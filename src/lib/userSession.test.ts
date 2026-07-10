import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
}));

vi.mock("./localAuth", () => ({
  getSessionUser: mocks.getSessionUser,
}));

import { AuthRequiredError, requireAuthenticatedUser } from "./userSession";

describe("user session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns the local workspace in anonymous mode", async () => {
    vi.stubEnv("APP_MODE", "anonymous");
    await expect(requireAuthenticatedUser()).resolves.toEqual({
      id: "local-workspace",
      email: null,
      anonymous: true,
    });
  });

  it("returns the session user in multi-user mode", async () => {
    vi.stubEnv("APP_MODE", "multi-user");
    mocks.getSessionUser.mockResolvedValue({ id: "user-a", email: "a@example.com" });
    await expect(requireAuthenticatedUser()).resolves.toEqual({
      id: "user-a",
      email: "a@example.com",
      anonymous: false,
    });
  });

  it("throws 401 when multi-user mode has no session", async () => {
    vi.stubEnv("APP_MODE", "multi-user");
    mocks.getSessionUser.mockResolvedValue(null);
    await expect(requireAuthenticatedUser()).rejects.toMatchObject({
      status: 401,
      message: "请先登录后再生成。",
    } satisfies Partial<AuthRequiredError>);
  });
});
