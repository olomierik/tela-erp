// ─── Types ────────────────────────────────────────────────────────────────────

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type JEStatus    = 'draft' | 'posted' | 'cancelled';

export interface Account extends Record<string, unknown> {
  id:          string;   // same as code
  code:        string;
  name:        string;
  type:        AccountType;
  parentId:    string | null;
  currency:    string;
  balance:     number;
  isHeader:    boolean;  // group/parent accounts have no direct transactions
  description: string;
}

export interface JournalLine extends Record<string, unknown> {
  id:         string;
  accountId:  string;
  accountCode:string;
  accountName:string;
  description:string;
  debit:      number;
  credit:     number;
  department: string;
}

export interface JournalEntry extends Record<string, unknown> {
  id:          string;
  reference:   string;   // JE-2026-001
  date:        string;
  description: string;
  status:      JEStatus;
  lines:       JournalLine[];
  createdAt:   string;
}

// ─── Standard Chart of Accounts ───────────────────────────────────────────────

export const CHART_OF_ACCOUNTS: Account[] = [
  // 1000 – Assets
  { id:'1000', code:'1000', name:'Assets',                      type:'asset',     parentId:null,   currency:'USD', balance:0,          isHeader:true,  description:'All asset accounts' },
  { id:'1100', code:'1100', name:'Current Assets',              type:'asset',     parentId:'1000', currency:'USD', balance:0,          isHeader:true,  description:'Short-term assets' },
  { id:'1110', code:'1110', name:'Cash and Bank',               type:'asset',     parentId:'1100', currency:'USD', balance:0,          isHeader:true,  description:'Cash and bank accounts' },
  { id:'1111', code:'1111', name:'Petty Cash',                  type:'asset',     parentId:'1110', currency:'USD', balance:2500,       isHeader:false, description:'Petty cash fund' },
  { id:'1112', code:'1112', name:'Main Checking Account',       type:'asset',     parentId:'1110', currency:'USD', balance:142800,     isHeader:false, description:'Primary operating account' },
  { id:'1113', code:'1113', name:'Savings Account',             type:'asset',     parentId:'1110', currency:'USD', balance:38500,      isHeader:false, description:'Business savings' },
  { id:'1114', code:'1114', name:'Foreign Currency Account',    type:'asset',     parentId:'1110', currency:'EUR', balance:15200,      isHeader:false, description:'EUR operating account' },
  { id:'1120', code:'1120', name:'Accounts Receivable',         type:'asset',     parentId:'1100', currency:'USD', balance:34200,      isHeader:false, description:'Amounts owed by customers' },
  { id:'1130', code:'1130', name:'Inventory',                   type:'asset',     parentId:'1100', currency:'USD', balance:156000,     isHeader:false, description:'Stock on hand' },
  { id:'1140', code:'1140', name:'Prepaid Expenses',            type:'asset',     parentId:'1100', currency:'USD', balance:8400,       isHeader:false, description:'Expenses paid in advance' },
  { id:'1150', code:'1150', name:'Other Current Assets',        type:'asset',     parentId:'1100', currency:'USD', balance:3200,       isHeader:false, description:'Miscellaneous current assets' },
  { id:'1200', code:'1200', name:'Fixed Assets',                type:'asset',     parentId:'1000', currency:'USD', balance:0,          isHeader:true,  description:'Long-term tangible assets' },
  { id:'1210', code:'1210', name:'Property & Equipment',        type:'asset',     parentId:'1200', currency:'USD', balance:320000,     isHeader:false, description:'Buildings and equipment' },
  { id:'1220', code:'1220', name:'Accumulated Depreciation',   type:'asset',     parentId:'1200', currency:'USD', balance:-87500,     isHeader:false, description:'Contra asset — accumulated depreciation' },
  { id:'1230', code:'1230', name:'Vehicles',                    type:'asset',     parentId:'1200', currency:'USD', balance:45000,      isHeader:false, description:'Company vehicles' },
  { id:'1240', code:'1240', name:'Intangible Assets',           type:'asset',     parentId:'1200', currency:'USD', balance:18000,      isHeader:false, description:'Patents, trademarks, goodwill' },

  // 2000 – Liabilities
  { id:'2000', code:'2000', name:'Liabilities',                 type:'liability', parentId:null,   currency:'USD', balance:0,          isHeader:true,  description:'All liability accounts' },
  { id:'2100', code:'2100', name:'Current Liabilities',         type:'liability', parentId:'2000', currency:'USD', balance:0,          isHeader:true,  description:'Short-term obligations' },
  { id:'2110', code:'2110', name:'Accounts Payable',            type:'liability', parentId:'2100', currency:'USD', balance:48200,      isHeader:false, description:'Amounts owed to vendors' },
  { id:'2120', code:'2120', name:'Accrued Liabilities',         type:'liability', parentId:'2100', currency:'USD', balance:12800,      isHeader:false, description:'Expenses incurred but not yet paid' },
  { id:'2130', code:'2130', name:'Taxes Payable',               type:'liability', parentId:'2100', currency:'USD', balance:9400,       isHeader:false, description:'Tax obligations due' },
  { id:'2140', code:'2140', name:'Deferred Revenue',            type:'liability', parentId:'2100', currency:'USD', balance:5600,       isHeader:false, description:'Revenue received but not yet earned' },
  { id:'2200', code:'2200', name:'Long-term Liabilities',       type:'liability', parentId:'2000', currency:'USD', balance:0,          isHeader:true,  description:'Long-term obligations' },
  { id:'2210', code:'2210', name:'Bank Loans',                  type:'liability', parentId:'2200', currency:'USD', balance:125000,     isHeader:false, description:'Long-term bank financing' },
  { id:'2220', code:'2220', name:'Lease Obligations',           type:'liability', parentId:'2200', currency:'USD', balance:38000,      isHeader:false, description:'Finance lease liabilities' },

  // 3000 – Equity
  { id:'3000', code:'3000', name:'Equity',                      type:'equity',    parentId:null,   currency:'USD', balance:0,          isHeader:true,  description:'Owner\'s equity accounts' },
  { id:'3100', code:'3100', name:'Common Stock',                type:'equity',    parentId:'3000', currency:'USD', balance:100000,     isHeader:false, description:'Issued share capital' },
  { id:'3200', code:'3200', name:'Retained Earnings',           type:'equity',    parentId:'3000', currency:'USD', balance:248500,     isHeader:false, description:'Accumulated profits' },
  { id:'3300', code:'3300', name:'Owner\'s Drawings',           type:'equity',    parentId:'3000', currency:'USD', balance:-18000,     isHeader:false, description:'Withdrawals by owner' },

  // 4000 – Revenue
  { id:'4000', code:'4000', name:'Revenue',                     type:'revenue',   parentId:null,   currency:'USD', balance:0,          isHeader:true,  description:'All revenue accounts' },
  { id:'4100', code:'4100', name:'Sales Revenue',               type:'revenue',   parentId:'4000', currency:'USD', balance:0,          isHeader:true,  description:'Operating revenue' },
  { id:'4110', code:'4110', name:'Product Sales',               type:'revenue',   parentId:'4100', currency:'USD', balance:842000,     isHeader:false, description:'Revenue from product sales' },
  { id:'4120', code:'4120', name:'Service Revenue',             type:'revenue',   parentId:'4100', currency:'USD', balance:286000,     isHeader:false, description:'Revenue from services rendered' },
  { id:'4200', code:'4200', name:'Other Revenue',               type:'revenue',   parentId:'4000', currency:'USD', balance:0,          isHeader:true,  description:'Non-operating revenue' },
  { id:'4210', code:'4210', name:'Interest Income',             type:'revenue',   parentId:'4200', currency:'USD', balance:4200,       isHeader:false, description:'Interest earned on deposits' },
  { id:'4220', code:'4220', name:'Other Income',                type:'revenue',   parentId:'4200', currency:'USD', balance:8600,       isHeader:false, description:'Miscellaneous income' },

  // 5000 – Expenses
  { id:'5000', code:'5000', name:'Expenses',                    type:'expense',   parentId:null,   currency:'USD', balance:0,          isHeader:true,  description:'All expense accounts' },
  { id:'5100', code:'5100', name:'Cost of Goods Sold',          type:'expense',   parentId:'5000', currency:'USD', balance:512000,     isHeader:false, description:'Direct cost of products sold' },
  { id:'5200', code:'5200', name:'Operating Expenses',          type:'expense',   parentId:'5000', currency:'USD', balance:0,          isHeader:true,  description:'Recurring operational costs' },
  { id:'5210', code:'5210', name:'Salaries & Wages',            type:'expense',   parentId:'5200', currency:'USD', balance:186000,     isHeader:false, description:'Employee compensation' },
  { id:'5220', code:'5220', name:'Rent & Utilities',            type:'expense',   parentId:'5200', currency:'USD', balance:48000,      isHeader:false, description:'Office rent and utility bills' },
  { id:'5230', code:'5230', name:'Marketing & Advertising',     type:'expense',   parentId:'5200', currency:'USD', balance:24000,      isHeader:false, description:'Promotion and advertising costs' },
  { id:'5240', code:'5240', name:'Office Supplies',             type:'expense',   parentId:'5200', currency:'USD', balance:6800,       isHeader:false, description:'Stationery and office consumables' },
  { id:'5250', code:'5250', name:'Depreciation Expense',        type:'expense',   parentId:'5200', currency:'USD', balance:18200,      isHeader:false, description:'Periodic asset write-down' },
  { id:'5260', code:'5260', name:'Insurance',                   type:'expense',   parentId:'5200', currency:'USD', balance:12400,      isHeader:false, description:'Business insurance premiums' },
  { id:'5270', code:'5270', name:'Travel & Entertainment',      type:'expense',   parentId:'5200', currency:'USD', balance:9200,       isHeader:false, description:'Business travel and meals' },
  { id:'5300', code:'5300', name:'Other Expenses',              type:'expense',   parentId:'5000', currency:'USD', balance:0,          isHeader:true,  description:'Non-operating expenses' },
  { id:'5310', code:'5310', name:'Interest Expense',            type:'expense',   parentId:'5300', currency:'USD', balance:8800,       isHeader:false, description:'Interest paid on loans' },
  { id:'5320', code:'5320', name:'Tax Expense',                 type:'expense',   parentId:'5300', currency:'USD', balance:36400,      isHeader:false, description:'Income tax expense' },
  { id:'5330', code:'5330', name:'Bank Charges',                type:'expense',   parentId:'5300', currency:'USD', balance:2100,       isHeader:false, description:'Banking fees and charges' },
];

