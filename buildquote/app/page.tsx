export default function Home() {
  return (
    <main className="min-h-screen bg-page flex flex-col items-center justify-center px-6 shadow-[0_10px_30px_rgba(24,93,122,0.15)]">
      <div className="mb-8 text-center">
        <h1 className="text-[2.5rem] font-bold tracking-tight text-heading">
          Build<span className="text-brand">Quote</span>
        </h1>
        <p className="text-xs text-text-muted mt-1 uppercase tracking-widest">
          buildquote.com.au
        </p>
      </div>
      <div className="text-center mb-5 w-full max-w-2xl px-2">
        <p className="text-2xl font-extrabold tracking-tight text-text-primary leading-tight">
          Your handwritten materials list.<br />
          Turned into a professional RFQ.<br />
          <span className="text-brand">Instantly.</span>
        </p>
        <div className="mt-5 mx-auto w-full max-w-lg flex items-center justify-center gap-1.5 flex-wrap px-2">
          <span className="text-heading text-base font-semibold leading-none">Snap a photo</span>
          <span className="text-brand text-base font-bold leading-none">-&gt;</span>
          <span className="text-heading text-base font-semibold leading-none">We read it</span>
          <span className="text-brand text-base font-bold leading-none">-&gt;</span>
          <span className="text-heading text-base font-semibold leading-none">You review it</span>
          <span className="text-brand text-base font-bold leading-none">-&gt;</span>
          <span className="text-heading text-base font-semibold leading-none">Hit send</span>
        </div>
      </div>
      
      <a
        href="/coming-soon"
        className="bg-brand hover:bg-brand-hover active:bg-brand-hover text-white font-bold text-lg px-8 py-4 rounded-2xl transition-colors w-full max-w-xs text-center shadow-[0_10px_24px_rgba(249,115,22,0.22)]"
      >Send a Quote Request</a>
      <p className="text-text-secondary text-sm mt-2 font-medium">Takes about 60 seconds</p>
      <div className="mt-6 w-full max-w-sm">
        <div className="flex items-center justify-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>
          ))}
          <span className="text-text-muted text-sm font-semibold ml-1">5.0 on</span>
          <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        </div>
        <div className="overflow-hidden w-full" style={{maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)"}}>
          <div className="flex gap-3 animate-scroll hover:[animation-play-state:paused]">
            {[...Array(2)].flatMap((_, setIdx) => [
              {text: "Photo of my list, done in 60 seconds.", name: "Dave M.", role: "Builder, Busselton"},
              {text: "Way faster than typing emails.", name: "Shane R.", role: "Carpenter, Dunsborough"},
              {text: "Doesn't change who I buy from. Just quicker.", name: "Lisa K.", role: "PM, Bunbury"},
              {text: "Suppliers love getting a proper RFQ.", name: "Tom W.", role: "Builder, Margaret River"},
              {text: "Even reads my shocking handwriting.", name: "Bec J.", role: "Owner Builder, Mandurah"},
            ].map((t, i) => (
              <div key={`${setIdx}-${i}`} className="flex-shrink-0 w-52 bg-surface-subtle border border-border-subtle rounded-xl p-3">
                <p className="text-text-secondary text-sm italic leading-relaxed mb-2">“{t.text}”</p>
                <p className="text-text-primary text-sm font-semibold">{t.name}</p>
                <p className="text-text-muted text-xs">{t.role}</p>
              </div>
            )))
            }
          </div>
        </div>
      </div>
      <div className="mt-5 text-center max-w-xs">
        <p className="text-text-primary text-xl font-extrabold tracking-tight">Built for busy builders.</p>
        <p className="text-text-secondary text-base mt-2 leading-relaxed font-medium">Send clear building materials quote requests to your trusted suppliers in seconds.</p>
        <p className="text-heading text-xs font-semibold uppercase tracking-widest mt-3 opacity-70">Built in Western Australia</p>
      </div>
      <div className="mt-6 flex gap-4 justify-center">
        <a href="/privacy" className="text-text-muted text-sm font-medium hover:text-text-secondary">Privacy Policy</a>
        <a href="/terms" className="text-text-muted text-sm font-medium hover:text-text-secondary">Terms of Use</a>
      </div>
    </main>
  )
}
