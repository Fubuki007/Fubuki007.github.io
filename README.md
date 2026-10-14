# Fubuki Academic Homepage

React + Vite 大学生个人学术主页。内容包含个人简介、科研与学习记录、联系方式；保留静态紫蓝视觉风格。网站入口为 [fubuki007.github.io](https://fubuki007.github.io)。

## 本地预览

需要 Node.js 22.12 及以上版本。

```bash
npm ci
npm run dev
```

默认访问 `http://127.0.0.1:5173/`。运行 `npm run build` 会把静态文件生成到仓库根目录，供 GitHub Pages 从 `master` 分支根目录发布。根目录的 `index.html`、`favicon.svg` 与 `assets/portfolio/` 是需要一并提交的构建产物；后续添加图片时，构建脚本也会同步 `media/`。`.nojekyll` 让 Pages 直接提供这些静态文件。

## 更新内容

- 个人姓名、学校、邮箱与介绍：`app/src/content.js` 中的 `profile`
- 研究兴趣：`researchInterests`，只填入已确认的方向
- 科研与学习记录：`researchRecords`，记录字段为 `id`、`type`、`title`、`description`，可选 `period` 与 `href`
- 页面结构和交互：`app/src/App.jsx`
- 样式与响应式布局：`app/src/styles.css`

目前大学生身份由本人确认，学校沿用原主页的信息。研究兴趣与科研记录暂时留空，页面显示「正在整理中」。收到个人简历后再补充专业、教育时间、具体科研经历与成果；不使用虚构项目、论文、奖项或业绩数字。
