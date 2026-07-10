import { anonymousWorkspaceId, getAppMode } from "./appMode";
import { getSessionUser } from "./localAuth";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  anonymous: boolean;
};

export class AuthRequiredError extends Error {
  status = 401;

  constructor(message = "请先登录后再生成。") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export async function getRequestActor(): Promise<AuthenticatedUser | null> {
  if (getAppMode() === "anonymous") {
    return {
      id: anonymousWorkspaceId,
      email: null,
      anonymous: true,
    };
  }

  const user = await getSessionUser();
  return user ? { ...user, anonymous: false } : null;
}

export async function requireAuthenticatedUser() {
  const actor = await getRequestActor();
  if (!actor) throw new AuthRequiredError();
  return actor;
}
