'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { createSponsor } from './actions';
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

const sponsorScopeValues = ['GLOBAL', 'TOURNAMENT'] as const;
const sponsorPlacementValues = ['HOME', 'TOURNAMENT', 'STANDINGS'] as const;

const sponsorFormSchema = z
  .object({
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
    placement: z.enum(sponsorPlacementValues),
    scope: z.enum(sponsorScopeValues),
    tournamentId: z
      .union([z.literal(''), z.coerce.number().int().positive()])
      .optional(),
    isActive: z.boolean(),
    sortOrder: z.coerce.number().int().min(0, 'Sort order must be 0 or higher'),
  })
  .superRefine((value, ctx) => {
    if (value.scope === 'TOURNAMENT' && !value.tournamentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tournamentId'],
        message: 'Please select a tournament for a tournament-specific sponsor.',
      });
    }
  });

type SponsorFormInput = z.input<typeof sponsorFormSchema>;
type SponsorFormValues = z.output<typeof sponsorFormSchema>;

type TournamentOption = {
  id: number;
  name: string;
  youthLevel: string;
  date: string;
};

type SponsorFormProps = {
  tournaments: TournamentOption[];
};

function selectClassName() {
  return 'flex h-9 w-full rounded-md border border-emerald-900/70 bg-[#0f2217] px-3 py-1 text-sm text-white shadow-xs outline-none transition-[color,box-shadow,border-color] focus-visible:border-emerald-400 focus-visible:ring-[3px] focus-visible:ring-emerald-400/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50';
}

function tournamentOptionLabel(tournament: TournamentOption) {
  return `${tournament.name} • ${tournament.youthLevel} • ${tournament.date}`;
}

function placementLabel(value: (typeof sponsorPlacementValues)[number]) {
  switch (value) {
    case 'HOME':
      return 'Homepage';
    case 'TOURNAMENT':
      return 'Tournament Page';
    case 'STANDINGS':
      return 'Standings Page';
    default:
      return value;
  }
}

function placementHelpText(value: (typeof sponsorPlacementValues)[number]) {
  switch (value) {
    case 'HOME':
      return 'Shows in the grouped sponsor section at the bottom of the homepage.';
    case 'TOURNAMENT':
      return 'Shows in the grouped sponsor section at the bottom of the tournament page.';
    case 'STANDINGS':
      return 'Shows in the grouped sponsor section at the bottom of the standings page.';
    default:
      return '';
  }
}

export function SponsorForm({ tournaments }: SponsorFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<SponsorFormInput, unknown, SponsorFormValues>({
    resolver: zodResolver(sponsorFormSchema),
    defaultValues: {
      businessName: '',
      imageUrl: '',
      headline: '',
      bodyText: '',
      buttonText: '',
      linkUrl: '',
      placement: 'HOME',
      scope: 'GLOBAL',
      tournamentId: '',
      isActive: true,
      sortOrder: 0,
    },
  });

  const scope = form.watch('scope');
  const imageUrl = form.watch('imageUrl');
  const placement = form.watch('placement');

  useEffect(() => {
    if (scope === 'GLOBAL') {
      form.setValue('tournamentId', '', {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [form, scope]);

  function onSubmit(values: SponsorFormValues) {
    startTransition(async () => {
      try {
        const result = await createSponsor({
          ...values,
          tournamentId:
            values.scope === 'TOURNAMENT' && values.tournamentId
              ? Number(values.tournamentId)
              : null,
        });

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        router.push('/super-admin/sponsors');
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error('Something went wrong while creating the sponsor.');
      }
    });
  }

  return (
    <div className='space-y-6'>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <FormField
            control={form.control}
            name='businessName'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder='Faribault Hockey Sponsor'
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
              name='placement'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Page Placement</FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName()}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    >
                      {sponsorPlacementValues.map((placementValue) => (
                        <option
                          key={placementValue}
                          className='bg-[#0f2217] text-white'
                          value={placementValue}
                        >
                          {placementLabel(placementValue)}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <p className='text-sm text-white/60'>
                    {placementHelpText(placement)}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='scope'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scope</FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName()}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    >
                      <option className='bg-[#0f2217] text-white' value='GLOBAL'>
                        Global
                      </option>
                      <option
                        className='bg-[#0f2217] text-white'
                        value='TOURNAMENT'
                      >
                        Tournament Specific
                      </option>
                    </select>
                  </FormControl>
                  <p className='text-sm text-white/60'>
                    Global sponsors can appear across the site. Tournament-specific
                    sponsors only appear on the assigned tournament or its related
                    standings view.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className='grid gap-6 md:grid-cols-2'>
            <FormField
              control={form.control}
              name='tournamentId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tournament</FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName()}
                      value={field.value === undefined ? '' : String(field.value)}
                      onChange={(event) => field.onChange(event.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      disabled={scope !== 'TOURNAMENT'}
                    >
                      <option className='bg-[#0f2217] text-white' value=''>
                        {scope === 'TOURNAMENT'
                          ? 'Select a tournament'
                          : 'Global sponsors are not tied to a tournament'}
                      </option>
                      {tournaments.map((tournament) => (
                        <option
                          key={tournament.id}
                          value={String(tournament.id)}
                          className='bg-[#0f2217] text-white'
                        >
                          {tournamentOptionLabel(tournament)}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <p className='text-sm text-white/60'>
                    Lower numbers show first within the grouped sponsor section.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className='grid gap-6 md:grid-cols-2'>
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

            <div className='rounded-md border border-white/10 bg-black/15 p-4 text-sm text-white/70'>
              Sponsors are grouped together at the bottom of each public page,
              not split into multiple sections.
            </div>
          </div>

          <FormField
            control={form.control}
            name='headline'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Headline</FormLabel>
                <FormControl>
                  <Input
                    placeholder='Proud supporter of Faribault Hockey'
                    autoComplete='off'
                    {...field}
                    value={field.value ?? ''}
                  />
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
                    placeholder='Optional sponsor description or promo text'
                    className='min-h-28'
                    {...field}
                    value={field.value ?? ''}
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
                    <Input
                      placeholder='Visit Website'
                      autoComplete='off'
                      {...field}
                      value={field.value ?? ''}
                    />
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
                    <Input
                      placeholder='https://example.com'
                      autoComplete='off'
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <Button type='submit' disabled={isPending}>
              {isPending ? 'Creating Sponsor...' : 'Create Sponsor'}
            </Button>

            <Button type='button' variant='outline' asChild>
              <Link href='/super-admin/sponsors'>Cancel</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}