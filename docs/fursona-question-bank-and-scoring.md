# AI 兽设题库与关联规则

本文档定义 P1 版本的快速问卷题库、隐藏标签、评分关联和结果推演逻辑。

新版题库采用“隐晦 QA”设计：用户看到的是情境、选择和幻想偏好，后台再把答案拆成多个弱标签。目标是避免用户直接猜到“选这个就是狐狸/龙/赛博”，同时避免单个答案把用户结果拍死。

## 1. 设计原则

P1 快速问卷建议保持 10-12 题。当前推荐上线版使用 12 题。

题库必须满足：

- 用户感觉是在做娱乐测试，不是在主动填写人格标签。
- 用户可见题干不直接出现“独行、忠诚、神秘、赛博、混血”等分析词。
- 用户可见选项尽量不直接出现物种名，除非是深度定制页。
- 每个答案最多影响 3-5 个标签，且多数为小权重。
- 单个答案不能直接决定物种、血统或角色定位。
- 最终结果必须由多题累积分数、组合触发和用户显式血统选择共同决定。

## 2. 问卷分层

### 2.1 用户可见层

用户只看到：

- 场景题：你会走哪条路、先处理什么、留下什么。
- 行为题：遇到突发情况时做什么。
- 审美题：选择物品、声音、光线、地点，而不是直接选风格。
- 边界题：你希望角色“更完整/更异化/更清晰”，但不直接暴露血统算法。

### 2.2 后台解析层

后台记录：

- 人格标签：`alone`, `social`, `loyal`, `mystery`, `wild`, `soft`, `control`, `chaos`
- 世界观标签：`cyber`, `forest`, `dark`, `chinese`, `ocean`, `academy`, `wasteland`
- 视觉标签：`fur_short`, `fur_long`, `feather`, `scale`, `fluffy`, `slim`, `heavy`, `small`, `giant`
- 血统标签：`pure_bias`, `hybrid_bias`, `mythic_bias`, `mechanical_bias`
- 物种候选分：`fox`, `wolf`, `dog`, `cat`, `leopard`, `snow_leopard`, `lion`, `raven`, `owl`, `deer`, `rabbit`, `otter`, `dragon`, `serpent`, `qilin`, `mech`

## 3. 反猜测评分规则

### 3.1 单题权重限制

| 类型 | 单个选项最高权重 | 说明 |
| --- | --- | --- |
| 人格标签 | `+1.5` | 不能直接定性用户人格 |
| 世界观标签 | `+2` | 审美选择可以稍强 |
| 物种候选 | `+1.5` | 单题不能直接锁物种 |
| 血统倾向 | `+1.5` | 血统仍以用户切换为准 |
| 视觉材质 | `+2` | 材质题可影响图像细节 |

### 3.2 组合触发

只有多个标签同时出现时，才触发明显结果。

| 组合条件 | 触发结果 |
| --- | --- |
| `mystery >= 3` + `slim >= 2` + `fox >= 2` | 狐系候选提高 |
| `loyal >= 3` + `wild >= 2` + `dark >= 2` | 狼系候选提高 |
| `control >= 3` + `mythic_bias >= 2` + `scale >= 2` | 龙/麒麟候选提高 |
| `soft >= 3` + `forest >= 2` | 鹿/兔/水獭候选提高 |
| `cyber >= 3` + `mechanical_bias >= 2` | 机械副血统候选提高 |
| `feather >= 2` + `dark >= 2` + `mystery >= 2` | 鸟类副血统候选提高 |

### 3.3 结果阈值

```text
主物种：取综合分最高物种，但领先第二名不足 15% 时，交给 LLM 做合理融合。
纯血：只在用户选择纯血，或 pure_score 明显高于 hybrid_score 时生成。
混血：只在用户选择混血，或多个副标签持续出现时生成。
AI 推荐：如果不确定，生成主血统清晰的轻混血，而不是随机混种。
```

## 4. P1 隐晦快速问卷

### Q1. 雨夜里，你误入一座还亮着灯的旧车站。第一眼你会注意哪里？

| 选项 | 用户感受 | 隐藏分数 |
| --- | --- | --- |
| 售票窗口后面没关好的抽屉 | 观察细节、寻找线索 | `alone +1`, `mystery +1`, `fox +0.8`, `raven +0.5` |
| 候车椅上睡着的人有没有盖好外套 | 先照顾弱者 | `soft +1`, `loyal +0.8`, `dog +0.7`, `deer +0.5` |
| 天花板上闪烁的摄像头 | 对系统和监控敏感 | `control +0.8`, `cyber +1`, `mech +0.8`, `owl +0.4` |
| 月台尽头那扇本不该打开的门 | 被未知吸引 | `mystery +1.2`, `chaos +0.6`, `dragon +0.5`, `serpent +0.5` |

