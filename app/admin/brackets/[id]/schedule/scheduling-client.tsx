"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  generateSlotsMultiDay,
  type DayWindow,
  type Slot as GeneratedSlot,
} from "@/lib/tournament-engine/scheduling/slotGenerator";

type ApiSlot = {
  start: string; // ISO with offset (recommended)
  location: string;
  allowedStageTypes?: string[];
};

type SlotRow = {
  id: string;
  startLocal: string; // "YYYY-MM-DDTHH:mm" from <input type="datetime-local">
  location: string;
  allowedStageTypes?: string[];
};

type ScheduleOkResponse = {
  ok: true;
  preview: boolean;
  scheduledCount: number;
  unscheduledCount: number;
  unusedSlotCount: number;
  stageTypesApplied: string[];
  unscheduledDetailed: { engineGameId: string; reason: string }[];
  scheduledGamesPreview: Array<{
    engineGameId: string;
    stageType: string;
    stageId?: string;
    slot: { start: string; location: string };
    home: { type: string; id?: string; name: string };
    away: { type: string; id?: string; name: string };
  }>;
  unusedSlotsPreview: ApiSlot[];
  rulesApplied?: any;
  derivedMinRestMinutes?: number;
  gameDurationMinutes?: number;
};

type ScheduleErrorResponse = {
  ok: false;
  errorCode?: string;
  error?: string;
  message?: string;
  hint?: string;
  unresolvedCount?: number;
  unresolved?: any[];
  alreadyScheduledCount?: number;
  examples?: any[];
};

type ScheduleResponse = ScheduleOkResponse | ScheduleErrorResponse;

type RuleResponse = {
  ok: boolean;
  youthLevel: string;
  gameMinutes: number;
  zamboniMinutes: number;
  restAfterEndMinutes: number;
  intervalMinutes: number; // game + zamboni
};

type BracketMetaResponse = {
  ok: boolean;
  bracket?: {
    id: number;
    name: string;
    youthLevel: string;
    tournamentFormat?: string;
  };
};

type ResolvePlacementResponse =
  | {
      ok: true;
      bracketId: number;
      poolId: string;
      poolPlayComplete: boolean;
      message?: string;
      blockedCount?: number;
      blocked?: any[];
      updatedCount?: number;
      resolvedPlacementCount?: number;
    }
  | { ok: false; error?: string; message?: string };

