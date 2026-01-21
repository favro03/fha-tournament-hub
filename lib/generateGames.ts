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
// Only enforce no back-to-back games (no consecutive time slots for a team), and no team plays more than once on the first day
function canPlayAtTime(team: string, scheduledGames: Game[], candidate: Times): boolean {
  // On the first day, no team can play more than once (handled in main logic)
  // For other days, no team can play in consecutive time slots
  // Find all games for this team on the same day
  const gamesSameDay = scheduledGames.filter(g => (g.homeTeam === team || g.awayTeam === team) && g.date === candidate.date);
  if (gamesSameDay.length === 0) return true;
  // Get all times for this day (including candidate)
  const allTimes = [
    ...gamesSameDay.map(g => parseTimeToMinutes(g.time || '')),
    parseTimeToMinutes(candidate.timeSlots || '')
  ].sort((a, b) => a - b);
  // If any two times are consecutive (difference is less than game duration), it's back-to-back
  // We'll use 75 minutes as the game duration, but only check for exact consecutive slots
  for (let i = 1; i < allTimes.length; i++) {
    if (allTimes[i] - allTimes[i - 1] < 75) {
      return false;
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
  // Generate all unique matchups and team names for use below
  const teamNames = teams.map(t => t.teamName);
  const allMatchups: [string, string][] = [];
  for (let i = 0; i < teamNames.length; i++) {
    for (let j = i + 1; j < teamNames.length; j++) {
      allMatchups.push([teamNames[i], teamNames[j]]);
    }
  }
  // Generate all possible matchups and shuffle for variety
  let matchups = generateMatchups(teams).sort(() => Math.random() - 0.5);

  // Track how many games each team has
  const teamGameCounts: Record<string, number> = Object.fromEntries(teams.map(t => [t.teamName, 0]));
  // Track used matchups
  const usedMatchups = new Set<string>();

  // Only use times marked as poolPlay
  const poolTimes = times.filter(t => t.gameType === 'poolPlay');


  // Restore original pool play scheduling logic (no redeclaration)

  // Track how many games each team has
  // (already declared above)
  // Track scheduled games
  // (already declared above)
  // Track used matchups
  // (already declared above)

  // Only use times marked as poolPlay
  // (already declared above)


  // Normalize date strings and group poolTimes by normalized date
  function normalizeDate(dateStr: string): string {
    // Accepts formats like 1/9/26, 1/9/2026, 01/09/2026, etc. Returns YYYY-MM-DD
    const parts = dateStr.replace(/\/+$/, '').split('/');
    if (parts.length !== 3) return dateStr;
    let [month, day, year] = parts;
    if (year.length === 2) year = '20' + year;
    if (month.length === 1) month = '0' + month;
    if (day.length === 1) day = '0' + day;
    return `${year}-${month}-${day}`;
  }
  const timesByDate: Record<string, Times[]> = {};
  for (const t of poolTimes) {
    const norm = normalizeDate(t.date ?? '');
    if (!timesByDate[norm]) timesByDate[norm] = [];
    timesByDate[norm].push(t);
  }
  const dates = Object.keys(timesByDate).sort();
  if (dates.length < 2) throw new Error('Need at least two days for pool play.');
  const friday = dates[0];
  const saturday = dates[1];
  const fridaySlots = timesByDate[friday];
  const saturdaySlots = timesByDate[saturday];
  if (fridaySlots.length !== 3 || saturdaySlots.length !== 6) throw new Error('Bracket requires 3 Friday and 6 Saturday pool play slots.');

  // Use a fixed round-robin schedule for 6 teams
  // Team order: [A, B, C, D, E, F]
  if (teamNames.length !== 6) throw new Error('This bracket logic only supports 6 teams.');
  // Standard round-robin for 6 teams (9 games, each team plays 3 times)
  // Each pair appears once
  const rrMatchups: [string, string][] = [
    [teamNames[0], teamNames[1]], // A vs B
    [teamNames[2], teamNames[3]], // C vs D
    [teamNames[4], teamNames[5]], // E vs F
    [teamNames[0], teamNames[2]], // A vs C
    [teamNames[1], teamNames[3]], // B vs D
    [teamNames[4], teamNames[0]], // E vs A
    [teamNames[1], teamNames[5]], // B vs F
    [teamNames[2], teamNames[4]], // C vs E
    [teamNames[3], teamNames[5]], // D vs F
  ];
  // Assign first 3 to Friday, next 6 to Saturday
  const scheduledGames: Game[] = [];
  for (let i = 0; i < 3; i++) {
    const [teamA, teamB] = rrMatchups[i];
    const time = fridaySlots[i];
    scheduledGames.push({
      day: time.day,
      date: time.date,
      time: time.timeSlots || '',
      location: time.location,
      homeTeam: teamA,
      awayTeam: teamB,
      homeScore: 0,
      awayScore: 0,
      label: 'Pool Play',
    });
  }
  for (let i = 0; i < 6; i++) {
    const [teamA, teamB] = rrMatchups[i + 3];
    const time = saturdaySlots[i];
    scheduledGames.push({
      day: time.day,
      date: time.date,
      time: time.timeSlots || '',
      location: time.location,
      homeTeam: teamA,
      awayTeam: teamB,
      homeScore: 0,
      awayScore: 0,
      label: 'Pool Play',
    });
  }
  return scheduledGames;

  // After scheduling, check if all teams have enough games
  const allTeamsHaveEnoughGames = Object.values(teamGameCounts).every(count => count >= gamesPerTeam);
  if (!allTeamsHaveEnoughGames) {
    // Determine the cause
    const teamsNeedingGames = Object.entries(teamGameCounts)
      .filter(([_, count]) => count < gamesPerTeam)
      .map(([team]) => team);
    let errorMsg = '';
    if (teamsNeedingGames.length > 0) {
      errorMsg += `Not enough time slots or teams for: ${teamsNeedingGames.join(', ')}. `;
    }
    if (teams.length < 2) {
      errorMsg += 'Not enough teams to generate games.';
    }
    if (!errorMsg) {
      errorMsg = 'Unable to generate valid pool play games with the current constraints.';
    }
    throw new Error(errorMsg);
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
  // Ensure we have at least 3 bracket times for the 3 games
  // For each bracket time, use its type to determine the label and seed placeholders
  bracketTimes.forEach((time) => {
    let label = time.type || 'Bracket';
    let homeTeam = '';
    let awayTeam = '';
    if (label === 'Championship') {
      homeTeam = 'Seed 1';
      awayTeam = 'Seed 2';
    } else if (label === '3rd Place') {
      homeTeam = 'Seed 3';
      awayTeam = 'Seed 4';
    } else if (label === 'Consolation') {
      homeTeam = 'Seed 5';
      awayTeam = 'Seed 6';
    }
    games.push({
      day: time.day,
      date: time.date,
      time: time.timeSlots || '',
      location: time.location,
      homeTeam,
      awayTeam,
      homeScore: 0,
      awayScore: 0,
      label,
    });
  });
  return games;
}
