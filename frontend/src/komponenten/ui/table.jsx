import { cn } from '@/hilfen/utils';

export function Table({ className, rahmenlos = false, ...props }) {
  const tabelle = <table data-slot="table" className={cn('w-full text-left', className)} {...props} />;
  if (rahmenlos) return tabelle;
  return (
    <div data-slot="table-container"
      className="kaertchen-schatten overflow-x-auto rounded-lg border border-linie bg-flaeche">
      {tabelle}
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return (
    <thead data-slot="table-header"
      className={cn('bg-flaeche-hell/50 text-xs text-schrift-gedimmt [&_tr]:border-b [&_tr]:border-linie', className)}
      {...props} />
  );
}

export function TableBody({ className, ...props }) {
  return <tbody data-slot="table-body" className={cn('divide-y divide-linie text-sm', className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return <tr data-slot="table-row" className={cn('hover:bg-flaeche-hell/50', className)} {...props} />;
}

export function TableHead({ className, ...props }) {
  return <th data-slot="table-head" className={cn('px-2.5 py-2 font-medium', className)} {...props} />;
}

export function TableCell({ className, ...props }) {
  return <td data-slot="table-cell" className={cn('px-2.5 py-2', className)} {...props} />;
}
