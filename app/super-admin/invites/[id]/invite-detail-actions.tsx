'use client';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

type InviteDetailActionsProps = {
  inviteId: string;
  inviteLink: string | null;
  canRevoke: boolean;
  expiresAt: string;
};

export function InviteDetailActions({
  inviteId,
  inviteLink,
  canRevoke,
  expiresAt,
}: InviteDetailActionsProps) {
  const fullLink =
    inviteLink && typeof window !== 'undefined'
      ? `${window.location.origin}${inviteLink}`
      : inviteLink;

  async function handleCopyLink() {
    if (!fullLink) return;

    try {
      await navigator.clipboard.writeText(fullLink);
      toast.success('Invite link copied.');
    } catch (error) {
      console.error(error);
      toast.error('Could not copy invite link.');
    }
  }

  return (
    <div className='space-y-4 rounded-xl border border-white/10 bg-black/15 p-4'>
      <div>
        <h2 className='text-lg font-semibold text-white'>Actions</h2>
        <p className='mt-1 text-sm text-white/65'>Manage this invite record.</p>
      </div>

      {inviteLink ? (
        <>
          <div className='rounded-lg border border-white/10 bg-black/20 p-4'>
            <div className='text-xs uppercase tracking-wide text-white/50'>
              Active Until
            </div>
            <div className='mt-1 text-sm text-white'>{expiresAt}</div>
          </div>

          <div className='space-y-2'>
            <div className='text-sm font-medium text-white'>
              Current Invite Link
            </div>
            <div className='break-all rounded-md border border-white/10 bg-black/20 p-3 text-sm text-emerald-200'>
              {fullLink ?? inviteLink}
            </div>
          </div>
        </>
      ) : (
        <div className='text-sm text-white/65'>
          No active invite link is available for this record.
        </div>
      )}

      <div className='flex flex-wrap gap-3'>
        {inviteLink ? (
          <Button type='button' variant='secondary' onClick={handleCopyLink}>
            Copy Invite Link
          </Button>
        ) : null}

        {canRevoke ? (
          <div className='text-xs text-white/50'>
            Revoke flow not wired up in this pass yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}