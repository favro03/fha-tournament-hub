export type DayWindow = {
  dateISO: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  lastStartTime: string; // "HH:mm"
  label?: string;
  allowedStageTypes?: string[]; // ✅ per-window stage restriction
};

export type Slot = {
  start: string; // local ISO-like string (no offset). UI converts to ISO with offset.
  location: string;
  allowedStageTypes?: string[];
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseTimeToMinutes(t: string) {
  const [hh, mm] = String(t || "0:0").split(":").map((x) => Number(x));
  const H = Number.isFinite(hh) ? hh : 0;
  const M = Number.isFinite(mm) ? mm : 0;
  return H * 60 + M;
}

function dateAtLocal(dateISO: string, minutesFromMidnight: number) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  dt.setMinutes(minutesFromMidnight);
  return dt;
}

/**
 * Generates slots across multiple day windows.
 * - intervalMinutes is the puck-drop interval (gameMinutes + zamboniMinutes) from DB
 * - lastStartTime is inclusive (i.e. we generate a slot at lastStartTime)
 */
export function generateSlotsMultiDay(args: {
  dayWindows: DayWindow[];
  intervalMinutes: number;
  locations: string[];
}): Slot[] {
  const interval = Math.max(1, Math.floor(Number(args.intervalMinutes) || 0));
  const locations = (args.locations ?? []).map((l) => l.trim()).filter(Boolean);
  if (!interval || locations.length === 0) return [];

  const out: Slot[] = [];

  for (const w of args.dayWindows ?? []) {
    const dateISO = String(w.dateISO || "").trim();
    if (!dateISO) continue;

    const startMin = parseTimeToMinutes(w.startTime);
    const lastMin = parseTimeToMinutes(w.lastStartTime);
    if (!Number.isFinite(startMin) || !Number.isFinite(lastMin)) continue;
    if (lastMin < startMin) continue;

    for (let t = startMin; t <= lastMin; t += interval) {
      const dt = dateAtLocal(dateISO, t);

      // IMPORTANT: We keep dt as local time. The UI later converts to ISO with local offset.
      const startLocalISO =
        `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}` +
        `T${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:00`;

      for (const loc of locations) {
        out.push({
          start: startLocalISO,
          location: loc,
       allowedStageTypes: Array.isArray(w.allowedStageTypes)
  ? [...w.allowedStageTypes]
  : undefined,
        });
      }
    }
  }
out.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return out;
}