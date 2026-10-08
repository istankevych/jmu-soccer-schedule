import { formatResult, outcome, seasonRecord } from './results.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatGameDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAYS[date.getUTCDay()]}, ${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

function formatRecord({ wins, losses, ties }) {
  return `${wins}-${losses}-${ties}`;
}

const PLACEHOLDER_ROUNDS = ['quarterfinals', 'semifinals', 'finals'];

function isPlaceholderOpponent(game) {
  return PLACEHOLDER_ROUNDS.includes(String(game.opponent).trim().toLowerCase());
}

function opponentLabel(game) {
  if (isPlaceholderOpponent(game)) {
    return `TBD <span class="round-label">(${escapeHtml(String(game.opponent).trim())})</span>`;
  }
  const name = escapeHtml(game.opponent);
  if (game.homeAway === 'away') return `at ${name}`;
  if (game.homeAway === 'neutral') return `vs ${name} (N)`;
  return `vs ${name}`;
}

function rowClass(game) {
  if (!game.result) return 'game--upcoming';
  const o = outcome(game.result);
  if (o === 'W') return 'game--win';
  if (o === 'L') return 'game--loss';
  return 'game--tie';
}

function timeOrResult(game) {
  if (game.result) return escapeHtml(formatResult(game.result));
  if (game.time) return escapeHtml(game.time);
  return 'TBA';
}

function formatUpdatedAt(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

function renderGameRow(game) {
  const confMark = game.competition === 'conference' ? '*' : '';
  const location = game.location ? escapeHtml(game.location) : '';
  return `    <tr class="${rowClass(game)}">
      <td data-label="Date">${escapeHtml(formatGameDate(game.date))}${confMark}</td>
      <td data-label="Opponent">${opponentLabel(game)}</td>
      <td data-label="Location">${location}</td>
      <td data-label="Time / Result">${timeOrResult(game)}</td>
    </tr>`;
}

function renderGamesTable(games) {
  if (games.length === 0) {
    return '  <p class="schedule-empty">No games on the schedule yet.</p>';
  }
  const rows = games.map(renderGameRow).join('\n');
  const hasConference = games.some((g) => g.competition === 'conference');
  const legend = hasConference
    ? '\n  <p class="schedule-legend"><span aria-hidden="true">*</span> Conference game</p>'
    : '';
  return `  <table class="schedule">
    <thead>
      <tr>
        <th scope="col">Date</th>
        <th scope="col">Opponent</th>
        <th scope="col">Location</th>
        <th scope="col">Time / Result</th>
      </tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>${legend}`;
}

/**
 * @param {{ season: number, team: string, updatedAt: string | null, games: object[] }} schedule
 * @param {{ now: Date }} _options
 */
export function renderPage(schedule, { now: _now } = {}) {
  const season = schedule.season;
  const title = `JMU Men's Soccer — ${season} Schedule`;
  const overall = seasonRecord(schedule.games);
  const conference = seasonRecord(schedule.games, { competition: 'conference' });
  const updated =
    schedule.updatedAt != null
      ? `\n  <p class="last-updated">Last updated: ${escapeHtml(formatUpdatedAt(schedule.updatedAt))}</p>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="record">Overall: ${escapeHtml(formatRecord(overall))} · Conference: ${escapeHtml(formatRecord(conference))}</p>
${renderGamesTable(schedule.games)}
${updated}
</body>
</html>
`;
}