### Q2. 你只能带走一样东西，作为接下来旅程的凭证。

| 选项 | 用户感受 | 隐藏分数 |
| --- | --- | --- |
| 一枚有裂纹的旧徽章 | 规则、身份、秩序 | `control +1`, `academy +0.8`, `owl +0.8`, `pure_bias +0.4` |
| 一串声音很轻的铃 | 仪式感、灵性 | `mystery +0.8`, `chinese +1`, `mythic_bias +0.8`, `qilin +0.6` |
| 一把可以折叠的短刃 | 行动、速度、自保 | `slim +1`, `wild +0.7`, `fox +0.7`, `leopard +0.7` |
| 一个还在发热的金属核心 | 未来感、异化 | `cyber +1.2`, `mechanical_bias +1.2`, `mech +1`, `hybrid_bias +0.8` |

### Q3. 路上有人喊住你，说你拿错了东西。你更可能？

| 选项 | 用户感受 | 隐藏分数 |
| --- | --- | --- |
| 先停下，但不立刻回头 | 谨慎、保留距离 | `alone +1`, `mystery +0.8`, `wolf +0.6`, `fox +0.6` |
| 把东西收好，问对方怎么证明 | 边界、逻辑 | `control +1`, `owl +0.7`, `dragon +0.5`, `pure_bias +0.3` |
| 直接把对方带到灯下说清楚 | 坦率、关系导向 | `social +0.8`, `loyal +1`, `dog +0.8`, `lion +0.4` |
| 先笑一下，换条路走 | 反应快、不按规则 | `chaos +1`, `slim +0.7`, `fox +0.8`, `raven +0.5` |

### Q4. 你走进一间没有主人的房间，墙上有四幅画。

| 选项 | 用户感受 | 隐藏分数 |
| --- | --- | --- |
| 黑色海面上漂着一盏灯 | 深水、未知、孤独 | `ocean +1`, `mystery +0.8`, `otter +0.5`, `serpent +0.5` |
| 雾中的树根缠住石碑 | 自然、封印、守护 | `forest +1.2`, `soft +0.5`, `deer +0.8`, `fox +0.4` |
| 城市上空有一条断开的光轨 | 未来、失控、追踪 | `cyber +1.2`, `wasteland +0.5`, `mech +0.7`, `raven +0.4` |
| 云层里露出古建筑的一角 | 神话、古老、仪式 | `chinese +1.2`, `mythic_bias +1`, `dragon +0.9`, `qilin +0.7` |

### Q5. 如果必须穿过一片危险区域，你会选择哪种路线？

| 选项 | 用户感受 | 隐藏分数 |
| --- | --- | --- |
| 绕远，从高处观察后再下去 | 观察、轻盈、策略 | `alone +0.8`, `slim +1`, `fox +0.7`, `owl +0.5` |
| 沿着最短路线快速通过 | 直接、速度、冒险 | `wild +0.8`, `slim +0.8`, `leopard +0.8`, `wolf +0.4` |
| 找到旧地图，把风险标出来 | 计划、掌控 | `control +1.2`, `academy +0.8`, `owl +0.8`, `dragon +0.4` |
| 等一队人经过，混在里面走 | 社交、适应、低风险 | `social +1`, `soft +0.4`, `dog +0.7`, `cat +0.4` |

### Q6. 一个陌生人交给你一封信，说“只有你能看懂”。你会先看哪部分？

| 选项 | 用户感受 | 隐藏分数 |
| --- | --- | --- |
| 火漆印上的纹路 | 纹样、血统、仪式 | `mythic_bias +0.8`, `scale +0.6`, `dragon +0.6`, `qilin +0.5` |
| 信纸边缘的污渍 | 追踪、现场判断 | `mystery +0.8`, `alone +0.5`, `wolf +0.5`, `raven +0.5` |
| 落款的人名 | 关系、承诺、来源 | `loyal +0.8`, `social +0.5`, `dog +0.6`, `deer +0.4` |
| 被划掉的那一行 | 反常、隐藏信息 | `chaos +0.8`, `mystery +0.8`, `fox +0.6`, `serpent +0.4` |

### Q7. 你更愿意让角色身上出现哪种“非语言信号”？

