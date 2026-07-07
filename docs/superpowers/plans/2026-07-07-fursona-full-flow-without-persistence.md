# AI Fursona Full Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the fursona generator fully usable end-to-end, excluding result persistence/history.

**Architecture:** Move questionnaire data into local data modules, run all quick/deep answers through one scoring pipeline, use branch selection for deep customization, add a pre-generation review step with conflict detection, and support single-image retry from the existing character spec. The OpenAI generation route remains the final generation boundary, but it receives richer local inference output.

**Tech Stack:** Next.js App Router, React, TypeScript, OpenAI SDK, Vitest, ESLint.

---

## File Structure

- Create: `src/data/questionTypes.ts`
  Shared question, answer, branch, score, and effect types.
- Create: `src/data/quickQuestions.ts`
  Fixed 12-question quick test. This is the only source for quick mode.
- Create: `src/data/deepQuestionBank.ts`
  Local expandable deep question bank with branch metadata.
- Create: `src/data/species.ts`
  Species display names, type groups, and scoring weights.
- Create: `src/data/scoringRules.ts`
  Combination trigger rules, lineage thresholds, and conflict rule constants.
- Create: `src/lib/scoring.ts`
  `scoreAnswers()`, `rankSpecies()`, `recommendLineage()`, `buildScoreSnapshot()`.
- Create: `src/lib/questionFlow.ts`
  Deep question selection from local bank based on current scores and depth.
- Create: `src/lib/conflicts.ts`
  Conflict detection and default correction hints.
- Create: `src/app/api/regenerate-image/route.ts`
  Single image regeneration endpoint using existing prompts.
- Modify: `src/lib/fursona.ts`
  Replace inline `optionScores` with `ScoreSnapshot`-driven inference.
- Modify: `src/app/api/generate/route.ts`
  Accept answers and optional `scoreSnapshot`; pass richer context to OpenAI.
- Modify: `src/app/page.tsx`
  Read local quick/deep questions, add deep branch flow, add pre-generation review, add image retry controls.
- Modify: `src/lib/fursona.test.ts`
  Cover new scoring, lineage, conflict, and blueprint behavior.
- Create: `src/lib/questionFlow.test.ts`
  Test deep branch selection and question limits.
- Create: `src/lib/conflicts.test.ts`
  Test conflict detection.
- Modify: `README.md`
  Remove prototype wording and document fixed Q12, local deep bank, and image retry.
- Modify: `docs/full-flow-implementation-iterations.md`
  Mark result persistence as excluded from this execution plan.

---

### Task 1: Add Local Question Types And Quick Q12

**Files:**
- Create: `src/data/questionTypes.ts`
- Create: `src/data/quickQuestions.ts`
- Test: `src/lib/fursona.test.ts`

- [ ] **Step 1: Add a failing test for fixed Q12**

Add this to `src/lib/fursona.test.ts`:

```ts
import { quickQuestions } from "@/data/quickQuestions";

describe("quickQuestions", () => {
  it("contains exactly 12 fixed quick questions", () => {
    expect(quickQuestions).toHaveLength(12);
    expect(new Set(quickQuestions.map((question) => question.id)).size).toBe(12);
  });

  it("keeps score data hidden behind selectable options", () => {
    for (const question of quickQuestions) {
      expect(question.options.length).toBeGreaterThanOrEqual(4);
      for (const option of question.options) {
        expect(option.label.length).toBeGreaterThan(0);
        expect(Object.keys(option.scores).length).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run:

```powershell
npm.cmd test -- src/lib/fursona.test.ts
```

Expected: FAIL because `@/data/quickQuestions` does not exist.

- [ ] **Step 3: Create shared question types**

Create `src/data/questionTypes.ts`:

```ts
export type QuestionBranch =
  | "quick"
  | "base"
  | "lineage"
  | "mammal"
  | "mythic"
  | "special"
  | "visual"
  | "world"
  | "constraints";

export type QuestionOption = {
  id: string;
  label: string;
  scores: Record<string, number>;
  effects?: {
    mission?: string;
    palette?: string;
    role?: string;
    mustKeep?: string[];
    avoid?: string[];
    promptHints?: string[];
    branchBoost?: QuestionBranch[];
  };
};

export type Question = {
  id: string;
  branch: QuestionBranch;
  title: string;
  options: QuestionOption[];
};

export type Answer = {
  questionId: string;
  optionId: string;
  branch?: QuestionBranch;
};
```

- [ ] **Step 4: Create fixed quick Q12**

Create `src/data/quickQuestions.ts` using the 12 hidden questions from `docs/fursona-question-bank-and-scoring.md`. Use this exact module shape:

```ts
import type { Question } from "./questionTypes";

