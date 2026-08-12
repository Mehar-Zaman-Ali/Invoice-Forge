import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReceiptItem {
  productId: string;
  productName: string;
  productDescription?: string | null;
  quantity: number;
  price: number;
  subtotal: number;
}

interface ReceiptItemsTableProps {
  items: ReceiptItem[];
  onRemoveItem: (index: number) => void;
}

export function ReceiptItemsTable({ items, onRemoveItem }: ReceiptItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        No items added yet. Select products to add to receipt.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">
                {item.productName}
                {item.productDescription && (
                  <div className="text-xs text-muted-foreground font-normal">
                    {item.productDescription}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right font-mono">{item.quantity}</TableCell>
              <TableCell className="text-right font-mono">€{item.price.toFixed(2)}</TableCell>
              <TableCell className="text-right font-mono">€{item.subtotal.toFixed(2)}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveItem(index)}
                  data-testid={`button-remove-item-${index}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
