# 翎语 Lingo

**走出信息边界，发现更多可能。**

面向大学生的机会发现、课程学习、项目实践和社区组队平台。本仓库保存现有官网的应用源码、数据库迁移、示例数据与自动化测试。

官网：[www.lingozm.cn](https://www.lingozm.cn/)。前端目前部署在腾讯云 EdgeOne Makers，身份认证、数据库和文件存储使用 Supabase。把源码放到 GitHub 后，原网站及其数据库继续使用现有服务；本仓库不包含真实用户、课程文件或邀请码导出。

## 本地运行

使用 Node.js 24 和 `package.json` 中指定的 pnpm 11.25.0。

```sh
git clone https://github.com/ThreshoLdnnis/LingoResources.git
cd LingoResources
pnpm install --frozen-lockfile
```

将 `.env.example` 复制为 `.env.local`，填写自己的项目连接配置：

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

```sh
pnpm dev
```

浏览器访问 `http://127.0.0.1:3000/`。未配置 Supabase 时可预览平台介绍页；登录及会员内容需要正确配置的 Supabase 项目。前端只使用 publishable key，服务端 secret / service_role key 不可写进 `NEXT_PUBLIC_*` 配置。

## 主要功能

- 平台介绍页：品牌展示、互动卡片、粒子标题、探索轨道与星空动效，登录与受邀注册入口。
- 探索主页与机会发现：搜索、类型/地点筛选、排序、收藏、资源详情与智能匹配。
- 学习成长：课程发布工作台、授课人署名、封面配色、课时目录与学习进度。
- 课件：HTML 互动网页、PDF、PPTX 在线阅读及原文件下载，图片展示，Word/PPT/ZIP 附件下载。每份最多 20MB，每课时最多 8 份。
- 项目与社区：发布项目/动态、赛事转发组队、评论、本人帖子编辑与删除、头像与个人名片。
- 个人空间：自我介绍、成长经历、作品展示、配色与布局、收藏和申请记录。
- 运营后台：资源/课程管理、可选站内报名、申请审核、邀请码管理、昵称与注册邮箱列表。
- 权限：会员内容必须登录；管理员管理课程与内测邀请；个人资料、帖子与评论由本人管理。权限同时由数据库 RLS 和列级授权执行。

## 检查与构建

```sh
pnpm typecheck
pnpm test
pnpm build
```

测试包含嵌入式 PostgreSQL/PGlite 迁移与权限验证、账号切换、邀请注册、课程附件、HTML 隔离阅读、社区归属、搜索匹配及分页。测试使用本地夹具，不向正式数据库创建用户或写入数据。

`pnpm dev` 和 `pnpm build` 会先生成 PDF.js worker、字体和字符映射等阅读器资源，写入 `public/pdfjs/`。这些文件可由依赖重建，所以不提交到 GitHub。

生产构建输出在 `out/`。当前 `next.config.mjs` 使用静态导出；把 **out 文件夹中的内容** 上传到现有腾讯云项目即可，不要上传源码目录或 `.env.local`。`NEXT_PUBLIC_*` 会在构建时写入客户端，修改配置后必须重新构建。

## 数据库与文件存储

`supabase/migrations/` 保存按时间排序的数据库结构、函数、RLS、Storage 与权限变更；`supabase/seed.sql` 仅含开发示例。

**继续使用现有正式平台时，不要重跑初始建表迁移或 seed，也不要导出用户数据到仓库。** 连接配置仍沿用现有 Supabase 项目。此 GitHub 迁移不迁移数据库或存储文件。

全新开发项目需要按文件名顺序应用全部迁移，再由运营者通过受控的数据库操作初始化首个管理员和邀请批次。邮箱确认、SMTP、Site URL 与允许跳转地址需在 Supabase 控制台配置。普通用户不能自行提升管理员权限。

课程附件存放于私有 `course-files` bucket，只有管理员可上传；已登录成员只能读取已发布课程关联的附件。HTML 在隔离 iframe 内运行内嵌交互，不能读取平台登录信息，也不会加载外部脚本、图片或接口。多章节文件应分别上传到对应课时，使用平台目录切换。

## 目录

```text
app/                   平台介绍、会员页面、全局样式
components/            页面组件、登录、课程编辑/阅读、社区、个人空间
lib/                   应用状态、数据模型、搜索匹配和权限辅助逻辑
public/                品牌、字体、工具 Logo 与资源署名
scripts/               构建前的 PDF.js 资源准备
supabase/migrations/   数据结构与权限迁移
supabase/seed.sql      示例数据
tests/                 自动化测试
docs/                  日常运营与维护说明
```

## 维护

日常发布见 [运营指南](docs/operations.md)。真实密码、SMTP 授权码、私钥、数据库备份、用户邮箱导出与邀请码清单应放在仓库之外；环境变量只保留空白示例。

资源与工具名称不代表客户或合作关系。第三方字体和视觉参考的来源、许可证及署名保留在 `public/fonts/`、`public/credits/` 与相关资源目录中。
