import LegalLayout from "./LegalLayout";

export default function RefundPolicy() {
  return (
    <LegalLayout
      title="Refund Policy"
      description="TELA ERP offers a 14-day money-back guarantee for new subscriptions. Refunds are processed by Paddle, our Merchant of Record."
    >
      <p>
        This Refund Policy describes the circumstances in which <strong>TELA HOLDINGS LIMITED</strong> ("TELA", "we",
        "us") will issue refunds for paid subscriptions to the TELA ERP platform and related services (the "Service").
        All payments are processed by our reseller and Merchant of Record, <strong>Paddle.com Market Limited</strong>{" "}
        ("Paddle"), which also handles refund disbursements on our behalf.
      </p>

      <h2>1. 14-Day Money-Back Guarantee</h2>
      <p>
        New customers may request a full refund of their first subscription payment within <strong>fourteen (14)
        calendar days</strong> of the initial purchase, for any reason. This guarantee applies once per customer and
        per workspace, and only to the first payment for a given subscription plan.
      </p>

      <h2>2. Subscription Renewals</h2>
      <p>
        Subscriptions renew automatically at the end of each billing cycle. Renewal payments are generally
        non-refundable. However, if a renewal was charged in error, or you cancelled before the renewal date but were
        still charged, contact us within <strong>seven (7) days</strong> of the charge and we will work with Paddle to
        process a refund.
      </p>

      <h2>3. Annual Plans</h2>
      <p>
        Annual subscriptions are eligible for the 14-day money-back guarantee on the initial purchase. After 14 days,
        annual fees are non-refundable, and cancelling will stop future renewals but will not generate a pro-rata
        refund of the unused portion of the term, except where required by mandatory consumer-protection law.
      </p>

      <h2>4. Pro-Rata and Partial Refunds</h2>
      <p>
        We do not provide pro-rata refunds for partial billing periods, downgrades, unused features, or seats removed
        mid-cycle, except where required by applicable law or expressly stated in a written agreement with you.
      </p>

      <h2>5. Non-Refundable Items</h2>
      <p>The following are not eligible for refund:</p>
      <ul>
        <li>Add-on services, one-time charges, set-up fees, or professional-services engagements that have already commenced;</li>
        <li>Charges older than 60 days;</li>
        <li>Subscriptions terminated by us for breach of our Terms of Service or Acceptable Use rules;</li>
        <li>Free trials, promotional credits, and discounted plans where the discount is contingent on a minimum commitment.</li>
      </ul>

      <h2>6. How to Request a Refund</h2>
      <p>You have two options:</p>
      <ul>
        <li>
          Visit <a href="https://paddle.net" target="_blank" rel="noopener noreferrer">paddle.net</a>, locate your
          order using the email address used at checkout, and submit a refund request directly to Paddle.
        </li>
        <li>
          Contact us at <a href="mailto:olomierik@gmail.com">olomierik@gmail.com</a> with your order number, email
          address, and the reason for the request, and we will coordinate the refund with Paddle on your behalf.
        </li>
      </ul>

      <h2>7. How Refunds Are Processed</h2>
      <p>
        Approved refunds are issued by Paddle to the original payment method, normally within 5–10 business days,
        though the time taken to appear on your statement depends on your bank or card issuer. Refunds are denominated
        in the original payment currency; exchange-rate differences are not reimbursed. Refunds are governed by{" "}
        <a href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noopener noreferrer">
          Paddle's Refund Policy
        </a>.
      </p>

      <h2>8. Cancellations</h2>
      <p>
        You may cancel your subscription at any time from within your account or via paddle.net. Cancellation stops
        future renewals; you retain access to paid features until the end of the current billing period. Cancellation
        does not by itself entitle you to a refund of fees already paid.
      </p>

      <h2>9. Chargebacks</h2>
      <p>
        Please contact us before initiating a chargeback so we can resolve the issue directly. Chargebacks raised
        without first attempting resolution may result in suspension of the affected account pending investigation.
      </p>

      <h2>10. Statutory Rights</h2>
      <p>
        Nothing in this Refund Policy limits any non-waivable rights you may have under the consumer-protection laws
        of your country of residence.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about this Refund Policy? Contact TELA HOLDINGS LIMITED at{" "}
        <a href="mailto:olomierik@gmail.com">olomierik@gmail.com</a>.
      </p>
    </LegalLayout>
  );
}
