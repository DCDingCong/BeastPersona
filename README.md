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

**版本：** V1.0.0<br>
**作者：** DingC<br>
**协议：** [MIT](./LICENSE)

兽格造像馆是一个移动端优先的 AI 兽设生成工具。用户通过隐藏意图的快速问卷或更细的深度分支题库输入性格、审美、世界观与边界偏好；系统先用本地规则引擎推演候选物种、血统倾向和设定冲突，再调用 OpenAI 生成结构化角色设定、完整形象图和多视角设定图。

## 项目亮点

- **移动端优先体验**：主界面按手机使用场景设计，桌面端保持居中预览。
- **双问卷模式**：固定 12 题快速流程适合快速生成，深度分支题库用于更细的角色定制。
- **隐藏评分机制**：用户看到的是叙事化选择，后台累积人格、审美、世界观、材质、血统和物种信号。
- **本地规则引擎**：先生成 `scoreSnapshot`、候选物种、血统建议和冲突提示，再进入 AI 生成。
- **血统类型控制**：支持 `AI 推荐`、`纯血`、`混血` 三种生成模式，减少随机拼接感。
- **双图一致输出**：完整场景图和参考设定图都来自同一份结构化角色设定，降低角色漂移。
- **结果页操作**：支持保存图片、复制设定文本、单张图片重新生成。

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
-> OpenAI 文本模型生成 character_spec_json
-> 从同一份 JSON 派生完整图与设定图 prompt
-> OpenAI 图片模型并行生成两张图
-> 结果页展示角色设定、完整图和参考图
```

## 技术栈

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- OpenAI SDK
- Vitest
- ESLint

## 项目结构

```text
src/app/page.tsx                         移动端主界面与交互流程
src/app/api/generate/route.ts            AI 生成接口
src/app/api/regenerate-image/route.ts    单张图片重试接口
src/data/quickQuestions.ts               固定 Q12 快速题库
src/data/deepQuestionBank.ts             本地深度分支题库
src/data/species.ts                      物种映射和权重
src/data/scoringRules.ts                 组合触发和血统阈值
src/lib/scoring.ts                       本地评分引擎
src/lib/questionFlow.ts                  深度分支抽题
src/lib/conflicts.ts                     设定冲突检测
src/lib/fursona.ts                       兽设规则推演与 fallback 设定
src/lib/openai.ts                        OpenAI SDK 配置读取
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
```

`.env.local.example` 只包含可提交到 GitHub 的占位值。真实的 `.env.local` 已被 `.gitignore` 忽略，不要提交 API key、自定义 base URL 或任何 secret。

安装依赖并启动开发服务：

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
| `npm.cmd test` | 运行 Vitest |
| `npm.cmd run lint` | 运行 ESLint |

## API

### `POST /api/generate`

生成结构化角色设定、完整形象图和多维度设定图。缺少 `OPENAI_API_KEY` 时会返回明确错误，不使用伪造演示数据。

### `POST /api/regenerate-image`

接收已有 prompt 并重绘单张图片，不重新生成角色设定。

## 生成规则摘要

- 快速问卷保持 12 道选择题，选项不直接暴露狐狸、龙、赛博、混血等结果标签。
- 单个答案只提供弱权重，通常影响 3-5 个标签，避免一题决定最终物种。
- 明显结果必须由多标签组合触发，例如 `mystery + slim + fox` 提高狐系候选，`control + mythic_bias + scale` 提高龙或麒麟候选。
- `纯血` 只保留一个主物种，禁止明显副血统特征；`混血` 最多 3 个血统，副血统必须落在具体身体部位、材质或装备上。
- 图片 prompt 强制加入 `no visible text, no character name, no labels, no typography, no watermark`。

## 暂不包含

- 结果持久化 / 历史记录
- 社区作品流
- 多角色关系网
- 生成后细粒度微调
- 局部重绘 / inpainting
- Live2D / VTuber 输出
- 约稿市场

## 注意事项

- 不要提交 `.env.local`、API key 或任何 secret。
- 如果替换为兼容 OpenAI 的服务，需要确认该服务同时兼容 Responses API 和 Images API。
- 图片生成成本、耗时和最终质量取决于所选模型与服务商，推荐使用 `gpt-image-2`。
- 图片质量波动、细节不稳定或风格漂移通常属于图片模型能力边界，不代表本地规则推演一定出错。
- 当前 V1.0.0 以快速生成流程为主要发布范围；精细模式题库会在后续版本继续完善。
