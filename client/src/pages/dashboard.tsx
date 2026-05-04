import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { AnalyticsCard } from "@/components/analytics-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, CreditCard, Banknote } from "lucide-react";

type Period = "daily" | "weekly" | "monthly" | "custom";

interface AnalyticsData {
  period: Period;
  range: { from: string; to: string };
  rangeLabel: string;
  summary: {
    income: number;
    change: number;
    receiptCount: number;
  };
  comparisonLabel: string;
  paymentMethods: {
    card: { total: number; percentage: number };
    cash: { total: number; percentage: number };
  };
  recentReceipts: Array<{
    id: string;
    number: string;
    amount: number;
    method: string;
    date: Date;
  }>;
  topProducts: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
}

function buildAnalyticsUrl(period: Period, fromDate: string, toDate: string): string {
  const params = new URLSearchParams();
  params.set("period", period);
  if (period === "custom") {
    params.set("from", fromDate);
    params.set("to", toDate);
  }
  const q = params.toString();
  return q ? `/api/analytics?${q}` : "/api/analytics";
}

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [fromDate, setFromDate] = useState(() =>
    format(subDays(new Date(), 6), "yyyy-MM-dd")
  );
  const [toDate, setToDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const analyticsUrl = useMemo(
    () => buildAnalyticsUrl(period, fromDate, toDate),
    [period, fromDate, toDate]
  );

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: [analyticsUrl],
    queryFn: async () => {
      const res = await fetch(analyticsUrl, { credentials: "include" });
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    },
  });

  const summaryTitle = useMemo(() => {
    switch (period) {
      case "daily":
        return "Today's income";
      case "weekly":
        return "This week's income";
      case "monthly":
        return "This month's income";
      case "custom":
        return "Income (custom range)";
      default:
        return "Income";
    }
  }, [period]);

  if (isLoading || !analytics) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your receipt analytics and performance</p>
        </div>
        <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your receipt analytics and performance</p>
        <p className="text-sm text-muted-foreground mt-2">
          <span className="font-medium text-foreground">Showing:</span> {analytics.rangeLabel}
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={period}
            onValueChange={(v) => setPeriod(v as Period)}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:inline-flex sm:h-10 sm:w-auto">
              <TabsTrigger value="daily" className="text-xs sm:text-sm">
                Daily
              </TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs sm:text-sm">
                Weekly
              </TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs sm:text-sm">
                Monthly
              </TabsTrigger>
              <TabsTrigger value="custom" className="text-xs sm:text-sm">
                Custom
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {period === "custom" && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="dash-from" className="text-xs text-muted-foreground">
                  From
                </Label>
                <input
                  id="dash-from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="dash-to" className="text-xs text-muted-foreground">
                  To
                </Label>
                <input
                  id="dash-to"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <AnalyticsCard
          title={summaryTitle}
          value={analytics.summary.income.toFixed(2)}
          change={analytics.summary.change}
          period={analytics.comparisonLabel}
          receiptCount={analytics.summary.receiptCount}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Recent receipts
            </CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              For the selected period
            </p>
          </CardHeader>
          <CardContent>
            {analytics.recentReceipts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No receipts in this range. Try another period or create a receipt.
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.recentReceipts.map((receipt) => (
                  <div key={receipt.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        {receipt.method === 'card' ? (
                          <CreditCard className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Banknote className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="font-mono font-medium text-sm">{receipt.number}</div>
                        <div className="text-xs text-muted-foreground">{formatTimeAgo(receipt.date)}</div>
                      </div>
                    </div>
                    <div className="font-mono font-semibold">€{receipt.amount.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top products
            </CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              By revenue in this range
            </p>
          </CardHeader>
          <CardContent>
            {analytics.topProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No product sales in this range.
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center rounded-full">
                        {index + 1}
                      </Badge>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.count} sold</div>
                      </div>
                    </div>
                    <div className="font-mono font-semibold">€{product.revenue.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment method distribution</CardTitle>
          <p className="text-xs text-muted-foreground font-normal">
            For the selected period only
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Card payments</span>
                <span className="font-mono font-semibold">{analytics.paymentMethods.card.percentage}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-chart-1" style={{ width: `${analytics.paymentMethods.card.percentage}%` }}></div>
              </div>
              <div className="text-xs text-muted-foreground">€{analytics.paymentMethods.card.total.toFixed(2)} total</div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cash payments</span>
                <span className="font-mono font-semibold">{analytics.paymentMethods.cash.percentage}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-chart-2" style={{ width: `${analytics.paymentMethods.cash.percentage}%` }}></div>
              </div>
              <div className="text-xs text-muted-foreground">€{analytics.paymentMethods.cash.total.toFixed(2)} total</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
