# AI 兽设深度定制分支题库

本文档定义 P1/P1.5 可用的深度定制题库。它和快速问卷不同：快速问卷用于传播和轻量测试，深度定制用于认真做 OC、头像、约稿参考和角色设定卡。

深度题库采用“题池 + 分支”的方式：后台总题库可以持续扩展，当前文档先给出 48 道首版样例题。系统先用基础题判断方向，再进入血统、物种、视觉、世界观、任务、约稿约束等分支；单次用户只会看到被命中的题目组合，不会答完整题库。

## 1. 设计目标

- 深度定制仍然保留测试感，不把所有字段做成表单。
- 用户每次实际回答建议控制在 18-28 题；专业设定模式最多 36 题，避免移动端疲劳。
- 每个答案只贡献小权重，结果由多题综合判断。
- 分支题根据前序答案进入，避免问无关问题。
- 后台题库可超过 48 题，用于 AB 测试、复测、节日活动和不同世界观扩展。
- 题库结果必须能转成结构化 `character_spec_json`。

## 2. 推荐流程

```text
基础判断 8 题
  ↓
血统分支 6 题
  ↓
物种细化分支 5-6 题，按候选物种进入
  ↓
视觉细化分支 7 题
  ↓
世界观/任务分支 5 题
  ↓
约稿约束分支 4-6 题
  ↓
生成完整形象图 + 多维度设定图 + 设定说明
```

## 3. 分支进入规则

| 分支 | 进入条件 | 单次建议展示 |
| --- | --- | --- |
| 基础判断 | 所有深度定制用户 | 8/8 |
| 血统分支 | 所有用户，尤其是 `lineageMode = ai` | 4-6/6 |
| 哺乳类细化 | `fox/wolf/dog/cat/deer/rabbit/snow_leopard/lion` 候选高 | 4-6/6 |
| 神话/鳞片细化 | `dragon/serpent/qilin/scale/mythic_bias` 高 | 3-5/5 |
| 羽翼/水生/机械细化 | `feather/ocean/mechanical_bias` 高 | 3-5/5 |
| 视觉细化 | 所有用户 | 5-7/7 |
| 世界观/任务 | 所有用户 | 3-5/5 |
| 约稿约束 | 准备导出设定卡或画师模式时 | 4-6/6 |

## 4. 分支选择伪代码

```ts
const baseScores = score(baseQuestions);

const lineageBranch = true;
const mammalBranch =
  max(baseScores.fox, baseScores.wolf, baseScores.dog, baseScores.cat, baseScores.deer, baseScores.rabbit) >= 2;
const mythicBranch =
  baseScores.scale + baseScores.mythic_bias + baseScores.dragon + baseScores.qilin >= 3;
const specialBranch =
  baseScores.feather + baseScores.ocean + baseScores.mechanical_bias >= 3;

const branches = [
  "base",
  "lineage",
  topBranch(mammalBranch, mythicBranch, specialBranch),
  "visual",
  "world",
  "constraints",
];
```

## 5. 题库字段建议

```ts
type DeepQuestion = {
  id: string;
  branch: "base" | "lineage" | "mammal" | "mythic" | "special" | "visual" | "world" | "constraints";
  trigger?: string;
  question: string;
  options: Array<{
    id: string;
    label: string;
    scores: Record<string, number>;
    effects?: {
      mustKeep?: string[];
      avoid?: string[];
      promptHints?: string[];
      branchBoost?: string[];
    };
  }>;
};
```

页面只展示 `question` 和 `label`，不展示 `scores`。

## 6. 基础判断分支，8 题

基础题用于判断用户的主方向，不直接问物种。

### DB01. 你希望角色第一次登场时，镜头先看到什么？

| 选项 | 隐藏分数 |
| --- | --- |
| 靴底踩过积水，倒影先出现 | `mystery +1`, `dark +0.8`, `slim +0.5`, `fox +0.4` |
| 一只手把别人护到身后 | `loyal +1`, `soft +0.4`, `dog +0.6`, `wolf +0.4` |
| 高处俯视全局的侧影 | `control +1`, `alone +0.6`, `owl +0.5`, `dragon +0.4` |
| 破门而入的强轮廓 | `wild +1`, `heavy +0.8`, `lion +0.6`, `wolf +0.5` |

