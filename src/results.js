// Result helpers: outcome, display string and season record.

/**
 * Outcome from JMU's point of view: 'W', 'L' or 'T'.
 * Only regulation/overtime goals count. A penalty shootout does NOT change the
 * outcome: NCAA records shootout games as ties, so `penalties` is ignored here.
 */
export function outcome(result) {
  if (result.jmuGoals > result.opponentGoals) return 'W';
  if (result.jmuGoals < result.opponentGoals) return 'L';
  return 'T';
}

/**
 * Display string, e.g. 'W 2-1', 'T 1-1 (OT)', 'T 1-1 (OT, 4-3 PK)'.
 * The suffix lists 'OT' when overtime is true and the penalties string if present.
 */
export function formatResult(result) {
  const extras = [];
  if (result.overtime) extras.push('OT');
  if (result.penalties) extras.push(result.penalties);
  const suffix = extras.length ? ` (${extras.join(', ')})` : '';
  return `${outcome(result)} ${result.jmuGoals}-${result.opponentGoals}${suffix}`;
}

/**
 * Record over played games (result !== null). Exhibitions are never counted.
 * With `competition`, only games of that competition are counted (e.g. 'conference').
 */
export function seasonRecord(games, { competition } = {}) {
  const record = { wins: 0, losses: 0, ties: 0 };
  for (const game of games) {
    if (!game.result) continue;
    if (game.competition === 'exhibition') continue;
    if (competition && game.competition !== competition) continue;
    const o = outcome(game.result);
    if (o === 'W') record.wins += 1;
    else if (o === 'L') record.losses += 1;
    else record.ties += 1;
  }
  return record;
}
