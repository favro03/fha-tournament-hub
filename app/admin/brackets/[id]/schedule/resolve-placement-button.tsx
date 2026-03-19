'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function ResolvePlacementButton({
  bracketId,
}: {
  bracketId: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function onResolve() {
    setStatus('idle');
    setMessage('');

    try {
      const res = await fetch(`/api/brackets/${bracketId}/resolve-placement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error ?? 'Failed to resolve placement teams');
      }

      const incomplete = (json.resolvedPools ?? []).filter(
        (p: any) => !p.poolPlayComplete
      );

      if (incomplete.length > 0) {
        setStatus('error');
        setMessage('Pool play is not complete yet for at least one pool.');
        return;
      }

      setStatus('done');
      setMessage('Placement teams resolved.');

      startTransition(() => {
        router.refresh();
      });
    } catch (error: any) {
      setStatus('error');
      setMessage(error?.message ?? 'Failed to resolve placement teams');
    }
  }

  return (
    <div className='flex flex-col items-start gap-2 md:items-end'>
      <button
        type='button'
        onClick={onResolve}
        disabled={isPending}
        className='inline-flex items-center justify-center rounded-md border border-emerald-900/70 bg-emerald-950/40 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-900/60 disabled:cursor-not-allowed disabled:opacity-50'
      >
        {isPending ? 'Resolving...' : 'Resolve Placement Teams'}
      </button>

      {message ? (
        <span
          className={`text-sm ${
            status === 'error' ? 'text-red-300' : 'text-emerald-300'
          }`}
        >
          {message}
        </span>
      ) : null}
    </div>
  );
}