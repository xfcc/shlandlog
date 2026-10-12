# 上海土地与城市更新

可迁移的中文静态公开事件台账。没有数据库、平台运行时、前端密钥或构建下载依赖。构建只读入本地 JSON，生成普通 HTML/CSS/JavaScript，任意静态托管均可承载。

## 本地使用

需要 Node.js 22 或更高版本（本次使用 Node 24.14.1）。项目无 npm 依赖。

```sh
npm ci --ignore-scripts
npm test
npm run validate
npm run build
npm run dev
```

打开 http://127.0.0.1:4173 。`npm run dev` 仅提供 `dist/` 预览，修改代码或数据后需要重新构建。可用 `PORT=4174 npm run dev` 改端口。

## 阅读功能

- 事件浏览、旧口径归档、覆盖与口径三个栏目。
- 中文关键词、资料期段、行政区、主题、阶段、核验层级、发布日期截至筛选；重置清空全部条件，按发布日期降序排列。
- 筛选条件保存在当前网址，可复制分享。每条记录有独立详情网址；浏览器返回可恢复原筛选。
- 详情分开保留事件日期、发布日期、实际起止日、事实与解读、面积与价格单位、来源等级及核验范围。
- 完整快照、四个查询均可导出 JSON/CSV，另可导出筛选结果 CSV。CSV 的空值保持空白，公式开头的文本加单引号防止电子表格执行。
- JavaScript 不可用时，仍可读完整列表、详情、覆盖说明及全部导出。

原展示逻辑由普通静态实现替代；未复制原平台组件或运行时。中文标签与筛选、详情、折叠覆盖说明保持一致，详情改为可直接分享的静态页面，窄屏用纵向列表阅读。

## 数据与来源

`data/snapshot.json` 是唯一台账；`data/schema.json` 是字段清单与来源说明。保留原来的四个查询键：

| 查询键 | 含义 | 2026-10-12 快照条数 |
| --- | --- | ---: |
| `land_events` | 当前第一方准入事件 | 27（9月20、10月7） |
| `unverified_leads` | 旧口径归档，全部不计当前 | 55 |
| `source_coverage` | 来源覆盖记录 | 18 |
| `field_definitions` | 字段口径定义 | 47 |

最后成功台账更新：2026-10-12 09:03:39（上海时间）。这个时间是输入快照的时间，不是构建时间，也不是对官方网站的实时核验时间。

唯一当前准入来源：[上海市土地交易市场／上海市土地交易事务中心](https://biz.ghzyj.sh.gov.cn/shtdsc/wz/)。不能仅凭 `gov.cn` 域名准入。媒体只能补充已有第一方准入依据的同一事件，并与官方事实分栏。其他政府部门与媒体独立记录仅保留在旧口径归档。

当前 27 条均为官方索引 / 搜索缓存核验，尚未取得完整公告正文。公告标题、结果公示标题及交易录播不能单独证明成交、金额、竞得人或实际成交日。空值是 `null`，不能替换为零。收录量不是宗地数、成交宗数或全市总量；未收录不表示无事件。

公开迁移输入的完整 ZIP 在本机经受支持的下载流程取得（33,608 字节），8 个清单文件的 SHA-256 验证通过。站点采用其中完整 JSON，未使用早期工作表文本重建数据。初始输入快照 SHA-256 为 `cab71b4c1bf9f6707adf21941abf97e0c3d04478c2536450a11af93185b3cca0`；字段清单为 `747ec406ac1451c91cfd2d3bf4ec4982448f904e60dcaff6f794f3e7462d0607`。后续维护会改变这些哈希。

## 手动维护

1. 编辑 `data/snapshot.json` 的对应 `queries.<key>.rows`。只追加已取得准入依据的事实，保留稳定 `id`、首次收录日与最近核验日。
2. 不以发布日代替实际事件日；未知字段留 `null`，金额、面积保持原始口径与单位。冲突要写清限制，不能静默覆盖。
3. 不符合现行规则的旧记录移至 `unverified_leads`，填写 `archive_status`、`archive_reason`、`archived_at` 与 `period_group: "旧口径归档"`；当前和归档记录 ID 不能重复。
4. 更新 `source_coverage` 与覆盖限制、快照 `generatedAt`、`metadata.cutoff`、版本及收录量描述；`schema.json` 的行数、字段说明和源记录也要同步。
5. 同步测试中标明的初始快照基准数量，再运行完整测试、校验和构建。检查桌面及 375px 手机宽度；确认当前与归档数量、空值、来源链接和导出。

这里没有创建或修改周更任务。数据更新不会自动发生；原有台账与原站点也没有被修改。

## 文件结构

```text
data/                 完整公开快照与字段清单
src/core.mjs          筛选、校验、HTML 转义、CSV 导出
src/app.mjs           浏览器交互与筛选网址
src/style.css         响应式中文阅读样式
scripts/build.mjs     生成页面与导出文件
scripts/validate.mjs  来源准入、字段与日期校验
scripts/serve.mjs     仅本机静态预览
tests/                数据边界与构建完整性测试
vercel.json           静态构建、输出目录、安全响应头
dist/                 构建结果，不提交
```

## Vercel 构建与访问

已配置 `vercel.json`：Framework Preset 为 Other（`framework: null`），根目录为仓库根目录，安装命令 `npm ci --ignore-scripts`，构建命令 `npm test && npm run build`，输出目录 `dist`，无需环境变量或 Vercel CLI。对应 [Vercel 构建设置文档](https://vercel.com/docs/builds/configure-a-build)。

连接 GitHub 时仅选择此仓库；遇到账号登录、应用授权或新权限，应由账号拥有者确认，勿扩大到全部仓库。未创建或关联 Vercel 项目，也未部署。

代码与公开公告资料可公开，站点实际访问策略仍需在部署时确认。Vercel 的 Standard Protection 保护预览及部署 URL，生产域名可公开；All Deployments 会保护包括生产域名的全部地址。具体以项目设置及 [官方 Deployment Protection 文档](https://vercel.com/docs/deployment-protection) 为准。站点不提供前端密码假鉴权。

部署后需在用户实际网络上检查生产域名、事件直达链接、JSON/CSV 下载和官方来源跳转；原网址的网络拦截不保证会因换平台自动消失。

## 验证

`npm test` 会真实构建，并检查导出逐字段等于完整输入、82 个事件详情、归档退出说明、所有站内页面与资源链接，另测试筛选、唯一来源准入、重复ID、空值导出、CSV公式防护、HTML转义和无效日期。初始快照数量断言属于迁移验收基准，维护新数据时需按已核验的实际数量更新。
