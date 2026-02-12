
'use client';
import React from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card";
import { UploadButton } from "@/lib/uploadthing";
import Image from "next/image";


const bracketFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  youthLevel: z.string().optional(),
  date: z.string().optional(),
  image: z.string().optional(),
  stageType: z.string().min(1, 'Stage type is required').or(z.literal('')),
  seeding: z.string().optional(),
});

const BracketForm: React.FC = () => {
  const router = useRouter();
  const form = useForm<z.infer<typeof bracketFormSchema>>({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      name: '',
      youthLevel: '',
      date: '',
      image: '',
      stageType: '', // No default selection
      seeding: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof bracketFormSchema>) => {
    try {
      const res = await fetch('/api/brackets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error('Failed to create bracket');
      toast.success('Bracket created!');
      router.push('/admin/brackets');
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Error creating bracket');
      }
    }
  };
    const images = form.watch('image');
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          {/* Name */}
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder='Enter bracket name' {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Division */}
          <FormField
            control={form.control}
            name='youthLevel'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Division</FormLabel>
                <FormControl>
                  <Input placeholder='Enter division (Mite, Squirt, Peewee, Bantam)' {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* Date */}
        <FormField
          control={form.control}
          name='date'
          render={({ field }) => (
            <FormItem className='w-full'>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input placeholder='Enter date (Month d-d year)' {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         {/* Image Upload */}
          <div className="upload-field flex flex-col gap-5 md:flex-row ">
            <FormField
              control={form.control}
              name='image'
              render={() => (
                <FormItem className='w-full'>
                  <FormLabel>Image</FormLabel>
                  <Card>
                    <CardContent className="space-y-2 mt-2 min-h-48">
                      <div className="flex-start space-x-2">
                        {images && (
                          <Image src={images} alt="bracket image" className="w-20 h-20 object-cover object-center rounded-sm" width={100} height={100}/>
                        )}
                        <FormControl>
                          <UploadButton endpoint='imageUploader' onClientUploadComplete={(res: {ufsUrl: string}[]) => {
                            form.setValue('image', res[0].ufsUrl)
                          }}
                          onUploadError={(error: Error) => {
                            toast.error(`ERROR! ${error.message}`)
                          }}
                          />
                        </FormControl>
                      </div>
                    </CardContent>
                  </Card>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          
        {/* Stage Type */}
        <FormField
          control={form.control}
          name="stageType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Build your own bracket</FormLabel>
              <FormControl>
                <select
                  {...field}
                  value={field.value ?? ''}
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
                >
                  <option value="">Select</option>
                  <option value="SINGLE_ELIMINATION">Single Elimination</option>
                  <option value="DOUBLE_ELIMINATION">Double Elimination</option>
                  <option value="ROUND_ROBIN">Round Robin</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Seeding - only show if a bracket type is selected */}
        {form.watch('stageType') && (
          <div className="mb-6">
            <FormLabel>Seeding</FormLabel>
            <div className="flex items-center gap-2 mb-2">
              <label htmlFor="numTeams">Number of Teams:</label>
              <select
                id="numTeams"
                className="border rounded px-2 py-1"
                value={(() => {
                  const seeding = form.watch('seeding') ?? '';
                  return seeding ? seeding.split(',').length : 0;
                })()}
                onChange={e => {
                  const num = parseInt(e.target.value, 10);
                  const seeding = form.watch('seeding') ?? '';
                  const current = seeding ? seeding.split(',') : [];
                  const newTeams = current.slice(0, num);
                  while (newTeams.length < num) newTeams.push('');
                  form.setValue('seeding', newTeams.join(','));
                }}
              >
                <option value={0}>Select</option>
                {[...Array(16)].map((_, i) => (
                  <option key={i+1} value={i+1}>{i+1}</option>
                ))}
              </select>
            </div>
            {(() => {
              const seeding = form.watch('seeding') || '';
              const teams = seeding ? seeding.split(',') : [];
              if (!teams.length || (teams.length === 1 && teams[0] === '')) return null;
              return (
                <div className="flex flex-col gap-2">
                  {teams.map((team, idx) => (
                    <Input
                      key={idx}
                      placeholder={`Team ${idx + 1} name`}
                      value={team}
                      onChange={e => {
                        const updated = [...teams];
                        updated[idx] = e.target.value;
                        form.setValue('seeding', updated.join(','));
                      }}
                    />
                  ))}
                </div>
              );
            })()}
            <FormMessage />
          </div>
        )}
        <Button type="submit">Create Bracket</Button>
      </form>
    </Form>
  );
};

export default BracketForm;