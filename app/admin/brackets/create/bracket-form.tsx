"use client";

import React, { useEffect, useMemo } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UploadButton } from "@/lib/uploadthing";
import Image from "next/image";

const YOUTH_LEVELS = [
  { value: "MINI_MITE", label: "Mini Mite" },
  { value: "MITE", label: "Mite" },
  { value: "SQUIRT", label: "Squirt" },
  { value: "PEEWEE", label: "Peewee" },
  { value: "BANTAM", label: "Bantam" },
  { value: "HIGH_SCHOOL", label: "High School" },
] as const;

const BUILD_OPTIONS = [
  { value: "POOL_BRACKET", label: "Pool Play + Bracket (Placement)" },
  { value: "JAMBOREE", label: "Jamboree" },
] as const;

const BRACKET_SIDES = [
  { value: "HOME", label: "Home" },
  { value: "AWAY", label: "Away" },
] as const;

type BracketFormMode = "create" | "update";

function makeBracketFormSchema(mode: BracketFormMode) {
  return z
    .object({
      name: z.string().min(1, "Name is required"),
      youthLevel: z.string().min(1, "Division is required"),
      side: z.enum(["HOME", "AWAY"], {
        required_error: "Home / Away is required",
      }),

      startDate: z.string().min(1, "Start date is required"),
      endDate: z.string().optional(),

      bracketSource: z.enum(["UPLOAD", "BUILD"], {
        required_error: "Bracket option is required",
      }),

      image: z.string().optional(),

      stageType: z.string().optional(),
      seeding: z.string().optional(),

      guaranteedGamesPerTeam: z.union([z.string(), z.number()]).optional(),
    })
    .superRefine((val, ctx) => {
      if (val.bracketSource === "UPLOAD") {
        if (!val.image || val.image.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["image"],
            message: "Please upload an image or switch to Build.",
          });
        }
      }

      if (val.bracketSource === "BUILD") {
        if (!val.stageType || val.stageType.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["stageType"],
            message: "Please select a build option (Pool+Bracket or Jamboree).",
          });
        }

        if (mode === "create") {
          const seeding = (val.seeding ?? "").trim();
          const teams = seeding.length
            ? seeding
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [];

          if (teams.length < 2) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["seeding"],
              message: "Please select at least 2 teams.",
            });
          }

          if (val.stageType === "POOL_BRACKET") {
            const gRaw = val.guaranteedGamesPerTeam;
            const g =
              typeof gRaw === "number"
                ? gRaw
                : Number(String(gRaw ?? "").trim());

            if (!Number.isFinite(g) || g < 1) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["guaranteedGamesPerTeam"],
                message: "Select guaranteed pool games per team.",
              });
            } else if (teams.length >= 2 && g > teams.length - 1) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["guaranteedGamesPerTeam"],
                message: `Guaranteed games per team cannot exceed ${teams.length - 1} for ${teams.length} teams.`,
              });
            }
          }
        }
      }
    });
}

type FormValues = z.infer<ReturnType<typeof makeBracketFormSchema>>;

export type BracketFormInitial = {
  id?: number;
  name?: string | null;
  youthLevel?: string | null;
  date?: string | null;
  image?: string | null;
  tournamentFormat?: string | null;
  side?: "HOME" | "AWAY" | null;
};

function makeDateRange(start?: string, end?: string) {
  const s = (start ?? "").trim();
  const e = (end ?? "").trim();
  if (!s) return "";
  return e && e !== s ? `${s} to ${e}` : s;
}

function parseDateRange(dateStr?: string | null) {
  const raw = (dateStr ?? "").trim();
  if (!raw) return { startDate: "", endDate: "" };

  const parts = raw.split(" to ").map((s) => s.trim());
  return {
    startDate: parts[0] ?? "",
    endDate: parts[1] ?? "",
  };
}

