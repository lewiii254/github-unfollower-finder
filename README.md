<div align="center">

# 🐙 Unfollow — GitHub Unfollower Checker

**See who doesn't follow you back on GitHub. Just a username, no sign-in, nothing stored on a server.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TanStack Start](https://img.shields.io/badge/TanStack-Start-FF4154.svg)](https://tanstack.com/start)
[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC.svg)](https://tailwindcss.com)
[![No login](https://img.shields.io/badge/Login-not%20required-success.svg)](#-privacy)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#-contributing)

[Features](#-features) · [Quick start](#-quick-start) · [How it works](#-how-it-works) · [Privacy](#-privacy) · [Roadmap](#-roadmap) · [Contributing](#-contributing)

</div>

---

## ✨ Features

| | |
|---|---|
| 🔓 **No sign-in** | Type any GitHub username and check. No OAuth, no tokens, no passwords. |
| 📊 **Clear dashboard** | Five tabs with live counts: **Not following back**, **Not mutuals**, **Mutuals**, **Followers**, **Following**. |
| 🛡️ **Protected list** | Shield friends, mentors or orgs so they never show up in "Not following back". Saved in your browser only. |
| ✨ **AI insights** | Tick accounts and press **Summarize** for a short overview of your follow relationships and accounts worth reviewing. |
| 🔗 **Unfollow on GitHub** | Every row has an **Open on GitHub** button — you stay in control and unfollow on GitHub itself. |
| ⚡ **Rate-limit aware** | Pages load in parallel and you get a clear message before GitHub's hourly limit is hit. |

> **Note:** Results show your *current* connections. GitHub's public API has no unfollow history, so this tool shows who doesn't follow back *right now* — not who unfollowed you and when.

---

## 🚀 Quick start

**Requirements:** Node.js 20+ or [Bun](https://bun.sh)

```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
bun install        # or: npm install
bun run dev        # or: npm run dev
```

Open the local URL shown in your terminal and enter a GitHub username.

### Environment

The checker itself needs no configuration. The optional **AI insights** feature runs on the server and needs:

| Variable | Purpose |
|---|---|
| `LOVABLE_API_KEY` | Key for the AI Gateway used by the Summarize button (server-side only). |

### Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start the dev server |
| `bun run build` | Production build |
| `bun run preview` | Preview the production build |
| `bun run test` | Run tests (Vitest) |
| `bun run lint` | Lint with ESLint |
| `bun run format` | Format with Prettier |

---

## 🧠 How it works

```text
 username ──► GitHub public API (from your browser)
                 │
                 ├─ /users/:name            profile + counts
                 ├─ /users/:name/followers  paginated, fetched in parallel
                 └─ /users/:name/following  paginated, fetched in parallel
                 │
                 ▼
        compare sets in the browser
                 │
   ┌─────────────┼──────────────┬─────────────┐
   ▼             ▼              ▼             ▼
Not following  Not mutuals    Mutuals     Followers / Following
   back      (minus protected accounts from localStorage)
                 │
                 ▼ (optional, only accounts you tick)
        server function ──► AI Gateway ──► summary + review list
```

**Rate limits:** unauthenticated GitHub requests are limited to about **60 per hour per IP**, and each page holds 100 accounts. Very large accounts (~20,000+ combined connections) may not be checkable in one go.

---

## 🔒 Privacy

- **Nothing to sign into** — the app never asks for GitHub access.
- **Data stays in your browser** — follower lists are fetched and compared on your device.
- **Protected list is local** — stored in `localStorage` under `unfollow:whitelist`.
- **AI is opt-in** — only the usernames you tick, plus your counts, are sent when you press Summarize.
- **No changes to your account** — unfollowing only ever happens on GitHub, by you.

---

## 🛠️ Tech stack

- [TanStack Start](https://tanstack.com/start) — full-stack React 19 with server functions
- [TanStack Router](https://tanstack.com/router) & [Query](https://tanstack.com/query)
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Lucide](https://lucide.dev) icons · [Vite](https://vitejs.dev) · [Vitest](https://vitest.dev)

### Project structure

```text
src/
├─ routes/index.tsx           # The checker page and dashboard
├─ lib/insights.functions.ts  # AI summary server function
├─ components/ui/             # shadcn/ui components
└─ styles.css                 # Design tokens and theme
```

---

## 🗺️ Roadmap

- [ ] Optional personal token (kept in the browser) for higher rate limits
- [ ] Snapshot history to show real "unfollowed you since…" changes
- [ ] Export results as CSV / JSON
- [ ] Copy `gh` CLI commands to bulk-unfollow from your terminal
- [ ] Flag inactive accounts
- [ ] Sort by followers, join date and more

Have an idea? [Open an issue](../../issues).

---

## 🤝 Contributing

Contributions of all sizes are welcome!

1. Fork the repo
2. Create a branch: `git checkout -b feature/my-idea`
3. Commit: `git commit -m "Add my idea"`
4. Push: `git push origin feature/my-idea`
5. Open a pull request

Please run `bun run lint` and `bun run test` before submitting.

---

## 📄 License

Released under the [MIT License](LICENSE).

<div align="center">

Built with [Lovable](https://lovable.dev) · If this helped you, consider giving it a ⭐

</div>
