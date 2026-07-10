import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("regenerate image route", () => {
  it("requires public image generation requests to use the async queue", async () => {
    const response = await POST(
      new Request("http://localhost/api/regenerate-image", {
        method: "POST",
        body: JSON.stringify({
          prompt: "full body character portrait",
          aiSettings: { apiKey: "test-key" },
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toContain("/api/regenerate-image/jobs");
  });
});
