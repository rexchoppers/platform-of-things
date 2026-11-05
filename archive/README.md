# Archive

What's left from before the 2026 world rebuild. Nothing here is built or shipped: `tsconfig.json` only includes `src/`, and Vite only bundles what the game imports.

Everything else has moved into the game and was removed from here. The whole previous game is still in git at commit `a4b7463`. To read a file from it without touching your working files:

```bash
git show a4b7463:src/objects/Decorations.ts
```

## `original-game/`

| File | Why it's still here |
|------|---------------------|
| `src/objects/Dog.ts` | Ivy as she was before her movement was rewritten and she was made a little smaller. Her model is still handbuilt in `src/objects/Dog.ts`. |