### DB02. 角色身上最适合出现哪种旧痕迹？

| 选项 | 隐藏分数 |
| --- | --- |
| 早已愈合但看得出的抓痕 | `wild +0.8`, `wolf +0.5`, `leopard +0.5` |
| 被修补过的衣角 | `soft +0.6`, `loyal +0.5`, `deer +0.4` |
| 反复擦亮的金属边缘 | `cyber +0.8`, `mechanical_bias +0.8`, `mech +0.6` |
| 像符文一样的浅色印记 | `mystery +0.6`, `mythic_bias +0.8`, `dragon +0.5`, `qilin +0.5` |

### DB03. 如果角色必须隐藏身份，最可能隐藏哪里？

| 选项 | 隐藏分数 |
| --- | --- |
| 耳朵或角的轮廓 | `hybrid_bias +0.7`, `scale +0.5`, `dragon +0.5`, `fox +0.4` |
| 眼睛的颜色 | `mystery +0.8`, `dark +0.4`, `serpent +0.4`, `raven +0.4` |
| 尾巴或背后的影子 | `fluffy +0.8`, `fox +0.6`, `wolf +0.4` |
| 关节处的结构 | `mechanical_bias +0.9`, `cyber +0.7`, `mech +0.8` |

### DB04. 你更喜欢哪种“不说话也能传达性格”的方式？

| 选项 | 隐藏分数 |
| --- | --- |
| 永远站在离出口最近的位置 | `alone +0.8`, `control +0.5`, `wolf +0.5` |
| 会把小物件摆得很整齐 | `control +0.8`, `academy +0.5`, `owl +0.5` |
| 看似漫不经心，反应很快 | `chaos +0.7`, `slim +0.6`, `fox +0.6`, `cat +0.4` |
| 对熟人有明显的距离差 | `loyal +0.7`, `mystery +0.4`, `dog +0.5`, `fox +0.4` |

### DB05. 角色更像从哪种地方走出来？

| 选项 | 隐藏分数 |
| --- | --- |
| 雨夜楼顶和广告灯牌之间 | `cyber +1`, `dark +0.5`, `mech +0.5`, `raven +0.4` |
| 雾气很重的旧林道 | `forest +1`, `mystery +0.4`, `deer +0.6`, `fox +0.4` |
| 风沙里的废弃交通站 | `wasteland +1`, `wild +0.4`, `wolf +0.5`, `raven +0.4` |
| 云层下的古祭台 | `chinese +1`, `mythic_bias +0.8`, `dragon +0.7`, `qilin +0.5` |

### DB06. 角色的行动方式更接近？

| 选项 | 隐藏分数 |
| --- | --- |
| 先观察三秒，再移动 | `alone +0.7`, `control +0.5`, `owl +0.4`, `wolf +0.4` |
| 边行动边修正路线 | `slim +0.8`, `chaos +0.4`, `fox +0.5`, `leopard +0.5` |
| 先保护身边人，再处理目标 | `loyal +1`, `soft +0.4`, `dog +0.7`, `deer +0.4` |
| 直接制造压迫感，让对方退让 | `wild +0.8`, `heavy +0.6`, `lion +0.6`, `dragon +0.4` |

### DB07. 你希望角色的“危险感”来自哪里？

| 选项 | 隐藏分数 |
| --- | --- |
| 看起来很安静，但不知道在想什么 | `mystery +1`, `alone +0.5`, `fox +0.5`, `serpent +0.4` |
| 身体结构本身有压迫感 | `heavy +0.8`, `giant +0.5`, `lion +0.5`, `dragon +0.5` |
| 装备或改造看起来很精密 | `cyber +0.8`, `mechanical_bias +0.8`, `mech +0.7` |
| 有某种古老规则不能被触犯 | `control +0.6`, `mythic_bias +0.8`, `qilin +0.5`, `dragon +0.5` |

