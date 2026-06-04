// lib/pdf-generator.ts
import jsPDF from "jspdf";
import type { ReceiptItem } from "@shared/schema";

export interface ReceiptData {
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

/**
 * Generates a clean, modern receipt PDF and triggers download.
 */
export function generateReceiptPDF(data: ReceiptData): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Colors
  const primary: [number, number, number] = [33, 33, 33];
  const grey: [number, number, number] = [120, 120, 120];
  const lightGrey: [number, number, number] = [240, 240, 240];

  const safeFinalize = () => {
    // --- Header (left)
    const headerStartY = 20;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...grey);
    doc.text("ALL Mobile Phone & Computer Service 54", 20, headerStartY);
    doc.text("Phibsborough Road, Dublin 7", 20, headerStartY + 5);
    doc.text("M: 0894444944  |  T: 015553236", 20, headerStartY + 10);

    // Right: INVOICE, number, date
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("INVOICE", pageWidth - 20, 18, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...grey);
    doc.text(`Invoice No: ${data.receiptNumber}`, pageWidth - 20, 25, {
      align: "right",
    });
    doc.text(
      `Date: ${new Date(data.date).toLocaleDateString("en-GB")}`,
      pageWidth - 20,
      30,
      { align: "right" }
    );

    // Separator (positioned below business text)
    const separatorY = headerStartY + 15;
    doc.setDrawColor(...lightGrey);
    doc.setLineWidth(0.5);
    doc.line(20, separatorY, pageWidth - 20, separatorY);

    // Items header (adjusted to be below separator)
    let y = separatorY + 13;
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(20, y, pageWidth - 40, 8, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...grey);
    doc.text("Item", 24, y + 6);
    doc.text("Price", pageWidth - 70, y + 6);
    doc.text("Amount", pageWidth - 24, y + 6, { align: "right" });

    // Items rows
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...primary);

    data.items.forEach((item, idx) => {
      if (y > 250) {
        doc.addPage();
        y = 20; // simple page break logic
      }

      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(20, y - 6, pageWidth - 40, 8, "F");
      }

      const name = item.productName || "Unknown";
      const price = Number(item.price || 0).toFixed(2);
      const amount = Number(
        item.subtotal || item.price * item.quantity || 0
      ).toFixed(2);

      doc.text(name, 24, y);
      doc.text(`€${price}`, pageWidth - 70, y);
      doc.text(`€${amount}`, pageWidth - 24, y, { align: "right" });

      y += 8;
    });

    // Totals
    y += 8;
    doc.setDrawColor(220, 220, 220);
    doc.line(pageWidth - 90, y, pageWidth - 20, y);

    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grey);
    doc.text("Subtotal:", pageWidth - 85, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primary);
    doc.text(`€${data.subtotal.toFixed(2)}`, pageWidth - 24, y, {
      align: "right",
    });

    // Only show discount if included
    if (data.includeDiscount) {
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...grey);
      doc.text(`Discount (${data.discountRate || 10}%):`, pageWidth - 85, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 0, 0); // red for discount
      doc.text(`-€${data.discount.toFixed(2)}`, pageWidth - 24, y, {
        align: "right",
      });
    }

    // Only show tax if included
    if (data.includeTax) {
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...grey);
      doc.text(`Tax (${data.taxRate || 8}%):`, pageWidth - 85, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primary);
      doc.text(`€${data.tax.toFixed(2)}`, pageWidth - 24, y, {
        align: "right",
      });
    }

    // total highlight
    y += 10;
    doc.setFillColor(201, 0, 135); // pink highlight
    doc.roundedRect(pageWidth - 90, y - 6, 70, 12, 2, 2, "F");

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Total:", pageWidth - 83, y);
    doc.text(`€${data.total.toFixed(2)}`, pageWidth - 24, y, {
      align: "right",
    });

    // Terms
    y += 20;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primary);
    doc.text("TERMS & CONDITIONS", 20, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...grey);
    doc.text("1. No refund or exchange for mind changing.", 20, y + 8);
    doc.text(
      "2. Warranty voids in case of physical or liquid damage.",
      20,
      y + 14
    );

    // Footer
    y += 28;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(201, 0, 135);
    doc.text("Thank you!", 20, y);
  };

  safeFinalize();
  doc.save(`receipt-${data.receiptNumber}.pdf`);
}
