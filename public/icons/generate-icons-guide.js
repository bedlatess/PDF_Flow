// 使用纯 Node.js 生成简单的占位图标
// 由于 canvas 依赖安装复杂，使用更简单的 sharp 库

const fs = require('fs');
const path = require('path');

// 如果没有 sharp，使用 SVG 转 PNG 的备选方案
// 这里先创建一个简单的脚本说明

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

console.log('PWA 图标生成说明：');
console.log('\n方案 1: 使用在线工具 (推荐，最简单)');
console.log('1. 访问 https://realfavicongenerator.net/');
console.log('2. 上传 public/icons/icon.svg');
console.log('3. 下载生成的图标包');
console.log('4. 解压到 public/icons/ 目录');

console.log('\n方案 2: 使用 ImageMagick (如果已安装)');
console.log('运行以下命令：');
console.log('cd public/icons');
sizes.forEach(size => {
  console.log(`magick icon.svg -resize ${size}x${size} icon-${size}x${size}.png`);
});

console.log('\n方案 3: 使用浏览器生成器 (最快)');
console.log('在浏览器中打开: public/icons/generate-simple-icons.html');
console.log('会自动下载 8 个 PNG 图标文件');

console.log('\n临时方案: 创建符号链接使用 SVG (开发环境可用)');
console.log('生产环境建议使用方案 1 或 2 生成真实的 PNG 文件');

// 创建一个简单的占位符说明文件
const readmePath = path.join(__dirname, 'GENERATE_ICONS.txt');
const content = `
PWA 图标生成步骤
==================

当前状态: SVG 源文件已准备，需要生成 PNG

快速方法 (推荐):
1. 打开浏览器访问: file://${path.join(__dirname, 'generate-simple-icons.html')}
2. 页面会自动生成并下载 8 个 PNG 图标
3. 将下载的图标移到此目录

或使用在线工具:
1. 访问 https://realfavicongenerator.net/
2. 上传 icon.svg
3. 下载并解压图标包到此目录

需要的图标尺寸:
${sizes.map(s => `- icon-${s}x${s}.png`).join('\n')}

完成后，manifest.json 将能正确引用这些图标。
`;

fs.writeFileSync(readmePath, content);
console.log('\n✅ 已创建图标生成指南: public/icons/GENERATE_ICONS.txt');
console.log('\n继续执行其他任务...');
