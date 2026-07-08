import { describe, expect, it } from "vitest";
import type { CharacterSpec } from "./fursona";
import { applyCharacterSpecDraft, splitDraftList } from "./characterSpecEditing";

const baseSpec: CharacterSpec = {
  name: "",
  lineage_mode: "pure",
  primary_species: "狐",
  secondary_species: [],
  species_ratio: { 狐: 100 },
  positioning: "遗迹斥候",
  personality_keywords: ["警觉", "敏锐"],
  visual_keywords: ["狐耳", "狐尾"],
  colors: {
    primary: "#1E2A38",
    secondary: "#E65A2E",
    accent: "#22D3C5",
    neutral: "#E8E1D3",
    shadow: "#0B0F14",
  },
  body: "轻盈修长，动作灵活",
  height: "176cm",
  features: {
    ears: "狐系耳部轮廓",
    tail: "狐特征尾巴",
    eyes: "青绿色竖瞳",
    fur: "深灰蓝底色",
    special_marks: "月牙形发光标记",
  },
  outfit: "遗迹轻装外套与功能性护具",
  signature_item: "可折叠追踪刃",
  background_story: "来自边境地带的斥候。",
  mission: "追踪边境线索",
  catchphrase: "别跟太近，我会分心。",
  must_keep: ["狐耳"],
  avoid: ["不要混入其他物种的显著特征"],
  prompts: {
    complete_scene: "complete prompt",
    reference_sheet: "reference prompt",
    avatar: "avatar prompt",
  },
  setting_description: "狐纯血兽设。",
};

describe("character spec editing", () => {
  it("splits draft lists from newlines and punctuation while removing blanks", () => {
    expect(splitDraftList("警觉、敏锐\n神秘,  克制，")).toEqual([
      "警觉",
      "敏锐",
      "神秘",
      "克制",
    ]);
  });

  it("applies editable fields without mutating the original spec", () => {
    const updated = applyCharacterSpecDraft(baseSpec, {
      positioning: "雪境记录员",
      personality_keywords: "安静\n谨慎、专注",
      visual_keywords: "冰蓝眼睛\n厚实围巾",
      setting_description: "偏生活化的雪豹设定。",
      features: {
        eyes: "冰蓝色眼睛",
        tail: "粗尾巴，尾尖浅蓝",
      },
      prompts: {
        reference_sheet: "vertical A4 reference board",
      },
    });

    expect(updated).not.toBe(baseSpec);
    expect(updated.positioning).toBe("雪境记录员");
    expect(updated.personality_keywords).toEqual(["安静", "谨慎", "专注"]);
    expect(updated.visual_keywords).toEqual(["冰蓝眼睛", "厚实围巾"]);
    expect(updated.features.eyes).toBe("冰蓝色眼睛");
    expect(updated.features.tail).toBe("粗尾巴，尾尖浅蓝");
    expect(updated.features.ears).toBe(baseSpec.features.ears);
    expect(updated.prompts.reference_sheet).toBe("vertical A4 reference board");
    expect(updated.prompts.complete_scene).toContain(baseSpec.prompts.complete_scene);
    expect(updated.prompts.complete_scene).toContain("雪境记录员");
    expect(baseSpec.positioning).toBe("遗迹斥候");
  });

  it("adds edited requirements to image prompts when prompt fields are not manually edited", () => {
    const updated = applyCharacterSpecDraft(baseSpec, {
      positioning: "雪境记录员",
      personality_keywords: "安静\n谨慎",
      visual_keywords: "蓝色耳机\n雪豹斑纹",
    });

    expect(updated.prompts.complete_scene).toContain("User edited requirements");
    expect(updated.prompts.complete_scene).toContain("雪境记录员");
    expect(updated.prompts.reference_sheet).toContain("蓝色耳机");
    expect(updated.prompts.reference_sheet).toContain("雪豹斑纹");
  });

  it("adds an edit supplement to setting copy when setting copy is not manually edited", () => {
    const updated = applyCharacterSpecDraft(baseSpec, {
      positioning: "雪境记录员",
      personality_keywords: "安静\n谨慎",
    });

    expect(updated.setting_description).toContain("编辑补充");
    expect(updated.setting_description).toContain("雪境记录员");
    expect(updated.setting_description).toContain("安静");
  });
});
