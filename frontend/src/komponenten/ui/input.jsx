import { cn } from '@/hilfen/utils';

export function Input({ className, type = 'text', ...props }) {
  return (
    <input type={type} data-slot="input"
      className={cn(
        'w-full rounded-lg border border-feldrahmen bg-flaeche-hell px-3 py-3 text-lg text-schrift outline-none',
        'placeholder:text-schrift-gedimmt focus:border-schrift-gedimmt focus:ring-3 focus:ring-schrift/10',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props} />
  );
}
