import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DATA = [
  { month: 'Oct', revenue: 184000, expenses: 132000 },
  { month: 'Nov', revenue: 210000, expenses: 148000 },
  { month: 'Dec', revenue: 195000, expenses: 141000 },
  { month: 'Jan', revenue: 228000, expenses: 159000 },
  { month: 'Feb', revenue: 242000, expenses: 167000 },
  { month: 'Mar', revenue: 248500, expenses: 172000 },
];

function fmt(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 mb-0.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.fill }} />
          <span className="text-muted-foreground capitalize">{entry.name}:</span>
          <span className="font-semibold text-foreground">${entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export default function RevenueChart() {
  return (
    <Card className="rounded-xl border-border h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Revenue vs Expenses</CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />
              Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-accent inline-block" />
              Expenses
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Last 6 months</p>
      </CardHeader>
      <CardContent className="pt-2 pb-4">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={DATA} barCategoryGap="35%" margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={fmt}
              width={44}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} />
            <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--accent))" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
