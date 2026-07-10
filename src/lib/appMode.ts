export type AppMode = "anonymous" | "multi-user";

// The deployment branch protects public traffic with local accounts by default.
export const defaultAppMode: AppMode = "multi-user";

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
