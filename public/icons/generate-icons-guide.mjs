import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

console.log('📦 PWA 图标生成指南\n');
console.log('✅ SVG 源文件已准备: icon.svg\n');

console.log('🎯 方案 1: 浏览器生成器 (最快，推荐)');
console.log('   打开: public/icons/generate-simple-icons.html');
console.log('   自动下载 8 个 PNG 图标\n');

console.log('🎯 方案 2: 在线工具 (质量最好)');
console.log('   1. 访问 https://realfavicongenerator.net/');
console.log('   2. 上传 icon.svg');
console.log('   3. 下载图标包到此目录\n');

console.log('🎯 方案 3: ImageMagick (如果已安装)');
console.log('   cd public/icons');
sizes.forEach(size => {
  console.log(`   magick icon.svg -resize ${size}x${size} icon-${size}x${size}.png`);
});

const readmePath = join(__dirname, 'GENERATE_ICONS.txt');
const content = `PWA 图标生成指南
==================

需要生成的图标尺寸:
${sizes.map(s => `- icon-${s}x${s}.png`).join('\n')}

快速方法: 在浏览器打开 generate-simple-icons.html
在线工具: https://realfavicongenerator.net/
`;

writeFileSync(readmePath, content);
console.log('\n✅ 已创建指南文件: GENERATE_ICONS.txt\n');
