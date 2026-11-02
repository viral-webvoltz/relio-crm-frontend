export function HowToConnect() {
  return (
    <section className="card p-6" aria-labelledby="mail-help">
      <h2 id="mail-help" className="mb-3 text-base font-semibold text-heading">Where do I get these?</h2>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-body">
        <li>In Google Cloud, create a project and turn on the <strong>Gmail API</strong>.</li>
        <li>Create an <strong>OAuth client ID</strong> (web application). Copy its client ID and client secret.</li>
        <li>
          In the Google OAuth Playground, use your own client ID and secret and authorise these two scopes with the Gmail account that will send:{' '}
          <code className="rounded bg-background px-1">https://www.googleapis.com/auth/gmail.send</code> (to send email) and{' '}
          <code className="rounded bg-background px-1">https://www.googleapis.com/auth/gmail.readonly</code> (to read replies). Then exchange the code for tokens.
        </li>
        <li>Copy the <strong>refresh token</strong> and paste all three values into the form.</li>
      </ol>
      <p className="mt-3 text-xs text-muted">Secrets are stored encrypted and are never shown again. The CRM checks this inbox about once a minute for answers to the emails it sent, and updates the lead when one arrives.</p>
    </section>
  )
}
