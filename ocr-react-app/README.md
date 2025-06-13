# OCR 文档识别系统 (React版)

这是一个基于React的OCR文档识别系统前端应用，可以上传PDF、PNG和JPEG格式的文件，并通过OCR API将其转换为文本。

## 功能特点

- 💎 现代化React UI界面
- 📤 拖拽和点击上传文件
- 🔄 实时进度显示和动画效果
- 📝 Markdown渲染和代码高亮
- 🔄 渲染视图/源代码切换
- 📋 源代码一键复制
- 💾 下载Markdown和JSON结果
- 🌐 代理服务器解决跨域问题
- 🚀 演示模式(无需API也能体验功能)

## 开始使用

### 安装依赖

```bash
npm install
```

### 开发环境运行

```bash
npm start
```

这将在开发模式下启动应用，你可以在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看。

应用会自动代理API请求，解决跨域问题。

### 生产环境构建

```bash
npm run build
```

这将在`build`文件夹中生成生产环境版本的应用。

## API配置

应用默认连接到 `http://209.20.156.150:8000` API服务器：

- 在开发环境中，使用代理（`/api` → `http://209.20.156.150:8000`）
- 在生产环境中，直接连接API服务器

## 技术栈

- React 18
- React Router 6
- Axios
- Markdown-it
- Highlight.js

## 跨域解决方案

本应用使用http-proxy-middleware来解决跨域问题：

- 对开发环境配置了代理服务器
- 在setupProxy.js中定义了API代理规则
- 生产环境部署时需要配置相应的CORS或代理
