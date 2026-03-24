'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { deleteSponsor, updateSponsor } from './actions';
import { UploadButton } from '@/lib/uploadthing';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const sponsorEditFormSchema = z.object({
  sponsorId: z.number().int().positive(),
  businessName: z.string().trim().min(1, 'Business name is required'),
  imageUrl: z.string().trim().url('Please upload a sponsor image'),
  headline: z.string().trim().optional(),
  bodyText: z.string().trim().optional(),
  buttonText: z.string().trim().optional(),
  linkUrl: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^https?:\/\//i.test(value), {
      message: 'Link URL must start with http:// or https://',
    }),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0, 'Sort order must be 0 or higher'),
});

type SponsorEditFormInput = z.input<typeof sponsorEditFormSchema>;
type SponsorEditFormValues = z.output<typeof sponsorEditFormSchema>;

type SponsorEditFormProps = {
  sponsor: {
    id: number;
    businessName: string;
    imageUrl: string;
    headline: string | null;
    bodyText: string | null;
    buttonText: string | null;
    linkUrl: string | null;
    isActive: boolean;
    sortOrder: number;
  };
};

export function SponsorEditForm({ sponsor }: SponsorEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<SponsorEditFormInput, unknown, SponsorEditFormValues>({
    resolver: zodResolver(sponsorEditFormSchema),
    defaultValues: {
      sponsorId: sponsor.id,
      businessName: sponsor.businessName,
      imageUrl: sponsor.imageUrl,
      headline: sponsor.headline ?? '',
      bodyText: sponsor.bodyText ?? '',
      buttonText: sponsor.buttonText ?? '',
      linkUrl: sponsor.linkUrl ?? '',
      isActive: sponsor.isActive,
      sortOrder: sponsor.sortOrder,
    },
  });

  function onSubmit(values: SponsorEditFormValues) {
    startTransition(async () => {
      try {
        const result = await updateSponsor(values);

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error('Something went wrong while updating the sponsor.');
      }
    });
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      'Delete this sponsor? This cannot be undone.'
    );

    if (!confirmed) return;

    startTransition(async () => {
      try {
        await deleteSponsor(sponsor.id);
      } catch (error) {
        console.error(error);
        toast.error('Something went wrong while deleting the sponsor.');
      }
    });
  }

  const imageUrl = form.watch('imageUrl');

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-lg font-semibold text-white'>Edit Sponsor</h2>
        <p className='mt-1 text-sm text-white/65'>
          Update sponsor details, status, and ordering.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <FormField
            control={form.control}
            name='businessName'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Name</FormLabel>
                <FormControl>
                  <Input autoComplete='off' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='imageUrl'
            render={() => (
              <FormItem>
                <FormLabel>Sponsor Image</FormLabel>
                <FormControl>
                  <div className='space-y-4 rounded-xl border border-white/10 bg-black/20 p-4'>
                    <div className='rounded-lg border border-white/10 bg-black/20 p-4'>
                      <UploadButton
                        endpoint='imageUploader'
                        appearance={{
                          container: 'w-full ut-button:w-auto',
                          button:
                            'ut-ready:bg-emerald-600 ut-ready:hover:bg-emerald-700 ut-uploading:bg-emerald-600/80 rounded-md border-0 px-4 py-2 text-sm font-medium text-white transition',
                          allowedContent: 'text-xs text-white/55 mt-2',
                        }}
                        content={{
                          button() {
                            return 'Click Here To Upload Sponsor Image';
                          },
                          allowedContent() {
                            return 'Upload a logo or banner image';
                          },
                        }}
                        onClientUploadComplete={(res) => {
                          const url = res?.[0]?.url ?? '';

                          form.setValue('imageUrl', url, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });

                          toast.success('Sponsor image uploaded!');
                        }}
                        onUploadError={(error: Error) => {
                          toast.error(error.message);
                        }}
                      />
                    </div>

                    {imageUrl ? (
                      <div className='overflow-hidden rounded-lg border border-white/10 bg-black/30 p-3'>
                        <div className='mb-3 text-xs uppercase tracking-wide text-white/50'>
                          Image Preview
                        </div>
                        <div className='relative h-40 w-full overflow-hidden rounded-lg bg-black/20'>
                          <Image
                            src={imageUrl}
                            alt='Sponsor preview'
                            fill
                            className='object-contain'
                            sizes='(max-width: 768px) 100vw, 768px'
                          />
                        </div>
                      </div>
                    ) : (
                      <div className='rounded-lg border border-dashed border-white/15 bg-black/10 p-6 text-center text-sm text-white/55'>
                        No sponsor image uploaded yet.
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='grid gap-6 md:grid-cols-2'>
            <FormField
              control={form.control}
              name='sortOrder'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Order</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={0}
                      value={
                        typeof field.value === 'number' ||
                        typeof field.value === 'string'
                          ? field.value
                          : ''
                      }
                      onChange={(event) => field.onChange(event.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='isActive'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Active Status</FormLabel>
                  <div className='flex h-9 items-center gap-3 rounded-md border border-emerald-900/70 bg-[#0f2217] px-3'>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                    </FormControl>
                    <span className='text-sm text-white'>
                      {field.value ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name='headline'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Headline</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} autoComplete='off' />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='bodyText'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Body Text</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    className='min-h-28'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='grid gap-6 md:grid-cols-2'>
            <FormField
              control={form.control}
              name='buttonText'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Button Text</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} autoComplete='off' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='linkUrl'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link URL</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} autoComplete='off' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <Button type='submit' disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>

            <Button type='button' variant='outline' asChild>
              <Link href='/super-admin/sponsors'>Cancel</Link>
            </Button>
          </div>
        </form>
      </Form>

      <div className='space-y-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4'>
        <div>
          <h3 className='text-lg font-semibold text-white'>Danger Zone</h3>
          <p className='mt-1 text-sm text-white/65'>
            Permanently delete this sponsor record.
          </p>
        </div>

        <Button
          type='button'
          variant='destructive'
          onClick={handleDelete}
          disabled={isPending}
        >
          Delete Sponsor
        </Button>
      </div>
    </div>
  );
}