### DB08. 你更希望结果给人的第一印象是？

| 选项 | 隐藏分数 |
| --- | --- |
| 清晰、经典、很好记 | `pure_bias +1`, `control +0.4` |
| 独特、带一点异常感 | `hybrid_bias +1`, `chaos +0.4`, `mystery +0.4` |
| 很适合当头像传播 | `fluffy +0.5`, `cyber +0.4`, `fox +0.4`, `cat +0.4` |
| 很适合给画师做完整参考 | `pure_bias +0.4`, `control +0.6`, `must_keep_signal +0.8` |

## 7. 血统细化分支，6 题

血统分支用于判断纯血、轻混血、强混血和异化来源。

### DL01. 角色身上的“不同感”更像来自哪里？

| 选项 | 隐藏分数 |
| --- | --- |
| 天生血统 | `pure_bias +0.7`, `mythic_bias +0.4` |
| 后天改造 | `hybrid_bias +0.8`, `mechanical_bias +0.8`, `cyber +0.5` |
| 诅咒或契约 | `hybrid_bias +0.7`, `mystery +0.6`, `mythic_bias +0.7` |
| 没有什么不同，重点是物种本身 | `pure_bias +1.2`, `clear_species_shape +0.8` |

### DL02. 如果有副特征，你希望它出现在哪里？

| 选项 | 隐藏分数 |
| --- | --- |
| 眼睛和瞳孔 | `mystery +0.5`, `scale +0.4`, `serpent +0.4` |
| 肩颈、脊背或尾端 | `hybrid_bias +0.7`, `scale +0.7`, `dragon +0.5` |
| 手臂、关节或护具 | `mechanical_bias +0.8`, `cyber +0.6`, `mech +0.6` |
| 不要副特征，保持轮廓纯粹 | `pure_bias +1`, `avoid_hybrid_marks +1` |

### DL03. 你能接受角色有几个明显血统来源？

| 选项 | 隐藏分数 |
| --- | --- |
| 一个就够 | `pure_bias +1.2` |
| 两个，但主次要清楚 | `hybrid_bias +0.8`, `pure_bias +0.4` |
| 三个以内，可以有局部异化 | `hybrid_bias +1`, `mechanical_bias +0.4`, `mythic_bias +0.4` |
| 不在意数量，只要好看 | `hybrid_bias +0.8`, `chaos +0.6`, `needs_consistency_lock +1` |

### DL04. 副血统应该承担什么功能？

| 选项 | 隐藏分数 |
| --- | --- |
| 只做视觉记忆点 | `hybrid_bias +0.5`, `visual_mark_signal +0.7` |
| 解释能力来源 | `mythic_bias +0.6`, `scale +0.4`, `dragon +0.4` |
| 解释装备或科技 | `mechanical_bias +0.8`, `cyber +0.6`, `mech +0.6` |
| 不需要副血统功能 | `pure_bias +0.8`, `clear_species_shape +0.6` |

### DL05. 如果系统给出混血比例，你更希望？

| 选项 | 隐藏分数 |
| --- | --- |
| 主血统 80% 以上 | `pure_bias +0.8`, `dominant_primary +1` |
| 主血统 70%，副血统 30% | `hybrid_bias +0.7`, `dominant_primary +0.6` |
| 65/25/10，有清晰局部映射 | `hybrid_bias +1`, `needs_trait_mapping +0.8` |
| 比例不重要，视觉统一更重要 | `control +0.6`, `needs_consistency_lock +0.8` |

### DL06. 哪种情况最不能接受？

| 选项 | 隐藏分数 |
| --- | --- |
| 主物种看不出来 | `avoid_lost_primary +1`, `pure_bias +0.6` |
| 副特征太少，没有记忆点 | `hybrid_bias +0.7`, `visual_mark_signal +0.6` |
| 每张图都变成不同角色 | `needs_consistency_lock +1.2`, `control +0.5` |
| 设定太复杂，画师不好画 | `pure_bias +0.5`, `commission_ready +0.8` |

