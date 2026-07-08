import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { characterSpecSchema } from "./schema";

function findDynamicObjectSchemas(schema: unknown, path = "$"): string[] {
  if (!schema || typeof schema !== "object") return [];

  const node = schema as {
    type?: string;
    properties?: Record<string, unknown>;
    additionalProperties?: unknown;
    items?: unknown;
  };
  const violations: string[] = [];

  if (
    node.type === "object" &&
    typeof node.additionalProperties === "object" &&
    node.additionalProperties !== null
  ) {
    violations.push(path);
  }

  for (const [key, value] of Object.entries(node.properties || {})) {
    violations.push(...findDynamicObjectSchemas(value, `${path}.${key}`));
  }

  if (node.items) {
    violations.push(...findDynamicObjectSchemas(node.items, `${path}[]`));
  }

  return violations;
}

describe("generate route", () => {
  it("does not return demo character data when the generation key is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        body: JSON.stringify({
          mode: "quick",
          lineageMode: "ai",
          answers: [],
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.characterSpec).toBeUndefined();
    expect(payload.completeSceneImage).toBeUndefined();
    expect(payload.referenceSheetImage).toBeUndefined();
  });

  it("uses only strict structured-output object schemas", () => {
    expect(characterSpecSchema).toBeDefined();
    expect(findDynamicObjectSchemas(characterSpecSchema)).toEqual([]);
  });

  it("requires a concrete height in the generated character spec", () => {
    const schema = characterSpecSchema as {
      required: string[];
      properties: Record<string, unknown>;
    };

    expect(schema.required).toContain("height");
    expect(schema.properties.height).toEqual({ type: "string" });
  });

  it("keeps overview image prompts free of visible names and labels", () => {
    const source = characterSpecSchema.properties.prompts.properties.complete_scene;

    expect(source).toBeDefined();

    const routeSource = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

    expect(routeSource).toContain("no visible text");
    expect(routeSource).toContain("no character name");
    expect(routeSource).toContain("no labels");
  });

  it("guides reference sheets toward structured character boards", () => {
    const routeSource = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

    expect(routeSource).toContain("竖版 A4 角色设定板");
    expect(routeSource).toContain("3x3 表情格");
    expect(routeSource).toContain("vertical A4 portrait character reference sheet");
    expect(routeSource).toContain("short headings only");
  });
});
