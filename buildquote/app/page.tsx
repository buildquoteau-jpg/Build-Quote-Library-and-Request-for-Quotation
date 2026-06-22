export default function Home() {
  return (
    <main className="min-h-screen bg-page flex flex-col items-center px-6 pt-16 pb-12 lg:pt-24 xl:pt-32">

      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className="text-center mb-10 lg:mb-14">
        <h1 className="text-[2.6rem] sm:text-[3.2rem] lg:text-[5.5rem] xl:text-[7rem] font-bold tracking-tight text-heading leading-none">
          Build<span className="text-brand">Quote</span>
        </h1>
        <p className="text-xs lg:text-sm xl:text-base text-text-muted mt-1.5 uppercase tracking-widest font-semibold">
          buildquote.com.au
        </p>
      </div>

      {/* ── Hero headline ─────────────────────────────────────── */}
      <div className="text-center max-w-xl lg:max-w-3xl xl:max-w-4xl mb-8 lg:mb-12">
        <p className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-heading leading-tight">
          Building materials<br />
          Request for Quotation<br />
          <span className="text-brand mt-1 block">Made simple.</span>
        </p>
        <p className="text-text-secondary text-base sm:text-lg lg:text-xl xl:text-2xl mt-4 lg:mt-6 leading-relaxed font-medium max-w-md lg:max-w-2xl mx-auto">
          Browse manufacturer product systems, build your materials list
          and send a professional RFQ to your suppliers — in minutes.
        </p>
      </div>

      {/* ── Primary CTA ───────────────────────────────────────── */}
      <a
        href="/rfq"
        className="bg-brand hover:bg-brand-hover text-white font-bold text-lg lg:text-xl xl:text-2xl px-10 lg:px-16 py-4 lg:py-5 rounded-2xl transition-colors text-center shadow-[0_10px_24px_rgba(249,115,22,0.22)] w-full max-w-xs lg:max-w-sm xl:max-w-md"
      >
        Get Started
      </a>
      <p className="text-text-muted text-sm lg:text-base mt-2 font-medium">
        Always free for builders and trades
      </p>
      <div className="mt-4 flex flex-col items-center gap-2.5 w-full max-w-xs lg:max-w-sm xl:max-w-md">
        <a
          href="/register"
          className="w-full text-center bg-heading text-white font-bold text-sm lg:text-base px-6 py-3 lg:py-4 rounded-xl hover:opacity-90 transition"
        >
          Create free account
        </a>
        <a href="/login" className="text-sm lg:text-base font-semibold text-brand hover:underline">
          Already have an account? Sign in →
        </a>
      </div>


      {/* ── Footer ────────────────────────────────────────────── */}
      <div className="mt-12 lg:mt-20 text-center">
        <p className="text-heading text-[10px] lg:text-xs font-bold uppercase tracking-widest opacity-50 mb-4">
          Built in Western Australia
        </p>
        <div className="flex gap-4 justify-center">
          <a href="/privacy" className="text-text-muted text-xs lg:text-sm font-medium hover:text-text-secondary">Privacy Policy</a>
          <a href="/terms"   className="text-text-muted text-xs lg:text-sm font-medium hover:text-text-secondary">Terms of Use</a>
        </div>
      </div>

    </main>
  )
}
