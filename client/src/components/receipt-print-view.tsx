import type { ReceiptItem } from "@shared/schema";

interface ReceiptPrintViewProps {
  receiptNumber: string;
  date: Date;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  includeTax?: boolean;
  taxRate?: number;
  includeDiscount?: boolean;
  discountRate?: number;
}

export function ReceiptPrintView({
  receiptNumber,
  date,
  items,
  subtotal,
  discount,
  tax,
  total,
  paymentMethod,
  includeTax = false,
  taxRate = 8,
  includeDiscount = false,
  discountRate = 10,
}: ReceiptPrintViewProps) {
  return (
    <div className="hidden print:block print:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Receipt Manager</h1>
          <p className="text-sm text-muted-foreground">
            Professional Receipt System
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p>
              <strong>Receipt #:</strong> {receiptNumber}
            </p>
            <p>
              <strong>Date:</strong> {new Date(date).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p>
              <strong>Time:</strong> {new Date(date).toLocaleTimeString()}
            </p>
            <p>
              <strong>Payment:</strong>{" "}
              {paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}
            </p>
          </div>
        </div>

        <div className="border-t border-b py-4 mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Product</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="py-2">
                    {item.productName}
                    {item.productDescription && (
                      <div className="text-xs text-muted-foreground">
                        {item.productDescription}
                      </div>
                    )}
                  </td>
                  <td className="text-right py-2">{item.quantity}</td>
                  <td className="text-right py-2">€{item.price.toFixed(2)}</td>
                  <td className="text-right py-2">
                    €{item.subtotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>€{subtotal.toFixed(2)}</span>
          </div>
          {includeDiscount && (
            <div className="flex justify-between">
              <span>Discount ({discountRate}%):</span>
              <span className="text-red-600">-€{discount.toFixed(2)}</span>
            </div>
          )}
          {includeTax && (
            <div className="flex justify-between">
              <span>Tax ({taxRate}%):</span>
              <span>€{tax.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total:</span>
            <span>€{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Thank you for your business!</p>
        </div>
      </div>
    </div>
  );
}
