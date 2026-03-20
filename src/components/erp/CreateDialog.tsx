import { ReactNode, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Field {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select';
  options?: { label: string; value: string }[];
  required?: boolean;
  defaultValue?: string;
}

interface CreateDialogProps {
  title: string;
  buttonLabel: string;
  fields: Field[];
  onSubmit: (values: Record<string, any>) => void;
  isPending?: boolean;
}

export function CreateDialog({ title, buttonLabel, fields, onSubmit, isPending }: CreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    fields.forEach(f => { defaults[f.name] = f.defaultValue || ''; });
    return defaults;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const processed: Record<string, any> = {};
    fields.forEach(f => {
      const v = values[f.name];
      if (f.type === 'number') processed[f.name] = parseFloat(v) || 0;
      else if (v) processed[f.name] = v;
    });
    onSubmit(processed);
    setOpen(false);
    // Reset
    const defaults: Record<string, string> = {};
    fields.forEach(f => { defaults[f.name] = f.defaultValue || ''; });
    setValues(defaults);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{buttonLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(f => (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={f.name}>{f.label}</Label>
              {f.type === 'select' && f.options ? (
                <Select value={values[f.name]} onValueChange={v => setValues(prev => ({ ...prev, [f.name]: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {f.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={f.name}
                  type={f.type || 'text'}
                  required={f.required}
                  value={values[f.name]}
                  onChange={e => setValues(prev => ({ ...prev, [f.name]: e.target.value }))}
                  step={f.type === 'number' ? '0.01' : undefined}
                />
              )}
            </div>
          ))}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Creating...' : 'Create'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