| 选项 | 用户感受 | 隐藏分数 |
| --- | --- | --- |
| 走动时衣摆和尾影很明显 | 轮廓、动态、尾部存在感 | `fluffy +1`, `slim +0.6`, `fox +0.8`, `dog +0.4` |
| 靠近时能听到细微金属声 | 机械、装备、异化 | `cyber +1`, `mechanical_bias +1`, `mech +0.9`, `hybrid_bias +0.6` |
| 皮肤或毛发下有微弱纹路 | 神秘、鳞片、发光纹 | `mystery +0.5`, `scale +1`, `dragon +0.8`, `serpent +0.5` |
| 站定时像披着一层影子 | 暗色、压迫、夜行 | `dark +1`, `mystery +0.7`, `wolf +0.6`, `raven +0.7` |

### Q8. 你希望角色在远处被认出来，主要靠什么？

| 选项 | 用户感受 | 隐藏分数 |
| --- | --- | --- |
| 清晰的身体剪影 | 物种轮廓明确 | `pure_bias +1`, `control +0.4`, `wolf +0.4`, `snow_leopard +0.4` |
| 不寻常的局部特征 | 变异、混合、记忆点 | `hybrid_bias +1`, `scale +0.5`, `feather +0.5`, `dragon +0.4` |
| 一眼记住的配色 | 视觉传播、头像感 | `cyber +0.5`, `fluffy +0.3`, `fox +0.4`, `cat +0.4` |
| 姿态和气场 | 性格强、压迫感 | `wild +0.8`, `control +0.6`, `lion +0.7`, `dragon +0.5` |

### Q9. 有人请求你帮忙，但会拖慢你的任务。你会？

| 选项 | 用户感受 | 隐藏分数 |
| --- | --- | --- |
| 判断对方是否真的危险，再决定 | 理性、边界、观察 | `control +0.8`, `alone +0.6`, `owl +0.5`, `wolf +0.4` |
| 嘴上嫌麻烦，还是伸手 | 嘴硬、护短 | `loyal +1`, `mystery +0.4`, `fox +0.7`, `dog +0.5` |
| 直接帮，但不留下名字 | 温柔、匿名、治愈 | `soft +1`, `deer +0.8`, `rabbit +0.5`, `otter +0.5` |
| 让对方跟上，跟不上就算了 | 强势、行动优先 | `wild +0.8`, `chaos +0.5`, `wolf +0.6`, `lion +0.5` |

### Q10. 深夜里，你听见门外有三次敲击声。

| 选项 | 用户感受 | 隐藏分数 |
| --- | --- | --- |
| 不出声，从窗边确认外面 | 谨慎、夜行、观察 | `alone +0.8`, `dark +0.7`, `wolf +0.5`, `raven +0.5` |
| 把灯打开，站在门后等 | 正面、压迫、守势 | `control +0.7`, `wild +0.5`, `lion +0.5`, `dragon +0.5` |
| 先问一句暗号 | 规则、身份、关系 | `loyal +0.6`, `academy +0.6`, `dog +0.5`, `owl +0.5` |
| 故意从另一侧绕出去 | 反常、机动、狡黠 | `chaos +0.8`, `slim +0.7`, `fox +0.7`, `cat +0.4` |

### Q11. 如果角色有一个长期任务，你更喜欢它是？

| 选项 | 用户感受 | 隐藏分数 |
| --- | --- | --- |
| 找回一段被删除的记忆 | 赛博、追踪、身份谜题 | `cyber +1`, `mystery +0.6`, `mech +0.7`, mission: memory |
| 守着一个不能打开的门 | 守护、封印、秩序 | `loyal +0.8`, `control +0.8`, `dragon +0.5`, mission: gate |
| 把一盏灯送到海的另一边 | 治愈、旅程、水域 | `soft +0.8`, `ocean +1`, `otter +0.7`, mission: escort |
| 追捕一件会自己换主人的武器 | 危险、行动、暗线 | `wild +0.7`, `dark +0.7`, `wolf +0.5`, mission: hunt |

### Q12. 最后，生成结果时你更在意哪件事？

| 选项 | 用户感受 | 隐藏分数 |
| --- | --- | --- |
| 一眼能看懂它是什么 | 清晰、经典、纯血倾向 | `pure_bias +1.5`, `control +0.4` |
| 可以复杂，但主轮廓必须稳定 | 主血统明确的混血 | `hybrid_bias +1`, `pure_bias +0.5` |
| 越有异常感越好 | 幻想混种、异化 | `hybrid_bias +1.5`, `mythic_bias +0.6`, `chaos +0.4` |
| 希望有非自然的改造痕迹 | 机械或后天异化 | `hybrid_bias +1`, `mechanical_bias +1.5`, `cyber +0.8` |

