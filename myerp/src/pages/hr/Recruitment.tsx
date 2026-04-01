import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatDate } from '@/lib/mock';
import { useTable } from '@/lib/useTable';
import { toast } from 'sonner';
import { Pencil, Trash2, Briefcase, Users, CheckCircle, FileText, Loader2 } from 'lucide-react';

type JobType = 'full_time' | 'part_time' | 'contract' | 'internship';
type JobStatus = 'open' | 'closed' | 'draft';

interface JobPosting extends Record<string, unknown> {
  id: string;
  title: string;
  department: string;
  location: string;
  type: JobType;
  status: JobStatus;
  applicants_count: number;
  posted_date: string;
  closing_date: string;
}

const today = () => new Date().toISOString().slice(0, 10);

interface JobPostingForm {
  title: string;
  department: string;
  location: string;
  type: JobType;
  status: JobStatus;
  applicants_count: number;
  posted_date: string;
  closing_date: string;
}

const BLANK: JobPostingForm = {
  title: '',
  department: 'Engineering',
  location: '',
  type: 'full_time',
  status: 'draft',
  applicants_count: 0,
  posted_date: today(),
  closing_date: today(),
};

const statusVariant: Record<JobStatus, 'success' | 'destructive' | 'secondary'> = {
  open: 'success',
  closed: 'destructive',
  draft: 'secondary',
};

const typeLabel: Record<JobType, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  internship: 'Internship',
};

export default function Recruitment() {
  const { rows: items, loading, insert, update, remove } = useTable<JobPosting>('myerp_job_postings');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<JobPosting | null>(null);
  const [form, setForm] = useState<JobPostingForm>(BLANK);

  const totalPostings = items.length;
  const openPostings = items.filter(j => j.status === 'open').length;
  const totalApplicants = items.reduce((s, j) => s + j.applicants_count, 0);
  const closedPostings = items.filter(j => j.status === 'closed').length;

  function openNew() {
    setEditing(null);
    setForm(BLANK);
    setOpen(true);
  }

  function openEdit(job: JobPosting) {
    setEditing(job);
    setForm({
      title: job.title as string,
      department: job.department as string,
      location: job.location as string,
      type: job.type as JobType,
      status: job.status as JobStatus,
      applicants_count: job.applicants_count as number,
      posted_date: job.posted_date as string,
      closing_date: job.closing_date as string,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Job title is required'); return; }
    try {
      if (editing) {
        await update(editing.id, {
          title: form.title,
          department: form.department,
          location: form.location,
          type: form.type,
          status: form.status,
          applicants_count: form.applicants_count,
          posted_date: form.posted_date,
          closing_date: form.closing_date,
        });
        toast.success('Job posting updated');
      } else {
        await insert({
          title: form.title,
          department: form.department,
          location: form.location,
          type: form.type,
          status: form.status,
          applicants_count: form.applicants_count,
          posted_date: form.posted_date,
          closing_date: form.closing_date,
        });
        toast.success('Job posting created');
      }
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to save job posting');
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Job posting removed');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to remove job posting');
    }
  }

  function field(key: keyof JobPostingForm, value: string | number) {
    setForm(f => ({ ...f, [key]: value }));
  }

  return (
    <AppLayout title="Recruitment">
      <PageHeader
        title="Recruitment"
        subtitle="Post job openings, manage applications, and track candidates through the hiring pipeline."
        action={{ label: 'New Job Posting', onClick: openNew }}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Postings',    value: totalPostings,    icon: FileText,    color: 'text-primary'  },
          { label: 'Open Positions',    value: openPostings,     icon: Briefcase,   color: 'text-success'  },
          { label: 'Total Applicants',  value: totalApplicants,  icon: Users,       color: 'text-info'     },
          { label: 'Closed Positions',  value: closedPostings,   icon: CheckCircle, color: 'text-warning'  },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <kpi.icon className={`w-8 h-8 ${kpi.color} shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-semibold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Applicants</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead>Closing</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(job => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell>{job.department}</TableCell>
                    <TableCell>{job.location}</TableCell>
                    <TableCell>{typeLabel[job.type]}</TableCell>
                    <TableCell>{job.applicants_count}</TableCell>
                    <TableCell>{formatDate(job.posted_date)}</TableCell>
                    <TableCell>{formatDate(job.closing_date)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[job.status]} className="capitalize">{job.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(job)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(job.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Job Posting' : 'New Job Posting'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
            <div className="space-y-1.5">
              <Label>Job Title</Label>
              <Input value={form.title} onChange={e => field('title', e.target.value)} placeholder="e.g. Senior Engineer" />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.department} onChange={e => field('department', e.target.value)}>
                {['Engineering', 'Sales', 'HR', 'Finance', 'Operations', 'Marketing'].map(d => <option key={d}>{d}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => field('location', e.target.value)} placeholder="e.g. Remote, New York" />
            </div>
            <div className="space-y-1.5">
              <Label>Employment Type</Label>
              <Select value={form.type} onChange={e => field('type', e.target.value as JobType)}>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onChange={e => field('status', e.target.value as JobStatus)}>
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Applicants Count</Label>
              <Input type="number" value={form.applicants_count} onChange={e => field('applicants_count', Number(e.target.value))} min={0} />
            </div>
            <div className="space-y-1.5">
              <Label>Posted Date</Label>
              <Input type="date" value={form.posted_date} onChange={e => field('posted_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Closing Date</Label>
              <Input type="date" value={form.closing_date} onChange={e => field('closing_date', e.target.value)} />
            </div>
          </div>
          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Posting'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