export const quickQuestions: Question[] = [
  {
    id: "q01_station_focus",
    branch: "quick",
    title: "雨夜里，你误入一座还亮着灯的旧车站。第一眼你会注意哪里？",
    options: [
      { id: "drawer", label: "售票窗口后面没关好的抽屉", scores: { alone: 1, mystery: 1, fox: 0.8, raven: 0.5 } },
      { id: "sleeping_person", label: "候车椅上睡着的人有没有盖好外套", scores: { soft: 1, loyal: 0.8, dog: 0.7, deer: 0.5 } },
      { id: "camera", label: "天花板上闪烁的摄像头", scores: { control: 0.8, cyber: 1, mech: 0.8, owl: 0.4 } },
      { id: "open_door", label: "月台尽头那扇本不该打开的门", scores: { mystery: 1.2, chaos: 0.6, dragon: 0.5, serpent: 0.5 } },
    ],
  },
  {
    id: "q02_token",
    branch: "quick",
    title: "你只能带走一样东西，作为接下来旅程的凭证。",
    options: [
      { id: "badge", label: "一枚有裂纹的旧徽章", scores: { control: 1, academy: 0.8, owl: 0.8, pure_bias: 0.4 } },
      { id: "bell", label: "一串声音很轻的铃", scores: { mystery: 0.8, chinese: 1, mythic_bias: 0.8, qilin: 0.6 } },
      { id: "blade", label: "一把可以折叠的短刃", scores: { slim: 1, wild: 0.7, fox: 0.7, leopard: 0.7 } },
      { id: "core", label: "一个还在发热的金属核心", scores: { cyber: 1.2, mechanical_bias: 1.2, mech: 1, hybrid_bias: 0.8 } },
    ],
  },
  {
    id: "q03_called_out",
    branch: "quick",
    title: "路上有人喊住你，说你拿错了东西。你更可能？",
    options: [
      { id: "pause", label: "先停下，但不立刻回头", scores: { alone: 1, mystery: 0.8, wolf: 0.6, fox: 0.6 } },
      { id: "proof", label: "把东西收好，问对方怎么证明", scores: { control: 1, owl: 0.7, dragon: 0.5, pure_bias: 0.3 } },
      { id: "under_light", label: "直接把对方带到灯下说清楚", scores: { social: 0.8, loyal: 1, dog: 0.8, lion: 0.4 } },
      { id: "smile_leave", label: "先笑一下，换条路走", scores: { chaos: 1, slim: 0.7, fox: 0.8, raven: 0.5 } },
    ],
  },
  {
    id: "q04_painting",
    branch: "quick",
    title: "你走进一间没有主人的房间，墙上有四幅画。",
    options: [
      { id: "black_sea", label: "黑色海面上漂着一盏灯", scores: { ocean: 1, mystery: 0.8, otter: 0.5, serpent: 0.5 } },
      { id: "mist_root", label: "雾中的树根缠住石碑", scores: { forest: 1.2, soft: 0.5, deer: 0.8, fox: 0.4 } },
      { id: "light_rail", label: "城市上空有一条断开的光轨", scores: { cyber: 1.2, wasteland: 0.5, mech: 0.7, raven: 0.4 } },
      { id: "cloud_temple", label: "云层里露出古建筑的一角", scores: { chinese: 1.2, mythic_bias: 1, dragon: 0.9, qilin: 0.7 } },
    ],
  },
  {
    id: "q05_route",
    branch: "quick",
    title: "如果必须穿过一片危险区域，你会选择哪种路线？",
    options: [
      { id: "high_ground", label: "绕远，从高处观察后再下去", scores: { alone: 0.8, slim: 1, fox: 0.7, owl: 0.5 } },
      { id: "shortest", label: "沿着最短路线快速通过", scores: { wild: 0.8, slim: 0.8, leopard: 0.8, wolf: 0.4 } },
      { id: "old_map", label: "找到旧地图，把风险标出来", scores: { control: 1.2, academy: 0.8, owl: 0.8, dragon: 0.4 } },
      { id: "blend_in", label: "等一队人经过，混在里面走", scores: { social: 1, soft: 0.4, dog: 0.7, cat: 0.4 } },
    ],
  },
  {
    id: "q06_letter",
    branch: "quick",
    title: "一个陌生人交给你一封信，说“只有你能看懂”。你会先看哪部分？",
    options: [
      { id: "seal", label: "火漆印上的纹路", scores: { mythic_bias: 0.8, scale: 0.6, dragon: 0.6, qilin: 0.5 } },
      { id: "stain", label: "信纸边缘的污渍", scores: { mystery: 0.8, alone: 0.5, wolf: 0.5, raven: 0.5 } },
      { id: "signature", label: "落款的人名", scores: { loyal: 0.8, social: 0.5, dog: 0.6, deer: 0.4 } },
      { id: "crossed_line", label: "被划掉的那一行", scores: { chaos: 0.8, mystery: 0.8, fox: 0.6, serpent: 0.4 } },
    ],
  },
  {
    id: "q07_signal",
    branch: "quick",
    title: "你更愿意让角色身上出现哪种“非语言信号”？",
    options: [
      { id: "tail_shadow", label: "走动时衣摆和尾影很明显", scores: { fluffy: 1, slim: 0.6, fox: 0.8, dog: 0.4 } },
      { id: "metal_sound", label: "靠近时能听到细微金属声", scores: { cyber: 1, mechanical_bias: 1, mech: 0.9, hybrid_bias: 0.6 } },
      { id: "under_marks", label: "皮肤或毛发下有微弱纹路", scores: { mystery: 0.5, scale: 1, dragon: 0.8, serpent: 0.5 } },
      { id: "shadow_cloak", label: "站定时像披着一层影子", scores: { dark: 1, mystery: 0.7, wolf: 0.6, raven: 0.7 } },
    ],
  },
  {
    id: "q08_recognition",
    branch: "quick",
    title: "你希望角色在远处被认出来，主要靠什么？",
    options: [
      { id: "silhouette", label: "清晰的身体剪影", scores: { pure_bias: 1, control: 0.4, wolf: 0.4, snow_leopard: 0.4 } },
      { id: "odd_feature", label: "不寻常的局部特征", scores: { hybrid_bias: 1, scale: 0.5, feather: 0.5, dragon: 0.4 } },
      { id: "palette", label: "一眼记住的配色", scores: { cyber: 0.5, fluffy: 0.3, fox: 0.4, cat: 0.4 } },
      { id: "presence", label: "姿态和气场", scores: { wild: 0.8, control: 0.6, lion: 0.7, dragon: 0.5 } },
    ],
  },
  {
    id: "q09_help",
    branch: "quick",
    title: "有人请求你帮忙，但会拖慢你的任务。你会？",
    options: [
      { id: "assess", label: "判断对方是否真的危险，再决定", scores: { control: 0.8, alone: 0.6, owl: 0.5, wolf: 0.4 } },
      { id: "complain_help", label: "嘴上嫌麻烦，还是伸手", scores: { loyal: 1, mystery: 0.4, fox: 0.7, dog: 0.5 } },
      { id: "anonymous", label: "直接帮，但不留下名字", scores: { soft: 1, deer: 0.8, rabbit: 0.5, otter: 0.5 } },
      { id: "follow_me", label: "让对方跟上，跟不上就算了", scores: { wild: 0.8, chaos: 0.5, wolf: 0.6, lion: 0.5 } },
    ],
  },
  {
    id: "q10_knock",
    branch: "quick",
    title: "深夜里，你听见门外有三次敲击声。",
    options: [
      { id: "window", label: "不出声，从窗边确认外面", scores: { alone: 0.8, dark: 0.7, wolf: 0.5, raven: 0.5 } },
      { id: "behind_door", label: "把灯打开，站在门后等", scores: { control: 0.7, wild: 0.5, lion: 0.5, dragon: 0.5 } },
      { id: "password", label: "先问一句暗号", scores: { loyal: 0.6, academy: 0.6, dog: 0.5, owl: 0.5 } },
      { id: "side_exit", label: "故意从另一侧绕出去", scores: { chaos: 0.8, slim: 0.7, fox: 0.7, cat: 0.4 } },
    ],
  },
  {
    id: "q11_mission",
    branch: "quick",
    title: "如果角色有一个长期任务，你更喜欢它是？",
    options: [
      { id: "memory", label: "找回一段被删除的记忆", scores: { cyber: 1, mystery: 0.6, mech: 0.7 }, effects: { mission: "找回被删除的记忆" } },
      { id: "gate", label: "守着一个不能打开的门", scores: { loyal: 0.8, control: 0.8, dragon: 0.5 }, effects: { mission: "守护不能打开的门" } },
      { id: "lamp", label: "把一盏灯送到海的另一边", scores: { soft: 0.8, ocean: 1, otter: 0.7 }, effects: { mission: "护送灯火跨海" } },
      { id: "weapon", label: "追捕一件会自己换主人的武器", scores: { wild: 0.7, dark: 0.7, wolf: 0.5 }, effects: { mission: "追捕危险遗物" } },
    ],
  },
  {
    id: "q12_result_focus",
    branch: "quick",
    title: "最后，生成结果时你更在意哪件事？",
    options: [
      { id: "clear", label: "一眼能看懂它是什么", scores: { pure_bias: 1.5, control: 0.4 } },
      { id: "stable_complex", label: "可以复杂，但主轮廓必须稳定", scores: { hybrid_bias: 1, pure_bias: 0.5 } },
      { id: "abnormal", label: "越有异常感越好", scores: { hybrid_bias: 1.5, mythic_bias: 0.6, chaos: 0.4 } },
      { id: "modified", label: "希望有非自然的改造痕迹", scores: { hybrid_bias: 1, mechanical_bias: 1.5, cyber: 0.8 } },
    ],
  },
];
```

- [ ] **Step 5: Run the test**

Run:

```powershell
npm.cmd test -- src/lib/fursona.test.ts
```

Expected: PASS for the new Q12 tests.

---

### Task 2: Add Deep Local Question Bank

**Files:**
- Create: `src/data/deepQuestionBank.ts`
- Test: `src/lib/questionFlow.test.ts`

- [ ] **Step 1: Add failing tests for deep bank coverage**

Create `src/lib/questionFlow.test.ts`:

```ts
import { deepQuestionBank } from "@/data/deepQuestionBank";