## 5. 标签到物种的关联

### 5.1 物种基础权重

| 物种 | 强相关标签 | 弱相关标签 |
| --- | --- | --- |
| 狐 | `mystery`, `alone`, `slim`, `fluffy`, `chaos` | `cyber`, `forest` |
| 狼 | `alone`, `loyal`, `wild`, `dark` | `control`, `wasteland` |
| 犬 | `social`, `loyal`, `soft` | `academy`, `forest` |
| 猫 | `alone`, `mystery`, `small`, `chaos` | `academy`, `dark` |
| 豹 | `slim`, `wild`, `alone` | `dark`, `speed` |
| 雪豹 | `control`, `slim`, `dark`, `pure_bias` | `cold_palette` |
| 狮 | `social`, `wild`, `heavy`, `control` | `warm_palette` |
| 乌鸦 | `dark`, `mystery`, `feather`, `chaos` | `wasteland` |
| 猫头鹰 | `control`, `academy`, `mystery`, `feather` | `forest` |
| 鹿 | `soft`, `forest`, `control` | `mythic_bias` |
| 兔 | `soft`, `small`, `fluffy` | `social`, `chaos` |
| 水獭 | `soft`, `social`, `ocean`, `small` | `heal` |
| 东方龙 | `mythic_bias`, `control`, `scale`, `giant` | `cyber`, `chinese` |
| 蛇 | `mystery`, `scale`, `control`, `dark` | `slim` |
| 麒麟 | `mythic_bias`, `soft`, `chinese`, `control` | `forest` |
| 机械义体 | `mechanical_bias`, `cyber`, `control` | `hybrid_bias` |

### 5.2 物种得分公式

```text
物种得分 =
  人格标签匹配 * 0.30
+ 审美/世界观匹配 * 0.20
+ 体型/材质匹配 * 0.15
+ 任务/身份匹配 * 0.15
+ 组合触发加成 * 0.10
+ 用户显式偏好 * 0.10
```

说明：

- 快速问卷没有显式物种偏好时，用户偏好项默认为 0。
- 深度定制填写主物种时，主物种获得高加权，但仍要校验冲突。
- 混血模式下，主物种看综合分，副物种看补充特征分。
- 如果第一名与第二名接近，允许生成“主血统 + 局部副特征”，不要硬判纯血。

## 6. 血统推演规则

### 6.1 AI 推荐模式

```text
hybrid_score =
  hybrid_bias
+ mythic_bias * 0.8
+ mechanical_bias
+ scale * 0.5
+ feather * 0.5
+ secondary_species_signal

pure_score =
  pure_bias
+ clear_species_shape
+ repeated_same_species_signal
+ low_conflict_visual_signal
```

推荐逻辑：

| 条件 | 推荐 |
| --- | --- |
| `hybrid_score - pure_score >= 2.5` | 混血 |
| `pure_score - hybrid_score >= 2` | 纯血 |
| 物种第一名领先第二名超过 25% 且 `pure_bias` 高 | 纯血 |
| 多个材质标签同时出现，例如 `scale + mechanical_bias` | 混血 |
| 不确定 | 主血统清晰的轻混血，主血统不低于 70% |

### 6.2 纯血模式

纯血模式只保留一个主物种：

```json
{
  "lineage_mode": "pure",
  "primary_species": "雪豹",
  "secondary_species": [],
  "species_ratio": {
    "雪豹": 100
  }
}
```

自动禁止项：

- 不要混入其他物种的显著特征。
- 不要添加与主物种冲突的角、翅膀、鳞片或机械异化。
- 主物种轮廓必须清晰。

### 6.3 混血模式

混血模式最多 3 个血统：

```json
{
  "lineage_mode": "hybrid",
  "primary_species": "赤狐",
  "secondary_species": ["东方龙", "机械义体"],
  "species_ratio": {
    "赤狐": 65,
    "东方龙": 25,
    "机械义体": 10
  }
}
```

比例规则：

| 情况 | 比例建议 |
| --- | --- |
| 2 血统 | 70 / 30 |
| 3 血统 | 65 / 25 / 10 |
| 用户强调主轮廓稳定 | 75 / 25 |
| 用户强调异常感 | 60 / 30 / 10 |

强制规则：

- 主血统不低于 55%。
- 副血统不能改变主物种识别。
- 每个副血统必须落在具体身体部位、材质或装备上。

## 7. 输出内容关联

### 7.1 角色身份