// ─── Journal entry mock data ──────────────────────────────────────────────────

function line(id: string, accountId: string, desc: string, debit: number, credit: number, dept = ''): JournalLine {
  const acct = CHART_OF_ACCOUNTS.find(a => a.id === accountId)!;
  return { id, accountId, accountCode: acct.code, accountName: acct.name, description: desc, debit, credit, department: dept };
}

export const JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'je1', reference: 'JE-2026-001', date: '2026-03-01',
    description: 'Monthly rent payment — March 2026',
    status: 'posted', createdAt: '2026-03-01T09:00:00Z',
    lines: [
      line('l1', '5220', 'Office rent March 2026', 4000, 0, 'Operations'),
      line('l2', '1112', 'Payment from main account', 0, 4000, ''),
    ],
  },
  {
    id: 'je2', reference: 'JE-2026-002', date: '2026-03-05',
    description: 'Customer invoice payment received — Acme Corp',
    status: 'posted', createdAt: '2026-03-05T11:20:00Z',
    lines: [
      line('l3', '1112', 'Receipt from Acme Corp', 12400, 0, ''),
      line('l4', '1120', 'Clear AR — INV-0040', 0, 12400, ''),
    ],
  },
  {
    id: 'je3', reference: 'JE-2026-003', date: '2026-03-07',
    description: 'Payroll processing — March 2026 (first half)',
    status: 'posted', createdAt: '2026-03-07T14:00:00Z',
    lines: [
      line('l5', '5210', 'Gross salaries Mar 1–15', 93000, 0, 'All Departments'),
      line('l6', '1112', 'Net payroll disbursement', 0, 78600, ''),
      line('l7', '2130', 'PAYE taxes withheld', 0, 14400, ''),
    ],
  },
  {
    id: 'je4', reference: 'JE-2026-004', date: '2026-03-10',
    description: 'Vendor payment — Alpha Supplies Co',
    status: 'posted', createdAt: '2026-03-10T10:30:00Z',
    lines: [
      line('l8',  '2110', 'Settle PO-2025-022', 8200, 0, 'Procurement'),
      line('l9',  '1112', 'Payment via bank transfer', 0, 8200, ''),
    ],
  },
  {
    id: 'je5', reference: 'JE-2026-005', date: '2026-03-12',
    description: 'Inventory purchase — Raw materials',
    status: 'posted', createdAt: '2026-03-12T09:15:00Z',
    lines: [
      line('l10', '1130', 'Raw material stock replenishment', 24000, 0, 'Warehouse'),
      line('l11', '2110', 'Payable to TechParts Ltd', 0, 24000, 'Procurement'),
    ],
  },
  {
    id: 'je6', reference: 'JE-2026-006', date: '2026-03-15',
    description: 'Monthly depreciation — March 2026',
    status: 'posted', createdAt: '2026-03-15T08:00:00Z',
    lines: [
      line('l12', '5250', 'Depreciation — vehicles & equipment', 1517, 0, ''),
      line('l13', '1220', 'Accumulated depreciation charge', 0, 1517, ''),
    ],
  },
  {
    id: 'je7', reference: 'JE-2026-007', date: '2026-03-18',
    description: 'Service revenue recognition — TechVision Ltd',
    status: 'posted', createdAt: '2026-03-18T15:45:00Z',
    lines: [
      line('l14', '1120', 'Invoice issued — INV-0043', 9800, 0, 'Sales'),
      line('l15', '4120', 'Service revenue Q1 milestone', 0, 9800, 'Sales'),
    ],
  },
  {
    id: 'je8', reference: 'JE-2026-008', date: '2026-03-20',
    description: 'Marketing campaign spend — Q1 digital ads',
    status: 'draft', createdAt: '2026-03-20T11:00:00Z',
    lines: [
      line('l16', '5230', 'Google Ads — March campaign', 3200, 0, 'Marketing'),
      line('l17', '1112', 'Debit from main account', 0, 3200, 'Marketing'),
    ],
  },
  {
    id: 'je9', reference: 'JE-2026-009', date: '2026-03-22',
    description: 'Interest income — savings account March',
    status: 'draft', createdAt: '2026-03-22T09:00:00Z',
    lines: [
      line('l18', '1113', 'Interest credited to savings', 350, 0, ''),
      line('l19', '4210', 'Interest income recognition', 0, 350, ''),
    ],
  },
  {
    id: 'je10', reference: 'JE-2026-010', date: '2026-03-25',
    description: 'Advance deposit — client retainer (cancelled)',
    status: 'cancelled', createdAt: '2026-03-25T13:30:00Z',
    lines: [
      line('l20', '1112', 'Deposit received', 5000, 0, ''),
      line('l21', '2140', 'Deferred revenue — retainer', 0, 5000, ''),
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getAccountChildren(parentId: string | null): Account[] {
  return CHART_OF_ACCOUNTS.filter(a => a.parentId === parentId);
}

export function buildAccountTree(parentId: string | null = null): Account[] {
  return getAccountChildren(parentId);
}

export function nextJEReference(entries: JournalEntry[]): string {
  const year = new Date().getFullYear();
  const posted = entries
    .map(e => {
      const m = e.reference.match(/JE-\d{4}-(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    });
  const next = (Math.max(0, ...posted) + 1).toString().padStart(3, '0');
  return `JE-${year}-${next}`;
}

export const TYPE_COLORS: Record<AccountType, string> = {
  asset:     'info',
  liability: 'destructive',
  equity:    'success',
  revenue:   'default',
  expense:   'warning',
};

export const TYPE_LABELS: Record<AccountType, string> = {
  asset:     'Asset',
  liability: 'Liability',
  equity:    'Equity',
  revenue:   'Revenue',
  expense:   'Expense',
};
