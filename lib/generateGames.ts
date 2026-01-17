import { Team, Times, Game } from '@/types';

// Helper to parse time string (e.g., '10:00 AM') to minutes since midnight
function parseTimeToMinutes(time: string): number {
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  // match[1]=hour, match[2]=minute, match[3]=period
  const hour = match[1];
  const minute = match[2];
  const period = match[3];
  let h = parseInt(hour, 10);
  const m = parseInt(minute, 10);
  if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (period.toUpperCase() === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

// Helper to check if a team can play at a given time (2-hour gap)
function canPlayAtTime(team: string, scheduledGames: Game[], candidate: Times): boolean {
  const candidateMinutes = parseTimeToMinutes(candidate.timeSlots || candidate.time || '');
  for (const game of scheduledGames) {
    if (game.homeTeam === team || game.awayTeam === team) {
      if (game.date === candidate.date) {
        const gameMinutes = parseTimeToMinutes(game.time || '');
        if (Math.abs(candidateMinutes - gameMinutes) < 120) {
          return false;
        }
      }
    }
  }
  return true;
}

// Generate all possible unique matchups
function generateMatchups(teams: Team[]): [string, string][] {
  const matchups: [string, string][] = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matchups.push([teams[i].teamName, teams[j].teamName]);
    }
  }
  return matchups;
}

// Main function to generate pool play games
export function generatePoolPlayGames(
  teams: Team[],
  times: Times[],
  gamesPerTeam: number
): Game[] {
  // Generate all possible matchups
  let matchups = generateMatchups(teams);
  // Shuffle matchups for variety
  matchups = matchups.sort(() => Math.random() - 0.5);

  // Track how many games each team has
  const teamGameCounts: Record<string, number> = Object.fromEntries(teams.map(t => [t.teamName, 0]));
  // Track scheduled games
  const scheduledGames: Game[] = [];
  // Track used matchups
  const usedMatchups = new Set<string>();

  // Only use times marked as poolPlay
  const poolTimes = times.filter(t => t.gameType === 'poolPlay');

  for (const time of poolTimes) {
    // Find a matchup that fits constraints
    let found = false;
    for (let i = 0; i < matchups.length; i++) {
      const [teamA, teamB] = matchups[i];
      if (
        teamGameCounts[teamA] < gamesPerTeam &&
        teamGameCounts[teamB] < gamesPerTeam &&
        !usedMatchups.has(`${teamA}|${teamB}`) &&
        canPlayAtTime(teamA, scheduledGames, time) &&
        canPlayAtTime(teamB, scheduledGames, time)
      ) {
        scheduledGames.push({
          day: time.day,
          date: time.date,
          time: time.timeSlots || time.time || '',
          location: time.location,
          homeTeam: teamA,
          awayTeam: teamB,
          homeScore: 0,
          awayScore: 0,
          label: 'Pool Play',
        });
        teamGameCounts[teamA]++;
        teamGameCounts[teamB]++;
        usedMatchups.add(`${teamA}|${teamB}`);
        // Remove this matchup from the list
        matchups.splice(i, 1);
        found = true;
        break;
      }
    }
    if (!found) {
      // No valid matchup for this time slot
      continue;
    }
    // Stop if all teams have enough games
    if (Object.values(teamGameCounts).every(count => count >= gamesPerTeam)) {
      break;
    }
  }
  return scheduledGames;
}

// Generate bracket games with seed placeholders
export function generateBracketGames(
  times: Times[],
  numSeeds: number
): Game[] {
  // Only use times marked as bracketPlay
  const bracketTimes = times.filter(t => t.gameType === 'bracketPlay');
  const games: Game[] = [];
  let seed = 1;
  for (const time of bracketTimes) {
    // Example: seed1 vs seed2, seed3 vs seed4, etc.
    if (seed < numSeeds) {
      games.push({
        day: time.day,
        date: time.date,
        time: time.timeSlots || time.time || '',
        location: time.location,
        homeTeam: `seed${seed}`,
        awayTeam: `seed${seed + 1}`,
        homeScore: 0,
        awayScore: 0,
        label: time.type || 'Bracket',
      });
      seed += 2;
    }
  }
  return games;
}
