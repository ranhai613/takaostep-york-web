const ID = /^[a-z0-9][a-z0-9-]*$/;
const STATE_KEYS = ['schemaVersion','releaseId','currentSceneId','chapterId','completedEventIds','reachedSpotIds','solvedPuzzleIds','viewedHintIds','collectedPartIds','listenedAudioIds','audioProgress','q4Order','endingSeen','updatedAt'];

const present = value => typeof value === 'string' && value.length > 0;
const unique = values => Array.isArray(values) && new Set(values).size === values.length;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const unknownKeys = (value, allowed, name) => object(value) ? Object.keys(value).filter(key => !allowed.includes(key)).map(key => `${name}.${key} is not allowed`) : [];

export function validateReleaseConfig(release, { production = false } = {}) {
  const errors = [];
  if (!object(release)) return ['release must be an object'];
  const allowed = ['schemaVersion','releaseId','contentVersion','routeMode','initialStateProfile','contentPath','assetManifestPath','cacheName','compatibleReleaseIds','map'];
  errors.push(...unknownKeys(release, allowed, 'release'));
  if (!Number.isInteger(release.schemaVersion) || release.schemaVersion < 1) errors.push('release.schemaVersion must be a positive integer');
  for (const key of ['releaseId','contentVersion','contentPath','assetManifestPath','cacheName']) if (!present(release[key])) errors.push(`release.${key} is required`);
  if (!['primary','alternate'].includes(release.routeMode)) errors.push('release.routeMode must be primary or alternate');
  if (!['normal','test'].includes(release.initialStateProfile)) errors.push('release.initialStateProfile must be normal or test');
  if (production && release.initialStateProfile !== 'normal') errors.push('production initialStateProfile must be normal');
  if (release.compatibleReleaseIds !== undefined && (!unique(release.compatibleReleaseIds) || !release.compatibleReleaseIds.every(present))) errors.push('release.compatibleReleaseIds must contain unique IDs');
  if (!object(release.map) || !Array.isArray(release.map.center) || release.map.center.length !== 2 || !Number.isInteger(release.map.zoom) || !present(release.map.attribution) || typeof release.map.tileUrl !== 'string') errors.push('release.map is invalid');
  return errors;
}

export function validateAssetManifest(assets) {
  const errors = [];
  if (!object(assets)) return ['assets must be an object'];
  errors.push(...unknownKeys(assets, ['schemaVersion','releaseId','required','optional'], 'assets'));
  if (!Number.isInteger(assets.schemaVersion) || assets.schemaVersion < 1) errors.push('assets.schemaVersion must be a positive integer');
  if (!present(assets.releaseId)) errors.push('assets.releaseId is required');
  for (const key of ['required','optional']) if (!unique(assets[key]) || !assets[key].every(present) || (key === 'required' && assets[key].length === 0)) errors.push(`assets.${key} must be a unique path list`);
  return errors;
}

function validateIdCollection(items, label, errors) {
  if (!Array.isArray(items)) { errors.push(`${label} must be an array`); return; }
  const ids = items.map(item => item?.id);
  if (!ids.every(id => present(id) && ID.test(id))) errors.push(`${label} contains invalid IDs`);
  if (!unique(ids)) errors.push(`${label} contains duplicate IDs`);
}

