const RULES = new Set(['trim', 'case-fold', 'fullwidth-to-ascii', 'remove-space', 'remove-hyphen']);

export function fullwidthToAscii(value) {
  return value.replace(/[！-～]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xfee0)).replace(/　/g, ' ');
}

export function normalizeAnswer(value, rules = []) {
  let result = String(value ?? '');
  for (const rule of rules) {
    if (!RULES.has(rule)) throw new TypeError(`Unknown normalization rule: ${rule}`);
    if (rule === 'trim') result = result.trim();
    if (rule === 'case-fold') result = result.toLocaleUpperCase('en-US');
    if (rule === 'fullwidth-to-ascii') result = fullwidthToAscii(result);
    if (rule === 'remove-space') result = result.replace(/\s+/gu, '');
    if (rule === 'remove-hyphen') result = result.replace(/[-‐‑‒–—―ー－]/gu, '');
  }
  return result;
}

export function isAcceptedAnswer(value, acceptedAnswers, rules = []) {
  const normalized = normalizeAnswer(value, rules);
  return acceptedAnswers.some(answer => normalizeAnswer(answer, rules) === normalized);
}
