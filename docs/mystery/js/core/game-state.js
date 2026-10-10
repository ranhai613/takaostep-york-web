import { assertValid, validatePlayerState } from './content-validator.js';

const stamp = now => typeof now === 'string' ? now : (now?.() ?? new Date().toISOString());
const addUnique = (list, value) => list.includes(value) ? [...list] : [...list, value];

export function createInitialState(releaseId, now = () => new Date().toISOString()) {
  const state = {
    schemaVersion: 1,
    releaseId,
    currentSceneId: 's00',
    chapterId: 'chapter-ki',
    completedEventIds: [], reachedSpotIds: [], solvedPuzzleIds: [], viewedHintIds: [], collectedPartIds: [], listenedAudioIds: [],
    audioProgress: {}, q4Order: ['R','A','M','I'], endingSeen: false, updatedAt: stamp(now)
  };
  assertValid(validatePlayerState(state), 'initial state');
  return state;
}

export function reducePlayerState(state, event, now = () => new Date().toISOString()) {
  const next = structuredClone(state);
  const add = (key, value) => { next[key] = addUnique(next[key], value); };
  switch (event.type) {
    case 'complete-event': add('completedEventIds', event.id); break;
    case 'arrive': add('reachedSpotIds', event.spotId); if (event.eventId) add('completedEventIds', event.eventId); break;
    case 'solve': add('solvedPuzzleIds', event.puzzleId); if (event.eventId) add('completedEventIds', event.eventId); if (event.partId) add('collectedPartIds', event.partId); break;
    case 'collect-part': add('collectedPartIds', event.partId); break;
    case 'view-hint': add('viewedHintIds', `${event.puzzleId}-hint-${event.hintIndex + 1}`); break;
    case 'audio-listened': add('listenedAudioIds', event.audioId); delete next.audioProgress[event.audioId]; break;
    case 'audio-progress': next.audioProgress[event.audioId] = Math.max(0, Number(event.seconds) || 0); break;
    case 'q4-swap': {
      const from = Number(event.from), to = Number(event.to);
      if (![from,to].every(index => Number.isInteger(index) && index >= 0 && index < 4)) throw new RangeError('q4 swap index is invalid');
      [next.q4Order[from], next.q4Order[to]] = [next.q4Order[to], next.q4Order[from]]; break;
    }
    case 'navigate': if (event.sceneId) next.currentSceneId = event.sceneId; if (event.chapterId) next.chapterId = event.chapterId; break;
    case 'ending-seen': next.endingSeen = true; add('completedEventIds', 'ending-completed'); break;
    default: throw new TypeError(`Unknown state event: ${event.type}`);
  }
  next.updatedAt = stamp(now);
  assertValid(validatePlayerState(next), 'player state');
  return next;
}
