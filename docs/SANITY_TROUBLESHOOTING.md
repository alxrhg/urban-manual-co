# Sanity Troubleshooting

### 1. `Missing NEXT_PUBLIC_SANITY_PROJECT_ID`
The Studio and client throw if the project ID is absent. Confirm `NEXT_PUBLIC_SANITY_PROJECT_ID` is present locally (`.env.local`) and in hosted environments.

### 2. `Error: Project ID is not a valid` or CORS errors
Ensure the Sanity project allows the domain you are using:
- Run `sanity cors add http://localhost:3000` (local) and production domains.

### 3. Studio loads but schema changes do not appear
Sanity caches the compiled schema between builds. Restart `npm run dev` after editing files under `sanity/schemas`.

### 4. Studio shows "invalid token" or cannot save content
If the Studio requires authenticated mutations, set `SANITY_TOKEN` to a token with `editor` permissions. For local-only edits, you can run `sanity login` and use the Sanity CLI, but bundling with Next.js requires the token.

### 5. GROQ queries return stale data
Set `NEXT_PUBLIC_SANITY_USE_CDN=false` when you need real-time reads (e.g., preview). When `true`, Sanity caches responses across PoPs.

### 6. Build failures referencing `next-sanity/studio`
Make sure the `app/studio/[[...index]]/page.tsx` file lives inside the `app` directory (app router). The Studio cannot be rendered inside the pages router.

### 7. Cannot access Studio in production
Verify your authentication mode. Sanity Studio hosted inside Next can use Sanity's built-in login providers, but the domain must be whitelisted in the Sanity project settings under **Project > API > CORS origins**.
