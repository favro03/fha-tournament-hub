import * as React from 'react';

import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot='textarea'
      className={cn(
        'flex min-h-16 w-full field-sizing-content rounded-md border border-emerald-900/70 bg-[#0f2217] px-3 py-2 text-base text-white shadow-xs outline-none transition-[color,box-shadow,border-color] placeholder:text-white/45 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-emerald-400 focus-visible:ring-[3px] focus-visible:ring-emerald-400/20',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };