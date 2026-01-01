
'use client'
import React from 'react';

import { bracketDefaultValues } from "@/lib/constants";
import { insertBracketSchema, updateBracketSchema } from "@/lib/validators";
import { Bracket } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {  SubmitHandler, useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import {z} from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createBracketServerAction, updateBracketServerAction } from "./server-actions";
import { useActionState } from "react";
import { UploadButton } from "@/lib/uploadthing";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";


const BracketForm = ({type, bracket, bracketId}: {
    type: 'Create' | 'Update',
    bracket?: Bracket,
    bracketId?: string
}) => {
    const router = useRouter();
    const [imageUploading, setImageUploading] = React.useState(false);

    const form = useForm<z.infer<typeof insertBracketSchema>>({
      resolver:
        type === 'Update'
          ? zodResolver(updateBracketSchema)
          : zodResolver(insertBracketSchema),
      defaultValues:
        bracket && type === 'Update' ? bracket : bracketDefaultValues,
    });

    const images = form.watch('image');

    const onSubmit: SubmitHandler<z.infer<typeof insertBracketSchema>> = async (values) => {
      if (type === 'Create') {
        // Import createBracket from actions
        const { createBracket } = await import('@/lib/actions/brackets.actions');
        const res = await createBracket(values);
        if (!res.success) {
          toast.error(res.message);
        } else {
          toast.success(res.message);
          router.push('/admin/brackets');
        }
      }
      // You can add update logic here if needed
    };

    return (
      <Form {...form}>
        <form method="POST" onSubmit={form.handleSubmit(onSubmit as SubmitHandler<Record<string, unknown>>)} className="space-y-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start">
            {/* Name */}
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem className='w-full'>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder='Enter bracket name' {...field} />
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
                    <Input placeholder='Enter division (Mite, Squirt, Peewee, Bantam)' {...field} />
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
                  <Input placeholder='Enter date (Month d-d year)' {...field} />
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
          {/* Create Button */}
          <div>
            <Button
              type='submit'
              size='lg'
              disabled={form.formState.isSubmitting}
              className='button col-span-2 w-full'
            >
              {form.formState.isSubmitting ? 'Submitting' : `${type} Bracket`}
            </Button>
          </div>
        </form>
      </Form>
    );
  }

  export default BracketForm;