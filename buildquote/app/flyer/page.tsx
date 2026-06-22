export default function FlyerPage() {
  return (
    <div className="min-h-screen font-sans antialiased bg-[#F4F6F8] text-[#2F3E4F]">
      {/* TOP BAR */}
      <div className="bg-[#2F3E4F] px-6 sm:px-16 py-4 flex items-center justify-between">
        <div className="text-xl font-extrabold tracking-tight text-white">
          Build<span className="text-[#B08D57]">Quote</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/" className="text-white/70 hover:text-white text-xs font-medium transition">← Home</a>
          <div className="text-xs text-white/80 font-mono">buildquote.com.au</div>
        </div>
      </div>

      {/* HERO */}
      <div className="bg-[#445C70] px-6 sm:px-16 pt-12 pb-12 text-white">
        <div className="inline-flex items-center bg-white/10 border border-white/20 text-white text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-6">
          Built for Southwest WA Builders
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-4 max-w-3xl">
          Turn your messy materials list into a{' '}
          <span className="text-[#B08D57]">clean supplier-ready RFQ.</span>
        </h1>

        <p className="text-white/85 text-base sm:text-lg leading-relaxed mb-4 max-w-2xl">
          Upload a photo, spreadsheet, PDF, or typed list — or enter items manually.
          BuildQuote helps structure your materials into a professional Request for
          Quotation that is easy to review, edit, download, and send.
        </p>

        <p className="text-[#F4F6F8] text-sm sm:text-base leading-relaxed mb-8 max-w-2xl font-medium">
          As simple as taking a photo of your handwritten materials list and turning it into a clean supplier-ready RFQ.
        </p>

        <div className="flex flex-wrap gap-2 mb-10">
          {[
            '📸 Photo',
            '📊 Spreadsheet',
            '📄 PDF',
            '📝 Typed list',
            '✍️ Manual entry',
          ].map((label) => (
            <span
              key={label}
              className="bg-white/10 border border-white/15 text-white text-xs font-medium px-3 py-1.5 rounded-md"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-5 items-center max-w-5xl">
          <div>
            <div className="text-xs font-bold tracking-widest uppercase text-white/80 mb-2">
              Your materials list
            </div>
            <div className="rounded-2xl border border-white/15 overflow-hidden aspect-[4/3] bg-[#2F3E4F]">
              <img
                src="/handwritten-list.jpg"
                alt="Materials list example"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="hidden md:flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#B08D57] text-white flex items-center justify-center font-extrabold text-xs">
              BQ
            </div>
            <svg width="22" height="90" viewBox="0 0 24 90" fill="none">
              <path
                d="M12 4v74M6 72l6 10 6-10"
                stroke="#B08D57"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <div className="text-xs font-bold tracking-widest uppercase text-white/80 mb-2">
              Supplier-ready RFQ
            </div>
            <div className="rounded-2xl border border-white/15 overflow-hidden aspect-[4/3] bg-[#2F3E4F]">
              <img
                src="/rfq-pdf-sample.png"
                alt="Generated RFQ PDF"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="mt-10">
          <a
            href="https://buildquote.com.au/"
            className="inline-flex items-center gap-2 bg-[#B08D57] text-white text-base font-bold px-7 py-3.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            Try BuildQuote Free &nbsp;&rarr;
          </a>
          <div className="text-xs text-white/80 mt-3">
            No account needed &nbsp;&middot;&nbsp; Fast to test &nbsp;&middot;&nbsp; Built for real builder workflows
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="bg-white px-6 sm:px-16 py-12">
        <div className="text-xs font-bold tracking-widest uppercase text-[#3E7C59] mb-2">
          How it works
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2F3E4F] mb-8">
          Two simple ways to build your RFQ.
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-[#D7DEE5] bg-[#F4F6F8] p-6">
            <div className="text-xs font-bold tracking-widest uppercase text-[#3E7C59] mb-2">
              Option 1
            </div>
            <h3 className="text-xl font-bold text-[#2F3E4F] mb-3">
              Upload your list
            </h3>
            <p className="text-sm text-[#445C70] leading-relaxed mb-4">
              Already have a materials list? Upload it and let BuildQuote pull out
              the line items for you.
            </p>

            <div className="space-y-3">
              {[
                'Upload a photo, PDF, spreadsheet, Word doc, or typed list',
                'BuildQuote reads the list and structures the items',
                'Review quantities, names, and specs before sending',
                'Fix anything that needs adjusting in one place',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-xl bg-white border border-[#D7DEE5] px-4 py-3"
                >
                  <span className="mt-0.5 text-[#3E7C59] font-bold">✓</span>
                  <span className="text-sm text-[#2F3E4F] leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#D7DEE5] bg-[#F4F6F8] p-6">
            <div className="text-xs font-bold tracking-widest uppercase text-[#B08D57] mb-2">
              Option 2
            </div>
            <h3 className="text-xl font-bold text-[#2F3E4F] mb-3">
              Enter items manually
            </h3>
            <p className="text-sm text-[#445C70] leading-relaxed mb-4">
              No list yet? No problem. Start with manual entry and build your RFQ
              line by line.
            </p>

            <div className="space-y-3">
              {[
                'Add product names, quantities, units, and notes yourself',
                'Perfect for quick jobs, partial lists, or missing paperwork',
                'Use manual entry to top up items the upload missed',
                'Review everything before downloading or sending',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-xl bg-white border border-[#D7DEE5] px-4 py-3"
                >
                  <span className="mt-0.5 text-[#B08D57] font-bold">✓</span>
                  <span className="text-sm text-[#2F3E4F] leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FOUR STEPS */}
      <div className="bg-[#F4F6F8] px-6 sm:px-16 py-12 border-t border-[#D7DEE5]">
        <div className="text-xs font-bold tracking-widest uppercase text-[#3E7C59] mb-2">
          From list to RFQ
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2F3E4F] mb-3">
          Quote requests without the office re-keying.
        </h2>
        <p className="max-w-3xl text-sm sm:text-base text-[#445C70] leading-relaxed mb-8 font-medium">
          Start on site, clean up the list fast, and send a professional RFQ without rewriting handwritten notes or re-entering materials back at the office later.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              n: '01',
              title: 'Upload or start manually',
              desc: 'Use a photo, PDF, spreadsheet, or type items in directly from site.',
            },
            {
              n: '02',
              title: 'Review line items',
              desc: 'Check names, quantities, and specs in one place before sending.',
            },
            {
              n: '03',
              title: 'Add project details',
              desc: 'Set delivery info, required date, and supplier details quickly.',
            },
            {
              n: '04',
              title: 'Download or send',
              desc: 'Generate a clean RFQ PDF and CSV ready for supplier pricing.',
            },
          ].map((step) => (
            <div
              key={step.n}
              className="flex flex-col gap-2 rounded-2xl bg-white border border-[#D7DEE5] px-5 py-5"
            >
              <div className="text-xs font-bold text-[#3E7C59] tracking-widest uppercase">
                Step {step.n}
              </div>
              <div className="text-base font-bold text-[#2F3E4F]">{step.title}</div>
              <div className="text-sm text-[#445C70] leading-relaxed">{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* WHY BUILDQUOTE */}
      <div className="bg-white px-6 sm:px-16 py-12 border-t border-[#D7DEE5]">
        <div className="text-xs font-bold tracking-widest uppercase text-[#3E7C59] mb-2">
          Why BuildQuote
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2F3E4F] mb-8">
          Built for the way builders actually work.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              title: 'Messy inputs welcome',
              text: 'Phone photos, rough notes, spreadsheets, PDFs, or partial lists — BuildQuote helps turn them into a usable RFQ.',
            },
            {
              title: 'Manual entry still matters',
              text: 'Not every job starts with a clean file. Manual entry gives builders a practical fallback when the list is incomplete.',
            },
            {
              title: 'Cleaner supplier requests',
              text: 'Suppliers receive a more professional, more readable RFQ with your project and item details clearly laid out.',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="border-t-4 border-[#B08D57] bg-[#F4F6F8] rounded-b-2xl px-5 py-5"
            >
              <div className="text-base font-bold text-[#2F3E4F] mb-2">{card.title}</div>
              <div className="text-sm text-[#445C70] leading-relaxed">{card.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* COMMUNITY CTA */}
      <div className="bg-[#F4F6F8] px-6 sm:px-16 py-10 border-t border-[#D7DEE5]">
        <div className="w-full max-w-3xl rounded-xl p-[1.5px] bq-flow-border">
          <div className="rounded-[11px] bg-white p-4 sm:p-5 text-left">
            <p className="text-sm font-semibold text-[#2F3E4F] sm:text-base">
              More features coming to BuildQuote soon.
            </p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-[#445C70]">
              Supplier directory, saved builder profiles, component libraries and more — built for Southwest WA builders.
            </p>

            <div className="mt-4">
              <div className="bq-community-cta flex items-center gap-3 rounded-xl border border-[#7AAAB8]/40 bg-white px-4 py-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[#7AAAB8] bg-white text-[#3E7C59] font-bold">
                  ✓
                </span>
                <span className="text-base font-bold text-[#2F3E4F] leading-snug">
                  Join the BuildQuote community
                </span>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-[#445C70] leading-relaxed">
                Follow along as new features roll out across the platform.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER CTA */}
      <div className="bg-[#2F3E4F] px-6 py-14 text-center text-white">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight mb-3">
          Ready to turn your list into a{' '}
          <span className="text-[#B08D57]">supplier-ready RFQ?</span>
        </h2>
        <p className="text-sm text-white/75 mb-6 max-w-md mx-auto">
          Built for WA builders. Free to test. No account needed.
        </p>
        <a
          href="https://buildquote.com.au/"
          className="inline-flex items-center gap-2 bg-[#B08D57] text-white text-base font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity"
        >
          Start your Request for Quotation &nbsp;&rarr;
        </a>
        <div className="text-xs text-white/50 mt-5 font-mono tracking-wide">
          buildquote.com.au &nbsp;&middot;&nbsp; Request for Quotation, Made Simple
        </div>
      </div>
    </div>
  )
}