export default function Home() {
  return (
    <main className="h-screen bg-page flex flex-col items-center justify-between px-6 pt-12 pb-6 lg:pt-16 lg:pb-8">

      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className="text-center">
        <h1 className="text-[2.4rem] sm:text-[3rem] lg:text-[4rem] xl:text-[4.5rem] font-bold tracking-tight text-heading leading-none">
          Build<span className="text-brand">Quote</span>
        </h1>
        <p className="text-xs lg:text-sm text-text-muted mt-1.5 uppercase tracking-widest font-semibold">
          buildquote.com.au
        </p>
      </div>

      {/* ── Hero headline ─────────────────────────────────────── */}
      <div className="text-center max-w-xl lg:max-w-3xl">
        <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-heading leading-tight">
          Building materials<br />
          Request for Quotation<br />
          <span className="text-brand mt-1 block">Made simple.</span>
        </p>
        <p className="text-text-secondary text-sm sm:text-base lg:text-lg mt-3 lg:mt-5 leading-relaxed font-medium max-w-md lg:max-w-2xl mx-auto">
          Browse manufacturer product systems, build your materials list
          and send a professional RFQ to your suppliers — in minutes.
        </p>
      </div>

      {/* ── CTAs ──────────────────────────────────────────────── */}
      <div className="flex flex-col items-center w-full max-w-xs lg:max-w-sm gap-2.5">
        <a
          href="/rfq"
          className="bg-brand hover:bg-brand-hover text-white font-bold text-lg lg:text-xl px-10 py-4 rounded-2xl transition-colors text-center shadow-[0_10px_24px_rgba(249,115,22,0.22)] w-full"
        >
          Get Started
        </a>
        <p className="text-text-muted text-sm font-medium">
          Always free for builders and trades
        </p>
        <a
          href="/register"
          className="w-full text-center bg-heading text-white font-bold text-sm lg:text-base px-6 py-3 rounded-xl hover:opacity-90 transition"
        >
          Create free account
        </a>
        <a href="/login" className="text-sm font-semibold text-brand hover:underline">
          Already have an account? Sign in →
        </a>
      </div>

      {/* ── Footer ────────────────────────────────────────────── */}
      <div className="text-center">
        <p className="text-heading text-[10px] lg:text-xs font-bold uppercase tracking-widest opacity-50 mb-2">
          Built in Western Australia
        </p>
        <div className="flex gap-4 justify-center">
          <a href="/privacy" className="text-text-muted text-xs font-medium hover:text-text-secondary">Privacy Policy</a>
          <a href="/terms"   className="text-text-muted text-xs font-medium hover:text-text-secondary">Terms of Use</a>
        </div>
      </div>

    </main>
  )
}
