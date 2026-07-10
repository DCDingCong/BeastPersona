export type AppMode = "anonymous" | "multi-user";

// The open-source branch is usable without any account setup.
export const defaultAppMode: AppMode = "anonymous";

export function getAppMode(): AppMode {
  return process.env.APP_MODE === "multi-user" ? "multi-user" : defaultAppMode;
}

export function isMultiUserMode() {
  return getAppMode() === "multi-user";
}

export const anonymousWorkspaceId = "local-workspace";
