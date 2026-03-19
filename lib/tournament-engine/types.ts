// lib/tournament-engine/types.ts

/** Supported formats (you’ll add more as you implement them) */
export type BracketFormat =
  | "ROUND_ROBIN"
  | "SINGLE_ELIMINATION"
  | "DOUBLE_ELIMINATION"
  | "JAMBOREE";

/** Keep level flexible; you can tighten this later */
export type TournamentLevel =
  | "MITES"
  | "SQUIRT"
  | "PEEWEE"
  | "BANTAM"
  | "U15"
  | "U18"
  | string;

/**
 * A participant in a game can be:
 * - a specific team
 * - winner/loser of another game (for elimination brackets)
 * - a ranked team from a pool (for RR placement games / playoffs)
 */
export type ParticipantRef =
  | { type: "TEAM"; teamId: string }
  | { type: "WINNER_OF"; gameId: string }
  | { type: "LOSER_OF"; gameId: string }
  | { type: "POOL_RANK"; poolId: string; rank: number };

/** Game lifecycle */
export type GameStatus = "UNSCHEDULED" | "SCHEDULED" | "FINAL";

/** Where a game lives in the tournament */
export type StageType = "POOL_PLAY" | "PLACEMENT" | "PLAYOFFS" | "JAMBOREE";


/** Core game object produced by the engine */
export type Game = {
  id: string;

  stageType: StageType;
  stageId: string; // e.g. "pool-A", "placement", "championship-bracket"
  round?: number;  // helpful for rendering, optional

  home: ParticipantRef;
  away: ParticipantRef;

  // Scheduling fields (engine can set these later; app can store them)
  startTime?: string; // ISO string to keep engine DB-agnostic
  endTime?: string;   // optional
  rink?: string;      // rink/ice sheet label, e.g. "FIA"

  status: GameStatus;

  // Results (optional; you may store results in a separate table in DB)
  result?: GameResult;
};

/** Basic team input */
export type TeamInput = {
  id: string;
  name: string;
};

/** Pool (for round robin formats) */
export type Pool = {
  id: string;   // "pool-A"
  name: string; // "Pool A"
  teamIds: string[];
};

/** Result / scoring structure (minimal for v1, expandable later) */
export type GameResult = {
  homeScore: number;
  awayScore: number;

  /** Optional: used if your rules differentiate SO wins */
  wentToShootout?: boolean;
  shootoutWinner?: "HOME" | "AWAY";

  /** Optional: penalty minutes per team (for tiebreakers) */
  homePim?: number;
  awayPim?: number;

  /** Marked final? (you can also use status === "FINAL") */
  isFinal?: boolean;
};

/** Standings points rules (matches your screenshot) */
export type PointsRules = {
  /** Example: win = 2 */
  win: number;
  /** Example: tie = 1 */
  tie: number;
  /** Example: loss = 0 */
  loss: number;

  /**
   * Optional: some tournaments add a bonus point for shutout,
   * or treat shootout wins specially. Use these if needed.
   */
  shootoutWin?: number; // e.g. 2
  shutoutBonus?: number; // e.g. +1 (so shutout win totals 3)
};

/** Tiebreaker ordering for RR standings */
export type Tiebreaker =
  | "HEAD_TO_HEAD"
  | "GOALS_ALLOWED"      // GA (lower is better)
  | "GOALS_FOR"          // GF (higher is better)
  | "GOAL_DIFF"          // Diff (higher is better)
  | "PENALTY_MINUTES"    // lower is better
  | "COIN_FLIP";

/** A standings ruleset */
export type StandingsRules = {
  points: PointsRules;
  tiebreakers: Tiebreaker[];
};

/**
 * Round Robin Placement Games:
 * This matches your real-life Squirt format:
 * - #1 vs #2 Championship
 * - #3 vs #4 3rd place
 * - #5 vs #6 5th place
 *
 * (And it generalizes nicely if you later want 7th/8th, etc.)
 */
export type PlacementGameRule =
  | { type: "CHAMPIONSHIP" } // #1 vs #2
  | { type: "THIRD_PLACE" }  // #3 vs #4
  | { type: "FIFTH_PLACE" }  // #5 vs #6
  | { type: "CUSTOM"; name: string; seedA: number; seedB: number }; // future-proof

/** Round Robin config (single pool MVP, expandable later) */
export type RoundRobinConfig = {
  type: "ROUND_ROBIN";

  /**
   * If omitted => full single round robin (everyone plays everyone once)
   * If provided => approximate to hit games-per-team target (v1)
   */
  gamesPerTeam?: number;

  /** MVP: one pool. Later you can add poolsCount/poolAssignment. */
  pools?: {
    count: 1; // keep it strict for now; expand later
  };

  /** Standings rules (default to your screenshot if not provided) */
  standingsRules?: StandingsRules;

  /** Placement games seeded from final standings */
  placementGames?: PlacementGameRule[];
};

/** Single elimination config (stub for now) */
export type SingleElimConfig = {
  type: "SINGLE_ELIMINATION";
  includeThirdPlace?: boolean;
};

/** Double elimination config (stub for later) */
export type DoubleElimConfig = {
  type: "DOUBLE_ELIMINATION";
};

/** Jamboree config (stub for later) */
export type JamboreeConfig = {
  type: "JAMBOREE";
  gamesPerTeam: number;
};

/** Union of all generator configs */
export type GeneratorConfig =
  | RoundRobinConfig
  | SingleElimConfig
  | DoubleElimConfig
  | JamboreeConfig;

/** Output plan produced by the engine */
export type Plan = {
  format: BracketFormat;

  pools?: Pool[];

  games: Game[];

  /** Used by UI rendering, versioning, debug, etc */
  meta?: Record<string, unknown>;
};
