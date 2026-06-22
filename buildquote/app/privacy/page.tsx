export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-page px-6 py-12">
      <div className="mb-8">
        <a href="/" className="text-brand text-sm font-medium hover:underline">&larr; Back to BuildQuote</a>
      </div>
      <h1 className="text-3xl font-bold text-text-primary mb-2">Privacy Policy</h1>
      <p className="text-text-muted text-sm mb-8">Last updated: March 2026</p>
      <div className="space-y-8 text-text-secondary text-sm leading-relaxed">
        <section>
          <h2 className="text-text-primary font-semibold text-base mb-2">1. What we collect</h2>
          <p>BuildQuote collects the information you provide when creating a Request for Quotation — including your name, company, email address, delivery address, and the materials list you upload. We also collect the supplier details you enter.</p>
        </section>
        <section>
          <h2 className="text-text-primary font-semibold text-base mb-2">2. How we use your information</h2>
          <p>Your information is used solely to generate and send your Request for Quotation to your nominated supplier. We retain a copy of submitted RFQs for record-keeping and service improvement. We do not sell your data to third parties.</p>
        </section>
        <section>
          <h2 className="text-text-primary font-semibold text-base mb-2">3. File uploads</h2>
          <p>Files you upload (photos, PDFs, spreadsheets) are processed by our AI parsing service to extract materials list items. Files are not processed in memory and discarded after parsing — they are not stored permanently.</p>
        </section>
        <section>
          <h2 className="text-text-primary font-semibold text-base mb-2">4. Email communications</h2>
          <p>When you send an RFQ, your details are included in the email sent to the supplier. A copy is sent to your email address if you select that option. BuildQuote receives a copy of all RFQs sent through the platform.</p>
        </section>
        <section>
          <h2 className="text-text-primary font-semibold text-base mb-2">5. Community signups</h2>
          <p>If you opt in to the BuildQuote community, your email address is stored to send you product updates. You can unsubscribe at any time by contacting us.</p>
        </section>
        <section>
          <h2 className="text-text-primary font-semibold text-base mb-2">6. Third-party services</h2>
          <p>BuildQuote uses Anthropic (AI parsing), Resend (email delivery), Supabase (data storage), and Vercel (hosting). Each has its own privacy policy.</p>
        </section>
        <section>
          <h2 className="text-text-primary font-semibold text-base mb-2">7. Contact</h2>
          <p>For privacy questions, contact <a href="mailto:buildquoteau@gmail.com" className="text-brand hover:underline">buildquoteau@gmail.com</a>.</p>
        </section>
      </div>
    </main>
  )
}
