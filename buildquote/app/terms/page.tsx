export default function Terms() {
  return (
    <main className="min-h-screen bg-page px-6 py-12">
      <div className="mb-8">
        <a href="/" className="text-brand text-sm font-medium hover:underline">&larr; Back to BuildQuote</a>
      </div>
      <h1 className="text-3xl font-bold text-text-primary mb-2">Terms of Use</h1>
      <p className="text-text-muted text-sm mb-8">Last updated: March 2026</p>
      <div className="space-y-8 text-text-secondary text-sm leading-relaxed">
        <section>
          <h2 className="text-text-primary font-semibold text-base mb-2">1. Service description</h2>
          <p>BuildQuote is a tool that helps builders create and send Requests for Quotation to building materials suppliers. The service uses AI to parse uploaded documents and extract materials list items.</p>
        </section>
        <section>
          <h2 className="text-text-primary font-semibold text-base mb-2">2. Accuracy of parsed items</h2>
          <p>AI parsing may not be 100% accurate. You are responsible for reviewing all items, quantities, specifications, and supplier details before sending any RFQ. BuildQuote accepts no liability for errors in AI-parsed content sent to suppliers without review.</p>
        </section>
        <section>
          <h2 className="text-text-primary font-semibold text-base mb-2">3. Supplier information</h2>
          <p>Supplier contact details are provided as a convenience. You are responsible for verifying supplier details are current and correct. BuildQuote does not guarantee the accuracy of supplier contact information.</p>
        </section>
        <section>
          <h2 className="text-text-primary font-semibold text-base mb-2">4. No contract formation</h2>
          <p>Sending an RFQ through BuildQuote does not constitute a purchase order, contract, or binding agreement. An RFQ is a request for pricing only. Any contract is formed directly between you and the supplier.</p>
        </section>
        <section>
          <h2 className="text-text-primary font-semibold text-base mb-2">5. Acceptable use</h2>
          <p>You must not use BuildQuote to send unsolicited communications or submit false information. We reserve the right to suspend access for misuse.</p>
        </section>
        <section>
          <h2 className="text-text-primary font-semibold text-base mb-2">6. Limitation of liability</h2>
          <p>BuildQuote is provided as-is. We are not liable for any loss arising from use of the service, including errors in parsed content, failed email delivery, or supplier responses.</p>
        </section>
        <section>
          <h2 className="text-text-primary font-semibold text-base mb-2">7. Contact</h2>
          <p>Questions? Contact <a href="mailto:buildquoteau@gmail.com" className="text-brand hover:underline">buildquoteau@gmail.com</a>.</p>
        </section>
      </div>
    </main>
  )
}
