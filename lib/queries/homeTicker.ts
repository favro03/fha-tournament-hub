import { prisma } from "@/lib/prisma";
import { parseDateRange } from "@/lib/utils";

const TICKER_TIME_ZONE = "America/Chicago";
const FALLBACK_GAME_MINUTES = 75;

type RawGame = {
  id: number;
  engineGameId: string;
  date: string;
  time: string;
  location: string;
  homeTeam: string;
  awayTeam: string;
  status: string;
};

type RawBracket = {
  id: number;
  name: string;
  youthLevel: string;
  date: string;
  side: "HOME" | "AWAY";
  games: RawGame[];
};

type TournamentSummary = {
  id: number;
  name: string;
  youthLevel: string;
  date: string;
};

type GameSummary = {
  bracketId: number;
  bracketName: string;
  youthLevel: string;
  tournamentDate: string;
  engineGameId: string;
  gameId: number;
  date: string;
  time: string;
  location: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: Date;
  endsAt: Date;
};

export type HomeTickerView =
  | {
      mode: "active";
      activeTournament: TournamentSummary;
      nowPlaying: GameSummary | null;
      upNext: GameSummary | null;
    }
  | {
      mode: "upcoming";
      nextTournament: TournamentSummary;
    }
  | {
      mode: "empty";
      message: string;
    };

function parseDateOnly(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function parseTime12Hour(timeStr: string) {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (hour === 12) hour = 0;
  if (meridiem === "PM") hour += 12;

  return { hour, minute };
}

function getOffsetMinutesForTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);

  const offsetValue =
    parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT-6";

  const match = offsetValue.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/i);
  if (!match) return -360;

  const sign = match[1] === "+" ? 1 : -1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");

  return sign * (hours * 60 + minutes);
}

