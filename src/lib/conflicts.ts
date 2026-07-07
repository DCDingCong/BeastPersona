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

  if (input.lineageMode === "pure" && (input.tags.mechanical_bias || 0) >= 2) {
    conflicts.push({
      code: "pure_with_mech_bias",
      severity: "warning",
      message: "纯血倾向与机械义体倾向同时较强。",
      resolution: "机械元素降级为装备，不计入血统。",
    });
  }

  if (input.lineageMode === "pure" && input.secondarySpecies.length > 0) {
    conflicts.push({
      code: "pure_with_secondary",
      severity: "warning",
      message: "纯血模式不应包含副血统。",
      resolution: "保留主物种，副血统转为服装、道具或背景设定。",
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
  if (input.primarySpecies && avoidText.includes(input.primarySpecies)) {
    conflicts.push({
      code: "avoid_mentions_primary",
      severity: "warning",
      message: "禁止事项中包含主物种，可能导致生成方向冲突。",
      resolution: "保留主物种，改写禁止项为具体误读，例如不要画成猫科、不要省略尾巴。",
    });
  }

  return conflicts;
}
