"use client";

import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";

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

const YOUTH_LEVELS = [
  { value: "MITE", label: "Mite" },
  { value: "SQUIRT", label: "Squirt" },
  { value: "PEEWEE", label: "Peewee" },
  { value: "BANTAM", label: "Bantam" },
] as const;

const BUILD_OPTIONS = [
  { value: "POOL_BRACKET", label: "Pool Play + Bracket (Placement)" },
  { value: "JAMBOREE", label: "Jamboree" },
] as const;

const BRACKET_SIDES = [
  { value: "HOME", label: "Home" },
  { value: "AWAY", label: "Away" },
] as const;

const STANDARD_TEAM_COUNT_OPTIONS = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const JAMBoree_TEAM_COUNT_OPTIONS = [0, 2, 3, 4, 5, 6, 7, 8];

type MiteLevelKey = "miniMite" | "mite1" | "mite2" | "mite3";

const MITE_LEVELS = [
  {
    key: "miniMite" as MiteLevelKey,
    enabledField: "enableMiniMite" as const,
    countField: "miniMiteTeamCount" as const,
    teamsField: "miniMiteTeams" as const,
    stageId: "jamboree:MINI_MITE",
    levelToken: "MINI_MITE",
    label: "Mini Mite",
  },
  {
    key: "mite1" as MiteLevelKey,
    enabledField: "enableMite1" as const,
    countField: "mite1TeamCount" as const,
    teamsField: "mite1Teams" as const,
    stageId: "jamboree:MITE1",
    levelToken: "MITE1",
    label: "Mite 1",
  },
  {
    key: "mite2" as MiteLevelKey,
    enabledField: "enableMite2" as const,
    countField: "mite2TeamCount" as const,
    teamsField: "mite2Teams" as const,
    stageId: "jamboree:MITE2",
    levelToken: "MITE2",
    label: "Mite 2",
  },
  {
    key: "mite3" as MiteLevelKey,
    enabledField: "enableMite3" as const,
    countField: "mite3TeamCount" as const,
    teamsField: "mite3Teams" as const,
    stageId: "jamboree:MITE3",
    levelToken: "MITE3",
    label: "Mite 3",
  },
] as const;

type BracketFormMode = "create" | "update";

function stringifyPipeTeams(teams: string[]) {
  return teams.map((t) => t.trim()).filter(Boolean).join("|");
}

function parsePipeSeparatedTeams(value?: string) {
  const s = (value ?? "").trim();
  if (!s) return [];
  return s
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
}

function ensureTeamListSize(existing: string[], targetCount: number, prefix = "Team") {
  const next = [...existing];
  while (next.length < targetCount) {
    next.push(`${prefix}${next.length + 1}`);
  }
  return next.slice(0, targetCount);
}