## 8. 哺乳类物种细化分支，6 题

进入条件：狐、狼、犬、猫、豹、雪豹、鹿、兔、狮等候选较高。

### DM01. 你更想强化哪种耳部轮廓？

| 选项 | 隐藏分数 |
| --- | --- |
| 尖而灵敏，角度明显 | `fox +0.8`, `cat +0.5`, `slim +0.4` |
| 厚实、警觉、偏野性 | `wolf +0.7`, `dog +0.5`, `wild +0.4` |
| 小而隐蔽，整体更优雅 | `snow_leopard +0.7`, `cat +0.5`, `control +0.4` |
| 长而柔软，亲和感更强 | `rabbit +0.8`, `soft +0.5`, `fluffy +0.5` |

### DM02. 尾巴应该如何参与角色识别？

| 选项 | 隐藏分数 |
| --- | --- |
| 很大，是第一记忆点 | `fox +0.8`, `fluffy +0.8`, `must_keep_tail +1` |
| 长而有平衡感 | `snow_leopard +0.7`, `cat +0.4`, `slim +0.4` |
| 厚重但不夸张 | `wolf +0.6`, `dog +0.5`, `loyal +0.3` |
| 几乎不强调尾巴 | `lion +0.4`, `deer +0.3`, `avoid_tail_focus +0.6` |

### DM03. 毛发质感更接近？

| 选项 | 隐藏分数 |
| --- | --- |
| 蓬松、层次多 | `fluffy +0.9`, `fox +0.5`, `rabbit +0.4` |
| 短而利落 | `fur_short +0.8`, `dog +0.4`, `wolf +0.4` |
| 长但服帖 | `fur_long +0.7`, `snow_leopard +0.5`, `control +0.3` |
| 局部有鬃毛或厚毛领 | `lion +0.7`, `wolf +0.4`, `heavy +0.4` |

### DM04. 脸部气质更偏？

| 选项 | 隐藏分数 |
| --- | --- |
| 狡黠、笑意很浅 | `fox +0.8`, `chaos +0.4`, `mystery +0.4` |
| 稳重、保护感强 | `dog +0.7`, `wolf +0.5`, `loyal +0.6` |
| 冷淡、像在评估距离 | `cat +0.6`, `snow_leopard +0.7`, `alone +0.5` |
| 温柔、无攻击感 | `deer +0.7`, `rabbit +0.6`, `soft +0.7` |

### DM05. 身体轮廓更希望？

| 选项 | 隐藏分数 |
| --- | --- |
| 轻盈、适合奔跑和跳跃 | `slim +0.8`, `fox +0.4`, `leopard +0.6` |
| 中型、可靠、容易行动 | `dog +0.5`, `wolf +0.5`, `loyal +0.4` |
| 高挑、优雅、距离感强 | `snow_leopard +0.7`, `deer +0.5`, `control +0.5` |
| 厚重、强势、有压迫感 | `heavy +0.8`, `lion +0.7`, `wolf +0.4` |

### DM06. 爪子或手部更适合？

| 选项 | 隐藏分数 |
| --- | --- |
| 灵巧，适合拿工具 | `fox +0.5`, `cat +0.5`, `slim +0.4` |
| 强力，适合战斗 | `wolf +0.6`, `lion +0.6`, `wild +0.5` |
| 保留动物感，但适合画头像 | `dog +0.4`, `rabbit +0.4`, `commission_ready +0.4` |
| 细长、带装饰或护具 | `snow_leopard +0.4`, `cyber +0.4`, `control +0.4` |

## 9. 神话与鳞片细化分支，5 题

进入条件：龙、蛇、麒麟、鳞片、神话、国风等候选较高。

### DY01. 神话感更像哪一种来源？

