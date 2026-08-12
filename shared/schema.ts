import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  decimal,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const products = pgTable("products", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});

export const receipts = pgTable("receipts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  receiptNumber: text("receipt_number").notNull().unique(),
  date: timestamp("date").notNull().defaultNow(),
  paymentMethod: text("payment_method").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  items: text("items").notNull(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
});
export const insertReceiptSchema = createInsertSchema(receipts)
  .omit({ id: true, date: true })
  .extend({
    date: z.string().datetime().or(z.date()).optional(),
  });

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receipts.$inferSelect;

export interface ReceiptItem {
  productId: string;
  productName: string;
  productDescription?: string | null;
  quantity: number;
  price: number;
  subtotal: number;
}
