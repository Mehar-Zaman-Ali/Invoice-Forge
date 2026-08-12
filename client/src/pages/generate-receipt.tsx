// app/(your-route)/generate-receipt.tsx
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ProductSelector } from "@/components/product-selector";
import { ReceiptItemsTable } from "@/components/receipt-items-table";
import { ReceiptTotals } from "@/components/receipt-totals";
import { PaymentMethodSelector } from "@/components/payment-method-selector";
import { FileDown, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Product, ReceiptItem } from "@shared/schema";
import { generateReceiptPDF } from "@/lib/pdf-generator";
import { ReceiptPrintView } from "@/components/receipt-print-view";

export default function GenerateReceipt() {
  const { toast } = useToast();

  // single stable receipt number for this session/page load
  const [receiptNumber] = useState(
    () => `RCT-${Date.now().toString().slice(-6)}`
  );

  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("card");
  const [includeTax, setIncludeTax] = useState<boolean>(false);
  const [taxRate, setTaxRate] = useState<number>(8);
  const [includeDiscount, setIncludeDiscount] = useState<boolean>(false);
  const [discountRate, setDiscountRate] = useState<number>(10);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    // keep default fetcher in your queryClient.config
  });

  const createReceiptMutation = useMutation({
    mutationFn: async (receiptData: {
      receiptNumber: string;
      date?: string;
      paymentMethod: string;
      subtotal: string;
      tax: string;
      total: string;
      items: string;
    }) => {
      return apiRequest("POST", "/api/receipts", receiptData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      setItems([]);
      toast({
        title: "Receipt Created",
        description: "The receipt has been saved successfully.",
      });
    },
    onError: (err) => {
      toast({
        title: "Save failed",
        description: "Unable to save receipt. Check your connection.",
      });
    },
  });

  const productsForSelector = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
  }));

  const handleAddItem = (productId: string, quantity: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const existingItemIndex = items.findIndex(
      (item) => item.productId === productId
    );

    if (existingItemIndex >= 0) {
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity += quantity;
      updatedItems[existingItemIndex].subtotal =
        updatedItems[existingItemIndex].quantity *
        updatedItems[existingItemIndex].price;
      setItems(updatedItems);
    } else {
      const price = Number(product.price);
      setItems([
        ...items,
        {
          productId,
          productName: product.name,
          productDescription: product.description,
          quantity,
          price,
          subtotal: price * quantity,
        },
      ]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const discount = includeDiscount ? +(subtotal * (discountRate / 100)) : 0;
  const discountedSubtotal = subtotal - discount;
  const tax = includeTax ? +(discountedSubtotal * (taxRate / 100)) : 0;
  const total = +(discountedSubtotal + tax);

  const handleGeneratePDF = () => {
    if (items.length === 0) {
      toast({ title: "No items", description: "Add at least one item." });
      return;
    }

    const receiptDate = new Date();

    // Generate PDF
    generateReceiptPDF({
      receiptNumber,
      date: receiptDate,
      items,
      subtotal,
      discount,
      tax,
      total,
      paymentMethod,
      includeTax,
      taxRate,
      includeDiscount,
      discountRate,
    });

    // Save to backend
    createReceiptMutation.mutate({
      receiptNumber,
      paymentMethod,
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      items: JSON.stringify(items),
    });

    toast({
      title: "PDF Generated",
      description: "Receipt has been saved and downloaded as PDF.",
    });
  };

  const handlePrint = () => {
    if (items.length === 0) {
      toast({
        title: "No items to print",
        description: "Add at least one item.",
      });
      return;
    }

    toast({
      title: "Sending to Printer",
      description: "Receipt is being sent to your default printer.",
    });

    // Let the ReceiptPrintView markup handle printable layout — window.print will print the page
    window.print();
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Generate Receipt</h1>
          <p className="text-muted-foreground">
            Create a new receipt by adding items and payment details
          </p>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          Loading products...
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print-only view component — uses the same stable receiptNumber */}
      <ReceiptPrintView
        receiptNumber={receiptNumber}
        date={new Date()}
        items={items}
        subtotal={subtotal}
        discount={discount}
        tax={tax}
        total={total}
        paymentMethod={paymentMethod}
        includeTax={includeTax}
        taxRate={taxRate}
        includeDiscount={includeDiscount}
        discountRate={discountRate}
      />

      {/* UI (hidden when printing) */}
      <div className="max-w-4xl mx-auto space-y-6 print:hidden">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Generate Receipt</h1>
          <p className="text-muted-foreground">
            Create a new receipt by adding items and payment details
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Receipt Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="text-sm text-muted-foreground block">
                  Date
                </label>
                <div className="font-medium">
                  {new Date().toLocaleDateString()}
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground block">
                  Time
                </label>
                <div className="font-medium">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground block">
                  Receipt #
                </label>
                <div className="font-mono font-medium">{receiptNumber}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProductSelector
              products={productsForSelector}
              onAddItem={handleAddItem}
            />
            <ReceiptItemsTable items={items} onRemoveItem={handleRemoveItem} />
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentMethodSelector
                value={paymentMethod}
                onChange={setPaymentMethod}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Discount Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="include-discount"
                  checked={includeDiscount}
                  onCheckedChange={setIncludeDiscount}
                />
                <Label htmlFor="include-discount">Apply Discount</Label>
              </div>

              {includeDiscount && (
                <div className="space-y-2">
                  <Label htmlFor="discount-rate">Discount Rate (%)</Label>
                  <Input
                    id="discount-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={discountRate}
                    onChange={(e) =>
                      setDiscountRate(Number(e.target.value) || 0)
                    }
                    className="w-full"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tax Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="include-tax"
                  checked={includeTax}
                  onCheckedChange={setIncludeTax}
                />
                <Label htmlFor="include-tax">Include Tax</Label>
              </div>

              {includeTax && (
                <div className="space-y-2">
                  <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                  <Input
                    id="tax-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                    className="w-full"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <ReceiptTotals
          subtotal={subtotal}
          discount={discount}
          tax={tax}
          total={total}
          includeTax={includeTax}
          taxRate={taxRate}
          includeDiscount={includeDiscount}
          discountRate={discountRate}
        />

        <div className="flex gap-4 justify-end">
          <Button
            variant="outline"
            size="lg"
            onClick={handlePrint}
            disabled={items.length === 0}
            data-testid="button-print"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>

          <Button
            size="lg"
            onClick={handleGeneratePDF}
            disabled={items.length === 0 || createReceiptMutation.isPending}
            data-testid="button-generate-pdf"
          >
            <FileDown className="w-4 h-4 mr-2" />
            {createReceiptMutation.isPending ? "Saving..." : "Generate & Save"}
          </Button>
        </div>
      </div>
    </>
  );
}
