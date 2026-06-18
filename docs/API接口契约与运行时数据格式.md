# API 接口契约与运行时数据格式

更新时间：2026-06-17

## 范围

本文记录编辑器相关 API、公开辅助 API、运行时 JSON 数据格式和派生文件。运行时主数据仍是明文 JSON，R2 自动备份不得加入加密口令字段。

## 认证约定

编辑器写接口必须满足：

- 已登录编辑器 session cookie。
- 同源请求。
- 携带 CSRF header。

未认证返回 `401`，CSRF 或跨域失败返回 `403`。运行时数据目录不可用返回 `503`。

## 编辑器数据 API

### `GET /api/data/articles`

返回：

```json
{
  "persistent": true,
  "revision": "resource-revision",
  "articles": []
}
```

### `PUT /api/data/articles`

请求：

```json
{
  "revision": "resource-revision",
  "articles": []
}
```

成功返回：

```json
{
  "success": true,
  "revision": "next-resource-revision",
  "remoteBackup": {
    "queued": true,
    "enabled": true,
    "success": null,
    "message": "R2 backup sync has been queued."
  }
}
```

冲突返回 `409`，并带回服务器当前 revision 和数据。

### `GET /api/data/navigation`

返回：

```json
{
  "persistent": true,
  "revision": "resource-revision",
  "categories": []
}
```

### `PUT /api/data/navigation`

请求：

```json
{
  "revision": "resource-revision",
  "categories": []
}
```

成功后会刷新运行时导航数据、派生搜索索引，并将 R2 备份加入队列。

### `GET /api/data/settings`

返回站点设置、revision 和版本元数据。

### `PUT /api/data/settings`

请求：

```json
{
  "revision": "resource-revision",
  "settings": {
    "siteName": "站点名称",
    "siteDescription": "站点描述"
  }
}
```

实际 `settings` 必须包含完整 `SiteSettings` 字段。

### `POST /api/data/media`

上传编辑器图片。主要用于文章编辑器从剪切板粘贴图片，也支持普通 `multipart/form-data` 上传。请求必须通过编辑器写接口认证。

支持的请求体：

- `multipart/form-data`，字段名为 `file`。
- 原始 `image/*` body，作为编辑器粘贴上传的兼容路径。

成功返回：

```json
{
  "success": true,
  "asset": {
    "id": "sha256",
    "path": "files/2026/06/sha256.png",
    "publicPath": "/media/files/2026/06/sha256.png",
    "mimeType": "image/png",
    "size": 1234,
    "hash": "sha256",
    "createdAt": "2026-06-17T00:00:00.000Z",
    "updatedAt": "2026-06-17T00:00:00.000Z"
  },
  "remoteMedia": {
    "enabled": true,
    "success": true,
    "key": "blog-navigation/media/files/2026/06/sha256.png"
  },
  "remoteBackup": {
    "queued": true
  }
}
```

仅支持 PNG、JPEG、WebP 和 GIF，单文件最大 5 MiB。图片先写入本地 `data/media/files/`，再复用现有 R2 自动备份配置上传到独立 R2 object。R2 媒体同步失败不会回滚本地上传；响应中的 `remoteMedia.success=false` 会提示编辑器展示警告。

## 备份 API

### `GET /api/data/backup`

导出当前文章、导航、站点设置、媒体清单和 manifest envelope。该 JSON 可直接检查和迁移；媒体二进制不写入备份 JSON。

### `POST /api/data/backup`

从本地备份 JSON 恢复。请求必须携带 `currentManifest`，用于防止用户在旧页面覆盖新数据。

### `GET /api/data/backup/remote`

返回 R2 状态和备份队列摘要。

### `POST /api/data/backup/remote/sync`

立即同步当前数据到 R2。

### `POST /api/data/backup/remote/restore`

从 R2 latest 备份恢复。恢复前会先生成当前数据的远端快照；恢复 JSON 数据后，会按媒体清单从 R2 独立 object 拉取本地缺失图片。

### `POST /api/data/backup/remote/retry`

将失败的备份任务重新加入队列。

## 公开 API

### `GET /media/files/...`

读取本地媒体文件，供文章 Markdown 图片链接使用。路径必须位于 `data/media/files/` 下，非法路径或文件不存在返回 `404`。

### `GET /api/search?q=...`

搜索文章和导航工具。优先读取 `data/indexes/search.json` 派生索引；索引缺失或损坏时回退到源数据。