function makeBracketFormSchema(mode: BracketFormMode) {
  return z
    .object({
      name: z.string().min(1, "Name is required"),
      youthLevel: z.string().min(1, "Division is required"),
      side: z.enum(["HOME", "AWAY"] as const, {
  message: "Home / Away is required",
}),

      startDate: z.string().min(1, "Start date is required"),
      endDate: z.string().optional(),

    bracketSource: z.enum(["UPLOAD", "BUILD"] as const, {
  message: "Bracket option is required",
}),
      image: z.string().optional(),
      stageType: z.string().optional(),

      guaranteedGamesPerTeam: z.union([z.string(), z.number()]).optional(),
      standardTeamCount: z.union([z.string(), z.number()]).optional(),
      standardTeams: z.string().optional(),

      jamboreeGamesPerTeam: z.union([z.string(), z.number()]).optional(),

      enableMiniMite: z.boolean().optional(),
      enableMite1: z.boolean().optional(),
      enableMite2: z.boolean().optional(),
      enableMite3: z.boolean().optional(),

      miniMiteTeamCount: z.union([z.string(), z.number()]).optional(),
      mite1TeamCount: z.union([z.string(), z.number()]).optional(),
      mite2TeamCount: z.union([z.string(), z.number()]).optional(),
      mite3TeamCount: z.union([z.string(), z.number()]).optional(),

      miniMiteTeams: z.string().optional(),
      mite1Teams: z.string().optional(),
      mite2Teams: z.string().optional(),
      mite3Teams: z.string().optional(),
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

      if (val.bracketSource !== "BUILD") return;

      if (!val.stageType || val.stageType.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stageType"],
          message: "Please select a build option.",
        });
        return;
      }

      if (mode !== "create") return;

      if (val.stageType === "POOL_BRACKET") {
        const countRaw = val.standardTeamCount;
        const count =
          typeof countRaw === "number"
            ? countRaw
            : Number(String(countRaw ?? "").trim());

        const teams = parsePipeSeparatedTeams(val.standardTeams);

        if (!Number.isFinite(count) || count < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["standardTeamCount"],
            message: "Select at least 2 teams.",
          });
        }

        if (teams.length < count) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["standardTeams"],
            message: "One or more team names are missing.",
          });
        }

        if (teams.some((t) => !t.trim())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["standardTeams"],
            message: "Team names cannot be blank.",
          });
        }

        const gRaw = val.guaranteedGamesPerTeam;
        const g =
          typeof gRaw === "number" ? gRaw : Number(String(gRaw ?? "").trim());

        if (!Number.isFinite(g) || g < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["guaranteedGamesPerTeam"],
            message: "Select guaranteed pool games per team.",
          });
        } else if (Number.isFinite(count) && count >= 2 && g > count - 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["guaranteedGamesPerTeam"],
            message: `Guaranteed games per team cannot exceed ${count - 1} for ${count} teams.`,
          });
        }

        return;
      }

      if (val.stageType === "JAMBOREE") {
        const enabledLevels = [
          {
            enabled: !!val.enableMiniMite,
            countRaw: val.miniMiteTeamCount,
            path: "miniMiteTeams" as const,
            label: "Mini Mite",
            teams: parsePipeSeparatedTeams(val.miniMiteTeams),
          },
          {
            enabled: !!val.enableMite1,
            countRaw: val.mite1TeamCount,
            path: "mite1Teams" as const,
            label: "Mite 1",
            teams: parsePipeSeparatedTeams(val.mite1Teams),
          },
          {
            enabled: !!val.enableMite2,
            countRaw: val.mite2TeamCount,
            path: "mite2Teams" as const,
            label: "Mite 2",
            teams: parsePipeSeparatedTeams(val.mite2Teams),
          },
          {
            enabled: !!val.enableMite3,
            countRaw: val.mite3TeamCount,
            path: "mite3Teams" as const,
            label: "Mite 3",
            teams: parsePipeSeparatedTeams(val.mite3Teams),
          },
        ].filter((x) => x.enabled);

        if (enabledLevels.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["stageType"],
            message: "Enable at least one mite level for the jamboree.",
          });
        }

        for (const level of enabledLevels) {
          const count =
            typeof level.countRaw === "number"
              ? level.countRaw
              : Number(String(level.countRaw ?? "").trim());

          if (!Number.isFinite(count) || count < 2) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [level.path],
              message: `${level.label} needs at least 2 teams.`,
            });
            continue;
          }

          if (level.teams.length < count) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [level.path],
              message: `${level.label} is missing one or more team names.`,
            });
          }

          if (level.teams.some((t) => !t.trim())) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [level.path],
              message: `${level.label} has a blank team name.`,
            });
          }
        }

        const gRaw = val.jamboreeGamesPerTeam;
        const g =
          typeof gRaw === "number" ? gRaw : Number(String(gRaw ?? "").trim());

        if (!Number.isFinite(g) || g < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["jamboreeGamesPerTeam"],
            message: "Enter games per team for the mite jamboree.",
          });
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

const selectClassName =
  "block h-11 w-full rounded-md border border-emerald-900/70 bg-[#0f2217] px-3 py-2 text-sm text-white shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20";

const toggleBaseClass =
  "rounded-md border px-3 py-2 text-sm font-medium transition-colors";

function buildJamboreePayload(values: FormValues) {
  const gamesRaw = values.jamboreeGamesPerTeam;
  const gamesPerTeam =
    typeof gamesRaw === "number"
      ? gamesRaw
      : Number(String(gamesRaw ?? "").trim());

  const selectedLevels = MITE_LEVELS.filter((level) => {
    return Boolean(values[level.enabledField]);
  });

  const teams: Array<{ id: string; name: string }> = [];
  const stages: Array<{
    stageId: string;
    levelToken: string;
    gamesPerTeam: number;
    teamIds: string[];
  }> = [];

  for (const level of selectedLevels) {
    const teamNames = parsePipeSeparatedTeams(String(values[level.teamsField] ?? ""));
    const teamIds: string[] = [];

    for (const teamName of teamNames) {
      const teamId = `${level.levelToken.toLowerCase()}_${teamIds.length + 1}`;
      teamIds.push(teamId);
      teams.push({
        id: teamId,
        name: teamName,
      });
    }

    if (teamIds.length >= 2) {
      stages.push({
        stageId: level.stageId,
        levelToken: level.levelToken,
        gamesPerTeam,
        teamIds,
      });
    }
  }

  return { gamesPerTeam, teams, stages };
}

