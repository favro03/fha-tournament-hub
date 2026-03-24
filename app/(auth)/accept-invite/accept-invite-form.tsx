'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { acceptAdminInvite } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const acceptInviteFormSchema = z
  .object({
    token: z.string().min(1),
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be 30 characters or less'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z
      .string()
      .min(8, 'Confirm password must be at least 8 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type AcceptInviteFormValues = z.infer<typeof acceptInviteFormSchema>;

type AcceptInviteFormProps = {
  token: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
};

export function AcceptInviteForm({
  token,
  email,
  role,
}: AcceptInviteFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInviteFormValues>({
    resolver: zodResolver(acceptInviteFormSchema),
    defaultValues: {
      token,
      username: '',
      password: '',
      confirmPassword: '',
    },
  });

  function onSubmit(values: AcceptInviteFormValues) {
    startTransition(async () => {
      try {
        const result = await acceptAdminInvite(values);

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        router.push('/sign-in');
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error('Something went wrong while accepting the invite.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
      <input type='hidden' {...register('token')} />

      <div className='space-y-1'>
        <Label htmlFor='email'>Email</Label>
        <Input id='email' value={email} disabled />
      </div>

      <div className='space-y-1'>
        <Label htmlFor='role'>Role</Label>
        <Input id='role' value={role} disabled />
      </div>

      <div className='space-y-1'>
        <Label htmlFor='username'>Username</Label>
        <Input
          id='username'
          autoComplete='username'
          {...register('username')}
        />
        {errors.username ? (
          <p className='text-sm text-destructive'>{errors.username.message}</p>
        ) : null}
      </div>

      <div className='space-y-1'>
        <Label htmlFor='password'>Password</Label>
        <Input
          id='password'
          type='password'
          autoComplete='new-password'
          {...register('password')}
        />
        {errors.password ? (
          <p className='text-sm text-destructive'>{errors.password.message}</p>
        ) : null}
      </div>

      <div className='space-y-1'>
        <Label htmlFor='confirmPassword'>Confirm Password</Label>
        <Input
          id='confirmPassword'
          type='password'
          autoComplete='new-password'
          {...register('confirmPassword')}
        />
        {errors.confirmPassword ? (
          <p className='text-sm text-destructive'>
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <Button disabled={isPending} className='w-full'>
        {isPending ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  );
}