'use client';

import { useMemo, useState, useTransition } from 'react';
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

const adminInviteFormSchema = z
  .object({
    email: z.string().trim().email('Enter a valid email address'),
    role: z.literal('ADMIN'),
    expirationWindow: z.enum([
      '7_DAYS',
      '30_DAYS',
      '90_DAYS',
      '365_DAYS',
      'CUSTOM',
    ]),
    customExpiresAt: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.expirationWindow !== 'CUSTOM') return;

    if (!value.customExpiresAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customExpiresAt'],
        message: 'Select an expiration date',
      });
      return;
    }

    const parsedDate = new Date(value.customExpiresAt);
    if (Number.isNaN(parsedDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customExpiresAt'],
        message: 'Select a valid expiration date',
      });
      return;
    }

    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

if (endOfDay <= new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customExpiresAt'],
        message: 'Expiration date must be in the future',
      });
    }
  });

type AdminInviteFormValues = z.infer<typeof adminInviteFormSchema>;

type InviteResultState = {
  relativeLink: string;
  expiresAtLabel: string;
};

const expirationOptions = [
  { value: '7_DAYS', label: '7 days' },
  { value: '30_DAYS', label: '30 days' },
  { value: '90_DAYS', label: '90 days' },
  { value: '365_DAYS', label: '1 year' },
  { value: 'CUSTOM', label: 'Custom date' },
] as const;

export function AdminInviteForm() {
  const [isPending, startTransition] = useTransition();
  const [inviteResult, setInviteResult] = useState<InviteResultState | null>(
    null
  );

  const form = useForm<AdminInviteFormValues>({
    resolver: zodResolver(adminInviteFormSchema),
    defaultValues: {
      email: '',
      role: 'ADMIN',
      expirationWindow: '365_DAYS',
      customExpiresAt: '',
    },
  });

  const expirationWindow = form.watch('expirationWindow');

  const fullInviteLink = useMemo(() => {
    if (!inviteResult) return null;
    if (typeof window === 'undefined') return inviteResult.relativeLink;
    return `${window.location.origin}${inviteResult.relativeLink}`;
  }, [inviteResult]);

  function onSubmit(values: AdminInviteFormValues) {
    setInviteResult(null);

    startTransition(async () => {
      try {
        const result = await createAdminInvite(values);

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        setInviteResult({
          relativeLink: result.inviteLink,
          expiresAtLabel: result.expiresAtLabel,
        });

        form.reset({
          email: '',
          role: 'ADMIN',
          expirationWindow: values.expirationWindow,
          customExpiresAt:
            values.expirationWindow === 'CUSTOM'
              ? values.customExpiresAt
              : '',
        });

        toast.success(result.message);
      } catch (error) {
        console.error(error);
        toast.error('Something went wrong while creating the invite.');
      }
    });
  }

  async function handleCopy() {
    if (!fullInviteLink) return;

    try {
      await navigator.clipboard.writeText(fullInviteLink);
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

          <FormField
            control={form.control}
            name='expirationWindow'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expiration</FormLabel>
                <FormControl>
                  <select
                    value={field.value}
                    onChange={field.onChange}
                    className='flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500/50'
                  >
                    {expirationOptions.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                        className='bg-[#102317] text-white'
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <p className='text-xs text-white/55'>
                  Choose how long the invite should remain active before it
                  expires.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {expirationWindow === 'CUSTOM' ? (
            <FormField
              control={form.control}
              name='customExpiresAt'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Expiration Date</FormLabel>
                  <FormControl>
                    <Input type='date' {...field} />
                  </FormControl>
                  <p className='text-xs text-white/55'>
                    The invite will expire at the end of the selected day.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          <Button type='submit' disabled={isPending}>
            {isPending ? 'Creating Invite...' : 'Create Invite'}
          </Button>
        </form>
      </Form>

      {inviteResult ? (
        <div className='space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4'>
          <div>
            <h2 className='text-lg font-semibold text-white'>Invite created</h2>
            <p className='mt-1 text-sm text-white/70'>
              Copy this link and send it manually.
            </p>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='rounded-lg border border-white/10 bg-black/20 p-4'>
              <div className='text-xs uppercase tracking-wide text-white/50'>
                Expires
              </div>
              <div className='mt-1 text-sm text-white'>
                {inviteResult.expiresAtLabel}
              </div>
            </div>

            <div className='rounded-lg border border-white/10 bg-black/20 p-4'>
              <div className='text-xs uppercase tracking-wide text-white/50'>
                Link Type
              </div>
              <div className='mt-1 text-sm text-white'>Accept Invite URL</div>
            </div>
          </div>

          <div className='space-y-2'>
            <div className='text-sm font-medium text-white'>Invite Link</div>
            <div className='break-all rounded-md border border-white/10 bg-black/20 p-3 text-sm text-emerald-200'>
              {fullInviteLink ?? inviteResult.relativeLink}
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