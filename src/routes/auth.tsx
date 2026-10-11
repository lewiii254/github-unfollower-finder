import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Github, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in — Unfollow" },
    { name: "description", content: "Sign in to connect your GitHub account and unfollow people in one click." },
    { property: "og:title", content: "Sign in — Unfollow" },
    { property: "og:description", content: "Sign in to connect GitHub and unfollow in one click." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { if (session) navigate({ to: "/", replace: true }); }, [session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(""); setMsg("");
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErr(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (error) setErr(error.message);
      else if (!data.session) setMsg("Check your email to confirm your account, then sign in.");
    }
    setBusy(false);
  }

  async function google() {
    setErr("");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) setErr(result.error instanceof Error ? result.error.message : "Google sign-in failed.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 text-xl font-bold"><Github className="size-6" />unfollow<span className="-ml-2 text-muted-foreground">.</span></Link>
        <h1 className="text-center text-2xl font-semibold">{mode === "in" ? "Sign in" : "Create an account"}</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">Needed to connect GitHub and unfollow in one click.</p>
        <Button type="button" variant="outline" className="mt-6 h-11 w-full" onClick={google}>Continue with Google</Button>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
        <form onSubmit={submit} className="space-y-3">
          <Input type="email" required placeholder="Email" aria-label="Email" value={email} onChange={e => setEmail(e.target.value)} className="h-11" />
          <Input type="password" required minLength={6} placeholder="Password" aria-label="Password" value={password} onChange={e => setPassword(e.target.value)} className="h-11" />
          <Button type="submit" disabled={busy} className="h-11 w-full">{busy && <LoaderCircle className="animate-spin" />}{mode === "in" ? "Sign in" : "Sign up"}</Button>
        </form>
        {err && <p role="alert" className="mt-3 text-sm text-destructive">{err}</p>}
        {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-5 w-full text-center text-sm text-muted-foreground hover:text-foreground">
          {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
