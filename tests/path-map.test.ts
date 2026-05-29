import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PathMap } from '../src/path-map.ts';

describe('PathMap', () => {
  it('should append and match parameter routes', () => {
    const map = new PathMap<string>();
    map.append('/users/:id', 'user-route');

    const userMatch = map.getAllMatching('/users/123');
    assert.deepEqual(userMatch, [
      { params: { id: '123' }, object: 'user-route' }
    ]);
  });

  it('should append and match wildcard routes', () => {
    const map = new PathMap<string>();
    map.append('/*splat', 'wildcard-route');

    const wildcardMatch = map.getAllMatching('/bar/baz');
    assert.deepEqual(wildcardMatch, [
      { params: { splat: ['bar', 'baz'] }, object: 'wildcard-route' }
    ]);
  });

  it('should append and match optional routes', () => {
    const map = new PathMap<string>();
    map.append('/users{/:id}/delete', 'optional-route');

    const optionalMatchWithoutId = map.getAllMatching('/users/delete');
    assert.deepEqual(optionalMatchWithoutId, [
      { params: {}, object: 'optional-route' }
    ]);

    const optionalMatchWithId = map.getAllMatching('/users/123/delete');
    assert.deepEqual(optionalMatchWithId, [
      { params: { id: '123' }, object: 'optional-route' }
    ]);
  });

  it('should support appendUse for prefix matching', () => {
    const map = new PathMap<string>();

    map.appendUse('/api', 'api-prefix');
    map.append('/api/users/:id', 'user-route');

    const prefixMatches = map.getAllMatching('/api/users/123');

    assert.deepEqual(prefixMatches, [
      { params: {}, object: 'api-prefix' },
      { params: { id: '123' }, object: 'user-route' }
    ]);
  });

  it('should maintain the order of appended objects', () => {
    const map = new PathMap<string>();
    map.append('/items/:id', 'first');
    map.append('/items/:id', 'second');
    map.appendUse('/items', 'items-prefix');

    const matches = map.getAllMatching('/items/456');

    assert.deepEqual(matches, [
      { params: { id: '456' }, object: 'first' },
      { params: { id: '456' }, object: 'second' },
      { params: {}, object: 'items-prefix' },
    ]);
  });
});
