const PUZZLE_BRIEFING_IDS = new Map([
  [1, 'audio-main-1'],
  [2, 'audio-main-2'],
  [3, 'audio-main-3']
]);

export function getPuzzleBriefingClip(audioClips, puzzleOrder) {
  const id = PUZZLE_BRIEFING_IDS.get(Number(puzzleOrder));
  return id ? audioClips.find(clip => clip.id === id) ?? null : null;
}

export function getPuzzleBriefingEventId(puzzleId) {
  return `${puzzleId}-briefing-completed`;
}

export function getTravelClips(audioClips, triggerEventId) {
  const briefingIds = new Set(PUZZLE_BRIEFING_IDS.values());
  return audioClips.filter(clip => clip.triggerEventId === triggerEventId && !briefingIds.has(clip.id));
}
