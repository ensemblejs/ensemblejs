import expect from 'expect';
import determineSaveIdFromPath from '../../src/util/determine-save-id-from-path';

const scenarios = [
  { path: '/save/something', expected: null },
  { path: '/saves/something', expected: 'something' },
  { path: '/saves/861e1727-8e95-4491-a2e9-0f601490071a', expected: '861e1727-8e95-4491-a2e9-0f601490071a' },
  { path: '/saves/861e1727.8e95.4491.a2e9.0f601490071a', expected: '861e1727.8e95.4491.a2e9.0f601490071a' },
  { path: 'saves/something', expected: 'something' },
  { path: '/banana/derp/saves/something', expected: 'something' },
  { path: '/saves/something/sub/resource', expected: 'something' },
  { path: '/saves/something?query=string', expected: 'something' },
  { path: '/saves/something/sub/resource?query=string', expected: 'something' },
  { path: '/saves/something/saves/lol', expected: 'something' },
]

describe('determine save id from path', () => {
  scenarios.forEach(({path, expected}) => {
    it(`when the path is "${path}" the expected is "${expected}"`, () => {
      expect(determineSaveIdFromPath(path)).toEqual(expected);
    });
  })
});