function makeId() {
  return `slot_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Convert a datetime-local string (local wall clock time) into an ISO string
 * with explicit local offset, e.g.:
 *   "2026-02-08T08:00" -> "2026-02-08T08:00:00-06:00"
 */
function localToISOWithOffset(local: string): string {
  const raw = (local ?? "").trim();
  if (!raw) return "";

  // Ensure seconds
  const localWithSeconds = raw.length === 16 ? `${raw}:00` : raw;

  const d = new Date(raw); // interpreted as local time
  if (Number.isNaN(d.getTime())) return "";

  // Offset at that date (handles DST)
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const hh = pad2(Math.floor(abs / 60));
  const mm = pad2(abs % 60);

  return `${localWithSeconds}${sign}${hh}:${mm}`;
}

/**
 * Convert a Date to a datetime-local compatible string "YYYY-MM-DDTHH:mm"
 * in the user's local timezone.
 */
function dateToLocalInput(d: Date) {
  const yyyy = d.getFullYear();
  const MM = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

function isoDateTodayLocal() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Add N days to yyyy-mm-dd (uses noon to avoid DST boundary issues) */
function addDays(dateISO: string, days: number) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
  dt.setDate(dt.getDate() + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isSquirtPlus(level: string) {
  const t = String(level || "").toUpperCase();
  return t.includes("SQUIRT") || t.includes("PEEWEE") || t.includes("BANTAM");
}

function fmtDT(startISO: string) {
  const d = new Date(startISO);
  if (Number.isNaN(d.getTime())) return startISO;
  return d.toLocaleString();
}

export default function SchedulingClient({ bracketId }: { bracketId: number }) {
  const storageKey = `schedule-slots-${bracketId}`;

  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [stageTypes, setStageTypes] = useState<string[]>(["POOL_PLAY", "PLACEMENT"]);
  const [debug, setDebug] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<ScheduleResponse | null>(null);

  // Hardening controls
  const [clearExistingOnApply, setClearExistingOnApply] = useState(true);

  // Placement resolution
  const [poolId, setPoolId] = useState("pool-A");
  const [resolveResult, setResolveResult] = useState<ResolvePlacementResponse | null>(null);
  const [resolveLoading, setResolveLoading] = useState(false);

  // Bracket + DB-driven rules
  const [bracketYouthLevel, setBracketYouthLevel] = useState<string>("");
  const [rules, setRules] = useState<RuleResponse | null>(null);
  const squirtPlus = useMemo(
    () => (bracketYouthLevel ? isSquirtPlus(bracketYouthLevel) : false),
    [bracketYouthLevel]
  );

  // Multi-day generator (Fri–Sun)
  const [tournamentStartDate, setTournamentStartDate] =
    useState<string>(isoDateTodayLocal());

  const [friStart, setFriStart] = useState("17:00");
  const [friLast, setFriLast] = useState("22:00");

  const [satStart, setSatStart] = useState("08:00");
  const [satLast, setSatLast] = useState("22:00");

  // Sunday split: pool finish early, placement later
  const [sunPoolStart, setSunPoolStart] = useState("08:00");
  const [sunPoolLast, setSunPoolLast] = useState("10:30");
  const [sunPlaceStart, setSunPlaceStart] = useState("11:45");
  const [sunPlaceLast, setSunPlaceLast] = useState("16:00");

  const [genLocations, setGenLocations] = useState("FIA");

  const wantsPlacement = useMemo(() => stageTypes.includes("PLACEMENT"), [stageTypes]);
  const placementResolvedOk = useMemo(() => {
    if (!wantsPlacement) return true;
    if (!resolveResult || resolveResult.ok !== true) return false;
    return resolveResult.poolPlayComplete === true && (resolveResult.blockedCount ?? 0) === 0;
  }, [resolveResult, wantsPlacement]);

  // Load saved slots
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as SlotRow[];
      if (Array.isArray(parsed)) setSlots(parsed);
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Persist slots
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(slots));
  }, [slots, storageKey]);

  // Load bracket youthLevel
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/brackets/${bracketId}`);
        const data = (await res.json()) as BracketMetaResponse;
        if (cancelled) return;
        if (data?.ok && data?.bracket?.youthLevel) {
          setBracketYouthLevel(data.bracket.youthLevel);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bracketId]);

  // Load DB-driven rules
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/brackets/${bracketId}/rules`);
        const data = (await res.json()) as RuleResponse;
        if (cancelled) return;
        if (data?.ok) setRules(data);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bracketId]);

  // Squirt+ UI guard: one sheet of ice
  useEffect(() => {
    if (!squirtPlus) return;
    setGenLocations("FIA");
  }, [squirtPlus]);

  function addSlot() {
    setSlots((prev) => [
      ...prev,
      { id: makeId(), startLocal: "", location: "", allowedStageTypes: undefined },
    ]);
  }

  function updateSlot(id: string, patch: Partial<SlotRow>) {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeSlot(id: string) {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  }

  function clearSlotsLocal() {
    setSlots([]);
    setScheduleResult(null);
  }

  function sortSlots() {
    setSlots((prev) => {
      const copy = [...prev];
      copy.sort((a, b) => {
        const aKey =
          (a.startLocal || "") +
          "||" +
          (a.location || "") +
          "||" +
          (a.allowedStageTypes?.join(",") ?? "");
        const bKey =
          (b.startLocal || "") +
          "||" +
          (b.location || "") +
          "||" +
          (b.allowedStageTypes?.join(",") ?? "");
        return aKey.localeCompare(bKey);
      });
      return copy;
    });
  }

  function dedupeSlots() {
    setSlots((prev) => {
      const seen = new Set<string>();
      const out: SlotRow[] = [];
      for (const s of prev) {
        const key = `${(s.startLocal || "").trim()}@@${(s.location || "").trim()}@@${(
          s.allowedStageTypes?.join(",") ?? ""
        ).trim()}`;
        if (key.startsWith("@@")) {
          out.push(s);
          continue;
        }
        if (!seen.has(key)) {
          seen.add(key);
          out.push(s);
        }
      }
      return out;
    });
  }

  // ✅ Generator: Fri–Sun windows, interval from DB, Sunday split with stage tagging
  function generateWeekendSlots() {
    if (!rules?.ok) return;

    const interval = Number(rules.intervalMinutes) || 0;
    if (interval <= 0) return;

    const fri = (tournamentStartDate || "").trim();
    if (!fri) return;

    const sat = addDays(fri, 1);
    const sun = addDays(fri, 2);

    const locations = (genLocations || "")
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    const effectiveLocations = squirtPlus
      ? ["FIA"]
      : locations.length
        ? locations
        : ["FIA"];

    const dayWindows: DayWindow[] = [
      // Fri & Sat: pool play
      {
        dateISO: fri,
        startTime: friStart,
        lastStartTime: friLast,
        label: "Fri",
        allowedStageTypes: ["POOL_PLAY"],
      },
      {
        dateISO: sat,
        startTime: satStart,
        lastStartTime: satLast,
        label: "Sat",
        allowedStageTypes: ["POOL_PLAY"],
      },

      // Sun early: finish pool
      {
        dateISO: sun,
        startTime: sunPoolStart,
        lastStartTime: sunPoolLast,
        label: "Sun AM",
        allowedStageTypes: ["POOL_PLAY"],
      },

      // Sun later: bracket / placement
      {
        dateISO: sun,
        startTime: sunPlaceStart,
        lastStartTime: sunPlaceLast,
        label: "Sun PM",
        allowedStageTypes: ["PLACEMENT"],
      },
    ];

    const generated: GeneratedSlot[] = generateSlotsMultiDay({
      dayWindows,
      intervalMinutes: interval,
      locations: effectiveLocations,
    });

    const newRows: SlotRow[] = generated.map((s) => ({
      id: makeId(),
      startLocal: dateToLocalInput(new Date(s.start)),
      location: s.location,
      allowedStageTypes: s.allowedStageTypes,
    }));

    setSlots((prev) => [...prev, ...newRows]);
  }

  // --- Validation / derived payload ---
  const duplicateKeys = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of slots) {
      const key = `${(s.startLocal || "").trim()}@@${(s.location || "").trim()}@@${(
        s.allowedStageTypes?.join(",") ?? ""
      ).trim()}`;
      if (key.startsWith("@@")) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [slots]);

  const slotIssues = useMemo(() => {
    const issues: Record<
      string,
      { missingStart?: boolean; missingLocation?: boolean; duplicate?: boolean }
    > = {};
    for (const s of slots) {
      const start = (s.startLocal ?? "").trim();
      const loc = (s.location ?? "").trim();
      const key = `${start}@@${loc}@@${(s.allowedStageTypes?.join(",") ?? "").trim()}`;

      const missingStart = !start;
      const missingLocation = !loc;
      const duplicate =
        !missingStart && !missingLocation && (duplicateKeys.get(key) ?? 0) > 1;

      if (missingStart || missingLocation || duplicate) {
        issues[s.id] = { missingStart, missingLocation, duplicate };
      }
    }
    return issues;
  }, [slots, duplicateKeys]);

  const payloadSlots: ApiSlot[] = useMemo(() => {
    return slots
      .map((s) => ({
        start: localToISOWithOffset(s.startLocal),
        location: (s.location ?? "").trim(),
        allowedStageTypes: Array.isArray(s.allowedStageTypes)
          ? s.allowedStageTypes
          : undefined,
      }))
      .filter((s) => s.start && s.location);
  }, [slots]);

  const invalidCount = useMemo(() => Object.keys(slotIssues).length, [slotIssues]);
  const duplicateCount = useMemo(() => {
    let c = 0;
    for (const k of Object.keys(slotIssues)) {
      if (slotIssues[k]?.duplicate) c++;
    }
    return c;
  }, [slotIssues]);

  const intervalLabel = useMemo(() => {
    if (!rules?.ok) return "—";
    return `${rules.intervalMinutes} min (game ${rules.gameMinutes} + zam ${rules.zamboniMinutes})`;
  }, [rules]);

  async function callResolvePlacement() {
    if (!wantsPlacement) {
      setResolveResult(null);
      return;
    }
    setResolveLoading(true);
    try {
      const res = await fetch(`/api/brackets/${bracketId}/resolve-placement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poolId }),
      });
      const data = (await res.json()) as ResolvePlacementResponse;
      setResolveResult(data);
    } finally {
      setResolveLoading(false);
    }
  }

  async function callClearSchedule() {
    setLoading(true);
    try {
      const res = await fetch(`/api/brackets/${bracketId}/schedule/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageTypes }),
      });
      const data = await res.json();
      setScheduleResult({
        ok: false,
        errorCode: "CLEARED",
        message: `Cleared schedule for: ${stageTypes.join(", ")}. Games cleared: ${
          data?.gamesCleared ?? "?"
        }. Slots deleted: ${data?.slotsDeleted ?? "?"}.`,
      });
    } finally {
      setLoading(false);
    }
  }

  async function callSchedule(preview: boolean) {
    if (payloadSlots.length === 0) {
      setScheduleResult({
        ok: false,
        errorCode: "NO_SLOTS",
        message: "No valid time slots to schedule. Add at least one slot with start + location.",
      });
      return;
    }

    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (preview) query.set("preview", "1");
      if (debug) query.set("debug", "1");

      const res = await fetch(`/api/brackets/${bracketId}/schedule?${query.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageTypes,
          slots: payloadSlots,
          clearExisting: preview ? false : clearExistingOnApply,
        }),
      });

      const data = (await res.json()) as ScheduleResponse;
      setScheduleResult(data);
    } finally {
      setLoading(false);
    }
  }

  const warnings = useMemo(() => {
    const w: string[] = [];

    if (invalidCount > 0)
      w.push(
        `You have ${invalidCount} slot row(s) with issues (missing fields or duplicates). Only valid rows are sent.`
      );
    if (duplicateCount > 0)
      w.push(`Duplicate slots detected (${duplicateCount} row(s) flagged). Try Dedupe.`);

    if (wantsPlacement && !placementResolvedOk) {
      w.push(
        "Placement scheduling is selected, but placement is not resolved yet. Run Resolve Placement before preview/apply."
      );
    }

    if (scheduleResult && scheduleResult.ok === true) {
      if (scheduleResult.unscheduledCount > 0) w.push("Some games could not be scheduled.");
      if (scheduleResult.unusedSlotCount > 0) w.push("Some time slots were unused.");
      if (scheduleResult.unscheduledDetailed?.some((u) => u.reason === "REST_RULE_CONFLICT")) {
        w.push("Rest rule conflicts detected.");
      }
    }

    return w;
  }, [invalidCount, duplicateCount, wantsPlacement, placementResolvedOk, scheduleResult]);

  function toggleStageType(t: string, on: boolean) {
    setStageTypes((prev) => {
      const set = new Set(prev);
      if (on) set.add(t);
      else set.delete(t);
      return [...set];
    });
    // whenever stage types change, clear any prior schedule result (to avoid confusion)
    setScheduleResult(null);
    setResolveResult(null);
  }

  return (
    <div className="space-y-8">
      {/* Stage Types + Flow */}
      <Card className="p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Scheduling Flow</h2>
          <p className="text-sm text-muted-foreground">
            Upgrade 9 hardening: resolve placement → preview → apply. The API will block double
            scheduling and unresolved placement.
          </p>
          <p className="text-xs text-muted-foreground">
            Sunday rule: any slot on Sunday with no allowedStageTypes will default to{" "}
            <b>PLACEMENT</b>. Override a Sunday slot by explicitly setting allowedStageTypes to{" "}
            <b>POOL_PLAY</b>.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-md border p-3 space-y-2">
            <div className="font-medium text-sm">Stage types to schedule</div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={stageTypes.includes("POOL_PLAY")}
                onCheckedChange={(v) => toggleStageType("POOL_PLAY", !!v)}
              />
              <Label>POOL_PLAY</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={stageTypes.includes("PLACEMENT")}
                onCheckedChange={(v) => toggleStageType("PLACEMENT", !!v)}
              />
              <Label>PLACEMENT</Label>
            </div>
            <div className="text-xs text-muted-foreground">
              (You can preview/apply either stage type, or both.)
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <div className="font-medium text-sm">Resolve Placement</div>
            <div className="text-xs text-muted-foreground">
              Only required when scheduling PLACEMENT.
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Pool</Label>
              <Input value={poolId} onChange={(e) => setPoolId(e.target.value)} />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={resolveLoading || !wantsPlacement}
              onClick={callResolvePlacement}
            >
              {resolveLoading ? "Resolving…" : "Resolve Placement"}
            </Button>

            {wantsPlacement && resolveResult && resolveResult.ok === true && (
              <div className="text-xs">
                {resolveResult.poolPlayComplete ? (
                  <div>
                    ✅ Pool complete. Updated: {resolveResult.updatedCount ?? 0}. Blocked:{" "}
                    {resolveResult.blockedCount ?? 0}
                  </div>
                ) : (
                  <div>
                    ⚠ Pool not complete. {resolveResult.message ?? "Mark pool games FINAL first."}
                  </div>
                )}
              </div>
            )}
            {wantsPlacement && resolveResult && resolveResult.ok === false && (
              <div className="text-xs">❌ {resolveResult.message ?? resolveResult.error}</div>
            )}
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <div className="font-medium text-sm">Apply behavior</div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={clearExistingOnApply}
                onCheckedChange={(v) => setClearExistingOnApply(!!v)}
              />
              <Label>Clear existing schedule before Apply</Label>
            </div>
            <div className="text-xs text-muted-foreground">
              If unchecked, the API will block Apply if any selected games are already scheduled.
            </div>
            <Button type="button" variant="outline" onClick={callClearSchedule} disabled={loading}>
              Clear Schedule Now
            </Button>
          </div>
        </div>
      </Card>

      {/* Slot Management */}
      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Time Slots</h2>
            <p className="text-sm text-muted-foreground">
              Add slots manually or generate them. Only valid rows (start + location) are sent to
              Preview/Apply.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Slot interval is DB-driven: <b>{intervalLabel}</b>. Rest is enforced by the scheduler.
            </p>
            {squirtPlus && (
              <p className="text-xs text-muted-foreground mt-1">
                Squirt+ tournaments are forced to <b>one sheet</b> in the generator UI.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={sortSlots}>
              Sort
            </Button>
            <Button variant="outline" type="button" onClick={dedupeSlots}>
              Dedupe
            </Button>
            <Button variant="destructive" type="button" onClick={clearSlotsLocal}>
              Clear
            </Button>
          </div>
        </div>

        {slots.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No slots yet. Click <b>Add Slot</b> or use <b>Multi-Day Generate</b>.
          </div>
        ) : (
          <div className="space-y-2">
            {slots.map((slot) => {
              const issue = slotIssues[slot.id];
              const hasIssue = !!issue;

              return (
                <div key={slot.id} className="flex flex-col gap-2 rounded-md border p-3">
                  <div className="flex gap-3 items-center">
                    <Input
                      type="datetime-local"
                      value={slot.startLocal}
                      onChange={(e) => updateSlot(slot.id, { startLocal: e.target.value })}
                    />
                    <Input
                      placeholder="Location (e.g. FIA)"
                      value={slot.location}
                      onChange={(e) => updateSlot(slot.id, { location: e.target.value })}
                    />
                    <Input
                      placeholder='Allowed stage types (comma) e.g. "POOL_PLAY" or "PLACEMENT"'
                      value={(slot.allowedStageTypes ?? []).join(",")}
                      onChange={(e) => {
                        const v = e.target.value
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean);
                        updateSlot(slot.id, { allowedStageTypes: v.length ? v : undefined });
                      }}
                    />
                    <Button
                      variant="destructive"
                      type="button"
                      onClick={() => removeSlot(slot.id)}
                    >
                      Remove
                    </Button>
                  </div>

                  {hasIssue && (
                    <div className="text-sm">
                      {issue.missingStart && (
                        <span className="mr-2 rounded bg-yellow-100 px-2 py-1">
                          Missing start time
                        </span>
                      )}
                      {issue.missingLocation && (
                        <span className="mr-2 rounded bg-yellow-100 px-2 py-1">
                          Missing location
                        </span>
                      )}
                      {issue.duplicate && (
                        <span className="mr-2 rounded bg-red-100 px-2 py-1">
                          Duplicate start+location(+allowedStageTypes)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" type="button" onClick={addSlot}>
            Add Slot
          </Button>

          <div className="text-sm text-muted-foreground">
            Valid slots: <b>{payloadSlots.length}</b> / {slots.length}
          </div>
        </div>

        {/* Multi-Day Generator */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-medium">Multi-Day Generate (Fri–Sun)</h3>
            <div className="text-xs text-muted-foreground">
              Interval: <b>{intervalLabel}</b>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="md:col-span-2">
              <Label className="text-xs">Start Date (Friday)</Label>
              <Input
                type="date"
                value={tournamentStartDate}
                onChange={(e) => setTournamentStartDate(e.target.value)}
              />
            </div>

            <div className="md:col-span-3">
              <Label className="text-xs">Locations (comma-separated)</Label>
              <Input
                value={genLocations}
                disabled={squirtPlus}
                onChange={(e) => setGenLocations(e.target.value)}
                placeholder="FIA,Rink 2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-md border p-3 space-y-2">
              <div className="font-medium text-sm">Friday (POOL_PLAY)</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">First start</Label>
                  <Input type="time" value={friStart} onChange={(e) => setFriStart(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Last start</Label>
                  <Input type="time" value={friLast} onChange={(e) => setFriLast(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-2">
              <div className="font-medium text-sm">Saturday (POOL_PLAY)</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">First start</Label>
                  <Input type="time" value={satStart} onChange={(e) => setSatStart(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Last start</Label>
                  <Input type="time" value={satLast} onChange={(e) => setSatLast(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-2">
              <div className="font-medium text-sm">Sunday split</div>
              <div className="text-xs text-muted-foreground">AM = POOL_PLAY, PM = PLACEMENT</div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Sun AM first</Label>
                  <Input
                    type="time"
                    value={sunPoolStart}
                    onChange={(e) => setSunPoolStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Sun AM last</Label>
                  <Input
                    type="time"
                    value={sunPoolLast}
                    onChange={(e) => setSunPoolLast(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-xs">Sun PM first</Label>
                  <Input
                    type="time"
                    value={sunPlaceStart}
                    onChange={(e) => setSunPlaceStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Sun PM last</Label>
                  <Input
                    type="time"
                    value={sunPlaceLast}
                    onChange={(e) => setSunPlaceLast(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Generates starts using DB interval. Sunday PM slots are restricted to PLACEMENT so pool
              games cannot steal bracket time.
            </p>
            <Button type="button" onClick={generateWeekendSlots} disabled={!rules?.ok}>
              Generate Weekend Slots
            </Button>
          </div>
        </div>
      </Card>

      {/* Controls */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Checkbox checked={debug} onCheckedChange={(val) => setDebug(!!val)} />
          <Label>Debug Mode</Label>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            disabled={
              loading ||
              payloadSlots.length === 0 ||
              stageTypes.length === 0 ||
              (wantsPlacement && !placementResolvedOk)
            }
            onClick={() => callSchedule(true)}
            variant="outline"
            type="button"
          >
            Preview Schedule
          </Button>
          <Button
            disabled={
              loading ||
              payloadSlots.length === 0 ||
              stageTypes.length === 0 ||
              (wantsPlacement && !placementResolvedOk)
            }
            onClick={() => callSchedule(false)}
            type="button"
          >
            Apply Schedule
          </Button>
        </div>

        {wantsPlacement && !placementResolvedOk && (
          <div className="text-sm text-yellow-800 bg-yellow-100 rounded p-3">
            Placement is selected but not resolved yet. Click <b>Resolve Placement</b> above.
          </div>
        )}
      </Card>

      {/* Results */}
      {(warnings.length > 0 || scheduleResult) && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Schedule Summary</h2>

          {warnings.length > 0 && (
            <div className="bg-yellow-100 p-3 rounded space-y-1">
              {warnings.map((w, i) => (
                <div key={i}>⚠ {w}</div>
              ))}
            </div>
          )}

          {scheduleResult && scheduleResult.ok === false && (
            <div className="bg-red-50 border border-red-200 p-3 rounded space-y-1">
              <div className="font-medium">❌ {scheduleResult.errorCode ?? "ERROR"}</div>
              <div className="text-sm">
                {scheduleResult.message ?? scheduleResult.error ?? "Request failed."}
              </div>
              {scheduleResult.hint && (
                <div className="text-xs text-muted-foreground">Hint: {scheduleResult.hint}</div>
              )}

              {scheduleResult.errorCode === "UNRESOLVED_PLACEMENT_GAMES" &&
                Array.isArray(scheduleResult.unresolved) &&
                scheduleResult.unresolved.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm font-medium">Unresolved placement games (examples)</div>
                    <ul className="text-xs list-disc pl-5">
                      {scheduleResult.unresolved.slice(0, 10).map((u: any, idx: number) => (
                        <li key={idx}>
                          {u.engineGameId} — {u.homeRefType} vs {u.awayRefType} ({u.stageId})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}

          {scheduleResult && scheduleResult.ok === true && (
            <>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <div>Scheduled: {scheduleResult.scheduledCount}</div>
                <div>Unscheduled: {scheduleResult.unscheduledCount}</div>
                <div>Unused Slots: {scheduleResult.unusedSlotCount}</div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Scheduled Games Preview</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Start</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Game</TableHead>
                      <TableHead>Home</TableHead>
                      <TableHead>Away</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduleResult.scheduledGamesPreview?.map((g, i) => (
                      <TableRow key={i}>
                        <TableCell>{fmtDT(g.slot.start)}</TableCell>
                        <TableCell>{g.slot.location}</TableCell>
                        <TableCell>{g.stageType}</TableCell>
                        <TableCell>{g.engineGameId}</TableCell>
                        <TableCell>{g.home.name}</TableCell>
                        <TableCell>{g.away.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {scheduleResult.unscheduledDetailed?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Unscheduled Games</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Game</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scheduleResult.unscheduledDetailed.map((u, i) => (
                        <TableRow key={i}>
                          <TableCell>{u.engineGameId}</TableCell>
                          <TableCell>{u.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {scheduleResult.unusedSlotsPreview?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Unused Slots</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Start</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Allowed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scheduleResult.unusedSlotsPreview.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell>{fmtDT(s.start)}</TableCell>
                          <TableCell>{s.location}</TableCell>
                          <TableCell>
                            {s.allowedStageTypes?.length ? s.allowedStageTypes.join(",") : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}