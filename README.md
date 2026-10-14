# Fubuki Portfolio

React + Vite 个人作品集基础版。网站入口为 [fubuki007.github.io](https://fubuki007.github.io)。

## 本地预览

需要 Node.js 22.12 及以上版本。

```bash
npm ci
npm run dev
```

默认访问 `http://127.0.0.1:5173/`。运行 `npm run build` 会把静态文件生成到仓库根目录，供 GitHub Pages 从 `master` 分支根目录发布。根目录的 `index.html`、`favicon.svg`、`media/` 与 `assets/portfolio/` 是需要一并提交的构建产物。`.nojekyll` 让 Pages 直接提供这些静态文件。

## 更新内容

- 个人姓名、邮箱、介绍与项目文案：`app/src/content.js`
- 页面结构和交互：`app/src/App.jsx`
- 样式与响应式布局：`app/src/styles.css`
- 首页动态视觉源文件：`app/scripts/media-scene.js`
- 重新生成首页视频和海报：`npm run generate:media`，然后运行 `npm run build`

当前三张作品封面均标注为概念展示。真实项目经历、客户信息、绩效数字与肖像素材应在提供可核实材料后替换。
