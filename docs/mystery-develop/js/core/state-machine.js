import { reducePlayerState } from './game-state.js';

const numberFromId = id => Number(String(id).match(/\d+/)?.[0]);
const requireCondition = (condition, message) => { if (!condition) throw new Error(`Unmet prerequisite: ${message}`); };

export function transition(state, event, now) {
  let next = state;
  switch (event.type) {
    case 'acknowledge-safety':
      next = reducePlayerState(next, { type:'complete-event', id:'safety-acknowledged' }, now);
      return reducePlayerState(next, { type:'navigate', sceneId:'s01' }, now);
    case 'complete-intro':
      requireCondition(state.completedEventIds.includes('safety-acknowledged'), 'safety acknowledgement is required');
      next = reducePlayerState(next, { type:'complete-event', id:'game-started' }, now);
      next = reducePlayerState(next, { type:'complete-event', id:'intro-completed' }, now);
      next = reducePlayerState(next, { type:'navigate', sceneId:'s04', chapterId:'chapter-sho' }, now);
      return next;
    case 'arrive': {
      const index = numberFromId(event.spotId);
      requireCondition(Number.isInteger(index) && index >= 1 && index <= 4, 'known spot is required');
      requireCondition(state.completedEventIds.includes('intro-completed'), 'introduction is required');
      if (index > 1) requireCondition(state.solvedPuzzleIds.includes(`q${index - 1}`), `q${index - 1} must be solved`);
      next = reducePlayerState(next, { type:'arrive', spotId:event.spotId, eventId:`spot-${index}-arrived` }, now);
      if (index === 4) next = reducePlayerState(next, { type:'collect-part', partId:'part-i' }, now);
      return reducePlayerState(next, { type:'navigate', sceneId:index === 4 ? 's08' : 's05', chapterId:index === 3 ? 'chapter-ten' : index === 4 ? 'chapter-ketsu' : 'chapter-sho' }, now);
    }
    case 'view-hint': {
      const expected = state.viewedHintIds.filter(id => id.startsWith(`${event.puzzleId}-hint-`)).length;
      requireCondition(event.hintIndex === expected || state.viewedHintIds.includes(`${event.puzzleId}-hint-${event.hintIndex + 1}`), 'hints must be opened in ordered sequence');
      return reducePlayerState(next, event, now);
    }
    case 'solve': {
      if (!event.correct) throw new Error('Incorrect answer; retry is allowed');
      const index = numberFromId(event.puzzleId);
      requireCondition(state.reachedSpotIds.includes(`spot-${index}`), `spot-${index} arrival is required`);
      next = reducePlayerState(next, { type:'solve', puzzleId:event.puzzleId, eventId:`q${index}-solved`, partId:event.partId }, now);
      return reducePlayerState(next, { type:'navigate', sceneId:'s07' }, now);
    }
    case 'advance-after-part': {
      const solved = state.solvedPuzzleIds.length;
      requireCondition(solved >= 1 && solved <= 3, 'a field puzzle must be solved');
      const chapterId = solved >= 2 ? 'chapter-ten' : 'chapter-sho';
      return reducePlayerState(next, { type:'navigate', sceneId:'s04', chapterId }, now);
    }
    case 'authenticate-final':
      requireCondition(['q1','q2','q3'].every(id => state.solvedPuzzleIds.includes(id)), 'q1-q3 must be solved');
      requireCondition(['part-r','part-a','part-m','part-i'].every(id => state.collectedPartIds.includes(id)), 'all parts are required');
      requireCondition(state.q4Order.join('') === 'MIRA', 'MIRA order is required');
      next = reducePlayerState(next, { type:'solve', puzzleId:'q4', eventId:'q4-solved' }, now);
      return reducePlayerState(next, { type:'navigate', sceneId:'s10', chapterId:'chapter-ketsu' }, now);
    case 'complete-ending':
      requireCondition(state.completedEventIds.includes('q4-solved'), 'final authentication is required');
      next = reducePlayerState(next, { type:'ending-seen' }, now);
      return reducePlayerState(next, { type:'navigate', sceneId:'completed' }, now);
    case 'replay-ending':
      requireCondition(state.endingSeen, 'ending must already be seen');
      return structuredClone(state);
    default:
      return reducePlayerState(state, event, now);
  }
}
