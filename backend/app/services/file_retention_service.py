"""Safe cleanup for temporary cloud-processing files."""
from __future__ import annotations

import shutil
import time
from dataclasses import dataclass
from pathlib import Path

from app.core.config import settings


@dataclass
class FileRetentionSummary:
    scanned_count: int = 0
    removable_count: int = 0
    removed_count: int = 0
    removed_bytes: int = 0
    skipped_count: int = 0
    upload_dir: str = ""

    def model(self) -> dict:
        return {
            "scanned_count": self.scanned_count,
            "removable_count": self.removable_count,
            "removed_count": self.removed_count,
            "removed_bytes": self.removed_bytes,
            "skipped_count": self.skipped_count,
            "upload_dir": self.upload_dir,
        }


class FileRetentionService:
    """Delete only PDF-Flow generated directories under the configured upload root."""

    upload_prefixes = ("file_", "office_")
    result_prefixes = (
        "merge_",
        "split_",
        "compress_",
        "rotate_",
        "img2pdf_",
        "pdf2img_",
        "watermark_",
        "advanced_",
    )
    download_prefixes = ("download_",)

    def __init__(self) -> None:
        self._last_cleanup_at = 0.0

    @property
    def base_dir(self) -> Path:
        return Path(settings.UPLOAD_DIR).resolve()

    def preview(self, now: float | None = None) -> dict:
        return self._cleanup(remove=False, now=now).model()

    def cleanup(self, now: float | None = None) -> dict:
        return self._cleanup(remove=True, now=now).model()

    def cleanup_if_due(self) -> dict | None:
        interval = max(settings.CLOUD_FILE_CLEANUP_INTERVAL_SECONDS, 60)
        now = time.time()
        if now - self._last_cleanup_at < interval:
            return None
        self._last_cleanup_at = now
        return self.cleanup(now=now)

    def _cleanup(self, remove: bool, now: float | None = None) -> FileRetentionSummary:
        current_time = time.time() if now is None else now
        base_dir = self.base_dir
        summary = FileRetentionSummary(upload_dir=str(base_dir))
        if not base_dir.exists() or not base_dir.is_dir():
            return summary

        for child in base_dir.iterdir():
            summary.scanned_count += 1
            if not child.is_dir():
                summary.skipped_count += 1
                continue

            child_resolved = child.resolve()
            if not self._is_inside_base(child_resolved, base_dir):
                summary.skipped_count += 1
                continue

            ttl = self._ttl_for_name(child.name)
            if ttl is None:
                summary.skipped_count += 1
                continue

            try:
                age = current_time - child.stat().st_mtime
            except OSError:
                summary.skipped_count += 1
                continue

            if age < ttl:
                continue

            size = self._directory_size(child)
            summary.removable_count += 1
            if remove:
                try:
                    shutil.rmtree(child)
                    summary.removed_count += 1
                    summary.removed_bytes += size
                except OSError:
                    summary.skipped_count += 1

        return summary

    def _ttl_for_name(self, name: str) -> int | None:
        if name.startswith(self.upload_prefixes):
            return settings.CLOUD_FILE_UPLOAD_TTL_SECONDS
        if name.startswith(self.result_prefixes):
            return settings.CLOUD_FILE_RESULT_TTL_SECONDS
        if name.startswith(self.download_prefixes):
            return settings.CLOUD_FILE_DOWNLOAD_TTL_SECONDS
        return None

    def _is_inside_base(self, path: Path, base_dir: Path) -> bool:
        try:
            path.relative_to(base_dir)
            return True
        except ValueError:
            return False

    def _directory_size(self, directory: Path) -> int:
        total = 0
        for item in directory.rglob("*"):
            if item.is_file():
                try:
                    total += item.stat().st_size
                except OSError:
                    continue
        return total


file_retention_service = FileRetentionService()
