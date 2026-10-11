import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/oauth/github/return")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const connectorId = url.searchParams.get("connector_id") ?? "";
        const code = url.searchParams.get("code") ?? "";
        const success = url.searchParams.get("success") === "true";
        const offline = url.searchParams.get("offline_access_allowed");
        const error = url.searchParams.get("error");
        const result = success && offline === "false"
          ? { success: true, connectorId, code: null }
          : success && code
            ? { success: true, connectorId, code }
            : { success: false, connectorId, error: error ?? (success ? "Missing code" : "OAuth failed") };
        const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        const safeJson = JSON.stringify(result).replace(/<\//g, "<\\/");
        const html = `<!DOCTYPE html><html><head><title>Finishing connection…</title></head><body style="font-family:system-ui;padding:2rem">
<p>${result.success ? "Connected. Closing…" : "Failed: " + esc((result as { error?: string }).error ?? "Unknown error")}</p>
<script>
const result = ${safeJson};
const message = { type: result.success ? "appUserConnectorOAuthComplete" : "appUserConnectorOAuthFailed", connectorId: result.connectorId, code: result.code ?? null };
if (window.opener && window.opener !== window) window.opener.postMessage(message, window.location.origin);
window.close();
</script></body></html>`;
        return new Response(html, { headers: { "Content-Type": "text/html" } });
      },
    },
  },
});
