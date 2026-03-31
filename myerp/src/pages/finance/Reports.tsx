import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';

const PERIOD = 'March 2026';

function ReportRow({ label, value, bold, indent, highlight }: {
  label: string;
  value: string;
  bold?: boolean;
  indent?: boolean;
  highlight?: 'positive' | 'negative' | 'neutral';
}) {
  const valueColor =
    highlight === 'positive' ? 'text-success' :
    highlight === 'negative' ? 'text-destructive' :
    highlight === 'neutral'  ? 'text-foreground' :
    'text-foreground';

  return (
    <div className={`flex items-center justify-between py-2 border-b border-border last:border-0 ${bold ? 'font-semibold' : ''}`}>
      <span className={`text-sm ${indent ? 'pl-4 text-muted-foreground' : ''} ${bold ? 'text-foreground' : 'text-muted-foreground'}`}>
        {label}
      </span>
      <span className={`text-sm tabular-nums ${valueColor} ${bold ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}

function TrialRow({ account, debit, credit }: { account: string; debit?: string; credit?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground flex-1">{account}</span>
      <span className="text-sm tabular-nums w-28 text-right text-foreground">{debit ?? '—'}</span>
      <span className="text-sm tabular-nums w-28 text-right text-foreground">{credit ?? '—'}</span>
    </div>
  );
}

export default function FinanceReports() {
  return (
    <AppLayout title="Financial Reports">
      <PageHeader
        title="Financial Reports"
        subtitle="Summarized financial statements for the current period."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* P&L Summary */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold">P&amp;L Summary</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{PERIOD}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 px-4 pb-4">
            <ReportRow label="Revenue"             value="$1,248,500"       />
            <ReportRow label="Cost of Sales"       value="$687,200" indent  />
            <ReportRow label="Gross Profit"        value="$561,300 (44.9%)" bold highlight="positive" />
            <ReportRow label="Operating Expenses"  value="$312,800" indent  />
            <ReportRow label="Net Income"          value="$248,500"         bold highlight="positive" />
          </CardContent>
          <div className="px-4 pb-4 pt-2 border-t border-border">
            <Button variant="outline" size="sm" disabled className="w-full gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </Button>
          </div>
        </Card>

        {/* Balance Sheet Summary */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold">Balance Sheet</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{PERIOD}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 px-4 pb-4">
            <ReportRow label="Total Assets"         value="$892,400" bold highlight="neutral" />
            <ReportRow label="Total Liabilities"    value="$410,200" bold highlight="negative" />
            <div className="mt-2">
              <ReportRow label="Shareholders' Equity" value="$482,200" bold highlight="positive" />
            </div>
            <div className="mt-4 rounded-md bg-muted/50 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">
                Assets = Liabilities + Equity &nbsp;|&nbsp; <span className="text-success font-medium">Balanced</span>
              </p>
            </div>
          </CardContent>
          <div className="px-4 pb-4 pt-2 border-t border-border">
            <Button variant="outline" size="sm" disabled className="w-full gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </Button>
          </div>
        </Card>

        {/* Trial Balance */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold">Trial Balance</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{PERIOD}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 px-4 pb-4">
            {/* Header row */}
            <div className="flex items-center justify-between py-1.5 border-b border-border mb-0.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex-1">Account</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-28 text-right">Debit</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-28 text-right">Credit</span>
            </div>
            <TrialRow account="Cash"         debit="$182,000"  />
            <TrialRow account="Receivables"  debit="$34,200"   />
            <TrialRow account="Inventory"    debit="$156,000"  />
            <TrialRow account="Payables"                       credit="$48,200"  />
            <TrialRow account="Revenue"                        credit="$248,500" />
            <TrialRow account="Expenses"     debit="$312,800"  />
            {/* Totals */}
            <div className="flex items-center justify-between py-2 mt-1 border-t-2 border-border font-semibold">
              <span className="text-sm flex-1">Totals</span>
              <span className="text-sm tabular-nums w-28 text-right text-success">$685,000</span>
              <span className="text-sm tabular-nums w-28 text-right text-success">$296,700</span>
            </div>
          </CardContent>
          <div className="px-4 pb-4 pt-2 border-t border-border">
            <Button variant="outline" size="sm" disabled className="w-full gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </Button>
          </div>
        </Card>

      </div>
    </AppLayout>
  );
}
