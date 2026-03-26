import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import type { PublicSponsor, SponsorPlacement } from '@/lib/queries/publicSponsors';

type PublicSponsorsSectionProps = {
  sponsors: PublicSponsor[];
  title?: string;
  description?: string;
  placement?: SponsorPlacement;
};

function getDefaultTitle(placement?: SponsorPlacement) {
  switch (placement) {
    case 'HEADER':
      return 'Featured Sponsors';
    case 'STANDINGS':
      return 'Standings Sponsors';
    case 'SCHEDULE':
      return 'Schedule Sponsors';
    case 'BRACKET':
      return 'Bracket Sponsors';
    default:
      return 'Sponsors';
  }
}

function SponsorCard({ sponsor }: { sponsor: PublicSponsor }) {
  const href = sponsor.linkUrl?.trim() ?? '';
  const hasLink = href.length > 0;
  const buttonText = sponsor.buttonText?.trim() || 'Learn More';

  const imageBlock = (
    <div className='relative h-32 w-full overflow-hidden rounded-2xl border border-emerald-400/10 bg-white/5 sm:h-36'>
      <Image
        src={sponsor.imageUrl}
        alt={sponsor.businessName}
        fill
        className='object-contain p-4'
        sizes='(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw'
      />
    </div>
  );

  return (
    <div className='rounded-[28px] border border-emerald-400/15 bg-slate-950/70 p-5 text-white shadow-xl backdrop-blur-md'>
      <div className='space-y-4'>
        {hasLink ? (
          <Link
            href={href}
            target='_blank'
            rel='noopener noreferrer'
            className='block transition-opacity hover:opacity-95'
          >
            {imageBlock}
          </Link>
        ) : (
          imageBlock
        )}

        <div>
          <h3 className='text-lg font-semibold text-white sm:text-xl'>
            {sponsor.businessName}
          </h3>

          {sponsor.headline ? (
            <p className='mt-2 text-sm font-medium text-emerald-300'>
              {sponsor.headline}
            </p>
          ) : null}

          {sponsor.bodyText ? (
            <p className='mt-3 text-sm leading-6 text-slate-300'>
              {sponsor.bodyText}
            </p>
          ) : null}
        </div>

        {hasLink ? (
          <div className='pt-1'>
            <Button asChild variant='outline'>
              <Link href={href} target='_blank' rel='noopener noreferrer'>
                {buttonText}
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function PublicSponsorsSection({
  sponsors,
  title,
  description,
  placement,
}: PublicSponsorsSectionProps) {
  if (sponsors.length === 0) return null;

  return (
    <section className='mt-6 rounded-[32px] border border-emerald-400/20 bg-slate-950/45 p-5 shadow-2xl backdrop-blur-sm lg:p-8'>
      <div className='mb-6'>
        <div className='text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300'>
          FHA Tournament Hub
        </div>

        <h2 className='mt-2 text-2xl font-bold text-white lg:text-3xl'>
          {title ?? getDefaultTitle(placement)}
        </h2>

        {description ? (
          <p className='mt-3 max-w-4xl text-sm text-slate-200 lg:text-base'>
            {description}
          </p>
        ) : null}
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {sponsors.map((sponsor) => (
          <SponsorCard key={sponsor.id} sponsor={sponsor} />
        ))}
      </div>
    </section>
  );
}