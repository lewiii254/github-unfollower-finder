import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Github, ShieldCheck, Shield, Users, UserRoundMinus, ScanLine, Check, ChevronDown, LoaderCircle, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import scene from "@/assets/checker-scene.jpg";
import { GithubAccountBar, GithubAccountProvider, useGithubAccount } from "@/components/GithubAccount";
import { unfollowGithubUser } from "@/lib/github.functions";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({ meta: [
    { title: "Unfollow — GitHub Unfollower Checker" },
    { name: "description", content: "Find out who doesn't follow you back on GitHub. Check your public connections with just a username, no sign-in required." },
    { property: "og:title", content: "Unfollow — GitHub Unfollower Checker" },
    { property: "og:description", content: "Your GitHub connections, a little clearer. A free, simple way to see who doesn't follow you back." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
});

type Person = { login: string; html_url: string; avatar_url?: string };
type Result = { username: string; followers: Person[]; following: Person[] };
type TabKey = "unfollowers" | "notMutuals" | "mutuals" | "followers" | "following" | "protected";
const WHITELIST_KEY = "unfollow:whitelist";

function useWhitelist() {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(WHITELIST_KEY) || "[]"); if (Array.isArray(saved)) setList(saved.filter((x): x is string => typeof x === "string")); } catch { /* ignore */ }
  }, []);
  const toggle = (login: string) => setList(prev => {
    const key = login.toLowerCase();
    const next = prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key];
    localStorage.setItem(WHITELIST_KEY, JSON.stringify(next));
    return next;
  });
  return { set: new Set(list), toggle };
}

function Dashboard(props: { result: Result }) {
  return <GithubAccountProvider><DashboardInner {...props} /></GithubAccountProvider>;
}

