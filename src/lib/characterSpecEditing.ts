import type { CharacterSpec } from "./fursona";

export type CharacterSpecDraftPatch = {
  positioning?: string;
  body?: string;
  height?: string;
  outfit?: string;
  signature_item?: string;
  mission?: string;
  catchphrase?: string;
  personality_keywords?: string;
  visual_keywords?: string;
  setting_description?: string;
  features?: Partial<CharacterSpec["features"]>;
  prompts?: Partial<CharacterSpec["prompts"]>;
};

export function splitDraftList(value: string) {
  return value
    .split(/[、,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function applyCharacterSpecDraft(
  spec: CharacterSpec,
  patch: CharacterSpecDraftPatch,
) {
  const updated = {
    ...spec,
    positioning: patch.positioning ?? spec.positioning,
    body: patch.body ?? spec.body,
    height: patch.height ?? spec.height,
    outfit: patch.outfit ?? spec.outfit,
    signature_item: patch.signature_item ?? spec.signature_item,
    mission: patch.mission ?? spec.mission,
    catchphrase: patch.catchphrase ?? spec.catchphrase,
    personality_keywords:
      patch.personality_keywords === undefined
        ? spec.personality_keywords
        : splitDraftList(patch.personality_keywords),
    visual_keywords:
      patch.visual_keywords === undefined
        ? spec.visual_keywords
        : splitDraftList(patch.visual_keywords),
    setting_description: patch.setting_description ?? spec.setting_description,
    features: {
      ...spec.features,
      ...(patch.features || {}),
    },
    prompts: {
      ...spec.prompts,
      ...(patch.prompts || {}),
    },
  };

  const settingUpdated =
    patch.setting_description === undefined && hasSpecContentPatch(patch)
      ? {
          ...updated,
          setting_description: appendSettingSupplement(updated.setting_description, updated),
        }
      : updated;

  const editDirective = buildPromptEditDirective(settingUpdated, patch);
  if (!editDirective) return settingUpdated;

  return {
    ...settingUpdated,
    prompts: {
      ...settingUpdated.prompts,
      complete_scene: patch.prompts?.complete_scene
        ? settingUpdated.prompts.complete_scene
        : appendPromptDirective(settingUpdated.prompts.complete_scene, editDirective),
      reference_sheet: patch.prompts?.reference_sheet
        ? settingUpdated.prompts.reference_sheet
        : appendPromptDirective(settingUpdated.prompts.reference_sheet, editDirective),
    },
  };
}

function hasSpecContentPatch(patch: CharacterSpecDraftPatch) {
  return (
    patch.positioning !== undefined ||
    patch.body !== undefined ||
    patch.height !== undefined ||
    patch.outfit !== undefined ||
    patch.signature_item !== undefined ||
    patch.mission !== undefined ||
    patch.catchphrase !== undefined ||
    patch.personality_keywords !== undefined ||
    patch.visual_keywords !== undefined ||
    patch.features !== undefined
  );
}

function buildPromptEditDirective(
  spec: CharacterSpec,
  patch: CharacterSpecDraftPatch,
) {
  if (!hasSpecContentPatch(patch) && patch.setting_description === undefined) return "";

  return [
    "User edited requirements",
    `positioning: ${spec.positioning}`,
    `body and height: ${spec.body}, ${spec.height}`,
    `personality: ${spec.personality_keywords.join(", ")}`,
    `visual keywords: ${spec.visual_keywords.join(", ")}`,
    `features: eyes ${spec.features.eyes}, ears ${spec.features.ears}, tail ${spec.features.tail}, fur ${spec.features.fur}, marks ${spec.features.special_marks}`,
    `outfit: ${spec.outfit}`,
    `signature item: ${spec.signature_item}`,
    `mission: ${spec.mission}`,
  ].join("; ");
}

function appendSettingSupplement(description: string, spec: CharacterSpec) {
  if (description.includes("编辑补充")) return description;

  return [
    description,
    `编辑补充：本次确认页修改为${spec.positioning}，身高${spec.height}，性格关键词为${spec.personality_keywords.join("、")}，视觉关键词为${spec.visual_keywords.join("、")}。`,
  ].join("\n");
}

function appendPromptDirective(prompt: string, directive: string) {
  return prompt.includes("User edited requirements")
    ? prompt
    : `${prompt}, ${directive}`;
}
