# 内置 TTF 字体安装

源码中的字体菜单会从项目根目录的 `public/fonts/` 读取以下文件：

- `ZCOOLQingKeHuangYou-Regular.ttf`
- `MaShanZheng-Regular.ttf`

在完整项目根目录运行：

```bash
node src/tools/download-built-in-fonts.mjs
```

脚本会从 Google Fonts 官方仓库下载 TTF 和对应的 OFL 许可证。字体缺失时界面不会报错，会自动使用系统后备字体。
