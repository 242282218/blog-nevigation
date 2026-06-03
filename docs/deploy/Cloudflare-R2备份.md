# Cloudflare R2 备份

Cloudflare 用作边缘层和可选灾备镜像。服务器本地文件系统仍是主数据源，R2 不是在线数据库。

## 适用场景

适用于以下需求：

- 把服务器本地运行时数据同步到远端对象存储。
- 在服务器损坏、迁移或重装时从云端恢复数据。
- 保留手动快照，降低误操作风险。

不适用于高并发写入、多用户协作编辑或审计历史。如果后续需要这些能力，应把存储层迁移到数据库，而不是把 R2 当作实时主存储。

## 推荐配置

- DNS：Cloudflare proxied record 指向服务器。
- TLS：使用 Full 或 Full strict。
- 应用：服务器上使用 Docker Compose。
- 备份：通过 S3-compatible API 写入 Cloudflare R2。

## R2 配置来源优先级

R2 有两种配置方式：

1. 已运行服务器推荐：登录 `/editor/settings`，使用 Cloudflare R2 面板保存配置。密钥会写入 `BLOG_DATA_ROOT/settings/cloudflare-r2.json`，保存后不会再返回给浏览器。
2. 首次部署或不可变部署推荐：在 `.env` 中配置 R2 环境变量。

设置页支持“一键配置 R2”：填写 Cloudflare 邮箱、Global API Key、Account ID 和 bucket 名称后，系统会自动创建或复用 bucket，创建该 bucket 专用的 R2 S3 凭证，并生成本地备份加密密钥。Global API Key 只用于本次请求，不会写入 `cloudflare-r2.json`，也不会在响应里回显。使用后建议在 Cloudflare 轮换 Global API Key。

手动配置仍然可用：如果已经有 R2 S3 凭证，可以直接填写 Account ID、Bucket、Access Key ID 和 Secret Access Key。手动配置时仍需通过 `.env` 提供 `R2_BACKUP_ENCRYPTION_KEY`，或明确设置 `R2_ALLOW_PLAINTEXT_BACKUP=true`。

重要规则：只要 `BLOG_DATA_ROOT/settings/cloudflare-r2.json` 存在，它就是完整的 R2 配置来源，`.env` 中的 R2 变量不会作为字段级 fallback。

因此：

- 如果该 JSON 文件损坏或字段不完整，R2 状态和恢复操作会快速失败。
- 如果想切回 `.env` 驱动配置，应通过 `/editor/settings` 删除或重新保存 R2 配置。
- 不要以为修改 `.env` 一定会生效；先确认是否存在 `settings/cloudflare-r2.json`。

## 环境变量

```env
R2_BACKUP_ENABLED=true
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_BUCKET=your-r2-bucket
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_PREFIX=blog-navigation
R2_SNAPSHOT_ON_WRITE=false
R2_BACKUP_ENCRYPTION_KEY=<32-byte-base64-or-hex-key>
R2_ALLOW_PLAINTEXT_BACKUP=false
```

`R2_ENDPOINT` 是可选项。正常使用 Cloudflare R2 时可以留空。

启用 R2 备份时，默认必须配置 `R2_BACKUP_ENCRYPTION_KEY`。上传到 R2 的备份对象会使用 AES-256-GCM 加密。未来恢复时必须继续使用同一个密钥。

只有在明确进行一次性明文迁移时，才设置 `R2_ALLOW_PLAINTEXT_BACKUP=true`。已有明文备份在没有密钥时仍可恢复，但不建议继续产生新的明文备份。

## 对象路径

```text
blog-navigation/latest/backup.json
blog-navigation/snapshots/YYYY/MM/DD/<timestamp>-manual-sync.json
```

`latest/backup.json` 会被同步操作覆盖。显式同步、恢复操作会写入快照；当 `R2_SNAPSHOT_ON_WRITE=true` 时，每次写入也会生成快照。

## 备份范围

R2 备份对象包含：

- 文章数据。
- 导航数据。
- 站点设置。
- manifest。

R2 备份对象不包含：

- `BLOG_DATA_ROOT/settings/cloudflare-r2.json`。
- R2 access key 或 secret key。
- GitHub 加密备份密钥。

这样可以避免把源服务器的存储凭据恢复到目标服务器，导致目标环境误写源 bucket 或泄露凭据。

## 恢复流程

从新服务器恢复：

1. 在 `.env` 中配置 R2 变量，尤其是 `R2_BUCKET`、`R2_PREFIX` 和 `R2_BACKUP_ENCRYPTION_KEY`。
2. 启动应用。
3. 登录 `/editor`。
4. 执行 cloud restore。
5. 验证公开页面和编辑器数据。
6. 从源码 checkout 中执行 `npm run data:verify -- /opt/blog-nevigation/data`。

如果云恢复提示本地数据已恢复，但后续云快照失败，说明服务器本地数据已经恢复成功。此时应修复 R2 配置，然后手动执行 cloud sync，恢复远端镜像状态。

## 常见问题排查

### 修改 `.env` 后 R2 状态没变

检查 `BLOG_DATA_ROOT/settings/cloudflare-r2.json` 是否存在。存在时它会完整优先于 `.env`。

### 恢复时报解密失败

检查 `R2_BACKUP_ENCRYPTION_KEY` 是否与创建备份时一致。密钥不一致时无法恢复加密备份。

### 找不到备份对象

检查 `R2_BUCKET` 和 `R2_PREFIX` 是否与备份时一致。prefix 不一致会导致应用查找另一个对象路径。

### R2 状态直接失败

检查 `settings/cloudflare-r2.json` 是否为合法 JSON，字段是否完整。必要时通过 `/editor/settings` 重新保存配置。

## 为什么 R2 不是主存储

本地 JSON 让公开页面读取不依赖远端对象存储可用性。R2 只承担灾备和迁移支持。如果应用后续需要多用户编辑、审计历史或高写入并发，应迁移到数据库，而不是把 R2 改造成实时数据库。
