# AI 兽设推算手机端

这是一个 Next.js + React + TypeScript 实现的 AI 兽设推算手机端工具。用户可以通过固定快速问卷或深度分支题库完成设定推演，并一次性输出：

- 角色完整形象图
- 角色多维度设定图
- 设定说明

当前链路接入 OpenAI SDK，支持真实文本推演和图片生成。没有配置 API key 时，页面可以预览流程和本地 fallback 设定，但不能视为完成真实 AI 生成。

## 技术栈

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- OpenAI SDK
- Vitest
- ESLint

## 当前功能

- 快速生成：固定 12 道隐晦问卷
- 深度定制：从本地题库按分支抽题
- 血统模式：AI 推荐、纯血、混血
- 本地评分：弱权重、组合触发、物种候选、血统建议
- 生成前确认：展示候选物种、血统建议、主要标签和冲突提示
- AI 生成：结构化设定、完整形象图、多维度设定图
- 结果页：保存图片、复制说明、单图重试

## 目录说明

```text
src/app/page.tsx                         移动端主界面与交互流程
src/app/api/generate/route.ts            AI 生成接口
src/app/api/regenerate-image/route.ts    单张图片重试接口
src/data/quickQuestions.ts               固定 Q12 快速题库
src/data/deepQuestionBank.ts             深度本地分支题库
src/data/species.ts                      物种映射和权重
src/data/scoringRules.ts                 组合触发和血统阈值
src/lib/scoring.ts                       本地评分引擎
src/lib/questionFlow.ts                  深度分支抽题
src/lib/conflicts.ts                     设定冲突检测
src/lib/fursona.ts                       兽设规则推演与 fallback 设定
src/lib/openai.ts                        OpenAI SDK 配置读取
public/                                  前端静态示例图片
assets/                                  产品视觉参考图
docs/                                   PRD、题库和实现计划文档
.env.local.example                       本地环境变量模板，可提交
.env.local                               本地真实配置，不要提交
```

## 本地配置

复制环境变量模板：

```powershell
Copy-Item .env.local.example .env.local
```

然后编辑 `.env.local`：

```env
OPENAI_API_KEY=你的 OpenAI API Key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TEXT_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=gpt-image-1
```

说明：

- `OPENAI_API_KEY`：真实 API key，只放本地。
- `OPENAI_BASE_URL`：大模型请求地址。使用官方 OpenAI 时保持 `https://api.openai.com/v1`；如果使用代理、中转或兼容 OpenAI 的服务，改这里。
- `OPENAI_TEXT_MODEL`：结构化设定生成模型。
- `OPENAI_IMAGE_MODEL`：图片生成模型。

`.env.local` 已被 `.gitignore` 忽略，不会进入未来 Git 提交。只提交 `.env.local.example`。

## 启动开发环境

Windows PowerShell 下建议使用 `npm.cmd`，避免系统执行策略拦截 `npm.ps1`。

安装依赖：

```powershell
npm.cmd install
```

启动开发服务器：

```powershell
npm.cmd run dev
```

如果只是验收功能、避免开发热更新 WebSocket 干扰，建议先构建再启动稳定预览：

```powershell
npm.cmd run build
npm.cmd run preview
```

打开：

```text
http://localhost:3000
```

## 常用命令

运行测试：

```powershell
npm.cmd test
```

运行 ESLint：

```powershell
npm.cmd run lint
```

生产构建：

```powershell
npm.cmd run build
```

启动生产构建结果：

```powershell
npm.cmd run start
```

`npm.cmd run start` 需要先执行过 `npm.cmd run build`。
`npm.cmd run preview` 等价于在 `127.0.0.1:3000` 启动生产预览，更适合本地验收。

## AI 生成流程

前端请求：

```text
POST /api/generate
```

流程如下：

```text
固定 Q12 或深度分支题库
↓
本地评分引擎生成 scoreSnapshot
↓
生成前确认与冲突检测
↓
规则引擎推演物种和血统
↓
OpenAI 文本模型生成 character_spec_json
↓
从同一份 JSON 派生两组图片 prompt
↓
OpenAI 图片模型并行生成完整形象图和多维度设定图
↓
返回结果页需要的三类产物
```

单图重试请求：

```text
POST /api/regenerate-image
```

该接口只接收已有 prompt 并重画单张图片，不重新生成角色设定。

## 暂不包含

- 结果持久化 / 历史记录
- 社区
- 多角色关系网
- 生成后细粒度微调
- 局部重绘
- Live2D / VTuber
- 约稿市场

## 注意事项

- 不要把 `.env.local`、API key 或任何 secret 提交到云端。
- 如果替换为兼容 OpenAI 的服务，需要确认该服务同时兼容 Responses API 和 Images API；否则需要改 API 路由的调用方式。
- 图片生成成本和耗时取决于所选模型与服务商。
- 当前 UI 是移动端优先，桌面端主要作为居中手机预览。
