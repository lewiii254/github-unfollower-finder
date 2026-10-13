import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Github, ShieldCheck, Shield, Users, UserRoundMinus, ScanLine, Check, ChevronDown, LoaderCircle, LockKeyhole, Sparkles, Star, Cpu, Database, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import scene from "@/assets/checker-scene.jpg";
import { summarizeConnections, type Insights } from "@/lib/insights.functions";

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
const REPO = ""; // e.g. "your-username/unfollow" — set to enable the live star count
const REPO_URL = REPO ? `https://github.com/${REPO}` : "https://github.com";
function useStars() {
  const [stars, setStars] = useState<number | null>(null);
  useEffect(() => { if (!REPO) return; fetch(`https://api.github.com/repos/${REPO}`).then(r => r.ok ? r.json() : null).then(d => d && typeof d.stargazers_count === "number" && setStars(d.stargazers_count)).catch(() => {}); }, []);
  return stars;
}
function StarButton() {
  const stars = useStars();
  return <Button asChild variant="outline" className="gap-2"><a href={REPO_URL} target="_blank" rel="noreferrer"><Github />Star on GitHub<span className="flex items-center gap-1 border-l border-border pl-2 text-muted-foreground"><Star className="size-3.5" />{stars ?? "Open source"}</span></a></Button>;
}
const demoPeople = (prefix: string, n: number): Person[] => Array.from({ length: n }, (_, i) => ({ login: `${prefix}-${i + 1}`, html_url: "https://github.com" }));
const DEMO: Result = (() => { const mutuals = demoPeople("mutual-dev", 48); return { username: "demo", followers: [...mutuals, ...demoPeople("fan", 80)], following: [...mutuals, ...demoPeople("one-way", 14)] }; })();

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

function Dashboard({ result }: { result: Result }) {
  const [tab, setTab] = useState<TabKey>("unfollowers");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Map<string, string>>(new Map());
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [insights, setInsights] = useState<Insights | null>(null);
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
  const togglePick = (login: string) => setPicked(prev => { const n = new Map(prev); if (n.has(login)) n.delete(login); else n.set(login, active.label); return n; });
  const pickAllShown = () => setPicked(prev => { const n = new Map(prev); shown.slice(0, 300).forEach(p => n.set(p.login, active.label)); return n; });
  async function analyze() {
    setAiBusy(true); setAiError(""); setInsights(null);
    try {
      const r = await summarizeConnections({ data: { username: result.username, counts: { followers: result.followers.length, following: result.following.length, mutuals: tabs[2]!.people.length, notFollowingBack: tabs[0]!.people.length, notMutuals: tabs[1]!.people.length }, selected: [...picked].slice(0, 300).map(([login, category]) => ({ login, category })) } });
      if (r.ok) setInsights(r.insights); else setAiError(r.error);
    } catch { setAiError("Couldn't reach the AI. Please try again."); }
    finally { setAiBusy(false); }
  }
  return (
    <section aria-live="polite" className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div><p className="text-sm text-muted-foreground">Dashboard</p><h2 className="mt-2 text-2xl font-semibold">@{result.username}</h2></div>
        <p className="text-sm text-muted-foreground">{result.followers.length} followers · {result.following.length} following</p>
      </div>
      <div className="mt-6 rounded-lg border border-border bg-secondary/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4" />AI insights</h3><p className="text-sm text-muted-foreground">Tick accounts below, then get a summary and a list worth reviewing. {picked.size} selected.</p></div>
          <div className="flex gap-2">{picked.size > 0 && <Button variant="ghost" size="sm" onClick={() => setPicked(new Map())}>Clear</Button>}<Button size="sm" disabled={aiBusy || picked.size === 0} onClick={analyze}>{aiBusy ? <LoaderCircle className="animate-spin" /> : <Sparkles />}Summarize</Button></div>
        </div>
        {aiError && <p role="alert" className="mt-3 text-sm text-destructive">{aiError}</p>}
        {insights && <div className="mt-4 space-y-3 text-sm"><p>{insights.summary}</p>{insights.recommendations.length > 0 && <ul className="space-y-2">{insights.recommendations.map(r => <li key={r.login} className="flex flex-wrap items-baseline gap-x-2"><a className="font-semibold underline" href={`https://github.com/${r.login}`} target="_blank" rel="noreferrer">@{r.login}</a><span className="text-muted-foreground">{r.reason}</span></li>)}</ul>}</div>}
      </div>
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
          {shown.length > 0 && <Button variant="ghost" size="sm" onClick={pickAllShown}>Select all shown</Button>}<Input aria-label="Filter usernames" placeholder="Filter usernames" value={query} onChange={e => setQuery(e.target.value)} className="h-10 w-full sm:w-60" />
        </div>
        {shown.length === 0 ? <p className="py-8 text-muted-foreground">{q ? "No usernames match your filter." : active.empty}</p> : <div className="mt-2 grid gap-x-8 sm:grid-cols-2">{shown.map(person => { const on = isProtected(person); return <div key={person.login} className="flex items-center gap-3 border-b border-border py-4"><input type="checkbox" aria-label={`Select ${person.login}`} checked={picked.has(person.login)} onChange={() => togglePick(person.login)} className="size-4 accent-foreground" /><a href={person.html_url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-3 transition-colors hover:text-muted-foreground">{person.avatar_url ? <img src={person.avatar_url} alt="" loading="lazy" className="size-9 shrink-0 rounded-full bg-secondary" /> : <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary"><Github className="size-4" /></span>}<span className="min-w-0 flex-1 truncate">{person.login}</span><ArrowUpRight className="size-4" /></a><Button asChild variant="outline" size="sm"><a href={person.html_url} target="_blank" rel="noreferrer">Open on GitHub</a></Button><Button type="button" variant={on ? "secondary" : "ghost"} size="icon" onClick={() => whitelist.toggle(person.login)} aria-pressed={on} aria-label={on ? `Remove ${person.login} from protected` : `Protect ${person.login}`} title={on ? "Protected — click to remove" : "Protect this account"}>{on ? <ShieldCheck /> : <Shield />}</Button></div>; })}</div>}
      </div>
      <p className="mt-5 text-xs text-muted-foreground">A snapshot of your current connections, not a record of past unfollows.</p>
    </section>
  );
}