function buildStandardPayload(values: FormValues) {
  const teamNames = parsePipeSeparatedTeams(values.standardTeams);
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

  return {
    teams,
    config: {
      type: "ROUND_ROBIN",
      gamesPerTeam: Number.isFinite(gamesPerTeam) ? gamesPerTeam : undefined,
      placementGames,
    },
  };
}

export default function BracketForm({
  mode = "create",
  initial,
}: {
  mode?: BracketFormMode;
  initial?: BracketFormInitial;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

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
      guaranteedGamesPerTeam: "3",
      standardTeamCount: 4,
      standardTeams: stringifyPipeTeams(["Team1", "Team2", "Team3", "Team4"]),

      jamboreeGamesPerTeam: "3",
      enableMiniMite: true,
      enableMite1: true,
      enableMite2: true,
      enableMite3: true,

      miniMiteTeamCount: 4,
      mite1TeamCount: 4,
      mite2TeamCount: 4,
      mite3TeamCount: 4,

      miniMiteTeams: stringifyPipeTeams(["Team1", "Team2", "Team3", "Team4"]),
      mite1Teams: stringifyPipeTeams(["Team1", "Team2", "Team3", "Team4"]),
      mite2Teams: stringifyPipeTeams(["Team1", "Team2", "Team3", "Team4"]),
      mite3Teams: stringifyPipeTeams(["Team1", "Team2", "Team3", "Team4"]),
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
      guaranteedGamesPerTeam: "3",
      standardTeamCount: 4,
      standardTeams: stringifyPipeTeams(["Team1", "Team2", "Team3", "Team4"]),

      jamboreeGamesPerTeam: "3",
      enableMiniMite: true,
      enableMite1: true,
      enableMite2: true,
      enableMite3: true,

      miniMiteTeamCount: 4,
      mite1TeamCount: 4,
      mite2TeamCount: 4,
      mite3TeamCount: 4,

      miniMiteTeams: stringifyPipeTeams(["Team1", "Team2", "Team3", "Team4"]),
      mite1Teams: stringifyPipeTeams(["Team1", "Team2", "Team3", "Team4"]),
      mite2Teams: stringifyPipeTeams(["Team1", "Team2", "Team3", "Team4"]),
      mite3Teams: stringifyPipeTeams(["Team1", "Team2", "Team3", "Team4"]),
    });
  }, [initial, form]);

  const bracketSource = form.watch("bracketSource");
  const images = form.watch("image");
  const stageType = form.watch("stageType");

  const standardTeamCount = Number(form.watch("standardTeamCount") ?? 0);

  const enableMiniMite = form.watch("enableMiniMite");
  const enableMite1 = form.watch("enableMite1");
  const enableMite2 = form.watch("enableMite2");
  const enableMite3 = form.watch("enableMite3");

  useEffect(() => {
    if (stageType === "JAMBOREE" && form.getValues("youthLevel") !== "MITE") {
      form.setValue("youthLevel", "MITE", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [stageType, form]);

  const submitLabel = useMemo(() => {
    if (isSaving) return mode === "update" ? "Updating..." : "Creating...";
    return mode === "update" ? "Update Bracket" : "Create Bracket";
  }, [mode, isSaving]);

  const syncGeneratedTeamInputs = (
    teamsField:
      | "standardTeams"
      | "miniMiteTeams"
      | "mite1Teams"
      | "mite2Teams"
      | "mite3Teams",
    targetCount: number
  ) => {
    const existing = parsePipeSeparatedTeams(String(form.getValues(teamsField) ?? ""));
    const next = ensureTeamListSize(existing, targetCount, "Team");
    form.setValue(teamsField, stringifyPipeTeams(next), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onSubmit = async (values: FormValues) => {
    if (isSaving) return;

    try {
      setIsSaving(true);

      const date = makeDateRange(values.startDate, values.endDate);

      if (mode === "update") {
        if (!initial?.id) throw new Error("Missing bracket id for update");

        const payload = {
          name: values.name,
          youthLevel:
            values.stageType === "JAMBOREE" ? "MITE" : values.youthLevel,
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

      let payload: any;

      if (values.stageType === "JAMBOREE") {
        const jamboree = buildJamboreePayload(values);

        payload = {
          name: values.name,
          youthLevel: "MITE",
          side: values.side,
          date,
          teams: jamboree.teams,
          config: {
            type: "JAMBOREE",
            gamesPerTeam: jamboree.gamesPerTeam,
            stages: jamboree.stages,
          },
        };
      } else {
        const standard = buildStandardPayload(values);

        payload = {
          name: values.name,
          youthLevel: values.youthLevel,
          side: values.side,
          date,
          teams: standard.teams,
          config: standard.config,
        };
      }

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
    } finally {
      setIsSaving(false);
    }
  };

  const renderStandardGeneratedTeamInputs = () => {
    const names = parsePipeSeparatedTeams(String(form.watch("standardTeams") ?? ""));

    if (names.length === 0) {
      return (
        <p className="text-sm text-white/50">
          Select a team count to generate team name fields.
        </p>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {names.map((name, idx) => (
          <div key={`standard-${idx}`} className="space-y-1">
            <label className="text-xs font-medium text-white/70">
              Team {idx + 1}
            </label>
            <Input
              value={name}
              onChange={(e) => {
                const current = parsePipeSeparatedTeams(
                  String(form.getValues("standardTeams") ?? "")
                );
                current[idx] = e.target.value;
                form.setValue("standardTeams", stringifyPipeTeams(current), {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderMiteLevelCard = (
    title: string,
    enabledField:
      | "enableMiniMite"
      | "enableMite1"
      | "enableMite2"
      | "enableMite3",
    countField:
      | "miniMiteTeamCount"
      | "mite1TeamCount"
      | "mite2TeamCount"
      | "mite3TeamCount",
    teamsField: "miniMiteTeams" | "mite1Teams" | "mite2Teams" | "mite3Teams",
    enabled: boolean | undefined
  ) => {
    const names = parsePipeSeparatedTeams(String(form.watch(teamsField) ?? ""));

    return (
      <Card className="border-emerald-900/70 bg-[#0f2217] text-white">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="text-sm text-white/70">
                Pick how many teams are in this level, then edit the generated names.
              </p>
            </div>

            <label className="flex items-center gap-2 pt-1 text-sm font-medium">
              <input
                type="checkbox"
                checked={!!enabled}
                onChange={(e) =>
                  form.setValue(enabledField, e.target.checked, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                className="h-4 w-4 rounded border border-emerald-500/50 bg-transparent"
              />
              Include
            </label>
          </div>

          <FormField
            control={form.control}
            name={countField}
            render={({ field }) => (
              <FormItem className="max-w-55">
                <FormLabel className="text-white/90">Number of teams</FormLabel>
                <FormControl>
                  <select
                    value={String(field.value ?? 0)}
                    disabled={!enabled}
                    className={selectClassName}
                    onChange={(e) => {
                      const count = Number(e.target.value);
                      field.onChange(count);
                      syncGeneratedTeamInputs(teamsField, count);
                    }}
                  >
                    {JAMBoree_TEAM_COUNT_OPTIONS.map((count) => (
                      <option
                        key={count}
                        value={count}
                        className="bg-[#102317] text-white"
                      >
                        {count === 0 ? "Select count" : count}
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
            name={teamsField}
            render={() => (
              <FormItem>
                <FormLabel className="text-white/90">{title} teams</FormLabel>
                <FormControl>
                  <div className="rounded-md border border-emerald-900/70 bg-[#102317] p-4">
                    {!enabled ? (
                      <p className="text-sm text-white/50">
                        Turn on this level to enter teams.
                      </p>
                    ) : names.length === 0 ? (
                      <p className="text-sm text-white/50">
                        Select a team count to generate team name fields.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {names.map((name, idx) => (
                          <div key={`${teamsField}-${idx}`} className="space-y-1">
                            <label className="text-xs font-medium text-white/70">
                              Team {idx + 1}
                            </label>
                            <Input
                              value={name}
                              disabled={!enabled}
                              onChange={(e) => {
                                const current = parsePipeSeparatedTeams(
                                  String(form.getValues(teamsField) ?? "")
                                );
                                current[idx] = e.target.value;
                                form.setValue(
                                  teamsField,
                                  stringifyPipeTeams(current),
                                  {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  }
                                );
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    );
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
                    disabled={stageType === "JAMBOREE"}
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
                {stageType === "JAMBOREE" ? (
                  <p className="text-xs text-white/60">
                    Mite jamborees are saved under the MITE division and use separate Mini
                    Mite / Mite 1 / Mite 2 / Mite 3 groupings.
                  </p>
                ) : null}
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

        {bracketSource === "UPLOAD" ? (
          <Card className="border-emerald-900/70 bg-[#0f2217] text-white">
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <h3 className="text-base font-semibold">Upload bracket image</h3>
                <p className="text-sm text-white/70">
                  Use this if you want the public bracket page to show your uploaded image
                  instead of generated standings/bracket logic.
                </p>
              </div>

              <FormField
                control={form.control}
                name="image"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-white">Bracket Image</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <UploadButton
                          endpoint="imageUploader"
                          onClientUploadComplete={(res) => {
                            const url = res?.[0]?.url ?? "";
                            form.setValue("image", url, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            toast.success("Image uploaded!");
                          }}
                          onUploadError={(error: Error) => {
                            toast.error(error.message);
                          }}
                        />
                        {images ? (
                          <div className="overflow-hidden rounded-lg border border-emerald-900/70">
                            <Image
                              src={images}
                              alt="Bracket preview"
                              width={1200}
                              height={900}
                              className="h-auto w-full object-contain"
                            />
                          </div>
                        ) : null}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="stageType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Build Format</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={field.value ?? ""}
                      className={selectClassName}
                    >
                      <option value="">Select build format</option>
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

            {stageType === "POOL_BRACKET" ? (
              <Card className="border-emerald-900/70 bg-[#0f2217] text-white">
                <CardContent className="space-y-5 p-5">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">Pool play + placement setup</h3>
                    <p className="text-sm text-white/70">
                      Choose games per team, choose team count, then edit the generated
                      team names.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="guaranteedGamesPerTeam"
                      render={({ field }) => (
                        <FormItem className="max-w-xs">
                          <FormLabel className="text-white">
                            Guaranteed pool games per team
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              {...field}
                              value={field.value ?? "3"}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="standardTeamCount"
                      render={({ field }) => (
                        <FormItem className="max-w-xs">
                          <FormLabel className="text-white">Number of teams</FormLabel>
                          <FormControl>
                            <select
                              value={String(field.value ?? 0)}
                              className={selectClassName}
                              onChange={(e) => {
                                const count = Number(e.target.value);
                                field.onChange(count);
                                syncGeneratedTeamInputs("standardTeams", count);
                              }}
                            >
                              {STANDARD_TEAM_COUNT_OPTIONS.map((count) => (
                                <option
                                  key={count}
                                  value={count}
                                  className="bg-[#102317] text-white"
                                >
                                  {count === 0 ? "Select count" : count}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="standardTeams"
                    render={() => (
                      <FormItem>
                        <FormLabel className="text-white">Team names</FormLabel>
                        <FormControl>
                          <div className="rounded-md border border-emerald-900/70 bg-[#102317] p-4">
                            {standardTeamCount < 2 ? (
                              <p className="text-sm text-white/50">
                                Select a team count to generate team name fields.
                              </p>
                            ) : (
                              renderStandardGeneratedTeamInputs()
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            ) : null}

            {stageType === "JAMBOREE" ? (
              <div className="space-y-6">
                <Card className="border-emerald-900/70 bg-[#0f2217] text-white">
                  <CardContent className="space-y-5 p-5">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold">Mite jamboree setup</h3>
                      <p className="text-sm text-white/70">
                        Choose the mite levels included in this event, set team count for
                        each, and then edit the generated team names.
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="jamboreeGamesPerTeam"
                      render={({ field }) => (
                        <FormItem className="max-w-xs">
                          <FormLabel className="text-white">Games per team</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              {...field}
                              value={field.value ?? "3"}
                            />
                          </FormControl>
                          <p className="text-xs text-white/60">
                            This will be applied to each enabled mite level.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  {renderMiteLevelCard(
                    "Mini Mite",
                    "enableMiniMite",
                    "miniMiteTeamCount",
                    "miniMiteTeams",
                    enableMiniMite
                  )}
                  {renderMiteLevelCard(
                    "Mite 1",
                    "enableMite1",
                    "mite1TeamCount",
                    "mite1Teams",
                    enableMite1
                  )}
                  {renderMiteLevelCard(
                    "Mite 2",
                    "enableMite2",
                    "mite2TeamCount",
                    "mite2Teams",
                    enableMite2
                  )}
                  {renderMiteLevelCard(
                    "Mite 3",
                    "enableMite3",
                    "mite3TeamCount",
                    "mite3Teams",
                    enableMite3
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSaving}>
            {submitLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => router.push("/admin/brackets")}
          >
            Cancel
          </Button>
          {isSaving ? (
            <span className="text-sm text-white/70">
              Saving bracket and generating games...
            </span>
          ) : null}
        </div>
      </form>
    </Form>
  );
}