| 选项 | 隐藏分数 |
| --- | --- |
| 云、雨、雷和古老契约 | `dragon +0.8`, `chinese +0.7`, `mythic_bias +0.6` |
| 山林、瑞兆和守护 | `qilin +0.8`, `forest +0.5`, `soft +0.5` |
| 地下、暗河和沉默规则 | `serpent +0.8`, `mystery +0.6`, `dark +0.4` |
| 祭器、纹样和仪式服 | `control +0.6`, `chinese +0.7`, `qilin +0.4` |

### DY02. 鳞片应该出现在哪里？

| 选项 | 隐藏分数 |
| --- | --- |
| 肩颈和锁骨附近 | `scale +0.8`, `hybrid_bias +0.5`, `dragon +0.5` |
| 尾端和脊背 | `scale +0.8`, `dragon +0.6`, `must_keep_tail +0.5` |
| 眼周或手背 | `scale +0.6`, `serpent +0.5`, `mystery +0.4` |
| 如果纯血就不要鳞片 | `pure_bias +0.8`, `avoid_scales +0.8` |

### DY03. 角或冠饰应该如何处理？

| 选项 | 隐藏分数 |
| --- | --- |
| 明显但不巨大 | `dragon +0.6`, `dominant_primary +0.4` |
| 更像装饰或头饰 | `qilin +0.5`, `control +0.4`, `commission_ready +0.3` |
| 尽量隐藏，只留下轮廓 | `mystery +0.6`, `serpent +0.4`, `subtle_hybrid +0.5` |
| 不需要角 | `pure_bias +0.6`, `avoid_horns +0.8` |

### DY04. 长身结构更应该体现在？

| 选项 | 隐藏分数 |
| --- | --- |
| 姿态和站姿 | `slim +0.6`, `dragon +0.4`, `serpent +0.4` |
| 尾巴和服装线条 | `scale +0.5`, `dragon +0.5`, `visual_mark_signal +0.4` |
| 只体现在背景图腾里 | `mythic_bias +0.5`, `subtle_hybrid +0.6` |
| 不需要长身感 | `pure_bias +0.5`, `clear_species_shape +0.5` |

### DY05. 神话角色更适合哪种身份？

| 选项 | 隐藏分数 |
| --- | --- |
| 被召回的旧契约执行者 | `control +0.6`, `dragon +0.6`, mission: contract |
| 失去供奉的守护兽 | `loyal +0.6`, `qilin +0.6`, mission: guardian |
| 被封印过的异类 | `mystery +0.6`, `serpent +0.5`, `hybrid_bias +0.5` |
| 云海神殿的记录者 | `academy +0.5`, `chinese +0.6`, `owl +0.3` |

## 10. 特殊分支：羽翼、水生、机械，5 题

进入条件：羽毛、水生、机械、义体、赛博候选较高。

### DS01. 如果有羽翼或羽毛，应该更像？

| 选项 | 隐藏分数 |
| --- | --- |
| 披风边缘的羽状轮廓 | `feather +0.7`, `raven +0.6`, `subtle_hybrid +0.5` |
| 明确的翅膀结构 | `feather +1`, `hybrid_bias +0.6`, `eagle +0.5` |
| 面部或耳后的羽饰 | `feather +0.5`, `owl +0.5`, `commission_ready +0.3` |
| 不需要羽翼 | `avoid_wings +0.8`, `pure_bias +0.4` |

### DS02. 水生感应该从哪里体现？

| 选项 | 隐藏分数 |
| --- | --- |
| 颜色和光泽像深水 | `ocean +0.8`, `mystery +0.4`, `serpent +0.3` |
| 服装像潜行装备 | `ocean +0.5`, `cyber +0.4`, `mech +0.3` |
| 尾巴或鳍状局部 | `ocean +0.8`, `hybrid_bias +0.5`, `otter +0.4` |
| 只放在背景故事里 | `subtle_hybrid +0.5`, `ocean +0.4` |

### DS03. 机械感更适合？

| 选项 | 隐藏分数 |
| --- | --- |
| 一只机械手或义肢 | `mechanical_bias +1`, `mech +0.8`, `cyber +0.6` |
| 发光线条和接口 | `cyber +0.8`, `visual_mark_signal +0.5` |
| 外挂式护具，不改变身体 | `commission_ready +0.5`, `cyber +0.5`, `pure_bias +0.3` |
| 不要机械，只要自然身体 | `pure_bias +0.8`, `avoid_mech +1` |

