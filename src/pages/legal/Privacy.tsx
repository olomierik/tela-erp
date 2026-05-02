import LegalLayout from "./LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout
      title="Privacy Notice"
      description="How ERICK ELIBARIKI OLOMI (TELA ERP) collects, uses, and protects your personal data."
    >
      <p>
        This Privacy Notice explains how <strong>ERICK ELIBARIKI OLOMI</strong>, trading as
        <strong> TELA ERP</strong> ("we", "us"), collects and processes personal data when you use our website,
        applications, and services (the "Service").
      </p>

      <h2>1. Data Controller</h2>
      <p>
        ERICK ELIBARIKI OLOMI (trading as TELA ERP), based in Tanga, Tanzania, acts as the data controller for
        personal data processed in connection with the Service.
      </p>

      <h2>2. Categories of Personal Data We Collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, email address, phone number, password (hashed), business name.</li>
        <li><strong>Profile and tenant data:</strong> company details, role, team members you invite.</li>
        <li><strong>Content data:</strong> records you create in the ERP (invoices, customers, inventory, etc.).</li>
        <li><strong>Support data:</strong> messages and attachments you send to our support team.</li>
        <li><strong>Usage and telemetry:</strong> log data, device identifiers, IP address, browser type, pages viewed, timestamps, error reports.</li>
        <li><strong>Cookies and similar technologies</strong> as described below.</li>
      </ul>

      <h2>3. Purposes and Legal Bases</h2>
      <ul>
        <li><strong>Provide the Service</strong> (creating your account, hosting your data, enabling features) — performance of contract.</li>
        <li><strong>Security and fraud prevention</strong> (rate-limiting, abuse detection, audit logs) — legitimate interests and legal obligation.</li>
        <li><strong>Customer support</strong> — performance of contract and legitimate interests.</li>
        <li><strong>Product improvement and analytics</strong> (aggregated usage analysis) — legitimate interests.</li>
        <li><strong>Marketing communications</strong> (only where you have opted in) — consent.</li>
        <li><strong>Legal compliance</strong> (tax, accounting, responding to lawful requests) — legal obligation.</li>
      </ul>

      <h2>4. Data Sharing</h2>
      <p>We share personal data only with the following categories of recipients:</p>
      <ul>
        <li><strong>Service providers / sub-processors</strong> — hosting, database, email delivery, analytics, error monitoring, and customer-support tools.</li>
        <li><strong>Merchant of Record (Paddle):</strong> Paddle.com Market Limited acts as our reseller and Merchant of Record. Paddle handles payment processing, billing, subscription management, tax compliance, and invoicing. See <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer">Paddle's Privacy Policy</a>.</li>
        <li><strong>Professional advisers</strong> — legal, accounting, and audit professionals where strictly necessary.</li>
        <li><strong>Authorities</strong> — where required by applicable law, court order, or to protect rights, property, or safety.</li>
      </ul>

      <h2>5. International Transfers</h2>
      <p>
        Your data may be processed in countries outside Tanzania, including in the European Union and the United States,
        where our service providers operate. Where required, we rely on appropriate safeguards such as Standard
        Contractual Clauses or equivalent mechanisms.
      </p>

      <h2>6. Data Retention</h2>
      <p>
        We retain personal data for as long as your account is active and for a reasonable period afterwards to comply
        with legal, tax, and accounting obligations, to resolve disputes, and to enforce our agreements. When data is
        no longer needed, we delete or anonymise it.
      </p>

      <h2>7. Your Rights</h2>
      <p>Subject to applicable law, you have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you;</li>
        <li>Request correction of inaccurate data;</li>
        <li>Request deletion ("right to be forgotten");</li>
        <li>Restrict or object to certain processing;</li>
        <li>Request data portability;</li>
        <li>Withdraw consent at any time (where processing is based on consent);</li>
        <li>Lodge a complaint with a competent data-protection authority.</li>
      </ul>
      <p>To exercise any of these rights, contact us at the address listed below.</p>

      <h2>8. Security</h2>
      <p>
        We implement appropriate technical and organisational measures — including encryption in transit, role-based
        access controls, row-level security in our databases, secure password hashing, and audit logging — to protect
        personal data against unauthorised access, loss, or alteration.
      </p>

      <h2>9. Cookies</h2>
      <p>
        We use strictly necessary cookies to keep you signed in and to remember your preferences. We may also use
        analytics cookies to understand how the Service is used. You can manage cookie preferences through your browser
        settings.
      </p>

      <h2>10. Children</h2>
      <p>The Service is not directed to individuals under the age of 16, and we do not knowingly collect their data.</p>

      <h2>11. Changes to this Notice</h2>
      <p>
        We may update this Privacy Notice from time to time. Material changes will be communicated via the Service or
        by email. The "Last updated" date at the top reflects the latest revision.
      </p>

      <h2>12. Contact</h2>
      <p>
        For privacy questions or to exercise your rights, contact ERICK ELIBARIKI OLOMI at{" "}
        <a href="mailto:contact@tela-erp.com">contact@tela-erp.com</a>.
      </p>
    </LegalLayout>
  );
}
