import { buildImagePrompts, type CharacterSpec } from "./fursona";

export type CharacterSpecDraftPatch = {
  positioning?: string;
  world_style?: string;
  role?: string;
  body?: string;
  height?: string;
  outfit?: string;
  signature_item?: string;
  mission?: string;
  catchphrase?: string;
  background_story?: string;
  personality_keywords?: string;
  visual_keywords?: string;
  setting_description?: string;
  features?: Partial<CharacterSpec["features"]>;
  colors?: Partial<CharacterSpec["colors"]>;
  scene?: Partial<CharacterSpec["scene"]>;
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
    positioning: `${patch.world_style ?? spec.world_style} · ${patch.role ?? spec.role}`,
    world_style: patch.world_style ?? spec.world_style,
    role: patch.role ?? spec.role,
    body: patch.body ?? spec.body,
    height: patch.height ?? spec.height,
    outfit: patch.outfit ?? spec.outfit,
    signature_item: patch.signature_item ?? spec.signature_item,
    mission: patch.mission ?? spec.mission,
    catchphrase: patch.catchphrase ?? spec.catchphrase,
    background_story: patch.background_story ?? spec.background_story,
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
    colors: {
      ...spec.colors,
      ...(patch.colors || {}),
    },
    scene: {
      ...spec.scene,
      ...(patch.scene || {}),
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

  const positioned = {
    ...settingUpdated,
    positioning: `${settingUpdated.world_style} · ${settingUpdated.role}`,
  };
  const rebuiltPrompts = buildImagePrompts(positioned);

  return {
    ...positioned,
    prompts: {
      complete_scene: patch.prompts?.complete_scene ?? rebuiltPrompts.complete_scene,
      reference_sheet: patch.prompts?.reference_sheet ?? rebuiltPrompts.reference_sheet,
      avatar: patch.prompts?.avatar ?? rebuiltPrompts.avatar,
    },
  };
}

function hasSpecContentPatch(patch: CharacterSpecDraftPatch) {
  return (
    patch.positioning !== undefined ||
    patch.world_style !== undefined ||
    patch.role !== undefined ||
    patch.body !== undefined ||
    patch.height !== undefined ||
    patch.outfit !== undefined ||
    patch.signature_item !== undefined ||
    patch.mission !== undefined ||
    patch.catchphrase !== undefined ||
    patch.background_story !== undefined ||
    patch.personality_keywords !== undefined ||
    patch.visual_keywords !== undefined ||
    patch.features !== undefined ||
    patch.colors !== undefined ||
    patch.scene !== undefined
  );
}

function appendSettingSupplement(description: string, spec: CharacterSpec) {
  if (description.includes("编辑补充")) return description;

  return [
    description,
    `编辑补充：本次确认页修改为${spec.positioning}，身高${spec.height}，性格关键词为${spec.personality_keywords.join("、")}，视觉关键词为${spec.visual_keywords.join("、")}。`,
  ].join("\n");
}