### DS04. 异化痕迹应该给人什么感觉？

| 选项 | 隐藏分数 |
| --- | --- |
| 被迫留下的伤痕 | `mystery +0.6`, `dark +0.5`, `hybrid_bias +0.4` |
| 主动选择的升级 | `cyber +0.7`, `mechanical_bias +0.7`, `control +0.4` |
| 古老力量的副作用 | `mythic_bias +0.7`, `scale +0.5`, `dragon +0.4` |
| 不需要异化痕迹 | `pure_bias +0.8`, `avoid_hybrid_marks +0.8` |

### DS05. 特殊材质和主物种的关系应该是？

| 选项 | 隐藏分数 |
| --- | --- |
| 只作为局部点缀 | `dominant_primary +0.6`, `subtle_hybrid +0.5` |
| 和主物种能力绑定 | `needs_trait_mapping +0.7`, `hybrid_bias +0.6` |
| 和任务背景绑定 | `world_story_signal +0.6`, `cyber +0.3`, `mythic_bias +0.3` |
| 越明显越好 | `hybrid_bias +0.8`, `visual_mark_signal +0.7` |

## 11. 视觉细化分支，7 题

视觉分支所有深度用户都可进入，用于提高图像一致性。

### DV01. 主色更适合哪种感觉？

| 选项 | 隐藏分数 |
| --- | --- |
| 低饱和深色 | `dark +0.6`, palette: deep |
| 温暖但不刺眼 | `soft +0.4`, palette: warm |
| 冷白、银灰、浅蓝 | `control +0.4`, palette: cold |
| 高对比霓虹色 | `cyber +0.7`, palette: neon |

### DV02. 点缀色应该出现在哪里？

| 选项 | 隐藏分数 |
| --- | --- |
| 眼睛 | `must_keep_eye_color +0.8`, `mystery +0.3` |
| 尾端或耳尖 | `must_keep_tail +0.5`, `fox +0.3` |
| 服装边缘和道具 | `commission_ready +0.4`, `control +0.3` |
| 发光纹路或接口 | `cyber +0.5`, `mechanical_bias +0.4` |

### DV03. 人类特征和动物特征比例更接近？

| 选项 | 隐藏分数 |
| --- | --- |
| 人形为主，动物特征清晰 | `anthro_mid +1`, `commission_ready +0.4` |
| 动物感更强，脸部也明显兽化 | `animal_trait_high +1`, `pure_bias +0.3` |
| 接近兽人，但保留服装和道具 | `anthro_high +0.8`, `must_keep_outfit +0.3` |
| 头像优先，比例服务于好看 | `avatar_ready +0.8`, `commission_ready +0.3` |

### DV04. 服装更适合？

| 选项 | 隐藏分数 |
| --- | --- |
| 功能性轻装 | `slim +0.4`, `cyber +0.3`, outfit: tactical |
| 长外套或披风 | `mystery +0.4`, `dark +0.3`, outfit: coat |
| 仪式服或改良国风 | `chinese +0.5`, `mythic_bias +0.4`, outfit: ritual |
| 宽松柔软的日常层次 | `soft +0.4`, `forest +0.3`, outfit: casual |

### DV05. 表情组最需要哪三种？

| 选项 | 隐藏分数 |
| --- | --- |
| 冷脸、轻笑、警觉 | `mystery +0.5`, `fox +0.4`, expressions: cool |
| 正常、认真、护短 | `loyal +0.5`, `dog +0.4`, expressions: loyal |
| 温柔、困惑、安抚 | `soft +0.5`, `deer +0.4`, expressions: gentle |
| 战斗、压迫、失控 | `wild +0.5`, `wolf +0.4`, expressions: fierce |

### DV06. 设定图必须包含？

