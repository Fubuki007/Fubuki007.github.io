# Fubuki · 学习与科研

这是 Fubuki 的个人学术主页，使用 React + Vite 构建，记录广东技术师范大学电气工程及其自动化本科阶段的学习、科研与阶段性成果。

公开页面：<https://fubuki007.github.io/>

## 小工具收藏夹

入口：<https://fubuki007.github.io/tools/>，也可以从主页导航进入“小工具”。内置九宫格图片裁剪工具的在线入口和 GitHub 源码链接。

收藏保存在仓库的 `app/public/data/tools.json`。页面每次打开或点击“刷新”都会读取仓库最新内容，支持搜索、分类和导出 JSON 备份。

管理收藏：

1. 点击“连接 GitHub”。
2. 在 GitHub 创建 Fine-grained personal access token：Resource owner 为 `Fubuki007`，Repository access 仅选择 `Fubuki007.github.io`，Repository permissions 的 Contents 为 Read and write。
3. 在页面粘贴令牌并连接，再点击“添加链接”或收藏卡片上的编辑、删除按钮。每次保存直接更新仓库，不需要修改代码或重新部署。

令牌只保留在当前标签页的内存中，刷新或关闭后需要重新连接。收藏本身会跨设备保存；其他设备无需连接即可读取，编辑时需连接同一个 GitHub 账号。公开仓库中的收藏也公开可见。

保存前会重新读取最新文件，使用 GitHub 文件 SHA 防止覆盖其他设备的修改；同一条收藏发生冲突时会保留编辑内容并提示刷新。GitHub 无法连接时只显示已缓存或初始收藏，并明确提示离线状态，不会把失败保存显示为成功。

## 本地运行

```bash
npm install
npm run dev
```

构建并发布到仓库根目录：

```bash
npm run build
```

预览检查：

```bash
npm run preview
$env:PREVIEW_URL='http://127.0.0.1:4173/'
npm run test:preview
npm run test:tools
```

页面内容以个人简历中已填写的信息为准。课程、专业排名、初试成绩等仍为空的模板字段不会展示在页面中。

在本地再次构建前，先同步远程仓库中已通过网页修改的收藏文件。`npm run build` 会同时生成主页、`tools/index.html` 和静态收藏文件到仓库根目录，GitHub Pages 可直接打开 `/tools/`。`test:tools` 使用模拟 GitHub API 验证增删改、跨设备读取和失败处理，不会改动真实仓库。
