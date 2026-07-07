# 兽格造像馆

**Type:** [中文](./README.md) | [English](./README.en.md)

**Version:** V1.0.0<br>
**Author:** DingC<br>
**License:** [MIT](./LICENSE)

![兽格造像馆界面预览](./public/ai-fursona-mobile-style-v1.png)

兽格造像馆是一个移动端优先的 AI 兽设造像工具。用户通过隐晦问卷或深度分支题库输入性格、审美、世界观与边界偏好，系统先用本地规则引擎推演候选物种、血统和冲突，再调用 OpenAI 生成结构化角色设定、完整形象图和多维度设定图。

## 预览

| 完整形象图 | 多维度设定图 |
| --- | --- |
| ![完整形象图示例](./public/sample-complete-scene.png) | ![多维度设定图示例](./public/sample-reference-sheet.png) |

## 核心亮点

- **双模式问卷**：固定 12 题快速推算，或使用深度分支题库进行更细的角色定制。
- **隐晦评分**：用户看到的是场景选择，后台累积人格、审美、世界观、材质、血统和物种候选分。
- **血统切换**：保留 `AI 推荐`、`纯血`、`混血` 三种生成类型，可按用户偏好覆盖系统建议。
- **本地规则引擎**：先生成 `scoreSnapshot`、候选物种、血统建议和冲突提示，再进入 AI 生成。
- **双图输出**：同一份结构化设定派生完整场景图和参考设定图，减少角色不一致。
- **结果操作**：支持保存图片、复制设定说明、单张图片重试。

> 当前 V1.0.0 版本以快速推算流程为主要发行范围；精细模式题库暂未完整测试，将在 V2.0 继续迭代。

## 生成规则

### 问卷与评分

- 快速问卷保持 12 道选择题，选项不直接暴露结果标签。
- 单个答案只提供弱权重，通常影响 3-5 个标签，避免一题决定最终物种。
- 深度问卷根据已答标签动态抽取分支题，包括基础判断、血统细化、哺乳类、神话鳞片、特殊材质、视觉、世界观和约束。

### 组合触发

明显结果必须由多标签组合触发，例如：

| 条件 | 加成 |
| --- | --- |
| `mystery >= 3` + `slim >= 2` + `fox >= 2` | 狐系候选提高 |
| `loyal >= 3` + `wild >= 2` + `dark >= 2` | 狼系候选提高 |
| `control >= 3` + `mythic_bias >= 2` + `scale >= 2` | 龙 / 麒麟候选提高 |
| `cyber >= 3` + `mechanical_bias >= 2` | 机械义体与混血倾向提高 |

### 血统规则

- `AI 推荐`：根据 `hybrid_score`、`pure_score`、主物种领先比例和视觉冲突自动选择。
- `纯血`：只保留一个主物种，物种比例为 100%，禁止角、翅膀、鳞片、机械异化等明显副血统特征。
- `混血`：最多 3 个血统，主血统不低于 55%，副血统必须落在具体身体部位、材质或装备上。
- 不确定时默认生成“主血统清晰的轻混血”，避免随机拼接。

### 图片与文案约束

- 角色设定、完整形象图 prompt、参考设定图 prompt 都来自同一份 `character_spec_json`。
- 图片 prompt 强制加入 `no visible text, no character name, no labels, no typography, no watermark`。
- 结果页只展示用户友好的设定，不暴露逐题分数和内部推断细节。

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
src/data/deepQuestionBank.ts             深度本地分支题库
src/data/species.ts                      物种映射和权重
src/data/scoringRules.ts                 组合触发和血统阈值
src/lib/scoring.ts                       本地评分引擎
src/lib/questionFlow.ts                  深度分支抽题
src/lib/conflicts.ts                     设定冲突检测
src/lib/fursona.ts                       兽设规则推演与 fallback 设定
src/lib/openai.ts                        OpenAI SDK 配置读取
public/                                  GitHub 与前端可用的静态示例图
assets/                                  产品视觉参考图
docs/                                   PRD、题库和实现计划文档
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

`.env.local.example` 只提供可提交到 GitHub 的示例值。真实的 `.env.local` 已被 `.gitignore` 忽略，不要提交你的真实 key、自定义 base URL 或任何 secret。

安装依赖并启动：

```powershell
npm.cmd install
npm.cmd run dev
```

打开：

```text
http://localhost:3000
```

如果只是验收功能，建议使用稳定预览：

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

## API 流程

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
返回结果页需要的角色设定、完整图、参考图
```

### `POST /api/generate`

生成结构化角色设定、完整形象图和多维度设定图。缺少 `OPENAI_API_KEY` 时会返回明确错误。

### `POST /api/regenerate-image`

接收已有 prompt 并重画单张图片，不重新生成角色设定。

## 暂不包含

- 结果持久化 / 历史记录
- 社区与作品流
- 多角色关系网
- 生成后细粒度微调
- 局部重绘
- Live2D / VTuber
- 约稿市场

## 注意事项

- 不要提交 `.env.local`、API key 或任何 secret。
- 如果替换为兼容 OpenAI 的服务，需要确认该服务同时兼容 Responses API 和 Images API。
- 图片生成成本、耗时和最终质量取决于所选模型与服务商，推荐使用 `gpt-image-2`。
- 图片生成质量偏差、细节不稳定或风格不一致通常属于图片模型能力边界，不代表本地规则推演一定出错。
- 精细模式题库暂未完整测试，将在 V2.0 进行迭代。
- 当前 UI 是移动端优先，桌面端主要作为居中手机预览。
