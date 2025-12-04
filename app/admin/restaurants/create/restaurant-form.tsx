'use client'

import { restaurantDefaultValues } from "@/lib/constants";
import { insertRestaurantSchema, updateRestaurantSchema } from "@/lib/validators";
import { Restaurant } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ControllerRenderProps, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import {z} from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createRestaurant, updateRestaurant } from "@/lib/actions/restaurant.actions";
import { UploadButton } from "@/lib/uploadthing";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";


const RestaurantForm = ({type, restaurant, restaurantId}: {
    type: 'Create' | 'Update',
    restaurant?: Restaurant,
    restaurantId?: string
}) => {
    const router = useRouter();
    
     const form = useForm<z.infer<typeof insertRestaurantSchema>>({

    resolver:
      type === 'Update'
        ? zodResolver(updateRestaurantSchema)
        : zodResolver(insertRestaurantSchema),
    defaultValues:
      restaurant && type === 'Update' ? restaurant : restaurantDefaultValues,
  });
 const onSubmit: SubmitHandler<z.infer<typeof insertRestaurantSchema>> = async (
    values: z.infer<typeof insertRestaurantSchema>
  ) => {
    // On Create
    if (type === 'Create') {
      const res = await createRestaurant(values);

      if (!res.success) {
        toast.error(res.message);
      } else {
        toast.success(res.message);
        router.push('/admin/restaurants');
      }
    }

    // On Update
    if (type === 'Update') {
      if (!restaurantId) {
        router.push('/admin/restaurants');
        return;
      }

    const res = await updateRestaurant(restaurantId, values);

      if (!res.success) {
        toast.error(res.message);
      } else {
        toast.success(res.message);
        router.push('/admin/restaurants');
      }
    }
  };

  const images = form.watch('image')
  

    return ( 
        <Form {...form}>
        <form method="POST" onSubmit={form.handleSubmit(onSubmit as SubmitHandler<Record<string, unknown>>)} className="space-y-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start">
                {/* Name */}
                <FormField
         
            control={form.control}
            name='name'
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof insertRestaurantSchema>,
                'name'
              >;
            }) => (
              <FormItem className='w-full'>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder='Enter restaurant name' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />  
               {/* Address */}
          <FormField
       
            control={form.control}
            name='address'
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof insertRestaurantSchema>,
                'address'
              >;
            }) => (
              <FormItem className='w-full'>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder='Enter address' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
            </div>
            <div className='flex flex-col md:flex-row gap-5'>
     
          {/* Phone */}
          <FormField

            control={form.control}
            name='description'
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof insertRestaurantSchema>,
                'description'
              >;
            }) => (
              <FormItem className='w-full'>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder='Enter description' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
              {/* website */}
          <FormField
         
            control={form.control}
            name='website'
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof insertRestaurantSchema>,
                'website'
              >;
            }) => (
              <FormItem className='w-full'>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder='Enter website url' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
            
            <div className="upload-field flex flex-col gap-5 md:flex-row ">
                {/* Images */}
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
                        <Image src={images} alt="hotel image" className="w-20 h-20 object-cover object-center rounded-sm" width={100} height={100}/>
                      )}
                      <FormControl>
                        <UploadButton endpoint='imageUploader' onClientUploadComplete={(res: {url: string}[]) => {
                          form.setValue('image', res[0].url)
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
            {form.formState.isSubmitting ? 'Submitting' : `${type} Restaurant`}
          </Button>
        </div>
        </form> 
        </Form>
     );
}
 
export default RestaurantForm;