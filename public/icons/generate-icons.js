// 生成 PWA 占位图标的脚本
// 使用 Canvas API 生成简单的品牌色图标

const fs = require('fs');
const { createCanvas } = require('canvas');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const brandColor = '#4F46E5'; // Indigo 品牌色
const textColor = '#FFFFFF';

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = brandColor;
  ctx.fillRect(0, 0, size, size);

  // 圆角效果（可选）
  ctx.beginPath();
  const radius = size * 0.15;
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = brandColor;
  ctx.fill();

  // 文字 "PDF"
  ctx.fillStyle = textColor;
  ctx.font = `bold ${size * 0.3}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PDF', size / 2, size / 2);

  // 保存
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`icon-${size}x${size}.png`, buffer);
  console.log(`✓ Generated icon-${size}x${size}.png`);
});

console.log('\n✅ All icons generated successfully!');