function DashboardInner({ result: initial }: { result: Result }) {
  const gh = useGithubAccount();
  const [unfollowed, setUnfollowed] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const result = { ...initial, following: initial.following.filter(p => !unfollowed.has(p.login.toLowerCase())) };
  const canUnfollow = !!gh.status?.connected && gh.status.login?.toLowerCase() === initial.username.toLowerCase();
  async function unfollow(login: string) {
    if (!window.confirm(`Unfollow @${login} on GitHub?`)) return;
    setPending(login); setActionError("");
    try {
      const r = await unfollowGithubUser({ data: { login } });
      if (r.ok) setUnfollowed(prev => new Set(prev).add(login.toLowerCase()));
      else if (r.reason === "reconnect") { gh.markReconnect(); setActionError("Your GitHub access needs to be renewed. Reconnect above."); }
      else setActionError("Connect GitHub first.");
    } catch (e) { setActionError(e instanceof Error ? e.message : "Couldn't unfollow."); }
    finally { setPending(null); }
  }
  const [tab, setTab] = useState<TabKey>("unfollowers");
  const [query, setQuery] = useState("");
  const whitelist = useWhitelist();
  const followerSet = new Set(result.followers.map(p => p.login.toLowerCase()));
  const followingSet = new Set(result.following.map(p => p.login.toLowerCase()));
  const isProtected = (p: Person) => whitelist.set.has(p.login.toLowerCase());
  const allPeople = [...result.following, ...result.followers.filter(p => !followingSet.has(p.login.toLowerCase()))];
  const tabs: { key: TabKey; label: string; hint: string; empty: string; people: Person[] }[] = [
    { key: "unfollowers", label: "Not following back", hint: "You follow them, they don't currently follow you. Protected accounts are hidden here.", empty: "Everyone you follow follows you back (or is protected).", people: result.following.filter(p => !followerSet.has(p.login.toLowerCase()) && !isProtected(p)) },
    { key: "notMutuals", label: "Not mutuals", hint: "They follow you, you don't follow them back.", empty: "You follow back everyone who follows you.", people: result.followers.filter(p => !followingSet.has(p.login.toLowerCase())) },
    { key: "mutuals", label: "Mutuals", hint: "You follow each other.", empty: "No mutual connections yet.", people: result.following.filter(p => followerSet.has(p.login.toLowerCase())) },
    { key: "followers", label: "Followers", hint: "Everyone who follows you.", empty: "No followers yet.", people: result.followers },
    { key: "following", label: "Following", hint: "Everyone you follow.", empty: "Not following anyone yet.", people: result.following },
    { key: "protected", label: "Protected", hint: "Accounts you've protected. They never appear in “Not following back”. Saved in this browser.", empty: "No protected accounts yet. Tap the shield next to anyone to protect them.", people: allPeople.filter(isProtected) },
  ];
  const active = tabs.find(t => t.key === tab)!;
  const q = query.trim().toLowerCase();
  const shown = q ? active.people.filter(p => p.login.toLowerCase().includes(q)) : active.people;
  return (
    <section aria-live="polite" className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div><p className="text-sm text-muted-foreground">Dashboard</p><h2 className="mt-2 text-2xl font-semibold">@{result.username}</h2></div>
        <p className="text-sm text-muted-foreground">{result.followers.length} followers · {result.following.length} following</p>
      </div>
      <div className="mt-6"><GithubAccountBar /></div>
      {gh.status?.connected && !canUnfollow && <p className="mt-2 text-xs text-muted-foreground">Unfollow buttons appear when you check your own username (@{gh.status.login}).</p>}
      {actionError && <p role="alert" className="mt-3 text-sm text-destructive">{actionError}</p>}
      <div role="tablist" aria-label="Connection categories" className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {tabs.map(t => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`rounded-lg border p-3 text-left transition-colors ${tab === t.key ? "border-foreground bg-secondary" : "border-border hover:bg-secondary/50"}`}>
            <span className="block text-2xl font-semibold">{t.people.length}</span>
            <span className="block text-xs text-muted-foreground">{t.label}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-lg font-semibold">{active.label}</h3><p className="text-sm text-muted-foreground">{active.hint}</p></div>
          <Input aria-label="Filter usernames" placeholder="Filter usernames" value={query} onChange={e => setQuery(e.target.value)} className="h-10 w-full sm:w-60" />
        </div>
        {shown.length === 0 ? <p className="py-8 text-muted-foreground">{q ? "No usernames match your filter." : active.empty}</p> : <div className="mt-2 grid gap-x-8 sm:grid-cols-2">{shown.map(person => { const on = isProtected(person); return <div key={person.login} className="flex items-center gap-3 border-b border-border py-4"><a href={person.html_url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-3 transition-colors hover:text-muted-foreground">{person.avatar_url ? <img src={person.avatar_url} alt="" loading="lazy" className="size-9 shrink-0 rounded-full bg-secondary" /> : <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary"><Github className="size-4" /></span>}<span className="min-w-0 flex-1 truncate">{person.login}</span><ArrowUpRight className="size-4" /></a>{canUnfollow && (tab === "unfollowers" || tab === "following" || tab === "mutuals") && <Button type="button" variant="outline" size="sm" disabled={pending === person.login} onClick={() => unfollow(person.login)}>{pending === person.login ? <LoaderCircle className="animate-spin" /> : null}Unfollow</Button>}<Button type="button" variant={on ? "secondary" : "ghost"} size="icon" onClick={() => whitelist.toggle(person.login)} aria-pressed={on} aria-label={on ? `Remove ${person.login} from protected` : `Protect ${person.login}`} title={on ? "Protected — click to remove" : "Protect this account"}>{on ? <ShieldCheck /> : <Shield />}</Button></div>; })}</div>}
      </div>
      <p className="mt-5 text-xs text-muted-foreground">A snapshot of your current connections, not a record of past unfollows.</p>
    </section>
  );
}

async function getConnections(username: string, kind: "followers" | "following") {
  const people: Person[] = [];
  for (let page = 1; page <= 100; page++) {
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/${kind}?per_page=100&page=${page}`, { headers: { Accept: "application/vnd.github+json" } });
    if (!response.ok) {
      if (response.status === 404) throw new Error("We couldn't find that GitHub username. Check the spelling and try again.");
      if (response.status === 403 || response.status === 429) throw new Error("GitHub's request limit has been reached. Please try again later.");
      throw new Error("GitHub is unavailable right now. Please try again in a moment.");
    }
    const batch: Person[] = await response.json();
    people.push(...batch);
    if (batch.length < 100) return people;
  }
  throw new Error("This account has too many connections for a complete check here.");
}

const faqs = [
  ["Do I need to sign in with GitHub?", "No. Just enter a GitHub username. We only read publicly available follower and following lists — no password, token, or account access needed."],
  ["Can I see who recently unfollowed me?", "This check shows the people you follow who don't currently follow you back. GitHub doesn't provide historical unfollower data, so it can't tell you when someone unfollowed you."],
  ["Is my GitHub account safe?", "Yes. The checker is read-only and makes requests directly to GitHub from your browser. It never follows, unfollows, or changes anything on your account."],
  ["Is it really free?", "Yes. There are no paid plans. GitHub's public request limits apply, so you may occasionally need to wait before checking again."],
];

function Index() {
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  async function check(event: React.FormEvent) {
    event.preventDefault();
    const name = username.trim().replace(/^@/, "");
    if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(name)) { setError("Enter a valid GitHub username to get started."); return; }
    setBusy(true); setError(""); setResult(null);
    try {
      const [followers, following] = await Promise.all([getConnections(name, "followers"), getConnections(name, "following")]);
      setResult({ username: name, followers, following });
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <nav aria-label="Main navigation" className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 md:px-10">
          <a href="#" className="flex items-center gap-2.5 text-xl font-bold"><Github className="size-7" strokeWidth={2} />unfollow<span className="-ml-2 text-muted-foreground">.</span></a>
          <div className="flex items-center gap-7 text-sm"><a href="#how-it-works" className="hidden text-muted-foreground transition-colors hover:text-foreground sm:block">How it works</a><a href="#faq" className="text-muted-foreground transition-colors hover:text-foreground">FAQ</a><Button asChild variant="outline" className="hidden gap-2 sm:inline-flex"><a href="https://github.com" target="_blank" rel="noreferrer"><Github />GitHub<ArrowUpRight /></a></Button></div>
        </nav>
      </header>
      <main>
        <section className="relative isolate min-h-[650px] overflow-hidden border-b border-border px-6 pb-20 pt-20 md:pt-24">
          <img src={scene} alt="" width={1536} height={1024} className="hero-scene -z-10" />
          <div className="mx-auto max-w-3xl text-center">
            <div className="mint-label mb-7 inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium"><span className="size-1.5 rounded-full bg-foreground" />A little clarity for your connections</div>
            <h1 className="hero-title">GitHub unfollower<br />checker<span className="text-muted-foreground">.</span></h1>
            <p className="mx-auto mt-6 max-w-lg text-lg leading-7 text-muted-foreground">You follow them. Do they follow you?<br className="hidden sm:block" /> Find out who’s not following you back on GitHub.</p>
            <form onSubmit={check} className="mx-auto mt-9 max-w-[550px]">
              <div className="flex flex-col gap-2 rounded-lg border border-input bg-background p-1.5 shadow-sm sm:flex-row">
                <div className="relative min-w-0 flex-1"><Github className="absolute left-3.5 top-3.5 size-5 text-muted-foreground" /><Input aria-label="GitHub username" placeholder="Enter your GitHub username" autoComplete="off" spellCheck={false} value={username} onChange={event => setUsername(event.target.value)} className="h-12 border-0 pl-11 text-sm shadow-none focus-visible:ring-0" disabled={busy} /></div>
                <Button type="submit" disabled={busy} className="h-12 px-5">{busy ? <><LoaderCircle className="animate-spin" />Checking…</> : <>Check unfollowers<ArrowRight /></>}</Button>
              </div>
              {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Check className="size-3.5" />No sign-in needed</span><span className="flex items-center gap-1.5"><Check className="size-3.5" />100% free</span><span className="flex items-center gap-1.5"><LockKeyhole className="size-3.5" />Read-only access</span></div>
            </form>
          </div>
        </section>
        {result && <Dashboard result={result} />}
        <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-16 md:px-10">
          <div className="mb-10 flex flex-col items-center gap-3 text-center"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Less guessing. More clarity.</p><h2 className="text-3xl font-semibold">Your connections, untangled.</h2><p className="text-sm text-muted-foreground">One username. A clear picture. That’s it.</p></div>
          <div className="grid gap-8 md:grid-cols-3">
            {[{ icon: ScanLine, title: "Start with a username", copy: "Enter your GitHub handle. No passwords, permissions, or complicated setup.", number: "01" }, { icon: Users, title: "We connect the dots", copy: "We compare your public followers and following lists, straight from GitHub.", number: "02" }, { icon: UserRoundMinus, title: "See who’s not following back", copy: "Get a simple list of one-way connections. What you do next is up to you.", number: "03" }].map(item => <div key={item.number} className="border-t border-border pt-6"><div className="mb-5 flex items-center justify-between"><span className="flex size-11 items-center justify-center rounded-lg bg-secondary"><item.icon className="size-5" strokeWidth={1.6} /></span><span className="font-mono text-xs text-muted-foreground">{item.number}</span></div><h3 className="text-base font-semibold">{item.title}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{item.copy}</p></div>)}
          </div>
        </section>
        <section className="border-y border-border bg-secondary/40 px-6 py-7"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-16 gap-y-5 text-sm text-muted-foreground"><span className="flex items-center gap-2"><ShieldCheck className="size-4" />Your account stays yours</span><span className="flex items-center gap-2"><Github className="size-4" />Powered by GitHub’s public API</span><span className="flex items-center gap-2"><LockKeyhole className="size-4" />No account changes. Ever.</span></div></section>
        <section id="faq" className="mx-auto grid max-w-6xl gap-8 px-6 py-20 md:grid-cols-[1fr_1.5fr] md:px-10"><div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Good to know</p><h2 className="text-3xl font-semibold">A few questions,<br />answered.</h2></div><div>{faqs.map(([question, answer], index) => <div key={question} className="border-b border-border"><Button variant="ghost" onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index} aria-controls={`faq-${index}`} className="h-auto w-full justify-between whitespace-normal rounded-none px-0 py-5 text-left text-sm hover:bg-transparent">{question}<ChevronDown className={`shrink-0 transition-transform ${openFaq === index ? "rotate-180" : ""}`} /></Button>{openFaq === index && <p id={`faq-${index}`} className="pb-5 pr-6 text-sm leading-6 text-muted-foreground">{answer}</p>}</div>)}</div></section>
      </main>
      <footer className="border-t border-border"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-7 text-xs text-muted-foreground md:px-10"><span className="flex items-center gap-2 font-semibold text-foreground"><Github className="size-4" />unfollow.</span><span>Built for a little less guesswork.</span><span>Not affiliated with GitHub.</span></div></footer>
    </div>
  );
}
