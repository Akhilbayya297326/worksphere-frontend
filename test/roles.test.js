import assert from 'node:assert/strict';
import test from 'node:test';
import { getNavigationRole } from '../src/services/roles.js';

test('all developer specializations can navigate shared employee modules', () => {
    for (const role of ['Developer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'DevOps Engineer']) {
        assert.equal(getNavigationRole(role), 'Developer', role);
    }
});

test('developer normalization preserves manager and QA permissions without promoting unknown roles', () => {
    assert.equal(getNavigationRole('Manager'), 'Manager');
    assert.equal(getNavigationRole('QA Tester'), 'QA Tester');
    assert.equal(getNavigationRole('Unknown'), 'Unknown');
    assert.equal(getNavigationRole(undefined), undefined);
});