function inferBracketSource(initial?: BracketFormInitial) {
  const img = (initial?.image ?? "").trim();
  return img.length > 0 ? "UPLOAD" : "BUILD";
}

function inferStageType(initial?: BracketFormInitial) {
  if (initial?.tournamentFormat === "JAMBOREE") return "JAMBOREE";
  return "POOL_BRACKET";
}

function parseTeamNamesFromSeeding(seeding?: string) {
  const s = (seeding ?? "").trim();
  if (!s) return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

const selectClassName =
  "block h-11 w-full rounded-md border border-emerald-900/70 bg-[#0f2217] px-3 py-2 text-sm text-white shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20";

const toggleBaseClass =
  "rounded-md border px-3 py-2 text-sm font-medium transition-colors";

export default function BracketForm({
  mode = "create",
  initial,
}: {
  mode?: BracketFormMode;
  initial?: BracketFormInitial;
}) {
  const router = useRouter();

  const bracketFormSchema = useMemo(() => makeBracketFormSchema(mode), [mode]);

  const form = useForm<FormValues>({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      name: "",
      youthLevel: "",
      side: "HOME",
      startDate: "",
      endDate: "",
      bracketSource: "BUILD",
      image: "",
      stageType: "",
      seeding: "",
      guaranteedGamesPerTeam: "3",
    },
  });

  useEffect(() => {
    if (!initial) return;

    const { startDate, endDate } = parseDateRange(initial.date);
    const bracketSource = inferBracketSource(initial);
    const stageType = inferStageType(initial);

    form.reset({
      name: initial.name ?? "",
      youthLevel: initial.youthLevel ?? "",
      side: initial.side === "AWAY" ? "AWAY" : "HOME",
      startDate: startDate ?? "",
      endDate: endDate ?? "",
      bracketSource: bracketSource as "UPLOAD" | "BUILD",
      image: initial.image ?? "",
      stageType: stageType ?? "",
      seeding: "",
      guaranteedGamesPerTeam: "3",
    });
  }, [initial, form]);

  const bracketSource = form.watch("bracketSource");
  const images = form.watch("image");
  const stageType = form.watch("stageType");
  const seedingWatch = form.watch("seeding");

  const teamCount = useMemo(
    () => parseTeamNamesFromSeeding(seedingWatch).length,
    [seedingWatch]
  );

  const submitLabel = useMemo(() => {
    if (mode === "update") return "Update Bracket";
    return "Create Bracket";
  }, [mode]);

  const onSubmit = async (values: FormValues) => {
    try {
      const date = makeDateRange(values.startDate, values.endDate);

      if (mode === "update") {
        if (!initial?.id) throw new Error("Missing bracket id for update");

        const payload = {
          name: values.name,
          youthLevel: values.youthLevel,
          side: values.side,
          date,
          image: values.bracketSource === "UPLOAD" ? values.image : "",
          tournamentFormat:
            values.bracketSource === "UPLOAD"
              ? "IMAGE_UPLOAD"
              : values.stageType === "JAMBOREE"
                ? "JAMBOREE"
                : "POOL_PLACEMENT",
        };

        const res = await fetch(`/api/brackets/${initial.id}/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error ?? "Failed to update bracket");
        }

        toast.success("Bracket updated!");
        router.refresh();
        return;
      }

      if (values.bracketSource === "UPLOAD") {
        const payload = {
          name: values.name,
          youthLevel: values.youthLevel,
          side: values.side,
          date,
          image: values.image,
        };

        const res = await fetch("/api/brackets/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error ?? "Failed to create bracket (upload)");
        }

        toast.success("Bracket created!");
        router.push("/admin/brackets");
        return;
      }

      const teamNames = parseTeamNamesFromSeeding(values.seeding);
      const teams = teamNames.map((name, idx) => ({
        id: `t${idx + 1}`,
        name,
      }));

      const nTeams = teams.length;

      const guaranteedRaw = values.guaranteedGamesPerTeam;
      const gamesPerTeam =
        typeof guaranteedRaw === "number"
          ? guaranteedRaw
          : Number(String(guaranteedRaw ?? "").trim());

      const placementGames =
        nTeams >= 6
          ? [
              { type: "CHAMPIONSHIP" },
              { type: "THIRD_PLACE" },
              { type: "FIFTH_PLACE" },
            ]
          : nTeams >= 4
            ? [{ type: "CHAMPIONSHIP" }, { type: "THIRD_PLACE" }]
            : [{ type: "CHAMPIONSHIP" }];

      const config =
        values.stageType === "JAMBOREE"
          ? ({ type: "JAMBOREE" } as any)
          : ({
              type: "ROUND_ROBIN",
              gamesPerTeam: Number.isFinite(gamesPerTeam)
                ? gamesPerTeam
                : undefined,
              placementGames,
            } as any);

      const payload = {
        name: values.name,
        youthLevel: values.youthLevel,
        side: values.side,
        date,
        teams,
        config,
      };

      const res = await fetch("/api/brackets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Failed to generate bracket");
      }

      const data = await res.json();
      toast.success(`Bracket generated! (id: ${data.bracketId})`);
      router.push("/admin/brackets");
    } catch (err) {
      if (err instanceof Error) toast.error(err.message);
      else toast.error("Error saving bracket");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 text-white">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="w-full md:col-span-2">
                <FormLabel className="text-white">Tournament / Bracket Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter tournament name"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="youthLevel"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel className="text-white">Division</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    value={field.value ?? ""}
                    className={selectClassName}
                  >
                    <option value="">Select division</option>
                    {YOUTH_LEVELS.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        className="bg-[#102317] text-white"
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <FormField
            control={form.control}
            name="side"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel className="text-white">Tournament Side</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    value={field.value ?? "HOME"}
                    className={selectClassName}
                  >
                    {BRACKET_SIDES.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        className="bg-[#102317] text-white"
                      >
                        {opt.label}
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
            name="startDate"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel className="text-white">Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel className="text-white">End Date (optional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="bracketSource"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Bracket Option</FormLabel>
              <FormControl>
                <div className="flex flex-col gap-2 md:flex-row">
                  <button
                    type="button"
                    onClick={() => field.onChange("BUILD")}
                    className={[
                      toggleBaseClass,
                      field.value === "BUILD"
                        ? "border-emerald-400/60 bg-emerald-500/20 text-white"
                        : "border-emerald-900/70 bg-[#0f2217] text-white/80 hover:bg-emerald-950/50",
                    ].join(" ")}
                  >
                    Build with Engine
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange("UPLOAD")}
                    className={[
                      toggleBaseClass,
                      field.value === "UPLOAD"
                        ? "border-emerald-400/60 bg-emerald-500/20 text-white"
                        : "border-emerald-900/70 bg-[#0f2217] text-white/80 hover:bg-emerald-950/50",
                    ].join(" ")}
                  >
                    Upload Bracket Image
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {bracketSource === "UPLOAD" && (
          <div className="upload-field flex flex-col gap-5 md:flex-row">
            <FormField
              control={form.control}
              name="image"
              render={() => (
                <FormItem className="w-full">
                  <FormLabel className="text-white">Bracket Image</FormLabel>
                  <Card>
                    <CardContent className="mt-2 min-h-48 space-y-2">
                      <div className="flex-start space-x-2">
                        {images && images.length > 0 && (
                          <Image
                            src={images}
                            alt="bracket image"
                            className="h-20 w-20 rounded-sm object-cover object-center"
                            width={100}
                            height={100}
                          />
                        )}
                        <FormControl>
                          <UploadButton
                            endpoint="imageUploader"
                            onClientUploadComplete={(res: { ufsUrl: string }[]) => {
                              form.setValue("image", res[0].ufsUrl, {
                                shouldValidate: true,
                              });
                            }}
                            onUploadError={(error: Error) => {
                              toast.error(`ERROR! ${error.message}`);
                            }}
                          />
                        </FormControl>
                      </div>
                      <p className="text-xs text-white/60">
                        Upload an image if you don’t want to build a bracket with the engine.
                      </p>
                    </CardContent>
                  </Card>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {bracketSource === "BUILD" && (
          <>
            <FormField
              control={form.control}
              name="stageType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Build Option</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={field.value ?? ""}
                      className={selectClassName}
                    >
                      <option value="">Select</option>
                      {BUILD_OPTIONS.map((opt) => (
                        <option
                          key={opt.value}
                          value={opt.value}
                          className="bg-[#102317] text-white"
                        >
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === "create" && stageType && stageType.length > 0 && (
              <div className="mb-6 space-y-3">
                <FormLabel className="text-white">Teams</FormLabel>

                <div className="flex items-center gap-2">
                  <label htmlFor="numTeams" className="text-sm text-white/85">
                    Total Teams:
                  </label>
                  <select
                    id="numTeams"
                    className="h-10 rounded-md border border-emerald-900/70 bg-[#0f2217] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                    value={teamCount}
                    onChange={(e) => {
                      const num = parseInt(e.target.value, 10);
                      const newTeams = Array.from(
                        { length: num },
                        (_, i) => `Team ${i + 1}`
                      );
                      form.setValue("seeding", newTeams.join(","), {
                        shouldValidate: true,
                      });

                      const currentG = Number(
                        String(form.getValues("guaranteedGamesPerTeam") ?? "3")
                      );
                      const maxG = Math.max(1, num - 1);
                      if (Number.isFinite(currentG) && currentG > maxG) {
                        form.setValue("guaranteedGamesPerTeam", String(maxG), {
                          shouldValidate: true,
                        });
                      }
                    }}
                  >
                    <option value={0}>Select</option>
                    {[...Array(16)].map((_, i) => (
                      <option
                        key={i + 1}
                        value={i + 1}
                        className="bg-[#102317] text-white"
                      >
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                {stageType === "POOL_BRACKET" && teamCount >= 2 && (
                  <FormField
                    control={form.control}
                    name="guaranteedGamesPerTeam"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">
                          Guaranteed pool games per team
                        </FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            value={String(field.value ?? "3")}
                            className={selectClassName}
                          >
                            {Array.from(
                              { length: Math.max(1, teamCount - 1) },
                              (_, i) => i + 1
                            ).map((n) => (
                              <option
                                key={n}
                                value={n}
                                className="bg-[#102317] text-white"
                              >
                                {n}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <div className="text-xs text-white/60">
                          Example: 6 teams + 3 pool games per team = 9 pool games
                          total, then placement.
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {(() => {
                  const seeding = form.watch("seeding") || "";
                  const teams = seeding ? seeding.split(",") : [];
                  if (!teams.length || (teams.length === 1 && teams[0] === ""))
                    return null;

                  return (
                    <div className="flex flex-col gap-2">
                      {teams.map((team, idx) => (
                        <Input
                          key={idx}
                          placeholder={`Team ${idx + 1} name`}
                          value={team}
                          onChange={(e) => {
                            const updated = [...teams];
                            updated[idx] = e.target.value;
                            form.setValue("seeding", updated.join(","), {
                              shouldValidate: true,
                            });
                          }}
                        />
                      ))}
                    </div>
                  );
                })()}

                <p className="text-xs text-white/60">
                  Select total teams. You can edit names now or later.
                </p>
              </div>
            )}

            {mode === "update" && (
              <p className="text-xs text-white/60">
                Teams and generated games are not edited here. Use the Teams/Bracket
                tools (or a future “Regenerate” action) if you need to rebuild
                structure.
              </p>
            )}
          </>
        )}

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating…" : submitLabel}
        </Button>
      </form>
    </Form>
  );
}