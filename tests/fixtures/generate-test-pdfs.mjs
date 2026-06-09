/* eslint-env node */

/**
 * 生成测试用 PDF 文件
 * 使用 pdf-lib 创建简单的测试 PDF
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateTestPDF(filename, pageCount, title) {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { height } = page.getSize();

    // 添加标题
    page.drawText(title, {
      x: 50,
      y: height - 50,
      size: 24,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });

    // 添加页码
    page.drawText(`Page ${i + 1} of ${pageCount}`, {
      x: 50,
      y: height - 100,
      size: 14,
      font: timesRomanFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    // 添加一些内容
    const content = `This is a test PDF file.\n\nGenerated for E2E testing purposes.\n\nPage number: ${i + 1}`;
    page.drawText(content, {
      x: 50,
      y: height - 150,
      size: 12,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
      lineHeight: 20,
    });

    // 添加一个矩形
    page.drawRectangle({
      x: 50,
      y: 100,
      width: 200,
      height: 100,
      borderColor: rgb(0.31, 0.27, 0.9), // Brand color #4F46E5
      borderWidth: 2,
    });

    page.drawText('PDF-Flow Test File', {
      x: 70,
      y: 130,
      size: 10,
      font: timesRomanFont,
      color: rgb(0.31, 0.27, 0.9),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const outputPath = join(__dirname, filename);
  writeFileSync(outputPath, pdfBytes);
  console.log(`✓ Generated: ${filename} (${pageCount} pages)`);
}

async function main() {
  console.log('🔄 生成测试 PDF 文件...\n');

  try {
    // 生成各种测试文件
    await generateTestPDF('sample1.pdf', 2, 'Sample PDF 1');
    await generateTestPDF('sample2.pdf', 3, 'Sample PDF 2');
    await generateTestPDF('multi-page.pdf', 10, 'Multi-Page Test PDF');

    // 生成大文件（更多页面）
    await generateTestPDF('large.pdf', 50, 'Large Test PDF');

    console.log('\n✅ 所有测试 PDF 文件生成成功！');
    console.log('\n文件位置: tests/fixtures/');
    console.log('\n现在可以运行 E2E 测试了：');
    console.log('  npm run build');
    console.log('  npx playwright install');
    console.log('  npm run test:e2e');
  } catch (error) {
    console.error('❌ 生成测试 PDF 时出错:', error);
    process.exit(1);
  }
}

main();
