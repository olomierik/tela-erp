export function genId() { return Math.random().toString(36).slice(2, 9); }
export function today() { return new Date().toISOString().split('T')[0]; }
export function formatCurrency(n: number) {
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
}
