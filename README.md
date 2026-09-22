# Counter

基于 **Cloudflare Workers + D1** 构建的高性能、隐私友好、100% 兼容**不蒜子（Busuanzi）**规范的自建访客统计服务。

* **永不被拦截**：部署于自有域名，无第三方跟踪器域名标记，彻底告别 `ERR_BLOCKED_BY_CLIENT`。
* **零维护高可用**：依托 Cloudflare 边缘计算与全球 SQLite (D1)，彻底告别原版不蒜子的频繁 502/宕机。
* **真实 UV 去重**：使用 `SHA256(IP + UserAgent + 当天日期)` 计算每日唯一访客，既保护用户隐私又保证统计精准。
* **支持历史基数（Offset）**：支持无缝平移不蒜子历史数据，随时可补填已有 PV/UV 计数。
* **双模客户端支持**：
  * 提供 `counter.js`，支持全新去品牌化的 `data-counter` 语义化标签（支持同页面多处同时渲染），同时 100% 兼容传统 `busuanzi_value_*` DOM 标签与 `busuanzi.pure.mini.js` 路径。
  * 提供标准 JSON / JSONP API 及现代全局对象 `window.Counter`（保留 `window.bszCaller` 别名），完美适配 VitePress / Hexo / Hugo / Astro / Next.js 等前端。
* **免费额度充足**：完全在 Cloudflare Workers 和 D1 的免费额度内运行（每天 10 万次写、500 万次读）。

---

## 快速开始

### 1. 安装依赖

```bash
cd counter
pnpm install
```

### 2. 创建 Cloudflare D1 数据库

在终端中登录 Cloudflare 并创建数据库：

```bash
npx wrangler login
npx wrangler d1 create counter-db
```

命令执行后会输出一段配置，例如：
```toml
[[d1_databases]]
binding = "DB"
database_name = "counter-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

将该输出内容复制并覆盖 `wrangler.toml` 中的 `[[d1_databases]]` 部分。

### 3. 初始化数据库表结构

本地运行初始化（开发测试用）：
```bash
pnpm db:init:local
```

远程 Cloudflare D1 执行初始化（生产环境）：
```bash
pnpm db:init:remote
```

### 4. 本地测试与开发

```bash
pnpm dev
```

打开浏览器访问 `http://localhost:8787/`，若看到运行状态 JSON 即说明 Worker 工作正常。

### 5. 部署到 Cloudflare

```bash
pnpm deploy
```

部署完成后，在 Cloudflare Dashboard 中进入 **Workers & Pages -> counter -> Settings -> Domains & Routes**，为该 Worker 绑定你的自定义域名（例如 `counter.booling.cn`）。

---

## 客户端接入使用

### 方式一：传统静态网站（Hexo、Hugo、纯 HTML）

直接在网页 `<head>` 或 `<body>` 中引入 `counter.js`：

```html
<script async src="https://counter.booling.cn/counter.js"></script>

<!-- 推荐：去品牌化现代写法（支持单个页面多处同时渲染，使用 data 属性） -->
<span data-counter-container="site_pv">本站总访问量 <span data-counter="site_pv"></span> 次</span>
<span data-counter-container="site_uv">本站访客数 <span data-counter="site_uv"></span> 人</span>
<span data-counter-container="page_pv">本文阅读量 <span data-counter="page_pv"></span> 次</span>
<span data-counter-container="page_uv">本文访客数 <span data-counter="page_uv"></span> 人</span>

<!-- 亦支持通用 ID / Class 写法：#counter_value_site_pv / .counter_value_site_pv -->
```

#### 不蒜子（Busuanzi）无缝平替说明
若你的 Hexo/Hugo 主题已内置不蒜子标签（如 `busuanzi_container_*` / `busuanzi_value_*`），**无需修改任何模板 HTML**，只需将引入的 `<script src="...">` 地址改为你的自建 `counter.js` 即可直接工作：

```html
<!-- 直接替换原有 script 标签即可，原有 DOM 100% 兼容 -->
<script async src="https://counter.booling.cn/counter.js"></script>

<span id="busuanzi_container_site_pv">本站总访问量 <span id="busuanzi_value_site_pv"></span> 次</span>
<span id="busuanzi_container_site_uv">本站访客数 <span id="busuanzi_value_site_uv"></span> 人</span>
<span id="busuanzi_container_page_pv">本文阅读量 <span id="busuanzi_value_page_pv"></span> 次</span>
<span id="busuanzi_container_page_uv">本文访客数 <span id="busuanzi_value_page_uv"></span> 人</span>
```

### 方式二：现代 SPA 博客（VitePress / Vue / React）

如果你的站点使用如 VitePress、Vue 路由拦截打点，可以通过现代全局对象 `window.Counter` 触发打点：

```typescript
// 路由切换时手动调用
if (typeof window !== "undefined" && window.Counter) {
  window.Counter.fetch()
}
// 原版 window.bszCaller.fetch() 作为别名依然 100% 有效
```

也可以通过标准 JSONP 或 `fetch`（支持跨域 CORS）：
```typescript
const callbackName = `CounterCallback_${Date.now()}`
const script = document.createElement("script")
script.src = `https://counter.booling.cn/?jsonpCallback=${callbackName}`
document.head.appendChild(script)
```

或直接调用接口：
```typescript
const res = await fetch("https://counter.booling.cn/", {
  headers: { "Referer": window.location.href }
})
const data = await res.json()
// 返回格式:
// { "site_pv": 1234, "site_uv": 567, "page_pv": 89, "page_uv": 45, "version": 2.4 }
```

---

## 历史数据迁移与初始基数设置

如果你想将原本在不蒜子上的历史 PV/UV 迁移过来，或者想给博客设定一个起始数值：

### 1. 配置管理密钥（Admin Token）
在 `wrangler.toml` 中配置环境变量，或在 Cloudflare 控制台中添加密文：
```bash
npx wrangler secret put ADMIN_TOKEN
# 输入你的管理密钥，例如：my-secret-key-123456
```

### 2. 通过 API 调整初始数值

#### 设置全站（Site）历史基数：
```bash
curl -X POST https://counter.booling.cn/api/admin/offset \
  -H "Authorization: Bearer my-secret-key-123456" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "blog.booling.cn",
    "offset_pv": 10240,
    "offset_uv": 3560
  }'
```

#### 设置单篇文章（Page）历史基数：
```bash
curl -X POST https://counter.booling.cn/api/admin/offset \
  -H "Authorization: Bearer my-secret-key-123456" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "blog.booling.cn",
    "path": "/posts/my-first-post.html",
    "offset_pv": 520,
    "offset_uv": 310
  }'
```

### 3. 查看站点统计概览
```bash
curl -H "Authorization: Bearer my-secret-key-123456" \
  "https://counter.booling.cn/api/admin/domain?domain=blog.booling.cn"
```

---

## 许可证

[MIT License](LICENSE)
