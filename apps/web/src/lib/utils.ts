import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind クラスの結合（shadcn 流儀）。 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