describe("deepQuestionBank", () => {
  it("contains all required branch groups", () => {
    const branches = new Set(deepQuestionBank.map((question) => question.branch));

    expect(branches.has("base")).toBe(true);
    expect(branches.has("lineage")).toBe(true);
    expect(branches.has("mammal")).toBe(true);
    expect(branches.has("mythic")).toBe(true);
    expect(branches.has("special")).toBe(true);
    expect(branches.has("visual")).toBe(true);
    expect(branches.has("world")).toBe(true);
    expect(branches.has("constraints")).toBe(true);
  });

  it("keeps base branch fixed at 8 questions", () => {
    expect(deepQuestionBank.filter((question) => question.branch === "base")).toHaveLength(8);
  });

  it("can grow beyond the initial sample size without changing flow limits", () => {
    expect(deepQuestionBank.length).toBeGreaterThanOrEqual(48);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm.cmd test -- src/lib/questionFlow.test.ts
```

Expected: FAIL because `deepQuestionBank` does not exist.

- [ ] **Step 3: Create the deep question bank**

Create `src/data/deepQuestionBank.ts`. Populate it from `docs/fursona-deep-branch-question-bank.md` using the same `Question` type:

```ts
import type { Question } from "./questionTypes";

export const deepQuestionBank: Question[] = [
  {
    id: "db01_intro_shot",
    branch: "base",
    title: "你希望角色第一次登场时，镜头先看到什么？",
    options: [
      { id: "reflection", label: "靴底踩过积水，倒影先出现", scores: { mystery: 1, dark: 0.8, slim: 0.5, fox: 0.4 } },
      { id: "protect", label: "一只手把别人护到身后", scores: { loyal: 1, soft: 0.4, dog: 0.6, wolf: 0.4 } },
      { id: "high_view", label: "高处俯视全局的侧影", scores: { control: 1, alone: 0.6, owl: 0.5, dragon: 0.4 } },
      { id: "break_in", label: "破门而入的强轮廓", scores: { wild: 1, heavy: 0.8, lion: 0.6, wolf: 0.5 } },
    ],
  },
  {
    id: "db02_old_mark",
    branch: "base",
    title: "角色身上最适合出现哪种旧痕迹？",
    options: [
      { id: "scar", label: "早已愈合但看得出的抓痕", scores: { wild: 0.8, wolf: 0.5, leopard: 0.5 } },
      { id: "patched_cloth", label: "被修补过的衣角", scores: { soft: 0.6, loyal: 0.5, deer: 0.4 } },
      { id: "polished_metal", label: "反复擦亮的金属边缘", scores: { cyber: 0.8, mechanical_bias: 0.8, mech: 0.6 } },
      { id: "rune_mark", label: "像符文一样的浅色印记", scores: { mystery: 0.6, mythic_bias: 0.8, dragon: 0.5, qilin: 0.5 } },
    ],
  }
];
```

Then add the remaining deep questions from the document into the same array. Keep branch IDs aligned with the document:

```ts
export const deepBranchMinimums = {
  base: 8,
  lineage: 6,
  mammal: 6,
  mythic: 5,
  special: 5,
  visual: 7,
  world: 5,
  constraints: 6,
} as const;
```

- [ ] **Step 4: Run the test**

Run:

```powershell
npm.cmd test -- src/lib/questionFlow.test.ts
```

Expected: PASS.

---

### Task 3: Implement Unified Scoring

**Files:**
- Create: `src/data/species.ts`
- Create: `src/data/scoringRules.ts`
- Create: `src/lib/scoring.ts`
- Modify: `src/lib/fursona.test.ts`

- [ ] **Step 1: Add failing scoring tests**

Add to `src/lib/fursona.test.ts`:

```ts
import { scoreAnswers } from "@/lib/scoring";
import type { Answer } from "@/data/questionTypes";

describe("scoreAnswers", () => {
  it("ranks a cyber fox-dragon leaning answer set without one-answer lock-in", () => {
    const answers: Answer[] = [
      { questionId: "q01_station_focus", optionId: "drawer" },
      { questionId: "q02_token", optionId: "core" },
      { questionId: "q06_letter", optionId: "crossed_line" },
      { questionId: "q08_recognition", optionId: "odd_feature" },
      { questionId: "q11_mission", optionId: "memory" },
      { questionId: "q12_result_focus", optionId: "abnormal" },
    ];

    const snapshot = scoreAnswers(answers);

    expect(snapshot.speciesCandidates[0].species).toBe("狐");
    expect(snapshot.lineageRecommendation).toBe("hybrid");
    expect(snapshot.tags.hybrid_bias).toBeGreaterThan(2);
  });

  it("recommends pure lineage when clarity and pure bias dominate", () => {
    const answers: Answer[] = [
      { questionId: "q02_token", optionId: "badge" },
      { questionId: "q05_route", optionId: "old_map" },
      { questionId: "q08_recognition", optionId: "silhouette" },
      { questionId: "q12_result_focus", optionId: "clear" },
    ];

    const snapshot = scoreAnswers(answers);

    expect(snapshot.lineageRecommendation).toBe("pure");
    expect(snapshot.lineageScores.pure).toBeGreaterThan(snapshot.lineageScores.hybrid);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm.cmd test -- src/lib/fursona.test.ts
```

Expected: FAIL because `@/lib/scoring` does not exist.

- [ ] **Step 3: Add species metadata**

Create `src/data/species.ts`:

```ts
export const speciesByKey: Record<string, string> = {
  fox: "狐",
  wolf: "狼",
  dog: "犬",
  lion: "狮",
  leopard: "豹",
  snow_leopard: "雪豹",
  cat: "猫",
  raven: "乌鸦",
  owl: "猫头鹰",
  deer: "鹿",
  rabbit: "兔",
  otter: "水獭",
  dragon: "东方龙",
  serpent: "蛇",
  qilin: "麒麟",
  whale: "虎鲸",
  mech: "机械义体",
};

export const speciesKeys = Object.keys(speciesByKey);

export const speciesTraitWeights: Record<string, Record<string, number>> = {
  fox: { mystery: 0.9, alone: 0.7, slim: 0.7, fluffy: 0.6, chaos: 0.5 },
  wolf: { alone: 0.7, loyal: 0.8, wild: 0.8, dark: 0.6 },
  dog: { social: 0.8, loyal: 0.9, soft: 0.5 },
  lion: { social: 0.5, wild: 0.8, heavy: 0.8, control: 0.4 },
  leopard: { slim: 0.8, wild: 0.6, alone: 0.5, dark: 0.4 },
  snow_leopard: { control: 0.7, slim: 0.7, dark: 0.5, pure_bias: 0.5 },
  cat: { alone: 0.6, mystery: 0.6, small: 0.5, chaos: 0.4 },
  raven: { dark: 0.8, mystery: 0.7, feather: 0.8, chaos: 0.5 },
  owl: { control: 0.8, academy: 0.7, mystery: 0.5, feather: 0.6 },
  deer: { soft: 0.8, forest: 0.7, control: 0.4 },
  rabbit: { soft: 0.8, small: 0.7, fluffy: 0.7 },
  otter: { soft: 0.6, social: 0.6, ocean: 0.8, small: 0.4 },
  dragon: { mythic_bias: 0.8, control: 0.6, scale: 0.9, giant: 0.5, chinese: 0.6 },
  serpent: { mystery: 0.8, scale: 0.8, control: 0.5, dark: 0.5 },
  qilin: { mythic_bias: 0.8, soft: 0.5, chinese: 0.8, control: 0.5 },
  whale: { ocean: 0.8, giant: 0.6, soft: 0.3 },
  mech: { mechanical_bias: 1, cyber: 0.9, control: 0.4, hybrid_bias: 0.4 },
};
```

- [ ] **Step 4: Add scoring rules**

Create `src/data/scoringRules.ts`:

```ts
export const combinationBoosts = [
  { when: { mystery: 3, slim: 2, fox: 2 }, add: { fox: 1.5 } },
  { when: { loyal: 3, wild: 2, dark: 2 }, add: { wolf: 1.5 } },
  { when: { control: 3, mythic_bias: 2, scale: 2 }, add: { dragon: 1.2, qilin: 0.8 } },
  { when: { soft: 3, forest: 2 }, add: { deer: 1, rabbit: 0.8, otter: 0.7 } },
  { when: { cyber: 3, mechanical_bias: 2 }, add: { mech: 1.5, hybrid_bias: 0.8 } },
  { when: { feather: 2, dark: 2, mystery: 2 }, add: { raven: 1, owl: 0.8 } },
] as const;

export const lineageThresholds = {
  hybridAdvantage: 2.5,
  pureAdvantage: 2,
  clearPrimaryLeadRatio: 0.25,
} as const;
```

- [ ] **Step 5: Implement scoring**

Create `src/lib/scoring.ts`:

```ts
import { deepQuestionBank } from "@/data/deepQuestionBank";
import { quickQuestions } from "@/data/quickQuestions";
import { combinationBoosts, lineageThresholds } from "@/data/scoringRules";
import { speciesByKey, speciesKeys, speciesTraitWeights } from "@/data/species";
import type { Answer, Question, QuestionOption } from "@/data/questionTypes";

export type SpeciesCandidate = {
  key: string;
  species: string;
  score: number;
};

export type ScoreSnapshot = {
  tags: Record<string, number>;
  speciesCandidates: SpeciesCandidate[];
  lineageScores: {
    pure: number;
    hybrid: number;
  };
  lineageRecommendation: "pure" | "hybrid";
  selectedEffects: {
    missions: string[];
    palettes: string[];
    roles: string[];
    mustKeep: string[];
    avoid: string[];
    promptHints: string[];
  };
};

const allQuestions: Question[] = [...quickQuestions, ...deepQuestionBank];

export function scoreAnswers(answers: Answer[]): ScoreSnapshot {
  const tags: Record<string, number> = {};
  const selectedEffects: ScoreSnapshot["selectedEffects"] = {
    missions: [],
    palettes: [],
    roles: [],
    mustKeep: [],
    avoid: [],
    promptHints: [],
  };

  for (const answer of answers) {
    const option = findOption(answer);
    if (!option) continue;

    for (const [key, value] of Object.entries(option.scores)) {
      tags[key] = roundScore((tags[key] || 0) + value);
    }

    if (option.effects?.mission) selectedEffects.missions.push(option.effects.mission);
    if (option.effects?.palette) selectedEffects.palettes.push(option.effects.palette);
    if (option.effects?.role) selectedEffects.roles.push(option.effects.role);
    selectedEffects.mustKeep.push(...(option.effects?.mustKeep || []));
    selectedEffects.avoid.push(...(option.effects?.avoid || []));
    selectedEffects.promptHints.push(...(option.effects?.promptHints || []));
  }

  applyCombinationBoosts(tags);

  const speciesCandidates = rankSpecies(tags);
  const lineageScores = buildLineageScores(tags, speciesCandidates);
  const lineageRecommendation = recommendLineage(lineageScores);

  return {
    tags,
    speciesCandidates,
    lineageScores,
    lineageRecommendation,
    selectedEffects: uniqueEffects(selectedEffects),
  };
}

function findOption(answer: Answer): QuestionOption | undefined {
  const question = allQuestions.find((item) => item.id === answer.questionId);
  return question?.options.find((option) => option.id === answer.optionId);
}

function applyCombinationBoosts(tags: Record<string, number>) {
  for (const rule of combinationBoosts) {
    const matched = Object.entries(rule.when).every(
      ([key, min]) => (tags[key] || 0) >= min,
    );

    if (!matched) continue;

    for (const [key, value] of Object.entries(rule.add)) {
      tags[key] = roundScore((tags[key] || 0) + value);
    }
  }
}

export function rankSpecies(tags: Record<string, number>): SpeciesCandidate[] {
  return speciesKeys
    .map((key) => {
      const direct = tags[key] || 0;
      const trait = Object.entries(speciesTraitWeights[key] || {}).reduce(
        (total, [tag, weight]) => total + (tags[tag] || 0) * weight,
        0,
      );

      return {
        key,
        species: speciesByKey[key],
        score: roundScore(direct + trait),
      };
    })
    .sort((a, b) => b.score - a.score);
}

function buildLineageScores(
  tags: Record<string, number>,
  speciesCandidates: SpeciesCandidate[],
) {
  const [first, second] = speciesCandidates;
  const primaryLead =
    first && second && first.score > 0
      ? Math.max(0, (first.score - second.score) / first.score)
      : 0;

  return {
    pure: roundScore(
      (tags.pure_bias || 0) +
        (tags.clear_species_shape || 0) +
        (primaryLead >= lineageThresholds.clearPrimaryLeadRatio ? 1.2 : 0),
    ),
    hybrid: roundScore(
      (tags.hybrid_bias || 0) +
        (tags.mythic_bias || 0) * 0.8 +
        (tags.mechanical_bias || 0) +
        (tags.scale || 0) * 0.5 +
        (tags.feather || 0) * 0.5,
    ),
  };
}

function recommendLineage(scores: { pure: number; hybrid: number }) {
  if (scores.hybrid - scores.pure >= lineageThresholds.hybridAdvantage) return "hybrid";
  if (scores.pure - scores.hybrid >= lineageThresholds.pureAdvantage) return "pure";
  return scores.hybrid >= scores.pure ? "hybrid" : "pure";
}

function uniqueEffects(effects: ScoreSnapshot["selectedEffects"]) {
  return {
    missions: Array.from(new Set(effects.missions)),
    palettes: Array.from(new Set(effects.palettes)),
    roles: Array.from(new Set(effects.roles)),
    mustKeep: Array.from(new Set(effects.mustKeep)),
    avoid: Array.from(new Set(effects.avoid)),
    promptHints: Array.from(new Set(effects.promptHints)),
  };
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}
```

- [ ] **Step 6: Run scoring tests**

Run:

```powershell
npm.cmd test -- src/lib/fursona.test.ts src/lib/questionFlow.test.ts
```

Expected: PASS.

---

### Task 4: Wire Scoring Into Fursona Inference

**Files:**
- Modify: `src/lib/fursona.ts`
- Modify: `src/app/api/generate/route.ts`
- Modify: `src/lib/fursona.test.ts`

- [ ] **Step 1: Add tests for blueprint using score snapshots**

Add to `src/lib/fursona.test.ts`:

```ts
import { inferCharacterBlueprint } from "@/lib/fursona";

describe("inferCharacterBlueprint with local scores", () => {
  it("keeps pure lineage at 100 percent", () => {
    const blueprint = inferCharacterBlueprint({
      mode: "quick",
      lineageMode: "pure",
      answers: [
        { questionId: "q02_token", optionId: "badge" },
        { questionId: "q08_recognition", optionId: "silhouette" },
        { questionId: "q12_result_focus", optionId: "clear" },
      ],
    });

    expect(blueprint.lineageMode).toBe("pure");
    expect(Object.values(blueprint.speciesRatio)).toEqual([100]);
    expect(blueprint.secondarySpecies).toEqual([]);
  });

  it("maps hybrid secondary species to local traits", () => {
    const blueprint = inferCharacterBlueprint({
      mode: "quick",
      lineageMode: "hybrid",
      answers: [
        { questionId: "q02_token", optionId: "core" },
        { questionId: "q07_signal", optionId: "under_marks" },
        { questionId: "q12_result_focus", optionId: "modified" },
      ],
    });

    expect(blueprint.lineageMode).toBe("hybrid");
    expect(Math.max(...Object.values(blueprint.speciesRatio))).toBeGreaterThanOrEqual(55);
    expect(blueprint.traitMapping.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run tests to see current failures**

Run:

```powershell
npm.cmd test -- src/lib/fursona.test.ts
```

Expected: FAIL while `fursona.ts` still uses legacy `optionScores`.

- [ ] **Step 3: Modify request types**

In `src/lib/fursona.ts`, import and use the shared answer type:

```ts
import { scoreAnswers, type ScoreSnapshot } from "@/lib/scoring";
import type { Answer } from "@/data/questionTypes";

export type QuickAnswer = Answer;

export type GenerateRequest = {
  mode: InputMode;
  lineageMode: LineageMode;
  answers?: Answer[];
  deepConfig?: DeepConfig;
  scoreSnapshot?: ScoreSnapshot;
};
```

- [ ] **Step 4: Replace legacy scoring inside inference**

In `src/lib/fursona.ts`, replace `scoreRequest()` with:

```ts
function getScoreSnapshot(request: GenerateRequest): ScoreSnapshot {
  return request.scoreSnapshot || scoreAnswers(request.answers || []);
}
```

Then update `inferCharacterBlueprint()` to start with:

```ts
const snapshot = getScoreSnapshot(request);
const scores = snapshot.tags;
const primarySpecies =
  request.deepConfig?.primarySpeciesPreference?.trim() ||
  snapshot.speciesCandidates[0]?.species ||
  "狐";
const recommendedLineage = snapshot.lineageRecommendation;
```

- [ ] **Step 5: Update secondary species selection**

Change `pickSecondarySpecies()` to accept ranked candidates:

```ts
function pickSecondarySpecies(
  request: GenerateRequest,
  primarySpecies: string,
  snapshot: ScoreSnapshot,
) {
  const preferred = request.deepConfig?.secondarySpeciesPreference?.trim();
  if (preferred && preferred !== primarySpecies) {
    return request.deepConfig?.worldStyle?.includes("赛博")
      ? [preferred, "机械义体"]
      : [preferred];
  }

  const ranked = snapshot.speciesCandidates
    .map((candidate) => candidate.species)
    .filter((species) => species !== primarySpecies);

  const fallback = primarySpecies === "东方龙" ? ["狐"] : ["东方龙"];
  return [...ranked, ...fallback].slice(0, 2);
}
```

- [ ] **Step 6: Pass score snapshot to OpenAI context**

In `src/app/api/generate/route.ts`, include `scoreSnapshot` in `generateCharacterSpec()` input:

```ts
input: JSON.stringify(
  {
    user_request: request,
    score_snapshot: request.scoreSnapshot,
    rule_engine_draft: fallbackSpec,
  },
  null,
  2,
),
```

- [ ] **Step 7: Run tests**

Run:

```powershell
npm.cmd test
```

Expected: PASS.

---

### Task 5: Implement Deep Branch Selection

**Files:**
- Create: `src/lib/questionFlow.ts`
- Modify: `src/lib/questionFlow.test.ts`

- [ ] **Step 1: Add failing tests for branch selection**

Add to `src/lib/questionFlow.test.ts`:

```ts
import { selectDeepQuestions } from "@/lib/questionFlow";

describe("selectDeepQuestions", () => {
  it("starts with the 8 base questions", () => {
    const questions = selectDeepQuestions([], "standard");
    expect(questions).toHaveLength(8);
    expect(questions.every((question) => question.branch === "base")).toBe(true);
  });

  it("selects mythic branch after scale and mythic leaning answers", () => {
    const questions = selectDeepQuestions(
      [
        { questionId: "db02_old_mark", optionId: "rune_mark", branch: "base" },
        { questionId: "db03_hidden_part", optionId: "ears_or_horns", branch: "base" },
      ],
      "standard",
    );

    expect(questions.some((question) => question.branch === "mythic")).toBe(true);
  });

  it("does not exceed configured standard depth", () => {
    const questions = selectDeepQuestions([], "standard");
    expect(questions.length).toBeLessThanOrEqual(28);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm.cmd test -- src/lib/questionFlow.test.ts
```

Expected: FAIL because `selectDeepQuestions()` does not exist.

- [ ] **Step 3: Implement question flow**

Create `src/lib/questionFlow.ts`:

```ts
import { deepQuestionBank } from "@/data/deepQuestionBank";
import type { Answer, Question, QuestionBranch } from "@/data/questionTypes";
import { scoreAnswers } from "@/lib/scoring";

export type DeepFlowDepth = "light" | "standard" | "professional";

const depthLimits: Record<DeepFlowDepth, number> = {
  light: 20,
  standard: 28,
  professional: 36,
};

const branchTargets: Record<DeepFlowDepth, Partial<Record<QuestionBranch, number>>> = {
  light: { base: 8, lineage: 3, mammal: 3, mythic: 3, special: 3, visual: 3, world: 2, constraints: 1 },
  standard: { base: 8, lineage: 4, mammal: 5, mythic: 5, special: 5, visual: 5, world: 3, constraints: 2 },
  professional: { base: 8, lineage: 5, mammal: 6, mythic: 5, special: 5, visual: 6, world: 4, constraints: 4 },
};

export function selectDeepQuestions(
  answers: Answer[],
  depth: DeepFlowDepth = "standard",
): Question[] {
  const answeredIds = new Set(answers.map((answer) => answer.questionId));
  const baseQuestions = takeUnanswered("base", branchTargets[depth].base || 8, answeredIds);

  if (answers.length < 8) {
    return baseQuestions;
  }

  const snapshot = scoreAnswers(answers);
  const branches = selectBranches(snapshot.tags);
  const selected = [
    ...baseQuestions,
    ...takeUnanswered("lineage", branchTargets[depth].lineage || 4, answeredIds),
  ];

  for (const branch of branches) {
    selected.push(...takeUnanswered(branch, branchTargets[depth][branch] || 0, answeredIds));
  }

  selected.push(...takeUnanswered("visual", branchTargets[depth].visual || 5, answeredIds));
  selected.push(...takeUnanswered("world", branchTargets[depth].world || 3, answeredIds));
  selected.push(...takeUnanswered("constraints", branchTargets[depth].constraints || 2, answeredIds));

  return dedupeQuestions(selected).slice(0, depthLimits[depth]);
}

function selectBranches(tags: Record<string, number>): QuestionBranch[] {
  const mammalScore = Math.max(
    tags.fox || 0,
    tags.wolf || 0,
    tags.dog || 0,
    tags.cat || 0,
    tags.deer || 0,
    tags.rabbit || 0,
    tags.snow_leopard || 0,
    tags.lion || 0,
  );
  const mythicScore =
    (tags.scale || 0) + (tags.mythic_bias || 0) + (tags.dragon || 0) + (tags.qilin || 0);
  const specialScore = (tags.feather || 0) + (tags.ocean || 0) + (tags.mechanical_bias || 0);

  return [
    { branch: "mammal" as const, score: mammalScore },
    { branch: "mythic" as const, score: mythicScore },
    { branch: "special" as const, score: specialScore },
  ]
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .slice(0, 2)
    .map((item) => item.branch);
}

function takeUnanswered(branch: QuestionBranch, count: number, answeredIds: Set<string>) {
  return deepQuestionBank
    .filter((question) => question.branch === branch && !answeredIds.has(question.id))
    .slice(0, count);
}

function dedupeQuestions(questions: Question[]) {
  const seen = new Set<string>();
  return questions.filter((question) => {
    if (seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
}
```

- [ ] **Step 4: Run question flow tests**

Run:

```powershell
npm.cmd test -- src/lib/questionFlow.test.ts
```

Expected: PASS.

---

### Task 6: Add Conflict Detection And Review Data

**Files:**
- Create: `src/lib/conflicts.ts`
- Create: `src/lib/conflicts.test.ts`
- Modify: `src/lib/fursona.ts`

- [ ] **Step 1: Add failing conflict tests**

Create `src/lib/conflicts.test.ts`:

```ts
import { detectConflicts } from "@/lib/conflicts";

describe("detectConflicts", () => {
  it("downgrades mechanical lineage to equipment in pure mode", () => {
    const conflicts = detectConflicts({
      lineageMode: "pure",
      primarySpecies: "狐",
      secondarySpecies: ["机械义体"],
      mustKeep: [],
      avoid: [],
      tags: { mechanical_bias: 3 },
    });

    expect(conflicts[0].severity).toBe("warning");
    expect(conflicts[0].resolution).toContain("机械元素降级为装备");
  });

  it("warns when hybrid lacks trait mapping", () => {
    const conflicts = detectConflicts({
      lineageMode: "hybrid",
      primarySpecies: "狐",
      secondarySpecies: ["东方龙"],
      mustKeep: [],
      avoid: [],
      tags: {},
      traitMapping: [],
    });

    expect(conflicts.some((item) => item.code === "hybrid_missing_mapping")).toBe(true);
  });
});
```

- [ ] **Step 2: Run conflict tests to verify failure**

Run:

```powershell
npm.cmd test -- src/lib/conflicts.test.ts
```

Expected: FAIL because `detectConflicts()` does not exist.

- [ ] **Step 3: Implement conflicts**

Create `src/lib/conflicts.ts`:

```ts
export type ConflictInput = {
  lineageMode: "pure" | "hybrid";
  primarySpecies: string;
  secondarySpecies: string[];
  mustKeep: string[];
  avoid: string[];
  tags: Record<string, number>;
  traitMapping?: string[];
};

export type SettingConflict = {
  code: string;
  severity: "info" | "warning";
  message: string;
  resolution: string;
};

export function detectConflicts(input: ConflictInput): SettingConflict[] {
  const conflicts: SettingConflict[] = [];

  if (input.lineageMode === "pure" && input.secondarySpecies.length > 0) {
    conflicts.push({
      code: "pure_with_secondary",
      severity: "warning",
      message: "纯血模式不应包含副血统。",
      resolution: "保留主物种，副血统转为服装、道具或背景设定。",
    });
  }

  if (input.lineageMode === "pure" && (input.tags.mechanical_bias || 0) >= 2) {
    conflicts.push({
      code: "pure_with_mech_bias",
      severity: "warning",
      message: "纯血倾向与机械义体倾向同时较强。",
      resolution: "机械元素降级为装备，不计入血统。",
    });
  }

  if (
    input.lineageMode === "hybrid" &&
    input.secondarySpecies.length > 0 &&
    (!input.traitMapping || input.traitMapping.length <= 1)
  ) {
    conflicts.push({
      code: "hybrid_missing_mapping",
      severity: "warning",
      message: "混血模式需要说明副血统落在哪些身体部位或装备上。",
      resolution: "为每个副血统补充局部映射，例如肩颈鳞片、尾端纹理、义体护臂。",
    });
  }

  const avoidText = input.avoid.join(" ");
  if (avoidText.includes(input.primarySpecies)) {
    conflicts.push({
      code: "avoid_mentions_primary",
      severity: "warning",
      message: "禁止事项中包含主物种，可能导致生成方向冲突。",
      resolution: "保留主物种，改写禁止项为具体误读，例如不要画成猫科、不要省略尾巴。",
    });
  }

  return conflicts;
}
```

- [ ] **Step 4: Run conflict tests**

Run:

```powershell
npm.cmd test -- src/lib/conflicts.test.ts
```

Expected: PASS.

---

### Task 7: Wire Frontend Quick Q12 And Deep Branch Flow

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace inline quick questions**

In `src/app/page.tsx`, import local data:

```ts
import { quickQuestions } from "@/data/quickQuestions";
import { selectDeepQuestions, type DeepFlowDepth } from "@/lib/questionFlow";
import { scoreAnswers, type ScoreSnapshot } from "@/lib/scoring";
import { detectConflicts, type SettingConflict } from "@/lib/conflicts";
```

Replace:

```ts
const questions = [
  ...
];
```

with:

```ts
const questions = quickQuestions;
```

- [ ] **Step 2: Add review step state**

Change:

```ts
type Step = "home" | "quiz" | "deep" | "lineage" | "loading" | "result";
```

to:

```ts
type Step = "home" | "quiz" | "deep" | "review" | "lineage" | "loading" | "result";
```

Add state:

```ts
const [deepAnswers, setDeepAnswers] = useState<QuickAnswer[]>([]);
const [deepQuestionIndex, setDeepQuestionIndex] = useState(0);
const [deepDepth, setDeepDepth] = useState<DeepFlowDepth>("standard");
const [scoreSnapshot, setScoreSnapshot] = useState<ScoreSnapshot | null>(null);
const [conflicts, setConflicts] = useState<SettingConflict[]>([]);
```

- [ ] **Step 3: Route deep mode into question flow**

Replace `startDeep()` body with:

```ts
function startDeep() {
  setMode("deep");
  setDeepAnswers([]);
  setDeepQuestionIndex(0);
  setError(null);
  setStep("deep");
}
```

Create:

```ts
const activeDeepQuestions = useMemo(
  () => selectDeepQuestions(deepAnswers, deepDepth),
  [deepAnswers, deepDepth],
);
```

- [ ] **Step 4: Add deep answer handler**

Add:

```ts
function chooseDeepAnswer(optionId: string) {
  const question = activeDeepQuestions[deepQuestionIndex];
  const nextAnswers = [
    ...deepAnswers.filter((answer) => answer.questionId !== question.id),
    { questionId: question.id, optionId, branch: question.branch },
  ];

  const nextQuestions = selectDeepQuestions(nextAnswers, deepDepth);
  setDeepAnswers(nextAnswers);

  if (deepQuestionIndex < nextQuestions.length - 1) {
    setDeepQuestionIndex((current) => current + 1);
    return;
  }

  buildReview(nextAnswers);
}
```

- [ ] **Step 5: Add review builder**

Add:

```ts
function buildReview(nextAnswers: QuickAnswer[]) {
  const snapshot = scoreAnswers(nextAnswers);
  const blueprint = inferCharacterBlueprint({
    mode,
    lineageMode,
    answers: nextAnswers,
    deepConfig: mode === "deep" ? deepConfig : undefined,
    scoreSnapshot: snapshot,
  });

  setScoreSnapshot(snapshot);
  setConflicts(
    detectConflicts({
      lineageMode: blueprint.lineageMode,
      primarySpecies: blueprint.primarySpecies,
      secondarySpecies: blueprint.secondarySpecies,
      mustKeep: blueprint.mustKeep,
      avoid: blueprint.avoid,
      tags: snapshot.tags,
      traitMapping: blueprint.traitMapping,
    }),
  );
  setStep("review");
}
```

- [ ] **Step 6: Replace deep form UI with question UI**

In the `step === "deep"` block, render `activeDeepQuestions[deepQuestionIndex]` with the same option button pattern as quick mode. Keep the existing `deepConfig` form collapsed below as “补充项” only if there is room; it must not be the primary deep input.

- [ ] **Step 7: Add review UI**

Add a new `step === "review"` section before `lineage`:

```tsx
{step === "review" && (
  <section className="screen screen-scroll">
    <Header onBack={() => setStep(mode === "quick" ? "quiz" : "deep")} label="生成前确认" />
    <h2 className="question-title">先确认推演方向</h2>
    <p className="hint">系统会基于本地题库和分支权重生成摘要，确认后再调用图片模型。</p>
    <div className="summary-card">
      <p><strong>候选物种：</strong>{scoreSnapshot?.speciesCandidates.slice(0, 3).map((item) => item.species).join(" / ")}</p>
      <p><strong>血统建议：</strong>{scoreSnapshot?.lineageRecommendation === "pure" ? "纯血" : "混血"}</p>
      <p><strong>主要标签：</strong>{Object.entries(scoreSnapshot?.tags || {}).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([key]) => key).join("、")}</p>
    </div>
    {conflicts.map((conflict) => (
      <div className="error-box" key={conflict.code}>
        {conflict.message} {conflict.resolution}
      </div>
    ))}
    <div className="action-stack">
      <button className="primary-action" onClick={() => setStep("lineage")}>
        <strong>确认，继续选择血统</strong>
        <ChevronRight size={20} />
      </button>
    </div>
  </section>
)}
```

- [ ] **Step 8: Pass correct answers to generate**

Modify payload construction:

```ts
const activeAnswers = mode === "quick" ? answers : deepAnswers;
const payload: GenerateRequest = {
  mode,
  lineageMode,
  answers: activeAnswers,
  deepConfig: mode === "deep" ? deepConfig : undefined,
  scoreSnapshot: scoreSnapshot || scoreAnswers(activeAnswers),
};
```

- [ ] **Step 9: Run checks**

Run:

```powershell
npm.cmd run lint
npm.cmd test
```

Expected: both PASS.

---

### Task 8: Add Single Image Retry Endpoint And UI

**Files:**
- Create: `src/app/api/regenerate-image/route.ts`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create regenerate API route**

Create `src/app/api/regenerate-image/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getImageModel, getOpenAIClient, hasOpenAIKey } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

type RegenerateImageRequest = {
  prompt: string;
};

export async function POST(request: Request) {
  let body: RegenerateImageRequest;

  try {
    body = (await request.json()) as RegenerateImageRequest;
  } catch {
    return NextResponse.json({ error: "请求体不是有效 JSON。" }, { status: 400 });
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "缺少图片 prompt。" }, { status: 400 });
  }

  if (!hasOpenAIKey()) {
    return NextResponse.json({ error: "缺少 OPENAI_API_KEY，无法重新生成图片。" }, { status: 400 });
  }

  try {
    const client = getOpenAIClient();
    const response = await client.images.generate({
      model: getImageModel(),
      prompt: body.prompt,
      size: "1024x1536",
      quality: "medium",
      output_format: "png",
      n: 1,
    });
    const image = response.data?.[0];
    const src = image?.b64_json
      ? `data:image/png;base64,${image.b64_json}`
      : image?.url || null;

    if (!src) {
      return NextResponse.json({ error: "图片模型没有返回图片。" }, { status: 502 });
    }

    return NextResponse.json({ image: src });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "图片重新生成失败。" },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 2: Add retry helper to page**

In `src/app/page.tsx`, add:

```ts
async function retryImage(kind: "complete" | "reference") {
  const prompt =
    kind === "complete"
      ? activeSpec.prompts.complete_scene
      : activeSpec.prompts.reference_sheet;

  const response = await fetch("/api/regenerate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = (await response.json()) as { image?: string; error?: string };

  if (!response.ok || !data.image) {
    setError(data.error || "图片重新生成失败。");
    return;
  }

  setResult((current) => ({
    ...current,
    characterSpec: activeSpec,
    completeSceneImage: kind === "complete" ? data.image : current?.completeSceneImage,
    referenceSheetImage: kind === "reference" ? data.image : current?.referenceSheetImage,
  }));
}
```

- [ ] **Step 3: Add retry buttons**

Add buttons near the image sections:

```tsx
<button className="icon-button" onClick={() => retryImage("complete")}>
  <RefreshCw size={17} />
</button>
```

and:

```tsx
<button className="icon-button" onClick={() => retryImage("reference")}>
  <RefreshCw size={17} />
</button>
```

- [ ] **Step 4: Run checks**

Run:

```powershell
npm.cmd run lint
npm.cmd test
```

Expected: both PASS.

---

### Task 9: Update README And Iteration Docs

**Files:**
- Modify: `README.md`
- Modify: `docs/full-flow-implementation-iterations.md`

- [ ] **Step 1: Update README product wording**

In `README.md`, replace “P1 原型” with “全流程手机端工具”. Update current functions to:

```md
## 当前功能

- 快速生成：固定 12 道隐晦问卷
- 深度定制：从本地题库按分支抽题
- 血统模式：AI 推荐、纯血、混血
- 本地评分：弱权重、组合触发、物种候选、血统建议
- 生成前确认：展示候选物种、血统建议、主要标签和冲突提示
- AI 生成：结构化设定、完整形象图、多维度设定图
- 结果页：保存图片、复制说明、单图重试
```

- [ ] **Step 2: Document out-of-scope persistence**

Add:

```md
## 暂不包含

- 结果持久化 / 历史记录
- 社区
- 多角色关系网
- 生成后细粒度微调
- 局部重绘
- Live2D / VTuber
- 约稿市场
```

- [ ] **Step 3: Update iteration doc**

In `docs/full-flow-implementation-iterations.md`, change `I5. 图片重试与结果记录` to `I5. 图片重试` and move `结果持久化` into excluded scope.

- [ ] **Step 4: Run final verification**

Run:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Expected: all commands exit 0.

---

## Scope Excluded From This Plan

Result persistence/history is intentionally excluded:

- No `localStorage` result history
- No “记录” page implementation
- No previous-result restore after refresh
- No backend storage

The UI may keep the existing bottom nav label, but it should not become a functional history feature in this plan.

## Self-Review

- Spec coverage: Covers fixed Q12, deep local question bank, branch extraction, unified scoring, conflict detection, pre-generation review, image retry, and README sync.
- Exclusion check: Result persistence is excluded from tasks and listed explicitly.
- Type consistency: Shared `Answer`, `Question`, `QuestionOption`, `ScoreSnapshot`, and `SettingConflict` are defined before use.
- Test coverage: Each new logic module has targeted Vitest coverage, with final lint/test/build verification.
