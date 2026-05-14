import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PayPalSubscribeButtonProps {
  planId: string;
  planName: string;
  onSuccess?: (subscriptionId: string) => void;
  onError?: (err: unknown) => void;
}

export default function PayPalSubscribeButton({
  planId,
  planName,
  onSuccess,
  onError,
}: PayPalSubscribeButtonProps) {
  const [{ isPending }] = usePayPalScriptReducer();

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading PayPal…</span>
      </div>
    );
  }

  return (
    <PayPalButtons
      style={{ layout: "vertical", color: "blue", shape: "rect", label: "subscribe" }}
      createSubscription={(_data, actions) =>
        actions.subscription.create({ plan_id: planId })
      }
      onApprove={async (data) => {
        const subId = data.subscriptionID ?? "";
        toast.success(`🎉 Subscribed to ${planName}! ID: ${subId}`);
        onSuccess?.(subId);
      }}
      onError={(err) => {
        console.error("PayPal error", err);
        toast.error("Payment failed. Please try again.");
        onError?.(err);
      }}
      onCancel={() => toast.info("Subscription cancelled.")}
    />
  );
}
