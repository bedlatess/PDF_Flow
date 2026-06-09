# PWA 图标目录

## 占位图标生成说明

当前图标为品牌色（#4F46E5）背景 + "PDF" 白色文字的占位图标。

### 生产环境替换建议

在生产部署前，请替换为专业设计的图标：

1. **设计工具**: Figma / Sketch / Illustrator
2. **尺寸要求**: 
   - 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
3. **格式**: PNG with transparency
4. **设计规范**:
   - 使用品牌色 #4F46E5
   - 包含品牌 Logo
   - 确保在不同背景下清晰可见
   - 遵循 Material Design 图标规范

### 在线工具推荐

- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Favicon.io](https://favicon.io/)

### 快速生成命令

```bash
# 使用 Node.js 生成占位图标
cd public/icons
node generate-icons.js
```

**注意**: 需要安装 `canvas` 依赖: `npm install canvas`
