import type { POSCartItem } from '@/hooks/use-pos-cache';

interface POSReceiptProps {
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  receiptNumber: string;
  date: string;
  cashier: string;
  customerName: string;
  paymentMethod: string;
  items: POSCartItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  change: number;
  formatMoney: (amount: number) => string;
}

export default function POSReceipt(props: POSReceiptProps) {
  return (
    <div id="pos-receipt" className="max-w-[300px] mx-auto p-4 font-mono text-xs bg-white text-black">
      {/* Header */}
      <div className="text-center mb-3">
        <p className="text-sm font-bold">{props.companyName}</p>
        {props.companyAddress && <p>{props.companyAddress}</p>}
        {props.companyPhone && <p>Tel: {props.companyPhone}</p>}
        <p className="mt-2 border-b border-dashed border-gray-400 pb-1">
          SALES RECEIPT
        </p>
      </div>

      {/* Meta */}
      <div className="mb-2 space-y-0.5">
        <div className="flex justify-between"><span>Receipt #:</span><span>{props.receiptNumber}</span></div>
        <div className="flex justify-between"><span>Date:</span><span>{props.date}</span></div>
        <div className="flex justify-between"><span>Cashier:</span><span>{props.cashier}</span></div>
        <div className="flex justify-between"><span>Customer:</span><span>{props.customerName}</span></div>
      </div>

      <div className="border-t border-dashed border-gray-400 my-2" />

      {/* Items */}
      <div className="space-y-1">
        {props.items.map((item, i) => {
          const lineTotal = item.unitPrice * item.quantity * (1 - item.discount / 100);
          return (
            <div key={i}>
              <p className="truncate">{item.product.name}</p>
              <div className="flex justify-between pl-2">
                <span>{item.quantity} x {props.formatMoney(item.unitPrice)}</span>
                <span>{props.formatMoney(lineTotal)}</span>
              </div>
              {item.discount > 0 && (
                <p className="pl-2 text-gray-500">Disc: {item.discount}%</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-dashed border-gray-400 my-2" />

      {/* Totals */}
      <div className="space-y-0.5">
        <div className="flex justify-between"><span>Subtotal:</span><span>{props.formatMoney(props.subtotal)}</span></div>
        {props.taxRate > 0 && (
          <div className="flex justify-between"><span>Tax ({props.taxRate}%):</span><span>{props.formatMoney(props.taxAmount)}</span></div>
        )}
        <div className="flex justify-between font-bold text-sm border-t border-gray-400 pt-1 mt-1">
          <span>TOTAL:</span><span>{props.formatMoney(props.total)}</span>
        </div>
        <div className="flex justify-between"><span>Paid ({props.paymentMethod}):</span><span>{props.formatMoney(props.amountPaid)}</span></div>
        {props.change > 0 && (
          <div className="flex justify-between"><span>Change:</span><span>{props.formatMoney(props.change)}</span></div>
        )}
      </div>

      <div className="border-t border-dashed border-gray-400 my-3" />

      {/* Footer */}
      <div className="text-center space-y-1">
        <p className="font-bold">Thank you for your business!</p>
        <p className="text-gray-500">Powered by TELA ERP</p>
      </div>
    </div>
  );
}

export function printReceipt() {
  const receipt = document.getElementById('pos-receipt');
  if (!receipt) return;
  const win = window.open('', '_blank', 'width=350,height=600');
  if (!win) return;
  win.document.write(`
    <html><head><title>Receipt</title>
    <style>
      body { margin: 0; padding: 8px; font-family: monospace; font-size: 11px; }
      * { box-sizing: border-box; }
      @media print { body { margin: 0; } }
    </style></head><body>
    ${receipt.innerHTML}
    <script>window.onload = function() { window.print(); window.close(); }</script>
    </body></html>
  `);
  win.document.close();
}
