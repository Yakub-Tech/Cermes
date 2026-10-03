import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...klassen) {
  return twMerge(clsx(klassen));
}
