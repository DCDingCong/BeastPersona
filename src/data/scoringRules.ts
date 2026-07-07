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
