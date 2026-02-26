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

type BracketFormMode = "create" | "update";

function makeBracketFormSchema(mode: BracketFormMode) {
  return z
    .object({
      name: z.string().min(1, "Name is required"),
      youthLevel: z.string().min(1, "Division is required"),

      startDate: z.string().min(1, "Start date is required"),
      endDate: z.string().optional(),

      bracketSource: z.enum(["UPLOAD", "BUILD"], {
        required_error: "Bracket option is required",
      }),

      image: z.string().optional(),

      stageType: z.string().optional(), // POOL_BRACKET | JAMBOREE
      seeding: z.string().optional(), // comma list of team names
    })
    .superRefine((val, ctx) => {
      // UPLOAD always requires an image
      if (val.bracketSource === "UPLOAD") {
        if (!val.image || val.image.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["image"],
            message: "Please upload an image or switch to Build.",
          });
        }
      }

      // BUILD always requires a build option
      if (val.bracketSource === "BUILD") {
        if (!val.stageType || val.stageType.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["stageType"],
            message: "Please select a build option (Pool+Bracket or Jamboree).",
          });
        }

        // Only require team seeding on CREATE.
        // On UPDATE, teams already exist in the DB and we are only editing metadata.
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
  tournamentFormat?: string | null; // "JAMBOREE" | "POOL_PLACEMENT" | "IMAGE_UPLOAD"
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
  // We store tournamentFormat in DB: JAMBOREE vs POOL_PLACEMENT etc.
  if (initial?.tournamentFormat === "JAMBOREE") return "JAMBOREE";
  return "POOL_BRACKET";
}

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
      startDate: "",
      endDate: "",
      bracketSource: "BUILD",
      image: "",
      stageType: "",
      seeding: "",
    },
  });

  // Hydrate for edit mode (populate fields)
  useEffect(() => {
    if (!initial) return;

    const { startDate, endDate } = parseDateRange(initial.date);
    const bracketSource = inferBracketSource(initial);
    const stageType = inferStageType(initial);

    form.reset({
      name: initial.name ?? "",
      youthLevel: initial.youthLevel ?? "",
      startDate: startDate ?? "",
      endDate: endDate ?? "",
      bracketSource: bracketSource as "UPLOAD" | "BUILD",
      image: initial.image ?? "",
      stageType: stageType ?? "",
      seeding: "", // Optional: can be loaded later from Teams table if you want
    });
  }, [initial, form]);

  const bracketSource = form.watch("bracketSource");
  const images = form.watch("image");
  const stageType = form.watch("stageType");

  const submitLabel = useMemo(() => {
    if (mode === "update") return "Update Bracket";
    return "Create Bracket";
  }, [mode]);

  const onSubmit = async (values: FormValues) => {
    try {
      const date = makeDateRange(values.startDate, values.endDate);

      // UPDATE MODE
      if (mode === "update") {
        if (!initial?.id) throw new Error("Missing bracket id for update");

        const payload = {
          name: values.name,
          youthLevel: values.youthLevel,
          date,
          image: values.bracketSource === "UPLOAD" ? values.image : "",
          // Keep tournamentFormat consistent if they flip build option
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

      // CREATE MODE
      if (values.bracketSource === "UPLOAD") {
        const payload = {
          name: values.name,
          youthLevel: values.youthLevel,
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

      // BUILD path -> /api/brackets/generate
      const seeding = (values.seeding ?? "").trim();
      const teamNames = seeding.split(",").map((s) => s.trim()).filter(Boolean);

      const teams = teamNames.map((name, idx) => ({
        id: `t${idx + 1}`,
        name,
      }));

      const config =
        values.stageType === "JAMBOREE"
          ? ({ type: "JAMBOREE" } as any)
          : ({ type: "ROUND_ROBIN" } as any);

      const payload = {
        name: values.name,
        youthLevel: values.youthLevel,
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Basics */}
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Tournament / Bracket Name</FormLabel>
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
                <FormLabel>Division</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    value={field.value ?? ""}
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">Select division</option>
                    {YOUTH_LEVELS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
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

        {/* Dates */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Start Date</FormLabel>
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
                <FormLabel>End Date (optional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Bracket Source */}
        <FormField
          control={form.control}
          name="bracketSource"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bracket Option</FormLabel>
              <FormControl>
                <div className="flex flex-col gap-2 md:flex-row">
                  <button
                    type="button"
                    onClick={() => field.onChange("BUILD")}
                    className={[
                      "rounded-md border px-3 py-2 text-sm",
                      field.value === "BUILD"
                        ? "border-primary bg-primary/10"
                        : "border-input bg-background",
                    ].join(" ")}
                  >
                    Build with Engine
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange("UPLOAD")}
                    className={[
                      "rounded-md border px-3 py-2 text-sm",
                      field.value === "UPLOAD"
                        ? "border-primary bg-primary/10"
                        : "border-input bg-background",
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

        {/* UPLOAD PATH */}
        {bracketSource === "UPLOAD" && (
          <div className="upload-field flex flex-col gap-5 md:flex-row">
            <FormField
              control={form.control}
              name="image"
              render={() => (
                <FormItem className="w-full">
                  <FormLabel>Bracket Image</FormLabel>
                  <Card>
                    <CardContent className="space-y-2 mt-2 min-h-48">
                      <div className="flex-start space-x-2">
                        {images && images.length > 0 && (
                          <Image
                            src={images}
                            alt="bracket image"
                            className="w-20 h-20 object-cover object-center rounded-sm"
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
                      <p className="text-xs text-muted-foreground">
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

        {/* BUILD PATH */}
        {bracketSource === "BUILD" && (
          <>
            <FormField
              control={form.control}
              name="stageType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Build Option</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={field.value ?? ""}
                      className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
                    >
                      <option value="">Select</option>
                      {BUILD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Teams only matter when generating a new bracket. */}
            {mode === "create" && stageType && stageType.length > 0 && (
              <div className="mb-6 space-y-3">
                <FormLabel>Teams</FormLabel>

                <div className="flex items-center gap-2">
                  <label htmlFor="numTeams" className="text-sm">
                    Total Teams:
                  </label>
                  <select
                    id="numTeams"
                    className="border rounded px-2 py-1 text-sm"
                    value={(() => {
                      const seeding = form.watch("seeding") ?? "";
                      return seeding ? seeding.split(",").length : 0;
                    })()}
                    onChange={(e) => {
                      const num = parseInt(e.target.value, 10);
                      const newTeams = Array.from(
                        { length: num },
                        (_, i) => `Team ${i + 1}`
                      );
                      form.setValue("seeding", newTeams.join(","), {
                        shouldValidate: true,
                      });
                    }}
                  >
                    <option value={0}>Select</option>
                    {[...Array(16)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                {(() => {
                  const seeding = form.watch("seeding") || "";
                  const teams = seeding ? seeding.split(",") : [];
                  if (!teams.length || (teams.length === 1 && teams[0] === "")) return null;

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

                <p className="text-xs text-muted-foreground">
                  Select total teams. You can edit names now or later.
                </p>
              </div>
            )}

            {mode === "update" && (
              <p className="text-xs text-muted-foreground">
                Teams and generated games are not edited here. Use the Teams/Bracket tools
                (or a future “Regenerate” action) if you need to rebuild structure.
              </p>
            )}
          </>
        )}

        <Button type="submit">{submitLabel}</Button>
      </form>
    </Form>
  );
}
