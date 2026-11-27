export function SupabaseSetup() {
  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg sm:p-10">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-accent-red">
        One-time setup
      </p>
      <h2 className="text-3xl font-bold text-lighter-black">
        Connect your Supabase project
      </h2>
      <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-6 text-lighter-black">
        <li>Create a Supabase project and run the Gift Elf migration.</li>
        <li>
          Copy <code>.env.example</code> to <code>.env.local</code>.
        </li>
        <li>
          Set <code>VITE_SUPABASE_URL</code> and{" "}
          <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> (or the legacy{" "}
          <code>VITE_SUPABASE_ANON_KEY</code>) in <code>.env.local</code>, then
          restart the dev server.
        </li>
      </ol>
      <p className="mt-5 rounded-lg bg-[#fff3f3] p-4 text-sm leading-6 text-lighter-black">
        Do not put a Supabase service-role key in the browser app. Database
        access is protected by row-level security.
      </p>
    </div>
  )
}
