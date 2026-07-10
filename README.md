# 兽格造像馆

<p align="right">
  <strong>语言：</strong>
  <a href="./README.md">中文</a> |
  <a href="./README.en.md">English</a>
</p>

<p align="center">
  <img src="./public/ai-fursona-mobile-style-v1.png" alt="兽格造像馆移动端界面预览" width="760" />
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-App_Router-111111?logo=nextdotjs" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white" />
  <img alt="OpenAI" src="https://img.shields.io/badge/OpenAI-SDK-111111?logo=openai" />
  <img alt="Vitest" src="https://img.shields.io/badge/Vitest-Tested-6e9f18?logo=vitest&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-blue" />
</p>

**版本：** V1.2.0<br>
**作者：** DingC<br>
**协议：** [MIT](./LICENSE)

兽格造像馆是一个移动端优先的 AI 兽设生成工具。用户通过隐藏意图的快速问卷或更细的深度分支题库输入性格、审美、世界观与边界偏好；系统先用本地规则引擎推演候选物种、血统倾向和设定冲突，再调用 OpenAI 生成结构化角色设定、完整形象图和多视角设定图。

## 项目亮点

- **移动端优先体验**：主界面按手机使用场景设计，桌面端保持居中预览。
- **双问卷模式**：固定 12 题快速流程适合快速生成，深度分支题库用于更细的角色定制。
- **隐藏评分机制**：用户看到的是叙事化选择，后台累积人格、审美、世界观、材质、血统和物种信号。
- **本地规则引擎**：先生成 `scoreSnapshot`、候选物种、血统建议和冲突提示，再进入 AI 生成。
- **血统类型控制**：支持 `AI 推荐`、`纯血`、`混血` 三种生成模式，减少随机拼接感。
- **生成前可编辑**：确认页可直接修改定位、身高、体型、关键词、外观细节和图片提示词，修改会写入本次生成。
- **双运行模式**：开源版默认无需登录；公网部署可启用本地邮箱密码、积分和个人数据隔离。
- **本地持久化**：用户、积分、任务、角色设定和历史记录保存在本机 SQLite，图片写入私有数据目录。
- **异步生成队列**：多人提交时按数据库队列顺序执行，任务失败自动退款，过期 lease 可恢复。
- **双图一致输出**：完整场景图和参考设定图都来自同一份结构化角色设定，降低角色漂移。
- **设定板式参考图**：多维度设定图按竖版角色设定板组织，包含主视图、背视图、表情格、细节特写、服装变化、随身物品、色板、个人空间和三视图。
- **结果页操作**：支持保存图片、复制设定文本、单张图片重新生成，以及从选择页重新开始。
- **Android 包装**：内置 Capacitor Android 工程和静态导出脚本，可在具备 JDK 与 Android SDK 的机器上构建 APK。

## 预览

| 完整形象图 | 多维度设定图 |
| --- | --- |
| <img src="./public/sample-complete-scene.png" alt="完整形象图示例" width="420" /> | <img src="./public/sample-reference-sheet.png" alt="多维度设定图示例" width="420" /> |

## 生成流程

```text
固定 Q12 或深度分支题库
-> 本地评分引擎生成 scoreSnapshot
-> 生成前确认与冲突检测
-> 规则引擎推演物种和血统
-> 确认页手动编辑角色设定与图片 prompt
-> 生成或确认 character_spec_json
-> 从同一份 JSON 派生完整图与设定图 prompt
-> OpenAI 图片模型并行生成两张图
-> SQLite 保存任务和角色设定，本地私有目录保存图片
-> 结果页和历史记录展示角色设定、完整图和参考图
```

## 技术栈

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- OpenAI SDK
- Node.js SQLite
- Vitest
- ESLint

## 项目结构

```text
src/app/page.tsx                         移动端主界面与交互流程
src/app/api/auth/                         本地注册、登录和退出接口
src/app/api/generate/jobs/                异步生成任务接口
src/app/api/assets/                       私有图片读取接口
src/app/api/generate/schema.ts           结构化角色设定 JSON Schema
src/app/api/regenerate-image/jobs/       单张图片重绘任务接口
src/data/quickQuestions.ts               固定 Q12 快速题库
src/data/deepQuestionBank.ts             本地深度分支题库
src/data/species.ts                      物种映射和权重
src/data/scoringRules.ts                 组合触发和血统阈值
src/lib/scoring.ts                       本地评分引擎
src/lib/questionFlow.ts                  深度分支抽题
src/lib/conflicts.ts                     设定冲突检测
src/lib/characterSpecEditing.ts          确认页编辑草案合并逻辑
src/lib/fursona.ts                       兽设规则推演与 fallback 设定
src/lib/openai.ts                        OpenAI SDK 配置读取
src/lib/localDatabase.ts                 SQLite schema 与事务连接
src/lib/localAuth.ts                     密码哈希和数据库 Session
src/lib/asyncJobs.ts                     积分扣减和数据库队列
src/lib/generationStorage.ts             本机私有图片存储
capacitor.config.ts                      Android Capacitor 包装配置
android/                                 Capacitor 生成的 Android 工程
public/                                  GitHub 与前端可用的静态示例图
assets/                                  产品视觉参考图
docs/                                    PRD、题库和实现计划文档
```

## 本地运行

复制环境变量模板：

```powershell
Copy-Item .env.local.example .env.local
```

编辑 `.env.local`：

