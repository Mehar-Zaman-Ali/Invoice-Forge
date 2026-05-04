import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface AnalyticsCardProps {
  title: string;
  value: string;
  change?: number;
  period: string;
  receiptCount?: number;
}

export function AnalyticsCard({ title, value, change, period, receiptCount }: AnalyticsCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-chart-2' : 'text-destructive'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-mono font-semibold">€{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{period}</p>
        {receiptCount !== undefined && (
          <p className="text-xs text-muted-foreground mt-0.5">{receiptCount} receipt{receiptCount === 1 ? "" : "s"} in range</p>
        )}
      </CardContent>
    </Card>
  );
}
