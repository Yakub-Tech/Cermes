import { cn } from '@/hilfen/utils';

export function Label({ className, ...props }) {
  return (
    <label data-slot="label"
      className={cn('mb-1 block text-sm font-medium text-schrift-gedimmt', className)}
      {...props} />
  );
}
