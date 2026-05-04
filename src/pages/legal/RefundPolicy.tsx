import LegalLayout from "./LegalLayout";

export default function RefundPolicy() {
  return (
    <LegalLayout
      title="Refund Policy"
      description="TELA ERP offers a 30-day money-back guarantee. Refunds are processed by Paddle."
    >
      <p>
        This Refund Policy applies to purchases of TELA ERP subscriptions and services from <strong>ERICK ELIBARIKI
        OLOMI</strong>, trading as TELA HOLDINGS LIMITED. Our reseller and Merchant of Record, <strong>Paddle.com</strong>,
        processes all payments and refunds on our behalf.
      </p>

      <h2>30-Day Money-Back Guarantee</h2>
      <p>
        We offer a <strong>30-day money-back guarantee</strong>. If you are not satisfied with your TELA ERP
        subscription, you may request a full refund within <strong>30 days</strong> of the original purchase or renewal
        date.
      </p>

      <h2>How to Request a Refund</h2>
      <p>To request a refund, you have two options:</p>
      <ul>
        <li>
          Visit <a href="https://paddle.net" target="_blank" rel="noopener noreferrer">paddle.net</a>, locate your
          order using the email address you used at checkout, and submit a refund request directly to Paddle.
        </li>
        <li>
          Contact our support team at <a href="mailto:olomierik@gmail.com">olomierik@gmail.com</a> and we will
          coordinate the refund with Paddle on your behalf.
        </li>
      </ul>

      <h2>How Refunds Are Processed</h2>
      <p>
        Approved refunds are issued by Paddle to the original payment method, typically within 5–10 business days
        depending on your bank or card issuer. Refunds are governed by Paddle's{" "}
        <a href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noopener noreferrer">
          Refund Policy
        </a>
        .
      </p>

      <h2>Cancellations</h2>
      <p>
        You can cancel your subscription at any time from within the app or via paddle.net. After cancellation, you
        retain access to paid features until the end of the current billing period; the subscription will not renew.
      </p>

      <h2>Contact</h2>
      <p>
        For any questions about this Refund Policy, contact ERICK ELIBARIKI OLOMI at{" "}
        <a href="mailto:olomierik@gmail.com">olomierik@gmail.com</a>.
      </p>
    </LegalLayout>
  );
}
