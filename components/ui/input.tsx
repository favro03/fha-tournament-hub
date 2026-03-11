import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot='input'
      className={cn(
        'h-9 w-full min-w-0 rounded-md border border-emerald-900/70 bg-[#0f2217] px-3 py-1 text-base text-white shadow-xs outline-none transition-[color,box-shadow,border-color] placeholder:text-white/45 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'selection:bg-emerald-500 selection:text-slate-950',
        'focus-visible:border-emerald-400 focus-visible:ring-[3px] focus-visible:ring-emerald-400/20',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        className
      )}
      {...props}
    />
  );
}

export { Input };