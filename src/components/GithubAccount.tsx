import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Github, LoaderCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { completeGithubConnect, disconnectGithub, getGithubStatus, startGithubConnect } from "@/server/github.functions";

type Status = { connected: boolean; reconnectRequired: boolean; login: string | null };
type Ctx = { signedIn: boolean; status: Status | null; refresh: () => Promise<void>; markReconnect: () => void };
const GithubCtx = createContext<Ctx>({ signedIn: false, status: null, refresh: async () => {}, markReconnect: () => {} });
export const useGithubAccount = () => useContext(GithubCtx);

function waitForOAuth(popup: Window) {
  return new Promise<string | null>((resolve, reject) => {
    const cleanup = () => { window.removeEventListener("message", onMessage); window.clearInterval(poll); };
    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (event.origin !== window.location.origin || event.source !== popup || event.data?.connectorId !== "github" || (type !== "appUserConnectorOAuthComplete" && type !== "appUserConnectorOAuthFailed")) return;
      cleanup();
      if (type === "appUserConnectorOAuthComplete") resolve(typeof event.data?.code === "string" ? event.data.code : null);
      else { popup.close(); reject(new Error("GitHub connection failed.")); }
    };
    window.addEventListener("message", onMessage);
    const poll = window.setInterval(() => { if (popup.closed) { cleanup(); reject(new Error("The GitHub window was closed before finishing.")); } }, 500);
  });
}

export function GithubAccountProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [status, setStatus] = useState<Status | null>(null);
  const refresh = useCallback(async () => {
    if (!session) { setStatus(null); return; }
    try { setStatus(await getGithubStatus()); } catch { setStatus({ connected: false, reconnectRequired: false, login: null }); }
  }, [session]);
  useEffect(() => { refresh(); }, [refresh]);
  const markReconnect = () => setStatus({ connected: false, reconnectRequired: true, login: null });
  return <GithubCtx.Provider value={{ signedIn: !!session, status, refresh, markReconnect }}>{children}</GithubCtx.Provider>;
}

export function GithubAccountBar() {
  const { signedIn, status, refresh } = useGithubAccount();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  async function connect() {
    setErr(""); setNote("");
    const popup = window.open("", "github-oauth", "width=600,height=720");
    if (!popup) { setErr("Your browser blocked the pop-up. Allow pop-ups and try again."); return; }
    setBusy(true);
    try {
      const { authorizationUrl } = await startGithubConnect();
      const done = waitForOAuth(popup);
      popup.location.href = authorizationUrl;
      const code = await done;
      if (code) await completeGithubConnect({ data: { code } });
      await refresh();
      setNote(status?.reconnectRequired ? "Reconnected to GitHub." : "GitHub connected.");
    } catch (e) { popup.close(); setErr(e instanceof Error ? e.message : "Couldn't connect GitHub."); }
    finally { setBusy(false); }
  }
  async function disconnect() { setBusy(true); try { await disconnectGithub(); await refresh(); setNote("GitHub disconnected."); } catch { setErr("Couldn't disconnect."); } finally { setBusy(false); } }

  if (!signedIn) return <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4 text-sm"><span className="text-muted-foreground">Want to unfollow right from here? Sign in and connect GitHub.</span><Button asChild size="sm"><Link to="/auth">Sign in</Link></Button></div>;
  return (
    <div className="rounded-lg border border-border p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {status?.connected
          ? <span className="flex items-center gap-2"><Github className="size-4" />Connected as <strong>@{status.login}</strong></span>
          : <span className="text-muted-foreground">{status?.reconnectRequired ? "Your GitHub access needs to be renewed." : "Connect GitHub to unfollow in one click."}</span>}
        <div className="flex gap-2">
          {status?.connected
            ? <Button size="sm" variant="outline" onClick={disconnect} disabled={busy}>Disconnect GitHub</Button>
            : <Button size="sm" onClick={connect} disabled={busy || !status}>{busy && <LoaderCircle className="animate-spin" />}<Github />{status?.reconnectRequired ? "Reconnect GitHub" : "Connect GitHub"}</Button>}
          <Button size="sm" variant="ghost" onClick={() => supabase.auth.signOut()} aria-label="Sign out" title="Sign out"><LogOut /></Button>
        </div>
      </div>
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
      {err && <p role="alert" className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  );
}
