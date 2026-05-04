import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertReceiptSchema } from "@shared/schema";
import { z } from "zod";
import {
  differenceInCalendarDays,
  endOfDay,
  format,
  startOfDay,
  subDays,
} from "date-fns";

export async function registerRoutes(app: Express): Promise<Server> {
  // Single-tenant: all routes use shared storage (no req.user). When adding
  // multi-user mode, set SINGLE_USER_MODE in @shared/app-mode and add auth + filters here.

  // Product routes
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid product data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const validatedData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, validatedData);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid product data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Receipt routes
  app.get("/api/receipts", async (req, res) => {
    try {
      const { paymentMethod, startDate, endDate } = req.query;

      let receipts;
      if (paymentMethod && paymentMethod !== "all") {
        receipts = await storage.getReceiptsByPaymentMethod(
          paymentMethod as string
        );
      } else if (startDate && endDate) {
        receipts = await storage.getReceiptsByDateRange(
          new Date(startDate as string),
          new Date(endDate as string)
        );
      } else {
        receipts = await storage.getReceipts();
      }

      res.json(receipts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch receipts" });
    }
  });

  app.get("/api/receipts/:id", async (req, res) => {
    try {
      const receipt = await storage.getReceipt(req.params.id);
      if (!receipt) {
        return res.status(404).json({ error: "Receipt not found" });
      }
      res.json(receipt);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch receipt" });
    }
  });

  app.post("/api/receipts", async (req, res) => {
    try {
      console.log("Receipt data received:", JSON.stringify(req.body, null, 2));
      const validatedData = insertReceiptSchema.parse(req.body);
      const receipt = await storage.createReceipt(validatedData);
      res.status(201).json(receipt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(
          "Validation errors:",
          JSON.stringify(error.errors, null, 2)
        );
        return res
          .status(400)
          .json({ error: "Invalid receipt data", details: error.errors });
      }
      console.error("Receipt creation error:", error);
      res.status(500).json({ error: "Failed to create receipt" });
    }
  });

  // Analytics route — optional query: period=daily|weekly|monthly|custom, from=YYYY-MM-DD, to=YYYY-MM-DD
  app.get("/api/analytics", async (req, res) => {
    try {
      const receipts = await storage.getReceipts();
      const now = new Date();
      const period = (req.query.period as string) || "monthly";

      let rangeStart: Date;
      let rangeEnd: Date;
      let prevStart: Date;
      let prevEnd: Date;
      let comparisonLabel: string;

      if (period === "daily") {
        rangeStart = startOfDay(now);
        rangeEnd = endOfDay(now);
        prevStart = startOfDay(subDays(now, 1));
        prevEnd = endOfDay(subDays(now, 1));
        comparisonLabel = "vs. yesterday";
      } else if (period === "weekly") {
        const startOfThisWeek = new Date(now);
        startOfThisWeek.setDate(now.getDate() - now.getDay());
        startOfThisWeek.setHours(0, 0, 0, 0);
        const startOfLastWeek = new Date(startOfThisWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        rangeStart = startOfThisWeek;
        rangeEnd = now;
        prevStart = startOfLastWeek;
        prevEnd = new Date(startOfThisWeek.getTime() - 1);
        comparisonLabel = "vs. last week";
      } else if (period === "monthly") {
        rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
        rangeEnd = now;
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEnd = endOfDay(
          new Date(now.getFullYear(), now.getMonth(), 0)
        );
        comparisonLabel = "vs. last month";
      } else if (period === "custom") {
        const fromQ = req.query.from as string | undefined;
        const toQ = req.query.to as string | undefined;
        if (!fromQ || !toQ) {
          return res.status(400).json({
            error:
              "Custom period requires from and to query params (YYYY-MM-DD)",
          });
        }
        rangeStart = new Date(`${fromQ}T00:00:00`);
        rangeEnd = new Date(`${toQ}T23:59:59.999`);
        if (rangeStart > rangeEnd) {
          return res
            .status(400)
            .json({ error: "from date must be on or before to date" });
        }
        const nDays =
          differenceInCalendarDays(
            endOfDay(rangeEnd),
            startOfDay(rangeStart)
          ) + 1;
        prevEnd = endOfDay(subDays(startOfDay(rangeStart), 1));
        prevStart = startOfDay(subDays(prevEnd, nDays - 1));
        comparisonLabel = "vs. previous period";
      } else {
        return res.status(400).json({
          error: "Invalid period. Use daily, weekly, monthly, or custom",
        });
      }

      const receiptTime = (r: (typeof receipts)[0]) =>
        new Date(r.date).getTime();

      const inRange = (t: number, a: Date, b: Date) =>
        t >= a.getTime() && t <= b.getTime();

      const currentReceipts = receipts.filter((r) =>
        inRange(receiptTime(r), rangeStart, rangeEnd)
      );
      const prevReceipts = receipts.filter((r) =>
        inRange(receiptTime(r), prevStart, prevEnd)
      );

      const sumTotals = (list: typeof receipts) =>
        list.reduce((sum, r) => sum + parseFloat(r.total), 0);

      const currentIncome = sumTotals(currentReceipts);
      const prevIncome = sumTotals(prevReceipts);
      const pctChange =
        prevIncome > 0
          ? ((currentIncome - prevIncome) / prevIncome) * 100
          : currentIncome > 0
            ? 100
            : 0;

      const cardInPeriod = currentReceipts.filter(
        (r) => r.paymentMethod === "card"
      );
      const cashInPeriod = currentReceipts.filter(
        (r) => r.paymentMethod === "cash"
      );
      const cardTotal = cardInPeriod.reduce(
        (sum, r) => sum + parseFloat(r.total),
        0
      );
      const cashTotal = cashInPeriod.reduce(
        (sum, r) => sum + parseFloat(r.total),
        0
      );
      const totalIncome = cardTotal + cashTotal;

      const sortedCurrent = [...currentReceipts].sort(
        (a, b) => receiptTime(b) - receiptTime(a)
      );
      const recentReceipts = sortedCurrent.slice(0, 5).map((r) => ({
        id: r.id,
        number: r.receiptNumber,
        amount: parseFloat(r.total),
        method: r.paymentMethod,
        date: r.date,
      }));

      const productSales: {
        [key: string]: { count: number; revenue: number; name: string };
      } = {};

      for (const receipt of currentReceipts) {
        const items = JSON.parse(receipt.items);
        for (const item of items) {
          if (!productSales[item.productId]) {
            productSales[item.productId] = {
              count: 0,
              revenue: 0,
              name: item.productName,
            };
          }
          productSales[item.productId].count += item.quantity;
          productSales[item.productId].revenue += item.subtotal;
        }
      }

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map((p) => ({
          name: p.name,
          count: p.count,
          revenue: p.revenue,
        }));

      const sameCalendarDay =
        startOfDay(rangeStart).getTime() === startOfDay(rangeEnd).getTime();
      const rangeLabel = sameCalendarDay
        ? format(rangeEnd, "MMM d, yyyy")
        : `${format(rangeStart, "MMM d, yyyy")} – ${format(rangeEnd, "MMM d, yyyy")}`;

      res.json({
        period,
        range: {
          from: rangeStart.toISOString(),
          to: rangeEnd.toISOString(),
        },
        rangeLabel,
        summary: {
          income: currentIncome,
          change: Math.round(pctChange * 10) / 10,
          receiptCount: currentReceipts.length,
        },
        comparisonLabel,
        paymentMethods: {
          card: {
            total: cardTotal,
            percentage:
              totalIncome > 0 ? Math.round((cardTotal / totalIncome) * 100) : 0,
          },
          cash: {
            total: cashTotal,
            percentage:
              totalIncome > 0 ? Math.round((cashTotal / totalIncome) * 100) : 0,
          },
        },
        recentReceipts,
        topProducts,
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ error: "Failed to calculate analytics" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
