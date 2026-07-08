export const speciesByKey: Record<string, string> = {
  fox: "狐",
  wolf: "狼",
  dog: "犬",
  lion: "狮",
  tiger: "虎",
  bear: "熊",
  leopard: "豹",
  snow_leopard: "雪豹",
  cat: "猫",
  deer: "鹿",
  rabbit: "兔",
  otter: "水獭",
  dragon: "东方龙",
  serpent: "蛇",
  qilin: "麒麟",
  mech: "机械义体",
};

export const speciesKeys = Object.keys(speciesByKey);

export const speciesTraitWeights: Record<string, Record<string, number>> = {
  fox: { mystery: 0.9, alone: 0.7, slim: 0.7, fluffy: 0.6, chaos: 0.5 },
  wolf: { alone: 0.7, loyal: 0.8, wild: 0.8, dark: 0.6, strong: 0.35 },
  dog: { social: 0.8, loyal: 0.9, soft: 0.5 },
  lion: { social: 0.5, wild: 0.8, heavy: 0.8, strong: 0.55, control: 0.4 },
  tiger: { wild: 0.9, dark: 0.5, control: 0.4, heavy: 0.5, strong: 0.85 },
  bear: { loyal: 0.7, soft: 0.5, heavy: 0.8, strong: 0.75, chubby: 0.7, forest: 0.5, control: 0.55, academy: 0.4, pure_bias: 0.35 },
  leopard: { slim: 0.8, wild: 0.6, alone: 0.5, dark: 0.4 },
  snow_leopard: { control: 0.7, slim: 0.7, dark: 0.5, pure_bias: 0.5 },
  cat: { alone: 0.6, mystery: 0.6, small: 0.5, chaos: 0.4 },
  deer: { soft: 0.8, forest: 0.7, control: 0.4 },
  rabbit: { soft: 0.8, small: 0.7, fluffy: 0.7 },
  otter: { soft: 0.6, social: 0.6, ocean: 0.8, small: 0.4 },
  dragon: { mythic_bias: 0.8, control: 0.25, scale: 0.9, giant: 0.5, chinese: 0.6 },
  serpent: { mystery: 0.8, scale: 0.8, control: 0.5, dark: 0.5 },
  qilin: { mythic_bias: 0.8, soft: 0.5, chinese: 0.8, control: 0.5 },
  mech: { mechanical_bias: 1, cyber: 0.9, control: 0.4, hybrid_bias: 0.4 },
};
