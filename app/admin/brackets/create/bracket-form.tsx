


'use client'
import { useState } from 'react';


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
import { generatePoolPlayGames, generateBracketGames } from '@/lib/generateGames';
import { UploadButton } from "@/lib/uploadthing";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

// Helper to parse date and get day of week
function getDayOfWeek(dateString: string): string {
  // Accept formats like 1/1/26, 01/01/2026, 1/1//2026
  const cleaned = dateString.replace(/\/+/g, '/').replace(/\/+$/, '');
  const parts = cleaned.split('/');
  if (parts.length === 3) {
    const [monthRaw, dayRaw, yearRaw] = parts;
    const month = monthRaw;
    const day = dayRaw;
    let year = yearRaw;
    if (year.length === 2) year = '20' + year;
    if (year.length === 0) year = '2026'; // fallback for 1/1//2026
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { weekday: 'long' });
    }
  }
  // Try Date.parse fallback
  const d = new Date(dateString);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return '';
}


const BracketForm = ({type, bracket, bracketId}: {
    type: 'Create' | 'Update',
    bracket?: Bracket,
    bracketId?: string
}) => {
    const router = useRouter();
    // removed unused imageUploading state

    // Ensure all times fields are always controlled
    const safeBracket = bracket && type === 'Update'
      ? {
          ...bracket,
          times: Array.isArray(bracket.times)
            ? bracket.times.map(ts => ({
                day: ts.day ?? '',
                date: ts.date ?? '',
                timeSlots: ts.timeSlots ?? '',
                location: ts.location ?? '',
                gameType: ts.gameType ?? '',
                type: ts.type ?? '',
              }))
            : [],
          teams: Array.isArray(bracket.teams)
            ? bracket.teams.map(t => ({ teamName: t.teamName ?? '' }))
            : [],
          games: Array.isArray(bracket.games)
            ? bracket.games.map(g => ({
                day: g.day ?? '',
                date: g.date ?? '',
                time: g.time ?? '',
                location: g.location ?? '',
                homeTeam: g.homeTeam ?? '',
                awayTeam: g.awayTeam ?? '',
                homeScore: g.homeScore ?? 0,
                awayScore: g.awayScore ?? 0,
                homePenalty: g.homePenalty ?? 0,
                awayPenalty: g.awayPenalty ?? 0,
                label: g.label ?? '',
              }))
            : [],
        }
      : bracketDefaultValues;

    const form = useForm<z.infer<typeof insertBracketSchema>>({
      resolver:
        type === 'Update'
          ? zodResolver(updateBracketSchema)
          : zodResolver(insertBracketSchema),
      defaultValues: safeBracket,
    });


    const images = form.watch('image');


    // Teams array for team names
    const { fields: teamFields, replace: replaceTeams } = useFieldArray({
      control: form.control,
      name: 'teams',
    });

    // Games array for both main and pool play games
    const { fields: gameFields,  } = useFieldArray({
      control: form.control,
      name: 'games',
    });

    // Time slots array
    const { fields: timeFields, replace: replaceTimes, remove: removeTime } = useFieldArray({
      control: form.control,
      name: 'times'
    });
    // State for bracket generation dialog
    const [showBracketDialog, setShowBracketDialog] = useState(false);
    const [gamesPerTeam, setGamesPerTeam] = useState(1);
    const [generating, setGenerating] = useState(false);

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

    // Handler for Generate Bracket button
    const handleGenerateBracket = () => {
      setShowBracketDialog(true);
    };

    // Handler for confirming number of games per team
    const handleConfirmGamesPerTeam = () => {
      setShowBracketDialog(false);
      setGenerating(true);
      // Generate pool play games
      const teams = form.getValues('teams') ?? [];
      const times = form.getValues('times') ?? [];
      const poolGames = generatePoolPlayGames(teams, times, gamesPerTeam);
      // Generate bracket games (seed placeholders)
      const bracketGames = generateBracketGames(times, teams.length);
      // Set games in form (pool play first, then bracket games)
      form.setValue('games', [...poolGames, ...bracketGames]);
      setGenerating(false);
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
<FormField
  control={form.control}
  name="bracketName"
  render={({ field }) => (
    <FormItem className="flex flex-row items-center gap-2">
      <FormLabel>Build your own bracket</FormLabel>
      <FormControl>
        <select
          className="border rounded px-3 py-2"
          value={field.value ?? ""}
          onChange={e => field.onChange(e.target.value)}
        >
          <option value="">Select...</option>
          <option value="Jamboree">Jamboree</option>
          <option value="Single Elimination + Consolation">Single Elimination + Consolation</option>
          <option value="Pool Play + Championship Bracket">Pool Play + Championship Bracket</option>
        </select>
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>

          {/* Select number of teams - only show if bracketName is 'Pool Play + Championship Bracket' */}
          {form.watch('bracketName') === 'Pool Play + Championship Bracket' && (
            <div className="flex flex-col gap-4 mt-4">
              <label htmlFor="numTeams" className="font-medium">Select number of teams in tournament</label>
              <select
                id="numTeams"
                className="border rounded px-3 py-2 w-40"
                value={teamFields.length || ''}
                onChange={e => {
                  const num = parseInt(e.target.value, 10);
                  if (!isNaN(num)) {
                    // Replace teams array with correct length
                    replaceTeams(Array.from({ length: num }, (_, i) => ({ teamName: '' })));
                  } else {
                    replaceTeams([]);
                  }
                }}
              >
                <option value="">Select...</option>
                {Array.from({ length: 59 }, (_, i) => i + 2).map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              {/* Team name inputs */}
              {teamFields.length >= 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {teamFields.map((field, idx) => (
                    <FormField
                      key={field.id}
                      control={form.control}
                      name={`teams.${idx}.teamName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team {idx + 1} Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={`Enter team ${idx + 1} name`} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Select number of time slots - only show if bracketName is 'Pool Play + Championship Bracket' */}
          {form.watch('bracketName') === 'Pool Play + Championship Bracket' && (
            <div className="flex flex-col gap-4 mt-4">
              <label htmlFor="numTimes" className="font-medium">Select number of time slots</label>
              <select
                id="numTimes"
                className="border rounded px-3 py-2 w-40"
                value={timeFields.length || ''}
                onChange={e => {
                  const num = parseInt(e.target.value, 10);
                  if (!isNaN(num)) {
                    // Replace times array with correct length
                    replaceTimes(Array.from({ length: num }, () => ({ day: '', date: '', timeSlots: '', location: '' })));
                  } else {
                    replaceTimes([]);
                  }
                }}
              >
                <option value="">Select...</option>
                {Array.from({ length: 99 }, (_, i) => i + 2).map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              {/* Time slot inputs */}
              {timeFields.length >= 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {timeFields.map((field, idx) => (
                      <div key={field.id} className="border p-4 rounded-md relative space-y-2">
                        <div className="font-semibold mb-2">Game {idx + 1}</div>
                        <FormField
                          control={form.control}
                          name={`times.${idx}.date`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder={`Enter date`}
                                  value={field.value ?? ""}
                                  onChange={e => {
                                    field.onChange(e);
                                    const day = getDayOfWeek(e.target.value);
                                    form.setValue(`times.${idx}.day`, day);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`times.${idx}.day`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Day</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={`Enter day`} value={field.value ?? ""} readOnly />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                     
                      <FormField
                        control={form.control}
                        name={`times.${idx}.timeSlots`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={`Enter time`} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`times.${idx}.location`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={`Enter location`} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-4 items-center mt-2">
                        <FormField
                          control={form.control}
                          name={`times.${idx}.gameType`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center gap-2">
                              <FormLabel>Game Type</FormLabel>
                              <FormControl>
                                <select
                                  className="border rounded px-3 py-2"
                                  value={field.value ?? ""}
                                  onChange={e => field.onChange(e.target.value)}
                                >
                                  <option value="">Select...</option>
                                  <option value="bracketPlay">Bracket Play</option>
                                  <option value="poolPlay">Pool Play</option>
                                </select>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      {/* Only show type if gameType is bracketPlay */}
                      {form.watch(`times.${idx}.gameType`) === 'bracketPlay' && (
                        <FormField
                          control={form.control}
                          name={`times.${idx}.type`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <FormControl>
                                <select
                                  className="border rounded px-3 py-2"
                                  value={field.value ?? ""}
                                  onChange={e => field.onChange(e.target.value)}
                                >
                                  <option value="">Select...</option>
                                  <option value="Consolation">Consolation</option>
                                  <option value="3rd Place">3rd Place</option>
                                  <option value="Championship">Championship</option>
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => removeTime(idx)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}


          {/* Pool Play Section */}
          {gameFields.filter(g => g.label === 'Pool Play').length > 0 && (
            <div className="space-y-4 mt-8">
              <h3 className="text-lg font-bold">Pool Play</h3>
              {gameFields.filter(g => g.label === 'Pool Play').map((field, idx) => {
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
                              <Input {...field} placeholder="Day" value={field.value ?? ''} />
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
                              <Input {...field} placeholder="Date" value={field.value ?? ''} onChange={e => {
                                field.onChange(e);
                                const day = getDayOfWeek(e.target.value);
                                form.setValue(`games.${gameIdx}.day`, day);
                              }} />
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
                              <Input {...field} placeholder="Time" value={field.value ?? ''} />
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
                              <Input {...field} placeholder="Location" value={field.value ?? ''} />
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
                              <Input {...field} placeholder="Home Team" value={field.value ?? ''} />
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
                              <Input {...field} placeholder="Away Team" value={field.value ?? ''} />
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
                              <Input
                                type="number"
                                {...field}
                                placeholder="Home Score"
                                value={field.value ?? ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  field.onChange(val === '' ? '' : Number(val));
                                }}
                              />
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
                              <Input
                                type="number"
                                {...field}
                                placeholder="Away Score"
                                value={field.value ?? ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  field.onChange(val === '' ? '' : Number(val));
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`games.${gameIdx}.homePenalty`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Home Penalty (min)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
                                {...field}
                                placeholder="Home Penalty"
                                value={field.value ?? ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  field.onChange(val === '' ? '' : parseFloat(val));
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`games.${gameIdx}.awayPenalty`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Away Penalty (min)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
                                {...field}
                                placeholder="Away Penalty"
                                value={field.value ?? ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  field.onChange(val === '' ? '' : parseFloat(val));
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bracket Play Section */}
          {gameFields.filter(g => g.label !== 'Pool Play').length > 0 && (
            <div className="space-y-4 mt-8">
              <h3 className="text-lg font-bold">Bracket Play</h3>
              {gameFields.filter(g => g.label !== 'Pool Play').map((field, idx) => {
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
                              <Input {...field} placeholder="Day" value={field.value ?? ''} />
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
                              <Input {...field} placeholder="Date" value={field.value ?? ''} onChange={e => {
                                field.onChange(e);
                                const day = getDayOfWeek(e.target.value);
                                form.setValue(`games.${gameIdx}.day`, day);
                              }} />
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
                              <Input {...field} placeholder="Time" value={field.value ?? ''} />
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
                              <Input {...field} placeholder="Location" value={field.value ?? ''} />
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
                              <Input {...field} placeholder="Home Team (e.g. Seed 1)" value={field.value ?? ''} />
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
                              <Input {...field} placeholder="Away Team (e.g. Seed 2)" value={field.value ?? ''} />
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
                              <Input type="number" {...field} placeholder="Home Score" value={field.value ?? ''} />
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
                              <Input type="number" {...field} placeholder="Away Score" value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`games.${gameIdx}.homePenalty`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Home Penalty</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} placeholder="Home Penalty" value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`games.${gameIdx}.awayPenalty`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Away Penalty</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} placeholder="Away Penalty" value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pool Play Games (with label) */}
          {/* <div className="space-y-4 mt-8">
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
                            <Input {...field} placeholder="Label (e.g. Consolation, 3rd Place, Championship)" value={field.value ?? ""} />
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
          </div> */}

          {/* Generate Bracket Button and Dialog */}
          {form.watch('bracketName') === 'Pool Play + Championship Bracket' && teamFields.length > 1 && timeFields.length > 1 && (
            <div className="mb-4">
              <Button type="button" onClick={handleGenerateBracket} disabled={generating}>
                {generating ? 'Generating...' : 'Generate Bracket'}
              </Button>
              {showBracketDialog && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                  <div className="bg-white p-6 rounded shadow-lg min-w-[300px]">
                    <h2 className="text-lg font-bold mb-2">Number of Games Per Team</h2>
                    <input
                      type="number"
                      min={1}
                      max={teamFields.length - 1}
                      value={gamesPerTeam}
                      onChange={e => setGamesPerTeam(Number(e.target.value))}
                      className="border rounded px-3 py-2 w-full mb-4"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="secondary" onClick={() => setShowBracketDialog(false)}>Cancel</Button>
                      <Button type="button" onClick={handleConfirmGamesPerTeam}>OK</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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