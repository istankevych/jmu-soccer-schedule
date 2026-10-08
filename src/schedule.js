export const HOME_AWAY = ['home', 'away', 'neutral'];
export const COMPETITIONS = ['exhibition', 'regular', 'conference', 'postseason'];

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isGoals(value) {
  return Number.isInteger(value) && value >= 0;
}

function validateGame(game, path, errors) {
  if (game === null || typeof game !== 'object' || Array.isArray(game)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  if (!isValidDate(game.date)) {
    errors.push(`${path}.date: must be a valid date in YYYY-MM-DD format`);
  }
  if (game.time !== null && game.time !== undefined && !isNonEmptyString(game.time)) {
    errors.push(`${path}.time: must be a non-empty string or null`);
  }
  if (!isNonEmptyString(game.opponent)) {
    errors.push(`${path}.opponent: is required and must be a non-empty string`);
  }
  if (!HOME_AWAY.includes(game.homeAway)) {
    errors.push(`${path}.homeAway: must be one of ${HOME_AWAY.join(', ')}`);
  }
  if (game.location !== null && game.location !== undefined && !isNonEmptyString(game.location)) {
    errors.push(`${path}.location: must be a non-empty string or null`);
  }
  if (!COMPETITIONS.includes(game.competition)) {
    errors.push(`${path}.competition: must be one of ${COMPETITIONS.join(', ')}`);
  }
  const r = game.result;
  if (r !== null && r !== undefined) {
    if (typeof r !== 'object' || Array.isArray(r)) {
      errors.push(`${path}.result: must be an object or null`);
      return;
    }
    if (!isGoals(r.jmuGoals)) {
      errors.push(`${path}.result.jmuGoals: must be an integer >= 0`);
    }
    if (!isGoals(r.opponentGoals)) {
      errors.push(`${path}.result.opponentGoals: must be an integer >= 0`);
    }
    if (typeof r.overtime !== 'boolean') {
      errors.push(`${path}.result.overtime: must be a boolean`);
    }
    if (r.penalties !== undefined && typeof r.penalties !== 'string') {
      errors.push(`${path}.result.penalties: must be a string when present`);
    }
  }
}

export function validateSchedule(data) {
  const errors = [];
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return ['schedule: must be an object'];
  }
  if (!Number.isInteger(data.season)) {
    errors.push('season: must be a number');
  }
  if (!isNonEmptyString(data.team)) {
    errors.push('team: must be a non-empty string');
  }
  if (data.updatedAt !== null) {
    if (typeof data.updatedAt !== 'string' || Number.isNaN(Date.parse(data.updatedAt))) {
      errors.push('updatedAt: must be an ISO date string or null');
    }
  }
  if (!Array.isArray(data.games)) {
    errors.push('games: must be an array');
  } else {
    data.games.forEach((game, i) => validateGame(game, `games[${i}]`, errors));
  }
  return errors;
}

function timeToMinutes(time) {
  if (!time) return Infinity;
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(time.trim());
  if (!m) return Infinity;
  let h = Number(m[1]) % 12;
  if (m[3] ? m[3].toUpperCase() === 'PM' : Number(m[1]) === 12) h += 12;
  if (!m[3]) h = Number(m[1]);
  return h * 60 + Number(m[2]);
}

export function loadSchedule(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  const errors = validateSchedule(data);
  if (errors.length > 0) {
    throw new Error(`Invalid schedule:\n- ${errors.join('\n- ')}`);
  }
  const games = data.games
    .map((g) => ({ ...g, time: g.time ?? null, location: g.location ?? null, result: g.result ?? null }))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      const ta = timeToMinutes(a.time);
      const tb = timeToMinutes(b.time);
      return ta === tb ? 0 : ta < tb ? -1 : 1;
    });
  return { ...data, games };
}
