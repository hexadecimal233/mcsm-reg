# MCSManager 注册系统

## ❓ 介绍

拥有一个精致 GUI 的 MCSM 注册系统

## 🚀 使用方法

注册: 打开 `http://your.website/register/` 即可
续期: 打开 `http://your.website/renew/` 即可

**配置:**
`index.js`

- apikey apiurl 为你的 apikey 和 api 链接, port 是端口, dbfile 是数据库文件
  `app.js`
- organization customer login_page 分别是为组织名, 客服链接和登录跳转页面

## 🚗 运行

- 运行 `npm install` 安装依赖.
- 运行 `npm start` 即可启动.
