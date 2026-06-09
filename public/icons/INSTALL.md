# PWA 图标快速生成指南

## 方法 1: 在线工具生成（推荐）

使用 SVG 图标生成所有尺寸的 PNG：

1. 访问 [RealFaviconGenerator](https://realfavicongenerator.net/)
2. 上传 `icon.svg` 文件
3. 下载生成的图标包
4. 将文件复制到 `public/icons/` 目录

## 方法 2: 使用 ImageMagick 命令行

如果已安装 ImageMagick:

```bash
cd public/icons

# 从 SVG 生成各尺寸 PNG
magick icon.svg -resize 72x72 icon-72x72.png
magick icon.svg -resize 96x96 icon-96x96.png
magick icon.svg -resize 128x128 icon-128x128.png
magick icon.svg -resize 144x144 icon-144x144.png
magick icon.svg -resize 152x152 icon-152x152.png
magick icon.svg -resize 192x192 icon-192x192.png
magick icon.svg -resize 384x384 icon-384x384.png
magick icon.svg -resize 512x512 icon-512x512.png
```

## 方法 3: 使用在线 SVG 转 PNG

1. 访问 [CloudConvert](https://cloudconvert.com/svg-to-png)
2. 上传 `icon.svg`
3. 设置输出尺寸为每个所需大小
4. 下载并重命名文件

## 方法 4: 临时占位方案

如果只是开发测试，可以创建简单的纯色占位图标。使用以下在线工具：

- [Placeholder.com](https://placeholder.com/)
- 示例: `https://via.placeholder.com/512x512/4F46E5/FFFFFF?text=PDF`

下载后重命名为对应尺寸。

## 验证图标

生成后，检查以下文件是否存在：

- [ ] icon-72x72.png
- [ ] icon-96x96.png
- [ ] icon-128x128.png
- [ ] icon-144x144.png
- [ ] icon-152x152.png
- [ ] icon-192x192.png
- [ ] icon-384x384.png
- [ ] icon-512x512.png

## 测试 PWA

1. 运行 `npm run build && npm run preview`
2. 在 Chrome DevTools > Application > Manifest 查看图标
3. 尝试"安装应用"功能

---

**当前状态**: 提供了 SVG 源文件，需要转换为 PNG
