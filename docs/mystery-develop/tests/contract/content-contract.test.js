import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateAll, validateContent } from '../../js/core/content-validator.js';

const load = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

test('published data has matching releases and valid references', async () => {
  const [release, assets, content] = await Promise.all([load('../../data/release-config.json'), load('../../data/asset-manifest.json'), load('../../data/content.json')]);
  assert.deepEqual(validateAll({ release, assets, content }), []);
  assert.equal(content.spots.length, 4);
  assert.equal(content.puzzles.length, 4);
  assert.equal(content.parts.length, 4);
  assert.ok(content.spots.every(spot => spot.fallbackMode === 'player-confirmation'));
  const registeredAssets=new Set([...assets.required,...assets.optional]);
  assert.ok(content.audioClips.filter(clip=>clip.src).every(clip=>registeredAssets.has(clip.src)),'every assigned audio source must be registered in the asset manifest');
  assert.ok(content.parts.every(part=>/\/scrap_[RAMI]\.png$/u.test(part.image)),'parts must use the scrap artwork');
  assert.ok(content.parts.every(part=>registeredAssets.has(part.image)),'every part image must be registered in the asset manifest');
});

test('duplicate IDs and broken references are rejected', async () => {
  const content = await load('../../data/content.json');
  content.spots[1].id = content.spots[0].id;
  content.puzzles[0].partId = 'missing';
  const errors = validateContent(content);
  assert.ok(errors.some(error => error.includes('duplicate')));
  assert.ok(errors.some(error => error.includes('partId')));
});

test('Q1 uses the final orbital image and diary extraction sequence', async () => {
  const [content,assets] = await Promise.all([load('../../data/content.json'),load('../../data/asset-manifest.json')]);
  const q1=content.puzzles.find(puzzle=>puzzle.id==='q1');
  assert.equal(q1.image,'./assets/images/puzzles/q1.jpg');
  assert.ok(q1.prompt.includes('**木**の下'));
  assert.match(q1.prompt,/\*\*木\*\*[\s\S]*\*\*海\*\*[\s\S]*\*\*水\*\*[\s\S]*\*\*火\*\*[\s\S]*\*\*天\*\*[\s\S]*\*\*金\*\*[\s\S]*\*\*地\*\*[\s\S]*\*\*土\*\*/u);

  const q3=content.puzzles.find(puzzle=>puzzle.id==='q3');
  assert.equal(q3.image,'./assets/images/puzzles/q3-morse-code.jpg');
  assert.equal(q3.briefingImage,'./assets/images/puzzles/q3-morse-code.jpg');
  assert.ok(q1.explanation.includes('U・N・I・V・E・R・S・E'));
  assert.ok(q1.altText.includes('水星はI'));
  assert.ok(assets.required.includes(q1.image));
  assert.equal(assets.required.includes('./assets/images/puzzles/q1-placeholder.svg'),false);
});
