<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the checker at `/` and read follower lists from GitHub's public API in the browser, so checking works without sign-in.
- Account-changing GitHub actions (unfollow) go through server functions using each signed-in user's own GitHub App User Connector connection, stored encrypted in `app_user_connections`; never use shared credentials.
- Store the protected-accounts whitelist in browser localStorage, since checking needs no account.
- Describe results as current non-mutual connections, not historical unfollows, because GitHub's public API does not expose unfollower history.
