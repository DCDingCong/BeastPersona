import { detectConflicts } from "@/lib/conflicts";
import { describe, expect, it } from "vitest";

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
