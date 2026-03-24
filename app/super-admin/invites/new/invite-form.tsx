'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { createAdminInvite } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const adminInviteFormSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  role: z.literal('ADMIN'),
});

type AdminInviteFormValues = z.infer<typeof adminInviteFormSchema>;

export function AdminInviteForm() {
  const [isPending, startTransition] = useTransition();
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const form = useForm<AdminInviteFormValues>({
    resolver: zodResolver(adminInviteFormSchema),
    defaultValues: {
      email: '',
      role: 'ADMIN',
    },
  });

  function onSubmit(values: AdminInviteFormValues) {
    setInviteLink(null);

    startTransition(async () => {
      try {
        const result = await createAdminInvite(values);

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        setInviteLink(result.inviteLink);

        form.reset({
          email: '',
          role: 'ADMIN',
        });

        toast.success(result.message);
      } catch (error) {
        console.error(error);
        toast.error('Something went wrong while creating the invite.');
      }
    });
  }

  async function handleCopy() {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Invite link copied.');
    } catch (error) {
      console.error(error);
      toast.error('Could not copy invite link.');
    }
  }

  return (
    <div className='space-y-6'>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder='admin@example.com'
                    autoComplete='off'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='role'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <FormControl>
                  <Input {...field} disabled />
                </FormControl>
                <p className='text-xs text-white/55'>
                  Invites created here currently generate admin access only.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type='submit' disabled={isPending}>
            {isPending ? 'Creating Invite...' : 'Create Invite'}
          </Button>
        </form>
      </Form>

      {inviteLink ? (
        <div className='space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4'>
          <div>
            <h2 className='text-lg font-semibold text-white'>Invite created</h2>
            <p className='mt-1 text-sm text-white/70'>
              Copy this link and send it manually.
            </p>
          </div>

          <div className='space-y-2'>
            <div className='text-sm font-medium text-white'>Invite Link</div>
            <div className='break-all rounded-md border border-white/10 bg-black/20 p-3 text-sm text-emerald-200'>
              {inviteLink}
            </div>
          </div>

          <Button type='button' variant='secondary' onClick={handleCopy}>
            Copy Invite Link
          </Button>
        </div>
      ) : null}
    </div>
  );
}