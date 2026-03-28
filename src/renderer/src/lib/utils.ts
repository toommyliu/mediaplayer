import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clampAspectRatio(width: number, height: number, min = 0.5, max = 2) {
  const ar = width / height
  return Math.max(min, Math.min(max, ar))
}
