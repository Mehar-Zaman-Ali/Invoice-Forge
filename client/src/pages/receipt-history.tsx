import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, Printer, Search, CreditCard, Banknote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { generateReceiptPDF } from "@/lib/pdf-generator";
import type { Receipt, ReceiptItem } from "@shared/schema";

export default function ReceiptHistory() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const { data: receipts = [], isLoading } = useQuery<Receipt[]>({
    queryKey: ["/api/receipts", { paymentMethod: paymentFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (paymentFilter !== "all") {
        params.append("paymentMethod", paymentFilter);
      }
      const response = await fetch(`/api/receipts?${params}`);
      if (!response.ok) throw new Error("Failed to fetch receipts");
      return response.json();
    },
  });

  const filteredReceipts = receipts.filter((receipt) =>
    receipt.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewPDF = (receipt: Receipt) => {
    try {
      const items: ReceiptItem[] = JSON.parse(receipt.items);
      const subtotal = parseFloat(receipt.subtotal);
      const tax = parseFloat(receipt.tax);
      const total = parseFloat(receipt.total);

      // Calculate if tax or discount was applied based on the stored values
      const includeTax = tax > 0;
      const taxRate = includeTax
        ? Math.round((tax / (subtotal - (total - subtotal - tax))) * 100 * 10) /
          10
        : 8;

      // For simplicity, assume no discount for historical receipts unless we can detect it
      // You could enhance this by storing discount info in the database
      const includeDiscount = false;
      const discount = 0;
      const discountRate = 10;

      generateReceiptPDF({
        receiptNumber: receipt.receiptNumber,
        date: new Date(receipt.date),
        items,
        subtotal,
        discount,
        tax,
        total,
        paymentMethod: receipt.paymentMethod,
        includeTax,
        taxRate,
        includeDiscount,
        discountRate,
      });

      toast({
        title: "PDF Generated",
        description: `Receipt ${receipt.receiptNumber} PDF has been downloaded.`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePrint = (receipt: Receipt) => {
    try {
      // Create a temporary print window with the receipt content
      const items: ReceiptItem[] = JSON.parse(receipt.items);

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt ${receipt.receiptNumber}</title>
          <meta charset="utf-8">
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            body { 
              font-family: Arial, sans-serif; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
              font-size: 12px;
              line-height: 1.4;
            }
            .header { text-center; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 20px; font-weight: bold; }
            .header p { margin: 3px 0; color: #666; font-size: 11px; }
            .receipt-info { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 25px; 
              font-size: 11px;
            }
            .receipt-info div { flex: 1; }
            .receipt-info .right { text-align: right; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px; 
              font-size: 11px;
            }
            th, td { 
              padding: 6px 4px; 
              text-align: left; 
              border-bottom: 1px solid #ddd; 
            }
            th { font-weight: bold; background-color: #f5f5f5; }
            .text-right { text-align: right; }
            .totals { 
              margin-left: auto; 
              width: 180px; 
              font-size: 11px;
            }
            .totals div { 
              display: flex; 
              justify-content: space-between; 
              margin: 3px 0; 
              padding: 2px 0;
            }
            .total { 
              font-weight: bold; 
              font-size: 14px; 
              border-top: 2px solid #333; 
              padding-top: 5px; 
              margin-top: 8px;
            }
            .footer { 
              text-align: center; 
              margin-top: 30px; 
              color: #666; 
              font-size: 10px;
            }
            .print-button {
              background: #007bff;
              color: white;
              border: none;
              padding: 10px 20px;
              margin: 20px auto;
              display: block;
              cursor: pointer;
              border-radius: 4px;
            }
            @media print {
              .print-button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <p>ALL Mobile Phone & Computer Service 54</p>
            <p>Phibsborough Road, Dublin 7</p>
            <p>M: 0894444944 | T: 015553236</p>
          </div>
          
          <div class="receipt-info">
            <div>
              <strong>Receipt #:</strong> ${receipt.receiptNumber}<br>
              <strong>Date:</strong> ${new Date(
                receipt.date
              ).toLocaleDateString()}
            </div>
            <div class="right">
              <strong>Time:</strong> ${new Date(
                receipt.date
              ).toLocaleTimeString()}<br>
              <strong>Payment:</strong> ${
                receipt.paymentMethod.charAt(0).toUpperCase() +
                receipt.paymentMethod.slice(1)
              }
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item) => `
                <tr>
                  <td>${item.productName}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">€${item.price.toFixed(2)}</td>
                  <td class="text-right">€${item.subtotal.toFixed(2)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="totals">
            <div><span>Subtotal:</span><span>€${parseFloat(
              receipt.subtotal
            ).toFixed(2)}</span></div>
            ${
              parseFloat(receipt.tax) > 0
                ? `<div><span>Tax:</span><span>€${parseFloat(
                    receipt.tax
                  ).toFixed(2)}</span></div>`
                : ""
            }
            <div class="total"><span>Total:</span><span>€${parseFloat(
              receipt.total
            ).toFixed(2)}</span></div>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
          </div>

          <button class="print-button no-print" onclick="window.print()">Print Receipt</button>

          <script>
            // Auto-focus for better print dialog experience
            window.focus();
            
            // Optional: Auto-print after a short delay
            setTimeout(() => {
              if (confirm('Print this receipt?')) {
                window.print();
              }
            }, 500);
          </script>
        </body>
        </html>
      `;

      // Open the print window
      const printWindow = window.open(
        "",
        "_blank",
        "width=800,height=600,scrollbars=yes"
      );

      if (!printWindow) {
        toast({
          title: "Popup Blocked",
          description:
            "Please allow popups to print receipts, or check your browser settings.",
          variant: "destructive",
        });
        return;
      }

      // Write content and close document
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();

      toast({
        title: "Print Window Opened",
        description: `Receipt ${receipt.receiptNumber} print window has opened.`,
      });
    } catch (error) {
      console.error("Error printing receipt:", error);
      toast({
        title: "Print Error",
        description: "Failed to open print window. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Receipt History</h1>
          <p className="text-muted-foreground">
            View and manage all your receipts
          </p>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          Loading receipts...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Receipt History</h1>
        <p className="text-muted-foreground">
          View and manage all your receipts
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Receipt</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Receipt number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-receipt"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment">Payment Method</Label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger id="payment" data-testid="select-payment-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="card">Card Only</SelectItem>
                  <SelectItem value="cash">Cash Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date Range</Label>
              <Select defaultValue="all">
                <SelectTrigger id="date" data-testid="select-date-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-40 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReceipts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-12 text-muted-foreground"
                >
                  No receipts found. Create your first receipt to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredReceipts.map((receipt) => {
                const items = JSON.parse(receipt.items);
                return (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-mono font-medium">
                      {receipt.receiptNumber}
                    </TableCell>
                    <TableCell>
                      {new Date(receipt.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {items.length}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {receipt.paymentMethod === "card" ? (
                          <>
                            <CreditCard className="w-3 h-3" /> Card
                          </>
                        ) : (
                          <>
                            <Banknote className="w-3 h-3" /> Cash
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      €{parseFloat(receipt.total).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewPDF(receipt)}
                          data-testid={`button-view-${receipt.id}`}
                        >
                          <FileDown className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrint(receipt)}
                          data-testid={`button-print-${receipt.id}`}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