| 选项 | 隐藏分数 |
| --- | --- |
| 正面、背面、侧面 | `reference_sheet_full +1`, `commission_ready +0.5` |
| 正面、背面、表情三连 | `reference_sheet_expression +1`, `avatar_ready +0.4` |
| 大图加局部特写 | `visual_mark_signal +0.6`, `needs_trait_mapping +0.5` |
| 只要头像和半身 | `avatar_ready +1`, `reference_sheet_light +0.4` |

### DV07. 哪个视觉点不能省略？

| 选项 | 隐藏分数 |
| --- | --- |
| 耳朵 | `must_keep_ears +1` |
| 尾巴 | `must_keep_tail +1` |
| 眼睛颜色 | `must_keep_eye_color +1` |
| 特殊纹路/义体/角 | `must_keep_special_mark +1`, `needs_consistency_lock +0.4` |

## 12. 世界观与任务分支，5 题

用于生成完整形象图的背景故事、任务设定和画面场景。

### DW01. 故事开局更像？

| 选项 | 隐藏分数 |
| --- | --- |
| 收到一条不该存在的坐标 | `cyber +0.6`, `mystery +0.5`, mission: signal |
| 被叫回一处旧封印 | `mythic_bias +0.6`, `loyal +0.4`, mission: seal |
| 在废墟里捡到自己的名字 | `dark +0.6`, `wasteland +0.5`, mission: identity |
| 护送一盏不能熄灭的灯 | `soft +0.5`, `ocean +0.4`, mission: escort |

### DW02. 角色和世界的关系是？

| 选项 | 隐藏分数 |
| --- | --- |
| 被世界追捕 | `alone +0.5`, `dark +0.5`, role: fugitive |
| 在边缘地带接任务 | `cyber +0.4`, `slim +0.4`, role: scout |
| 守护一个别人忘记的地方 | `loyal +0.6`, `forest +0.5`, role: guardian |
| 记录不该流传的知识 | `academy +0.6`, `control +0.5`, role: archivist |

### DW03. 完整形象图更适合哪个镜头？

| 选项 | 隐藏分数 |
| --- | --- |
| 站在雨夜高处，背后是灯牌 | `cyber +0.6`, scene: rainy_rooftop |
| 站在雾林石碑前 | `forest +0.6`, scene: mist_forest |
| 站在云海神殿阶梯上 | `chinese +0.6`, `mythic_bias +0.4`, scene: temple |
| 站在废土列车旁 | `wasteland +0.6`, `dark +0.4`, scene: wasteland_train |

### DW04. 角色的标志性道具更像？

| 选项 | 隐藏分数 |
| --- | --- |
| 折叠短刃或追踪器 | `slim +0.4`, `cyber +0.4`, item: tracker_blade |
| 护符、铃或旧契约 | `chinese +0.5`, `mythic_bias +0.4`, item: talisman |
| 灯、药箱或小包 | `soft +0.5`, `loyal +0.3`, item: lantern_kit |
| 断裂武器或重型护具 | `wild +0.5`, `heavy +0.4`, item: weapon |

### DW05. 角色的口头禅应该更像？

| 选项 | 隐藏分数 |
| --- | --- |
| “别靠太近。” | `alone +0.5`, `mystery +0.4`, catchphrase: distance |
| “我说过会回来。” | `loyal +0.6`, catchphrase: promise |
| “规则不是这么写的。” | `control +0.6`, catchphrase: rule |
| “现在跑还来得及。” | `wild +0.5`, `chaos +0.4`, catchphrase: warning |

## 13. 约稿与禁止项分支，6 题

用于导出设定卡、画师说明和一致性锁定。

### DC01. 给画师最需要强调？

| 选项 | 隐藏分数 |
| --- | --- |
| 物种不能变 | `needs_species_lock +1`, `commission_ready +0.5` |
| 配色不能变 | `needs_palette_lock +1` |
| 特征不能省略 | `needs_feature_lock +1`, `must_keep_special_mark +0.5` |
| 风格可以发挥 | `allow_artist_freedom +1` |

### DC02. 哪类改动可以接受？

