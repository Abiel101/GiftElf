# Gift Elf

Gift Elf is a family Christmas wish-list app built with React, TypeScript, Vite, Tailwind CSS v4, shadcn/ui components, and Supabase. It keeps the original holiday palette and animated tree intro while family members share wish lists, secretly claim gifts, and coordinate team-ups.

## Supabase setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run the files in [`supabase/migrations`](./supabase/migrations) in filename order. For an existing project, run any migrations that have not yet been applied, including `20261128030000_personal_app_theme.sql`.
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the project's API settings. `VITE_SUPABASE_ANON_KEY` is also supported for older projects. These are browser-safe project values; never put a `service_role` key in the app.
4. Enable email/password authentication in Supabase. If email confirmation is on, new users need to confirm before signing in.

The migration creates yearly families, family membership and pending invite records, shared profiles, private birth years, wish-list gifts, secret claims, and team-ups. Birth years are private and age sharing is opt-in; shared ages are generalized (ages 21–24 appear as “Older than 20, younger than 25,” and other ages are shown by decade). It enables row-level security on every table. Gift owners cannot read claims or team-up records for their own gifts; claims and team-ups are made through server-side database functions. Family invite codes expire at the end of their family year. Supabase Realtime updates family membership, wish lists, claims, and team-ups while respecting the same owner-privacy policies.

The app supports email/password and Google sign-in. To enable Google OAuth:

1. In Google Cloud, create a Web OAuth client and add
   `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized
   redirect URI.
2. In Supabase, open **Authentication → Sign In / Providers → Google**, enable
   Google, and enter the OAuth client ID and secret. Keep the secret in
   Supabase; do not add it to `.env.local` or the frontend.
3. In **Authentication → URL Configuration**, set the Site URL to your
   deployed app's HTTPS URL. Add that URL to the Redirect URLs list, along
   with `http://localhost:5173/**` for local development.

Google sign-in returns to the origin where the app was opened. To sign in on a
phone away from your home network, deploy the app to a public HTTPS address (or
use a temporary HTTPS tunnel for testing), add that address to the Supabase
Redirect URLs list, and open the same address on the phone. Add each new tunnel
address when it changes. `localhost` refers to the device itself, so a phone
cannot use `localhost:5173` to reach a server running on your computer. If the
app's address is not allowed, Supabase may fall back to its Site URL, which can
send users to localhost if that is still configured there. The Google Cloud
redirect URI remains the Supabase callback from step 1, not the app URL.

When new-user sign-ups are enabled in Supabase, a user's first Google sign-in
creates their account automatically. The migration's `on_auth_user_created`
trigger also creates their GiftElf profile and private profile, so they can
continue without completing a separate email sign-up.

Family owners can regenerate an invite, immediately invalidating the old link,
QR code, and typed code. The owner can delete a family only while they are its
sole member; deletion also removes that family's gifts and invitations. To
join, enter the invite code manually or scan its QR code from the Family page.
Camera scanning requires camera permission and a secure context (HTTPS, or
localhost for development). Invite and email confirmation redirect URLs must be
allowed in Supabase URL Configuration.

Each user can choose an account-saved app theme in their profile, including
Cyberpunk. The default follows the active family's tree theme; a personal
choice changes only that user's app colors, not the shared tree.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

The original photos, background, tree, and snow animation are served from `public/img`. Tailwind theme colors and intro animations are defined in `src/index.css`.