function makeChicagoDate(dateStr: string, timeStr: string) {
  const datePart = parseDateOnly(dateStr);
  const timePart = parseTime12Hour(timeStr);

  if (!datePart || !timePart) return null;

  const utcGuess = new Date(
    Date.UTC(
      datePart.year,
      datePart.month - 1,
      datePart.day,
      timePart.hour,
      timePart.minute,
      0
    )
  );

  const offsetMinutes = getOffsetMinutesForTimeZone(
    utcGuess,
    TICKER_TIME_ZONE
  );

  return new Date(utcGuess.getTime() - offsetMinutes * 60_000);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function getTournamentBounds(dateRange: string) {
  const { startDate, endDate } = parseDateRange(dateRange);

  const start = startDate ? makeChicagoDate(startDate, "12:00 AM") : null;
  const end = endDate || startDate
    ? makeChicagoDate(endDate || startDate, "11:59 PM")
    : null;

  return { start, end };
}

function toTournamentSummary(bracket: RawBracket): TournamentSummary {
  return {
    id: bracket.id,
    name: bracket.name,
    youthLevel: bracket.youthLevel,
    date: bracket.date,
  };
}

function isSchedulableGame(game: RawGame) {
  return Boolean(game.date && game.time && game.status !== "UNSCHEDULED");
}

function isFinalStatus(status: string) {
  return status === "FINAL" || status === "COMPLETED" || status === "ARCHIVED";
}

function compareGames(a: GameSummary, b: GameSummary) {
  return a.startsAt.getTime() - b.startsAt.getTime();
}

function buildGameSummary(
  bracket: RawBracket,
  game: RawGame,
  gameMinutes: number
): GameSummary | null {
  const startsAt = makeChicagoDate(game.date, game.time);
  if (!startsAt) return null;

  return {
    bracketId: bracket.id,
    bracketName: bracket.name,
    youthLevel: bracket.youthLevel,
    tournamentDate: bracket.date,
    engineGameId: game.engineGameId,
    gameId: game.id,
    date: game.date,
    time: game.time,
    location: game.location,
    homeTeam: game.homeTeam || "TBD",
    awayTeam: game.awayTeam || "TBD",
    startsAt,
    endsAt: addMinutes(startsAt, gameMinutes),
  };
}

export async function getHomeTickerView(): Promise<HomeTickerView> {
  const now = new Date();

  const [rules, brackets] = (await Promise.all([
    prisma.tournamentRule.findMany({
      select: {
        youthLevel: true,
        gameMinutes: true,
      },
    }),
    prisma.bracket.findMany({
      where: {
        side: "HOME",
      },
      select: {
        id: true,
        name: true,
        youthLevel: true,
        date: true,
        side: true,
        games: {
          select: {
            id: true,
            engineGameId: true,
            date: true,
            time: true,
            location: true,
            homeTeam: true,
            awayTeam: true,
            status: true,
          },
        },
      },
      orderBy: [{ date: "asc" }, { name: "asc" }],
    }),
  ])) as [Array<{ youthLevel: string; gameMinutes: number }>, RawBracket[]];

  const durationByLevel = new Map<string, number>(
    rules.map((rule: { youthLevel: string; gameMinutes: number }) => [
      rule.youthLevel,
      rule.gameMinutes,
    ])
  );

  const activeBrackets = brackets.filter((bracket: RawBracket) => {
    const { start, end } = getTournamentBounds(bracket.date);
    if (!start || !end) return false;
    return now >= start && now <= end;
  });

  if (activeBrackets.length > 0) {
    const activeGames = activeBrackets.flatMap((bracket: RawBracket) => {
      const gameMinutes =
        durationByLevel.get(bracket.youthLevel) ?? FALLBACK_GAME_MINUTES;

      return bracket.games
        .filter(isSchedulableGame)
        .map((game: RawGame) => ({
          raw: game,
          summary: buildGameSummary(bracket, game, gameMinutes),
        }))
        .filter(
          (
            entry: { raw: RawGame; summary: GameSummary | null }
          ): entry is { raw: RawGame; summary: GameSummary } =>
            Boolean(entry.summary)
        );
    });

    const nowPlaying =
      activeGames
        .filter(
          ({ raw, summary }: { raw: RawGame; summary: GameSummary }) =>
            !isFinalStatus(raw.status) &&
            now >= summary.startsAt &&
            now < summary.endsAt
        )
        .map(
          (entry: { raw: RawGame; summary: GameSummary }) => entry.summary
        )
        .sort(compareGames)[0] ?? null;

    const upNext =
      activeGames
        .filter(
          ({ raw, summary }: { raw: RawGame; summary: GameSummary }) =>
            !isFinalStatus(raw.status) && summary.startsAt > now
        )
        .map(
          (entry: { raw: RawGame; summary: GameSummary }) => entry.summary
        )
        .sort(compareGames)[0] ?? null;

    const featuredBracket =
      activeBrackets.find(
        (bracket: RawBracket) =>
          bracket.id === (nowPlaying?.bracketId ?? upNext?.bracketId)
      ) ?? activeBrackets[0];

    return {
      mode: "active",
      activeTournament: toTournamentSummary(featuredBracket),
      nowPlaying,
      upNext,
    };
  }

  const upcomingBrackets = brackets
    .map((bracket: RawBracket) => {
      const { start } = getTournamentBounds(bracket.date);
      return { bracket, start };
    })
    .filter(
      (
        entry: { bracket: RawBracket; start: Date | null }
      ): entry is { bracket: RawBracket; start: Date } => Boolean(entry.start)
    )
    .filter(
      (entry: { bracket: RawBracket; start: Date }) => entry.start >= now
    )
    .sort(
      (
        a: { bracket: RawBracket; start: Date },
        b: { bracket: RawBracket; start: Date }
      ) => a.start.getTime() - b.start.getTime()
    );

  if (upcomingBrackets.length > 0) {
    return {
      mode: "upcoming",
      nextTournament: toTournamentSummary(upcomingBrackets[0].bracket),
    };
  }

  return {
    mode: "empty",
    message: "No active or upcoming tournaments",
  };
}