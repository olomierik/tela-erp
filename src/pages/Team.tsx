import AppLayout from '@/components/layout/AppLayout';
import { DataTable, StatusBadge } from '@/components/erp/SharedComponents';
import { Button } from '@/components/ui/button';

const members = [
  ['Alex Morgan', 'admin@tela-erp.com', <StatusBadge status="Admin" variant="info" />, <StatusBadge status="Active" variant="success" />, 'Mar 1, 2026'],
  ['Sarah Chen', 'sarah@tela-erp.com', <StatusBadge status="User" variant="default" />, <StatusBadge status="Active" variant="success" />, 'Mar 5, 2026'],
  ['James Wilson', 'james@tela-erp.com', <StatusBadge status="User" variant="default" />, <StatusBadge status="Active" variant="success" />, 'Mar 8, 2026'],
  ['Maria Garcia', 'maria@tela-erp.com', <StatusBadge status="Reseller" variant="warning" />, <StatusBadge status="Active" variant="success" />, 'Mar 10, 2026'],
];

export default function Team() {
  return (
    <AppLayout title="Team Management" subtitle="Manage team members and roles">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">4 members · 25 seats available</p>
        <Button size="sm">+ Invite Member</Button>
      </div>
      <DataTable headers={['Name', 'Email', 'Role', 'Status', 'Joined']} rows={members} />
    </AppLayout>
  );
}
