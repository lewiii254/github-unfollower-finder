import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const CONNECTOR = "github";
const GITHUB_SCOPES = ["read:user", "user:follow"];
const GH_HEADERS = { Accept: "application/vnd.github+json" };

export const startGithubConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { authorizeAppUserOAuth } = await import("@/integrations/lovable/appUserConnector");
    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const clientAPIKey = process.env['GITHUB_APP_USER_CONNECTOR_CLIENT_API_KEY'];
    if (!clientAPIKey) throw new Error("GitHub connection isn't set up yet.");
    const request = getRequest();
    const url = new URL(request.url);
    const sandboxHost = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const returnUrl = new URL("/api/oauth/github/return", sandboxHost ? `https://${sandboxHost}` : url.origin).toString();
    const existing = await getConnectionKeyForUser(context.userId, CONNECTOR);
    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: CONNECTOR,
      appUserId: context.userId,
      clientAPIKey,
      returnUrl,
      ...(existing ? { connectionAPIKey: existing } : {}),
      credentialsConfiguration: { scopes: GITHUB_SCOPES },
    });
    return { authorizationUrl };
  });

export const completeGithubConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => {
    if (typeof input?.code !== "string" || !input.code) throw new Error("Missing code");
    return { code: input.code };
  })
  .handler(async ({ data, context }) => {
    const { exchangeAppUserOAuthCode } = await import("@/integrations/lovable/appUserConnector");
    const { saveConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(GATEWAY_BASE_URL, data.code);
    if (connectorId !== CONNECTOR) throw new Error("Connection returned for the wrong service");
    await saveConnectionKeyForUser(context.userId, connectorId, connectionAPIKey);
    return { ok: true };
  });

export const getGithubStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { callAsAppUser, appUserReconnectRequired } = await import("@/integrations/lovable/appUserConnector");
    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR);
    if (!key) return { connected: false as const, reconnectRequired: false, login: null };
    const res = await callAsAppUser({ gatewayBaseUrl: GATEWAY_BASE_URL, connectionAPIKey: key, connectorId: CONNECTOR, path: "/user", init: { headers: GH_HEADERS }, requiredScopes: GITHUB_SCOPES });
    if (await appUserReconnectRequired(res)) return { connected: false as const, reconnectRequired: true, login: null };
    if (!res.ok) { const t = await res.text(); console.error(`GitHub /user failed [${res.status}]: ${t}`); throw new Error(`GitHub lookup failed (${res.status})`); }
    const user = (await res.json()) as { login: string };
    return { connected: true as const, reconnectRequired: false, login: user.login };
  });

export const unfollowGithubUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { login: string }) => {
    const login = String(input?.login ?? "");
    if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(login)) throw new Error("Invalid username");
    return { login };
  })
  .handler(async ({ data, context }) => {
    const { callAsAppUser, appUserReconnectRequired } = await import("@/integrations/lovable/appUserConnector");
    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR);
    if (!key) return { ok: false as const, reason: "not_connected" as const };
    const res = await callAsAppUser({ gatewayBaseUrl: GATEWAY_BASE_URL, connectionAPIKey: key, connectorId: CONNECTOR, path: `/user/following/${encodeURIComponent(data.login)}`, init: { method: "DELETE", headers: GH_HEADERS }, requiredScopes: GITHUB_SCOPES });
    if (await appUserReconnectRequired(res)) return { ok: false as const, reason: "reconnect" as const };
    if (res.status === 204) return { ok: true as const };
    const t = await res.text();
    console.error(`GitHub unfollow failed [${res.status}]: ${t}`);
    throw new Error(res.status === 403 || res.status === 429 ? "GitHub's limit was reached. Try again shortly." : `GitHub couldn't unfollow (${res.status}).`);
  });

export const disconnectGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { disconnectAppUser } = await import("@/integrations/lovable/appUserConnector");
    const { getConnectionKeyForUser, deleteConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR);
    if (key) await disconnectAppUser({ gatewayBaseUrl: GATEWAY_BASE_URL, connectionAPIKey: key, connectorId: CONNECTOR });
    await deleteConnectionKeyForUser(context.userId, CONNECTOR);
    return { ok: true };
  });