| 高分组合 | 推荐身份 |
| --- | --- |
| `alone + slim + cyber` | 夜行斥候 |
| `loyal + heavy` | 守卫 |
| `control + mythic_bias` | 术士 |
| `soft + forest` | 治愈者 |
| `dark + chaos` | 废城游侠 |
| `academy + control` | 档案管理员 |
| `ocean + soft` | 潮汐信使 |
| `mechanical_bias + cyber` | 机械侦察员 |

### 7.2 任务设定

| 高分组合 | 推荐任务 |
| --- | --- |
| `cyber + mystery` | 找回被删除的记忆 |
| `forest + loyal` | 守护雾林封印 |
| `dark + wild` | 追捕危险遗物 |
| `chinese + mythic_bias` | 寻找古老契约 |
| `soft + ocean` | 护送灯火跨海 |
| `control + academy` | 回收禁忌档案 |

### 7.3 视觉关键词

| 标签 | 视觉表现 |
| --- | --- |
| `mystery` | 半遮面、低饱和、发光眼、雾气 |
| `wild` | 爪痕、獠牙、锐利轮廓、强对比 |
| `soft` | 圆润轮廓、暖色边光、柔软毛发 |
| `control` | 对称服装、护符、几何纹样 |
| `cyber` | 义体、霓虹线条、机械护具 |
| `forest` | 藤蔓、雾、自然纹理、木质道具 |
| `dark` | 黑灰底色、破损披风、夜行场景 |
| `chinese` | 云纹、流苏、玉饰、古建筑背景 |
| `scale` | 鳞片、角、竖瞳、长尾纹理 |
| `feather` | 羽披、翼形轮廓、鸟类面部特征 |

## 8. 示例推演

### 示例 A：赛博狐龙混血

用户没有直接选择“狐狸、龙、赛博”，而是选择：

- 注意旧车站里的抽屉。
- 带走发热的金属核心。
- 先看信上被划掉的一行。
- 远处识别靠不寻常的局部特征。
- 长期任务是找回被删除的记忆。

后台累积：

```json
{
  "mystery": 4.2,
  "slim": 2.1,
  "cyber": 3.2,
  "mechanical_bias": 2.7,
  "hybrid_bias": 2.4,
  "fox": 3.1,
  "dragon": 2.3,
  "mech": 2.6
}
```

推演：

```json
{
  "lineage_mode": "hybrid",
  "primary_species": "赤狐",
  "secondary_species": ["东方龙", "机械义体"],
  "species_ratio": {
    "赤狐": 65,
    "东方龙": 25,
    "机械义体": 10
  },
  "personality_keywords": ["警觉", "敏锐", "嘴硬", "边界感强"],
  "world_style": "赛博雨夜",
  "role": "夜行斥候",
  "mission": "找回被删除的龙鳞记忆"
}
```

### 示例 B：纯血雪豹

用户没有直接选择“雪豹”，而是选择：

- 注意旧徽章。
- 从高处观察路线。
- 更在意清晰身体剪影。
- 门外敲击时站在门后等。
- 判断对方是否真的危险再帮忙。

后台累积：

```json
{
  "control": 4.1,
  "alone": 2.4,
  "slim": 2.0,
  "pure_bias": 2.5,
  "dark": 1.7,
  "snow_leopard": 2.9,
  "wolf": 2.4,
  "owl": 2.2
}
```

推演：

```json
{
  "lineage_mode": "pure",
  "primary_species": "雪豹",
  "secondary_species": [],
  "species_ratio": {
    "雪豹": 100
  },
  "personality_keywords": ["冷静", "警觉", "克制", "边界感强"],
  "world_style": "雪夜高地",
  "role": "高地巡守者",
  "mission": "守护山脊禁区"
}
```

## 9. 代码落地建议

当前代码里的 `src/lib/fursona.ts` 仍是基础版 `optionScores`，页面里的快速问卷也仍是 6 题。建议下一步把题库从页面中拆出去，改为数据文件：

```text
src/data/questions.ts
src/data/species.ts
src/data/scoring.ts
```

推荐结构：

```ts
type QuestionOption = {
  id: string;
  label: string;
  subtleMeaning: string;
  scores: Record<string, number>;
  effects?: {
    palette?: string;
    role?: string;
    mission?: string;
    mustKeep?: string[];
    avoid?: string[];
  };
};
```

落地时要注意：

- 页面只展示 `label`，不展示 `scores` 和 `subtleMeaning`。
- 结果页可以解释“你偏向夜行、观察、边界感”，但不要逐题解释“你选了 A 所以是狐狸”。
- 后台可以保存每次生成的标签快照，便于调权重和 AB 测试。
- 调题时优先改权重和组合阈值，不要直接把选项改成物种选择。