async function gh(path: string) {
  const response = await fetch(`https://api.github.com${path}`, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) {
    if (response.status === 404) throw new Error("We couldn't find that GitHub username. Check the spelling and try again.");
    if (response.status === 403 || response.status === 429) throw new Error("GitHub's free hourly limit has been reached. Please try again later.");
    throw new Error("GitHub is unavailable right now. Please try again in a moment.");
  }
  return response;
}

async function getPublicConnections(username: string) {
  const u = encodeURIComponent(username);
  const profile: { followers: number; following: number } = await (await gh(`/users/${u}`)).json();
  const pages = (n: number) => Math.max(1, Math.ceil(n / 100));
  const needed = pages(profile.followers) + pages(profile.following);
  const limit = await fetch("https://api.github.com/rate_limit").then(r => r.json()).catch(() => null) as { rate?: { remaining: number } } | null;
  const remaining = limit?.rate?.remaining ?? 60;
  if (needed > 100 * 2) throw new Error("This account has too many connections for a complete check here.");
  if (needed > remaining) throw new Error(`This check needs ${needed} GitHub requests, but only ${remaining} free ones are left this hour. Please try again later.`);
  const fetchKind = async (kind: "followers" | "following", total: number) => {
    const lists = await Promise.all(Array.from({ length: pages(total) }, (_, i) => gh(`/users/${u}/${kind}?per_page=100&page=${i + 1}`).then(r => r.json() as Promise<Person[]>)));
    return lists.flat();
  };
  const [followers, following] = await Promise.all([fetchKind("followers", profile.followers), fetchKind("following", profile.following)]);
  return { followers, following };
}

