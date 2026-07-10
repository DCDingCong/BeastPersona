export type AppMode = "anonymous" | "multi-user";

// The open-source branch is usable without any account setup.
export const defaultAppMode: AppMode = "anonymous";

export function getAppMode(): AppMode {
  if (process.env.APP_MODE === "anonymous" || process.env.APP_MODE === "multi-user") {
    return process.env.APP_MODE;
  }
  return defaultAppMode;
}

export function isMultiUserMode() {
  return getAppMode() === "multi-user";
}

export const anonymousWorkspaceId = "local-workspace";