| 选项 | 隐藏分数 |
| --- | --- |
| 服装细节可以改 | `flex_outfit +1` |
| 发型可以改 | `flex_hair +1` |
| 姿势可以改 | `flex_pose +1` |
| 除了表情都尽量别改 | `strict_reference +1`, `needs_consistency_lock +0.6` |

### DC03. 哪类错误最严重？

| 选项 | 隐藏分数 |
| --- | --- |
| 把犬科画成猫科 | `avoid_wrong_family +1` |
| 尾巴/角/翅膀少画 | `avoid_missing_feature +1` |
| 主色变成另一个色系 | `avoid_palette_shift +1` |
| 画得太人类或太动物 | `avoid_trait_ratio_shift +1` |

### DC04. 设定说明要偏向？

| 选项 | 隐藏分数 |
| --- | --- |
| 简洁，方便发朋友圈 | `share_ready +1` |
| 清楚，方便画师理解 | `commission_ready +1` |
| 详细，方便以后扩展世界观 | `story_heavy +0.8`, `needs_future_expand +0.5` |
| 更像角色档案 | `academy +0.5`, `control +0.4`, doc_style: dossier |

### DC05. 导出设定卡更需要？

| 选项 | 隐藏分数 |
| --- | --- |
| 一张完整角色图 | `complete_scene_priority +1` |
| 多维度参考图 | `reference_sheet_full +1` |
| 配色和禁止事项 | `commission_ready +0.8`, `needs_palette_lock +0.5` |
| prompt 和可复制说明 | `prompt_export +1` |

### DC06. 对 AI 生成最重要的锁定项是？

| 选项 | 隐藏分数 |
| --- | --- |
| 物种锁 | `needs_species_lock +1` |
| 配色锁 | `needs_palette_lock +1` |
| 体型锁 | `needs_body_lock +1` |
| 世界观风格锁 | `needs_style_lock +1` |

## 14. 单次深度问卷推荐组合

### 14.1 轻深度，18-20 题

适合想认真做头像，但不想填太久的用户。

```text
基础判断 8
血统分支 3
最高物种分支 3
视觉细化 3
世界观任务 2
约稿约束 1
```

### 14.2 标准深度，24-28 题

适合 P1 默认深度定制。

```text
基础判断 8
血统分支 4
最高物种分支 5
视觉细化 5
世界观任务 3
约稿约束 2
```

### 14.3 专业设定，32-36 题

适合画师委托、完整 OC 档案和资产包。

```text
基础判断 8
血统分支 5
最高物种分支 6
第二候选分支 3
视觉细化 6
世界观任务 4
约稿约束 4
```

## 15. 结果解释原则

结果页不要暴露逐题映射，例如不要写“你选了旧车站抽屉，所以是狐狸”。建议写成：

```text
你的答案整体表现出：观察型行动、边界感强、对异常线索敏感、偏好清晰主轮廓但接受局部异化。

因此系统将主血统定为赤狐，保留耳部和尾部作为主要识别点；副血统使用东方龙，集中在肩颈鳞片和尾端纹理；机械痕迹仅作为装备层，不改变主物种轮廓。
```

这样既能让用户觉得结果有依据，又不会暴露题库算法。

## 16. 后续代码落地建议

建议将深度题库拆成独立数据文件：

```text
src/data/deepQuestions.ts
src/data/deepBranches.ts
src/data/scoringRules.ts
```

推荐 API 输入结构：

```ts
type DeepAnswer = {
  questionId: string;
  optionId: string;
  branch: string;
};

type DeepGenerateRequest = {
  mode: "deep";
  lineageMode: "ai" | "pure" | "hybrid";
  answers: DeepAnswer[];
  explicitConfig?: {
    mustKeep?: string[];
    avoid?: string[];
    preferredSpecies?: string;
    preferredPalette?: string;
  };
};
```

生成前要保存：

- 原始答案
- 标签总分
- 进入过的分支
- 物种候选排序
- 血统判断原因
- 一致性锁定项

这些数据后续可用于调权重、复盘结果和做 AB 测试。
