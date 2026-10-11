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

- Keep the single-page checker at `/` and query GitHub's public API directly from the browser; the page is read-only and does not require credentials or server storage.
- Describe results as current non-mutual connections, not historical unfollows, because GitHub's public API does not expose unfollower history.
