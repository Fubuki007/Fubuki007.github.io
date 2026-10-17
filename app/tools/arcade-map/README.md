# 广州机厅地图

页面地址：/tools/arcade-map/

## 配置高德地图

1. 在高德开放平台创建 JS API Key。
2. 将 Key 的域名白名单限制为 fubuki007.github.io。
3. 如果控制台要求安全密钥，同时创建 securityJsCode。
4. 填入 app/public/data/amap-config.json 的 key 和 securityJsCode 字段。
5. 重新构建并发布。
也可以直接在页面的地图设置中临时填写。临时配置只保存在当前浏览器的 localStorage 中。

## 解析店铺坐标

1. 打开机厅地图，进入地图设置。
2. 点击解析剩余店铺。
3. 等待高德 PlaceSearch 和 Geocoder 依次解析。
4. 检查同名门店和商场内店铺的定位点。
5. 点击导出 arcades.json。
6. 用导出的文件替换 app/public/data/arcades.json。
7. 重新构建并发布。

## 数据文件

- app/public/data/arcades.csv：截图转写后的 CSV。
- app/public/data/arcades.json：站点使用的结构化数据。
- locationTruncated 表示截图地址有省略号。
- priceMissing 表示截图价格或币数字段缺失。
## 本地运行

npm run dev

访问 http://127.0.0.1:5173/tools/arcade-map/

## 发布

使用仓库原有的 npm run build。发布脚本会把 .site-build/tools 复制到仓库根目录的 tools 目录。