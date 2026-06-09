"""
PDF Processing Celery Tasks
处理 PDF 相关的异步任务
"""
import os
import tempfile
from typing import List, Optional
from celery import Task
from PyPDF2 import PdfReader, PdfWriter
from PIL import Image
import logging

from app.celery_worker import celery_app
from app.core.config import settings

logger = logging.getLogger(__name__)


class PDFTask(Task):
    """PDF 任务基类，提供错误处理和清理"""

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """任务失败时的回调"""
        logger.error(f"Task {task_id} failed: {exc}")
        # 清理临时文件
        self._cleanup_temp_files(kwargs.get("temp_files", []))

    def _cleanup_temp_files(self, file_paths: List[str]):
        """清理临时文件"""
        for path in file_paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception as e:
                logger.warning(f"Failed to cleanup {path}: {e}")


@celery_app.task(base=PDFTask, bind=True, max_retries=3)
def merge_pdfs_task(self, file_paths: List[str], output_path: str) -> dict:
    """
    合并多个 PDF 文件

    Args:
        file_paths: PDF 文件路径列表
        output_path: 输出文件路径

    Returns:
        dict: 包含 success, output_path, page_count
    """
    try:
        logger.info(f"Merging {len(file_paths)} PDFs")

        writer = PdfWriter()
        total_pages = 0

        for file_path in file_paths:
            reader = PdfReader(file_path)
            for page in reader.pages:
                writer.add_page(page)
                total_pages += 1

        # 写入输出文件
        with open(output_path, "wb") as output_file:
            writer.write(output_file)

        logger.info(f"Merged PDF created: {output_path} ({total_pages} pages)")

        return {
            "success": True,
            "output_path": output_path,
            "page_count": total_pages,
            "file_size": os.path.getsize(output_path)
        }

    except Exception as exc:
        logger.error(f"PDF merge failed: {exc}")
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(base=PDFTask, bind=True, max_retries=3)
def split_pdf_task(self, file_path: str, page_ranges: List[tuple], output_dir: str) -> dict:
    """
    拆分 PDF 文件

    Args:
        file_path: 输入 PDF 文件路径
        page_ranges: 页面范围列表 [(start, end), ...]
        output_dir: 输出目录

    Returns:
        dict: 包含 success, output_files
    """
    try:
        logger.info(f"Splitting PDF: {file_path}")

        reader = PdfReader(file_path)
        output_files = []

        for idx, (start, end) in enumerate(page_ranges):
            writer = PdfWriter()

            # 页面索引从 0 开始
            for page_num in range(start - 1, end):
                if page_num < len(reader.pages):
                    writer.add_page(reader.pages[page_num])

            # 生成输出文件名
            output_path = os.path.join(output_dir, f"split_{idx + 1}.pdf")
            with open(output_path, "wb") as output_file:
                writer.write(output_file)

            output_files.append(output_path)

        logger.info(f"PDF split into {len(output_files)} files")

        return {
            "success": True,
            "output_files": output_files,
            "count": len(output_files)
        }

    except Exception as exc:
        logger.error(f"PDF split failed: {exc}")
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(base=PDFTask, bind=True, max_retries=3)
def compress_pdf_task(self, file_path: str, output_path: str, quality: str = "medium") -> dict:
    """
    压缩 PDF 文件

    Args:
        file_path: 输入文件路径
        output_path: 输出文件路径
        quality: 质量级别 (low, medium, high)

    Returns:
        dict: 包含 success, output_path, compression_ratio
    """
    try:
        logger.info(f"Compressing PDF: {file_path} (quality: {quality})")

        reader = PdfReader(file_path)
        writer = PdfWriter()

        for page in reader.pages:
            # 压缩页面
            page.compress_content_streams()
            writer.add_page(page)

        # 写入压缩后的文件
        with open(output_path, "wb") as output_file:
            writer.write(output_file)

        # 计算压缩比
        original_size = os.path.getsize(file_path)
        compressed_size = os.path.getsize(output_path)
        compression_ratio = (1 - compressed_size / original_size) * 100

        logger.info(f"Compressed: {original_size} → {compressed_size} bytes ({compression_ratio:.1f}% reduction)")

        return {
            "success": True,
            "output_path": output_path,
            "original_size": original_size,
            "compressed_size": compressed_size,
            "compression_ratio": round(compression_ratio, 2)
        }

    except Exception as exc:
        logger.error(f"PDF compression failed: {exc}")
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(base=PDFTask, bind=True, max_retries=3)
def rotate_pdf_task(self, file_path: str, output_path: str, rotation: int) -> dict:
    """
    旋转 PDF 页面

    Args:
        file_path: 输入文件路径
        output_path: 输出文件路径
        rotation: 旋转角度 (90, 180, 270)

    Returns:
        dict: 包含 success, output_path
    """
    try:
        logger.info(f"Rotating PDF: {file_path} by {rotation}°")

        reader = PdfReader(file_path)
        writer = PdfWriter()

        for page in reader.pages:
            page.rotate(rotation)
            writer.add_page(page)

        with open(output_path, "wb") as output_file:
            writer.write(output_file)

        logger.info(f"Rotated PDF saved: {output_path}")

        return {
            "success": True,
            "output_path": output_path,
            "rotation": rotation,
            "page_count": len(reader.pages)
        }

    except Exception as exc:
        logger.error(f"PDF rotation failed: {exc}")
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(base=PDFTask, bind=True, max_retries=3)
def convert_images_to_pdf_task(self, image_paths: List[str], output_path: str) -> dict:
    """
    将图片转换为 PDF

    Args:
        image_paths: 图片文件路径列表
        output_path: 输出 PDF 路径

    Returns:
        dict: 包含 success, output_path, page_count
    """
    try:
        logger.info(f"Converting {len(image_paths)} images to PDF")

        images = []
        for img_path in image_paths:
            img = Image.open(img_path)
            # 转换为 RGB（PDF 不支持 RGBA）
            if img.mode == "RGBA":
                img = img.convert("RGB")
            images.append(img)

        # 保存为 PDF
        if images:
            images[0].save(output_path, save_all=True, append_images=images[1:])

        logger.info(f"PDF created from images: {output_path}")

        return {
            "success": True,
            "output_path": output_path,
            "page_count": len(images),
            "file_size": os.path.getsize(output_path)
        }

    except Exception as exc:
        logger.error(f"Image to PDF conversion failed: {exc}")
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(base=PDFTask, bind=True, max_retries=3)
def convert_pdf_to_images_task(self, file_path: str, output_dir: str, format: str = "png") -> dict:
    """
    将 PDF 转换为图片

    Args:
        file_path: 输入 PDF 路径
        output_dir: 输出目录
        format: 图片格式 (png, jpeg)

    Returns:
        dict: 包含 success, output_files
    """
    try:
        from pdf2image import convert_from_path

        logger.info(f"Converting PDF to {format.upper()} images: {file_path}")

        # 转换 PDF 为图片
        images = convert_from_path(file_path, dpi=300)
        output_files = []

        for idx, image in enumerate(images):
            output_path = os.path.join(output_dir, f"page_{idx + 1}.{format}")
            image.save(output_path, format.upper())
            output_files.append(output_path)

        logger.info(f"PDF converted to {len(output_files)} {format.upper()} images")

        return {
            "success": True,
            "output_files": output_files,
            "count": len(output_files),
            "format": format
        }

    except Exception as exc:
        logger.error(f"PDF to image conversion failed: {exc}")
        raise self.retry(exc=exc, countdown=60)