### `GET /api/health`

返回运行状态：

```json
{
  "status": "ok",
  "version": {},
  "dataRoot": {
    "path": "/var/lib/blog-navigation",
    "source": "env",
    "writable": true
  },
  "manifest": {
    "valid": true,
    "path": "/var/lib/blog-navigation/manifest.json",
    "updatedAt": "2026-06-08T00:00:00.000Z",
    "schemaVersion": 1
  },
  "backupQueue": {
    "pending": 0,
    "failed": 0,
    "failedTasks": []
  }
}
```

`dataRoot.writable=false` 或 manifest 无效时返回 `503`。

### `GET /feed.xml`

输出 RSS 2.0。只包含公开文章，不包含导航系统页。

## 运行时主数据

默认目录：

- Docker：`/var/lib/blog-navigation`
- 本地：`data/`

主数据文件：

```text
articles/articles.json
navigation/tools.json
settings/site.json
media/manifest.json
media/files/yyyy/mm/<sha256>.<ext>
manifest.json
```

### `articles/articles.json`

数组，每项为 `Article`：

```json
{
  "id": "uuid",
  "slug": "stable-url",
  "title": "标题",
  "date": "2026-06-08",
  "description": "摘要",
  "tags": ["tag"],
  "content": "# Markdown",
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000,
  "kind": "essay",
  "status": "published",
  "category": "分类",
  "series": "系列",
  "featured": false,
  "sourceLinks": [],
  "revisionNotes": []
}
```

`draft` 不会公开展示。公开状态包括 `seedling`、`published`、`evergreen`、`archived`。

### `navigation/tools.json`

数组，每项为 `Category`：

```json
{
  "name": "分类",
  "icon": "book",
  "slug": "category",
  "tools": [
    {
      "icon": "link",
      "title": "工具",
      "description": "说明",
      "url": "https://example.com",
      "tags": ["tag"]
    }
  ]
}
```

### `settings/site.json`

完整 `SiteSettings`。缺失时使用默认设置；文件存在但结构非法时返回错误，不静默回退。

### `media/manifest.json`

媒体清单只记录图片元数据，不包含二进制内容：

```json
{
  "version": 1,
  "updatedAt": "2026-06-17T00:00:00.000Z",
  "assets": [
    {
      "id": "sha256",
      "path": "files/2026/06/sha256.png",
      "publicPath": "/media/files/2026/06/sha256.png",
      "mimeType": "image/png",
      "size": 1234,
      "hash": "sha256",
      "createdAt": "2026-06-17T00:00:00.000Z",
      "updatedAt": "2026-06-17T00:00:00.000Z"
    }
  ]
}
```

`path` 必须是 `files/` 下的安全相对路径。文件名使用内容 SHA-256，重复粘贴同一图片会复用同一个文件。

### R2 媒体对象

媒体文件不写入 `latest/backup.json` 或 `snapshots/*.json`。启用 R2 后，每个媒体文件单独上传：

```text
<R2_PREFIX>/media/files/yyyy/mm/<sha256>.<ext>
```

R2 配置完全复用现有自动备份配置，不新增媒体专用环境变量或 UI 字段。JSON 备份仍保持明文 JSON，必须能直接 `JSON.parse`。

### `manifest.json`

资源 revision 与 hash：

```json
{
  "version": 1,
  "schemaVersion": 1,
  "updatedAt": "2026-06-08T00:00:00.000Z",
  "resources": {
    "articles": {
      "revision": "revision",
      "hash": "sha256",
      "updatedAt": "2026-06-08T00:00:00.000Z"
    }
  }
}
```

写接口必须带 revision。revision 不匹配时返回 `409`。

## 派生数据

派生数据可重建，不作为 R2 自动备份主载荷的一部分。

```text
indexes/search.json
audit/events.jsonl
.backup-pending.json
```

### `indexes/search.json`

文章或导航写入、恢复后刷新。搜索 API 会优先读取该文件。

### `audit/events.jsonl`

每行一个 JSON 事件。记录登录、登出、初始化、资源写入、恢复、R2 设置更新、备份失败重试。

示例：

```json
{"version":1,"id":"uuid","createdAt":"2026-06-08T00:00:00.000Z","action":"data.write","resource":"articles","outcome":"success"}
```

审计日志不得记录编辑口令、R2 Secret Access Key、全局 API Key 或完整 session token。