export function validateContent(content) {
  const errors = [];
  if (!object(content)) return ['content must be an object'];
  errors.push(...unknownKeys(content, ['schemaVersion','releaseId','chapters','spots','audioClips','puzzles','parts'], 'content'));
  if (!Number.isInteger(content.schemaVersion) || content.schemaVersion < 1) errors.push('content.schemaVersion must be a positive integer');
  if (!present(content.releaseId)) errors.push('content.releaseId is required');
  for (const key of ['chapters','spots','audioClips','puzzles','parts']) validateIdCollection(content[key], `content.${key}`, errors);
  if (content.spots?.length !== 4) errors.push('content.spots must have exactly 4 items');
  if (content.puzzles?.length !== 4) errors.push('content.puzzles must have exactly 4 items');
  if (content.parts?.length !== 4) errors.push('content.parts must have exactly 4 items');
  if ((content.chapters?.length ?? 0) < 4) errors.push('content.chapters must have at least 4 items');
  const puzzleIds = new Set(content.puzzles?.map(item => item.id));
  const partIds = new Set(content.parts?.map(item => item.id));
  const chapterIds = new Set(content.chapters?.map(item => item.id));
  for (const spot of content.spots ?? []) {
    if (!puzzleIds.has(spot.targetPuzzleId)) errors.push(`spot ${spot.id} targetPuzzleId is missing`);
    if (spot.fallbackMode !== 'player-confirmation') errors.push(`spot ${spot.id} fallbackMode must be player-confirmation`);
    if (![spot.lat,spot.lng,spot.radiusM].every(Number.isFinite) || spot.radiusM < 5 || spot.radiusM > 500) errors.push(`spot ${spot.id} location is invalid`);
    if (![spot.title,spot.safeStopText,spot.directionText,spot.arrivalEventId].every(present)) errors.push(`spot ${spot.id} text fields are required`);
  }
  for (const puzzle of content.puzzles ?? []) {
    if (!partIds.has(puzzle.partId)) errors.push(`puzzle ${puzzle.id} partId is missing`);
    if (!['text','reorder'].includes(puzzle.type) || !present(puzzle.prompt) || !present(puzzle.explanation)) errors.push(`puzzle ${puzzle.id} is invalid`);
    if (!Array.isArray(puzzle.hints) || puzzle.hints.length !== 3 || !puzzle.hints.every(present)) errors.push(`puzzle ${puzzle.id} must have exactly 3 hints`);
    if (!unique(puzzle.acceptedAnswers) || puzzle.acceptedAnswers.length === 0) errors.push(`puzzle ${puzzle.id} acceptedAnswers are invalid`);
  }
  const letters = content.parts?.map(item => item.displayText) ?? [];
  if (!unique(letters) || [...letters].sort().join('') !== 'AIMR') errors.push('content.parts must uniquely provide R/A/M/I');
  for (const audio of content.audioClips ?? []) {
    if (!chapterIds.has(audio.chapterId)) errors.push(`audio ${audio.id} chapterId is missing`);
    if (!['main','bridge','system','effect','bgm'].includes(audio.kind) || typeof audio.src !== 'string' || typeof audio.subtitle !== 'string') errors.push(`audio ${audio.id} is invalid`);
    if (audio.kind === 'main' && !present(audio.subtitle)) errors.push(`audio ${audio.id} requires subtitles`);
  }
  return errors;
}

export function validatePlayerState(state) {
  const errors = [];
  if (!object(state)) return ['state must be an object'];
  errors.push(...unknownKeys(state, STATE_KEYS, 'state'));
  if (!Number.isInteger(state.schemaVersion) || state.schemaVersion < 1) errors.push('state.schemaVersion is invalid');
  for (const key of ['releaseId','currentSceneId','chapterId','updatedAt']) if (!present(state[key])) errors.push(`state.${key} is required`);
  for (const key of ['completedEventIds','reachedSpotIds','solvedPuzzleIds','viewedHintIds','collectedPartIds','listenedAudioIds']) if (!unique(state[key]) || !state[key].every(present)) errors.push(`state.${key} must contain unique IDs`);
  if (!object(state.audioProgress) || Object.values(state.audioProgress ?? {}).some(value => !Number.isFinite(value) || value < 0)) errors.push('state.audioProgress is invalid');
  if (!Array.isArray(state.q4Order) || state.q4Order.length !== 4 || !unique(state.q4Order) || [...state.q4Order].sort().join('') !== 'AIMR') errors.push('state.q4Order must be exactly four unique R/A/M/I values');
  if (typeof state.endingSeen !== 'boolean') errors.push('state.endingSeen must be boolean');
  if (present(state.updatedAt) && Number.isNaN(Date.parse(state.updatedAt))) errors.push('state.updatedAt must be date-time');
  return errors;
}

export function validateAll({ release, assets, content }, options = {}) {
  const errors = [...validateReleaseConfig(release, options), ...validateAssetManifest(assets), ...validateContent(content)];
  if (release?.releaseId && assets?.releaseId && release.releaseId !== assets.releaseId) errors.push('releaseId mismatch between release and assets');
  if (release?.releaseId && content?.releaseId && release.releaseId !== content.releaseId) errors.push('releaseId mismatch between release and content');
  return errors;
}

export function assertValid(errors, label = 'configuration') {
  if (errors.length) throw new Error(`Invalid ${label}: ${errors.join('; ')}`);
}