```env
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TEXT_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=gpt-image-2
APP_MODE=anonymous
LOCAL_DATA_DIR=./data
INITIAL_USER_CREDITS=3
```

`.env.local.example` 只包含可提交到 GitHub 的占位值。真实的 `.env.local` 已被 `.gitignore` 忽略，不要提交 API key、自定义 base URL 或任何 secret。

需要 Node.js 22.13 或更高版本，推荐 Node.js 24。安装依赖并启动开发服务：

```powershell
npm.cmd install
npm.cmd run dev
```

打开：

```text
http://localhost:3000
```

稳定预览生产构建：

```powershell
npm.cmd run build
npm.cmd run preview
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm.cmd run dev` | 启动开发服务器 |
| `npm.cmd run build` | 生产构建 |
| `npm.cmd run preview` | 在 `127.0.0.1:3000` 启动生产预览 |
| `npm.cmd run start` | 启动已构建的生产应用 |
| `npm.cmd run build:android:web` | 生成 Android WebView 使用的 `out/` 静态资源 |
| `npm.cmd run android:sync` | 构建静态资源并同步到 Capacitor Android 工程 |
| `npm.cmd run android:apk` | 同步资源并调用 Gradle 构建 Debug APK |
| `npm.cmd test` | 运行 Vitest |
| `npm.cmd run lint` | 运行 ESLint |

## 运行模式与分支

- `main` 默认 `APP_MODE=anonymous`：不显示登录和积分，历史属于当前本机实例的公共工作区。
- `codex/public-deployment` 默认 `APP_MODE=multi-user`：启用邮箱密码、初始积分、任务扣费和个人历史隔离。
- 环境变量 `APP_MODE` 可以覆盖分支默认值。切换到 `multi-user` 不需要外部数据库服务。

SQLite、Session 和生成图片默认保存在 `data/`。该目录不会提交到 GitHub；公网部署时应定期备份整个目录。Tunnel 只需要转发 Next.js 服务端口，建议始终使用 HTTPS。

## Android APK

本项目使用 Capacitor 包装 Android WebView：

> V1.2 的账户、SQLite 队列和历史记录依赖 Next.js 服务端。静态 APK 不能直接运行这些服务端能力，当前正式发布目标为 Web/Tunnel 部署；Android 工程仅保留为后续适配基础。

```powershell
npm.cmd run build:android:web
npm.cmd run android:sync
npm.cmd run android:apk
```

`android:apk` 需要本机安装 JDK 17+、Android SDK，并正确设置 `JAVA_HOME` 与 `ANDROID_HOME` 或 `ANDROID_SDK_ROOT`。构建成功后 Debug APK 通常位于：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

当前开发机已经验证 `build:android:web` 和 `android:sync` 可运行；但缺少 `java` 和 `JAVA_HOME`，因此无法在此环境直接产出 APK 文件。

## API

### `POST /api/auth/signup` / `login` / `logout`

多用户模式下提供本地邮箱密码认证。密码使用 `scrypt` 哈希，浏览器只接收 HttpOnly Session Cookie。

### `POST /api/generate/jobs`

创建异步生成任务。匿名模式不扣积分；多用户模式事务扣除 1 积分，失败后自动退款。

### `GET /api/generate/jobs/[jobId]`

查询排队位置、任务状态和生成结果。多用户模式只能查询自己的任务。

### `POST /api/regenerate-image/jobs`

从已保存结果读取 prompt 并创建单图重绘任务，不信任浏览器传入的历史提示词。

## 生成规则摘要

- 快速问卷保持 12 道选择题，选项不直接暴露狐狸、龙、赛博、混血等结果标签。
- 单个答案只提供弱权重，通常影响 3-5 个标签，避免一题决定最终物种。
- 明显结果必须由多标签组合触发，例如 `mystery + slim + fox` 提高狐系候选，`control + mythic_bias + scale` 提高龙或麒麟候选。
- `纯血` 只保留一个主物种，禁止明显副血统特征；`混血` 最多 3 个血统，副血统必须落在具体身体部位、材质或装备上。
- 完整形象图 prompt 强制加入 `no visible text, no character name, no labels, no typography, no watermark`。
- 多维度设定图 prompt 使用竖版 A4 设定板布局，允许短标题和短标签，但避免长段落、签名和水印。
- 确认页编辑会自动追加 `User edited requirements` 到图片 prompt，确保用户修改真正影响生成。

## 暂不包含

- 社区作品流
- 邮箱验证和找回密码
- 多角色关系网
- 生成后细粒度微调（确认页已支持生成前编辑）
- 局部重绘 / inpainting
- Live2D / VTuber 输出
- 约稿市场

## 注意事项

- 不要提交 `.env.local`、API key 或任何 secret。
- 如果替换为兼容 OpenAI 的服务，需要确认 Web 服务端同时兼容 Responses API 和 Images API；Android 静态包至少需要可访问 Images API。
- `data/` 包含账户、Session、积分和生成图片，公网部署时不要把该目录作为静态文件暴露。
- 图片生成成本、耗时和最终质量取决于所选模型与服务商，推荐使用 `gpt-image-2`。
- 图片质量波动、细节不稳定或风格漂移通常属于图片模型能力边界，不代表本地规则推演一定出错。
- 当前 V1.2.0 面向单机 Next.js 部署；不要让多台服务器同时共享同一个 SQLite 文件。