const faqs = [
  ["Do I need to sign in with GitHub?", "No. Just enter a GitHub username. We only read publicly available follower and following lists — no password, token, or account access needed."],
  ["Can I see who recently unfollowed me?", "This check shows the people you follow who don't currently follow you back. GitHub doesn't provide historical unfollower data, so it can't tell you when someone unfollowed you."],
  ["Is my GitHub account safe?", "Yes. Checking is read-only. We never sign in or change anything. To unfollow someone, open their profile on GitHub and do it there."],
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
      const data = await getPublicConnections(name);
      setResult({ username: name, followers: data.followers, following: data.following });
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <nav aria-label="Main navigation" className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 md:px-10">
          <a href="#" className="flex items-center gap-2.5 text-xl font-bold"><Github className="size-7" strokeWidth={2} />unfollow<span className="-ml-2 text-muted-foreground">.</span></a>
          <div className="flex items-center gap-7 text-sm"><a href="#how-it-works" className="hidden text-muted-foreground transition-colors hover:text-foreground sm:block">How it works</a><a href="#faq" className="text-muted-foreground transition-colors hover:text-foreground">FAQ</a><span className="hidden sm:inline-flex"><StarButton /></span></div>
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
            {!result && <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-border bg-background/60 p-5 text-left shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Preview</p><Button size="sm" variant="secondary" onClick={() => setResult(DEMO)}>Try with demo account<ArrowRight /></Button></div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["48", "Mutuals"], ["14", "Not following back"], ["3", "Protected"], ["128", "Followers"]].map(([n, l]) => <div key={l} className="rounded-lg border border-border bg-background/70 p-3"><span className="block text-xl font-semibold">{n}</span><span className="text-xs text-muted-foreground">{l}</span></div>)}</div>
              <div className="mt-3 rounded-lg border border-border bg-secondary/50 p-3 text-sm"><p className="flex items-center gap-2 font-semibold"><Sparkles className="size-4" />AI insights</p><p className="mt-1 text-muted-foreground"><span className="font-semibold text-foreground">@one-way-3</span> — inactive for a year and doesn't follow back; worth reviewing.</p></div>
            </div>}
          </div>
        </section>
        {result && <Dashboard result={result} />}
        <section className="mx-auto max-w-6xl px-6 pt-16 md:px-10">
          <div className="mb-8 text-center"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Zero-data guarantee</p><h2 className="mt-3 text-3xl font-semibold">Private by design.</h2></div>
          <div className="grid gap-4 md:grid-cols-3">{[{ icon: Cpu, t: "100% client-side", c: "Connection lists are fetched directly in your browser." }, { icon: Database, t: "No database logging", c: "Your username and relationships are never stored on our servers." }, { icon: KeyRound, t: "Zero permissions", c: "No OAuth permissions or write access requested." }].map(x => <div key={x.t} className="rounded-xl border border-border p-6"><x.icon className="size-5" strokeWidth={1.6} /><h3 className="mt-4 font-semibold">{x.t}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{x.c}</p></div>)}</div>
        </section>
        <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-16 md:px-10">
          <div className="mb-10 flex flex-col items-center gap-3 text-center"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Less guessing. More clarity.</p><h2 className="text-3xl font-semibold">Your connections, untangled.</h2><p className="text-sm text-muted-foreground">One username. A clear picture. That’s it.</p></div>
          <div className="grid gap-8 md:grid-cols-3">
            {[{ icon: ScanLine, title: "Start with a username", copy: "Enter your GitHub handle. No passwords, permissions, or complicated setup.", number: "01" }, { icon: Users, title: "We connect the dots", copy: "We compare your public followers and following lists, straight from GitHub.", number: "02" }, { icon: UserRoundMinus, title: "See who’s not following back", copy: "Get a simple list of one-way connections. What you do next is up to you.", number: "03" }].map(item => <div key={item.number} className="border-t border-border pt-6"><div className="mb-5 flex items-center justify-between"><span className="flex size-11 items-center justify-center rounded-lg bg-secondary"><item.icon className="size-5" strokeWidth={1.6} /></span><span className="font-mono text-xs text-muted-foreground">{item.number}</span></div><h3 className="text-base font-semibold">{item.title}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{item.copy}</p></div>)}
          </div>
        </section>
        <section className="border-y border-border bg-secondary/40 px-6 py-7"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-16 gap-y-5 text-sm text-muted-foreground"><span className="flex items-center gap-2"><ShieldCheck className="size-4" />Your account stays yours</span><span className="flex items-center gap-2"><Github className="size-4" />Powered by GitHub’s public API</span><span className="flex items-center gap-2"><LockKeyhole className="size-4" />We never change your account</span></div></section>
        <section id="faq" className="mx-auto grid max-w-6xl gap-8 px-6 py-20 md:grid-cols-[1fr_1.5fr] md:px-10"><div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Good to know</p><h2 className="text-3xl font-semibold">A few questions,<br />answered.</h2></div><div>{faqs.map(([question, answer], index) => <div key={question} className="border-b border-border"><Button variant="ghost" onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index} aria-controls={`faq-${index}`} className="h-auto w-full justify-between whitespace-normal rounded-none px-0 py-5 text-left text-sm hover:bg-transparent">{question}<ChevronDown className={`shrink-0 transition-transform ${openFaq === index ? "rotate-180" : ""}`} /></Button>{openFaq === index && <p id={`faq-${index}`} className="pb-5 pr-6 text-sm leading-6 text-muted-foreground">{answer}</p>}</div>)}</div></section>
      </main>
      <footer className="border-t border-border"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-7 text-xs text-muted-foreground md:px-10"><span className="flex items-center gap-2 font-semibold text-foreground"><Github className="size-4" />unfollow.</span><a href={REPO_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-foreground"><Star className="size-3.5" />Proudly open source on GitHub</a><span>Not affiliated with GitHub.</span></div></footer>
    </div>
  );
}
