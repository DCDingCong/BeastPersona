import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const publicCopyFiles = [
  new URL("./page.tsx", import.meta.url),
  new URL("./layout.tsx", import.meta.url),
  new URL("../data/deepQuestionBank.ts", import.meta.url),
  new URL("./api/generate/route.ts", import.meta.url),
  new URL("./api/regenerate-image/route.ts", import.meta.url),
];

const bannedPublicCopy = [
  "AI Fursona Lab",
  "AI 推荐",
  "AI 推演",
  "AI 生成",
  "由 AI",
  "OPENAI_API_KEY",
  "Prompt：",
  "prompt 和",
  "固定 12 道隐晦题，系统会在后台进行多标签弱权重分析。",
  "先确认推演方向",
  "确认后再调用图片模型",
  "避免明显方向错误造成浪费",
  "候选物种",
  "血统建议",
  "主要标签",
  "任务倾向",
  "切换纯血/混血重新推演",
  "demoSpec",
  "sample-complete-scene.png",
  "sample-reference-sheet.png",
  "Supabase 尚未配置",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  ".env.local",
  "环境变量",
];

describe("public-facing copy", () => {
  it("does not expose AI-branded generator wording", () => {
    const visibleCopy = publicCopyFiles
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    for (const phrase of bannedPublicCopy) {
      expect(visibleCopy).not.toContain(phrase);
    }
  });

  it("does not render internal result constraints as visible result copy", () => {
    const pageCopy = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

    expect(pageCopy).not.toContain("<strong>必须保留");
    expect(pageCopy).not.toContain("<strong>禁止事项");
    expect(pageCopy).not.toContain('<Field label="必须保留项"');
    expect(pageCopy).not.toContain('<Field label="禁止事项"');
    expect(pageCopy).not.toContain('<Stat label="任务"');
    expect(pageCopy).not.toContain('<Stat label="道具"');
    expect(pageCopy).not.toContain('<div className="result-title">{activeSpec.name}</div>');
  });

  it("presents the product before asking users to authenticate", () => {
    const pageCopy = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

    expect(pageCopy).toContain("兽格造像馆");
    expect(pageCopy).toContain("输入你的性格、审美和幻想偏好");
    expect(pageCopy).toContain("完整形象图");
    expect(pageCopy).toContain("还没有账户？");
  });
});
