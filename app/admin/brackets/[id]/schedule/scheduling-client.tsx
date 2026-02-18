"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

type Slot = {
  start: string;
  location: string;
};

type PreviewResponse = {
  ok: boolean;
  preview: boolean;
  scheduledCount: number;
  unscheduledCount: number;
  unusedSlotCount: number;
  stageTypesApplied: string[];
  unscheduledDetailed: { engineGameId: string; reason: string }[];
  scheduledGamesPreview: any[];
  unusedSlotsPreview: Slot[];
  greedySmart?: any;
};

export default function SchedulingClient({
  bracketId,
}: {
  bracketId: number;
}) {
  const storageKey = `schedule-slots-${bracketId}`;

  const [slots, setSlots] = useState<Slot[]>([]);
  const [stageTypes, setStageTypes] = useState<string[]>([
    "POOL_PLAY",
    "PLACEMENT",
  ]);
  const [debug, setDebug] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreviewResponse | null>(null);

  // Quick generator state
  const [genStart, setGenStart] = useState("");
  const [genInterval, setGenInterval] = useState(60);
  const [genRounds, setGenRounds] = useState(5);
  const [genLocations, setGenLocations] = useState("Rink 1,Rink 2");

  // Load saved slots
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setSlots(JSON.parse(saved));
  }, [storageKey]);

  // Persist slots
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(slots));
  }, [slots, storageKey]);

  function addSlot() {
    setSlots([...slots, { start: "", location: "" }]);
  }

  function updateSlot(index: number, field: keyof Slot, value: string) {
    const copy = [...slots];
    copy[index][field] = value;
    setSlots(copy);
  }

  function removeSlot(index: number) {
    setSlots(slots.filter((_, i) => i !== index));
  }

  function generateSlots() {
    if (!genStart) return;

    const startDate = new Date(genStart);
    const locations = genLocations.split(",").map((l) => l.trim());
    const newSlots: Slot[] = [];

    for (let r = 0; r < genRounds; r++) {
      for (let loc of locations) {
        const dt = new Date(startDate.getTime() + r * genInterval * 60000);
        newSlots.push({
          start: dt.toISOString(),
          location: loc,
        });
      }
    }

    setSlots([...slots, ...newSlots]);
  }

  async function callSchedule(preview: boolean) {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (preview) query.set("preview", "1");
      if (debug) query.set("debug", "1");

      const res = await fetch(
        `/api/brackets/${bracketId}/schedule?${query.toString()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stageTypes,
            slots,
          }),
        }
      );

      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  const warnings = useMemo(() => {
    if (!result) return [];
    const w: string[] = [];

    if (result.unscheduledCount > 0)
      w.push("Some games could not be scheduled.");
    if (result.unusedSlotCount > 0)
      w.push("Some time slots were unused.");
    if (
      result.unscheduledDetailed?.some(
        (u) => u.reason === "REST_RULE_CONFLICT"
      )
    )
      w.push("Rest rule conflicts detected.");

    return w;
  }, [result]);

  return (
    <div className="space-y-8">
      {/* Slot Management */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Time Slots</h2>

        {slots.map((slot, i) => (
          <div key={i} className="flex gap-3 items-center">
            <Input
              type="datetime-local"
              value={slot.start ? slot.start.slice(0, 16) : ""}
              onChange={(e) =>
                updateSlot(i, "start", new Date(e.target.value).toISOString())
              }
            />
            <Input
              placeholder="Location"
              value={slot.location}
              onChange={(e) =>
                updateSlot(i, "location", e.target.value)
              }
            />
            <Button variant="destructive" onClick={() => removeSlot(i)}>
              Remove
            </Button>
          </div>
        ))}

        <Button variant="outline" onClick={addSlot}>
          Add Slot
        </Button>

        {/* Generator */}
        <div className="border-t pt-4 space-y-3">
          <h3 className="font-medium">Quick Generate</h3>
          <div className="flex gap-3">
            <Input
              type="datetime-local"
              value={genStart}
              onChange={(e) => setGenStart(e.target.value)}
            />
            <Input
              type="number"
              value={genInterval}
              onChange={(e) => setGenInterval(Number(e.target.value))}
              placeholder="Interval (min)"
            />
            <Input
              type="number"
              value={genRounds}
              onChange={(e) => setGenRounds(Number(e.target.value))}
              placeholder="Rounds"
            />
            <Input
              value={genLocations}
              onChange={(e) => setGenLocations(e.target.value)}
              placeholder="Rink 1,Rink 2"
            />
            <Button onClick={generateSlots}>Generate</Button>
          </div>
        </div>
      </Card>

      {/* Controls */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Checkbox
            checked={debug}
            onCheckedChange={(val) => setDebug(!!val)}
          />
          <Label>Debug Mode</Label>
        </div>

        <div className="flex gap-3">
          <Button
            disabled={loading}
            onClick={() => callSchedule(true)}
            variant="outline"
          >
            Preview Schedule
          </Button>
          <Button
            disabled={loading}
            onClick={() => callSchedule(false)}
          >
            Apply Schedule
          </Button>
        </div>
      </Card>

      {/* Results */}
      {result && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Schedule Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>Scheduled: {result.scheduledCount}</div>
            <div>Unscheduled: {result.unscheduledCount}</div>
            <div>Unused Slots: {result.unusedSlotCount}</div>
          </div>

          {warnings.length > 0 && (
            <div className="bg-yellow-100 p-3 rounded">
              {warnings.map((w, i) => (
                <div key={i}>⚠ {w}</div>
              ))}
            </div>
          )}

          {/* Scheduled Games */}
          <div>
            <h3 className="font-medium">Scheduled Games</h3>
            <ul className="space-y-1">
              {result.scheduledGamesPreview?.map((g, i) => (
                <li key={i}>
                  {new Date(g.slot.start).toLocaleString()} -{" "}
                  {g.slot.location} — {g.home.name} vs {g.away.name} (
                  {g.stageType})
                </li>
              ))}
            </ul>
          </div>

          {/* Unscheduled */}
          {result.unscheduledDetailed?.length > 0 && (
            <div>
              <h3 className="font-medium">Unscheduled Games</h3>
              <ul>
                {result.unscheduledDetailed.map((u, i) => (
                  <li key={i}>
                    {u.engineGameId} — {u.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Unused Slots */}
          {result.unusedSlotsPreview?.length > 0 && (
            <div>
              <h3 className="font-medium">Unused Slots</h3>
              <ul>
                {result.unusedSlotsPreview.map((s, i) => (
                  <li key={i}>
                    {new Date(s.start).toLocaleString()} - {s.location}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
