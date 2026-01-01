
'use client'


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
import { UploadButton } from "@/lib/uploadthing";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";


const BracketForm = ({type, bracket, bracketId}: {
    type: 'Create' | 'Update',
    bracket?: Bracket,
    bracketId?: string
}) => {
    const router = useRouter();
    // removed unused imageUploading state

    const form = useForm<z.infer<typeof insertBracketSchema>>({
      resolver:
        type === 'Update'
          ? zodResolver(updateBracketSchema)
          : zodResolver(insertBracketSchema),
      defaultValues:
        bracket && type === 'Update' ? bracket : bracketDefaultValues,
    });


    const images = form.watch('image');

    // Single games array for both main and pool play games
    const { fields: gameFields, append: appendGame, remove: removeGame } = useFieldArray({
      control: form.control,
      name: 'games',
    });

    const onSubmit: SubmitHandler<z.infer<typeof insertBracketSchema>> = async (values) => {
      // Only use games array, no poolGames
      if (type === 'Create') {
        const { createBracket } = await import('@/lib/actions/brackets.actions');
        const res = await createBracket(values);
        if (!res.success) {
          toast.error(res.message);
        } else {
          toast.success(res.message);
          router.push('/admin/brackets');
        }
      }
      if (type === 'Update' && bracketId) {
        const { updateBracket } = await import('@/lib/actions/brackets.actions');
        const res = await updateBracket(bracketId, values);
        if (!res.success) {
          toast.error(res.message);
        } else {
          toast.success(res.message);
          router.push('/admin/brackets');
        }
      }
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

          {/* Main Bracket Games (no label) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Main Bracket Games</h3>
              <Button type="button" onClick={() => appendGame({ day: '', date: '', time: '', location: '', homeTeam: '', awayTeam: '', homeScore: 0, awayScore: 0, label: undefined })}>
                Add Game
              </Button>
            </div>
            {gameFields.filter(g => !g.label).length === 0 && <div className="text-gray-500">No games added yet.</div>}
            {gameFields.filter(g => !g.label).map((field, idx) => {
              const gameIdx = gameFields.findIndex(f => f.id === field.id);
              return (
              <div key={field.id} className="border p-4 rounded-md relative space-y-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                  <FormField
                    control={form.control}
                    name={`games.${gameIdx}.day`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Day" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`games.${gameIdx}.date`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`games.${gameIdx}.time`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`games.${gameIdx}.location`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`games.${gameIdx}.homeTeam`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Home Team</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Home Team" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`games.${gameIdx}.awayTeam`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Away Team</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Away Team" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`games.${gameIdx}.homeScore`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Home Score</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} placeholder="Home Score" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`games.${gameIdx}.awayScore`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Away Score</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} placeholder="Away Score" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => removeGame(gameIdx)}>
                  Remove
                </Button>
              </div>
            );
            })}
          </div>

          {/* Pool Play Games (with label) */}
          <div className="space-y-4 mt-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Pool Play Games</h3>
              <Button type="button" onClick={() => appendGame({ day: '', date: '', time: '', location: '', homeTeam: '', awayTeam: '', homeScore: 0, awayScore: 0, label: 'Consolation, Campoionship' })}>
                Add Pool Play Game
              </Button>
            </div>
            {gameFields.filter(g => g.label !== undefined && g.label !== null && g.label !== '').length === 0 && <div className="text-gray-500">No pool play games added yet.</div>}
            {gameFields.filter(g => g.label !== undefined && g.label !== null && g.label !== '').map((field) => {
              const idx = gameFields.findIndex(f => f.id === field.id);
              return (
                <div key={field.id} className="border p-4 rounded-md relative space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                    <FormField
                      control={form.control}
                      name={`games.${idx}.label`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Label</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Label (e.g. Consolation, 3rd Place, Championship)" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`games.${idx}.day`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Day</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Day" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`games.${idx}.date`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`games.${idx}.time`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`games.${idx}.location`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`games.${idx}.homeTeam`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Home Team</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Home Team" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`games.${idx}.awayTeam`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Away Team</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Away Team" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`games.${idx}.homeScore`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Home Score</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} placeholder="Home Score" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`games.${idx}.awayScore`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Away Score</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} placeholder="Away Score" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => removeGame(idx)}>
                    Remove
                  </Button>
                </div>
              );
            })}
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