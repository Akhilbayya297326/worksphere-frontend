import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeMessages } from '../src/services/messages.js';

const message = (id, timestamp, text = id) => ({ _id: id, text, timestamp });

test('late history preserves messages received while history was loading', () => {
    const history = [message('old', '2026-10-24T09:00:00Z')];
    const live = [message('live', '2026-10-24T09:01:00Z')];
    assert.deepEqual(mergeMessages(history, live).map(item => item._id), ['old', 'live']);
});

test('history after reconnect deduplicates messages already received live', () => {
    const live = message('saved', '2026-10-24T09:01:00Z');
    const result = mergeMessages([message('old', '2026-10-24T09:00:00Z'), live], [live]);
    assert.equal(result.length, 2);
    assert.equal(result[1]._id, 'saved');
});

test('server acknowledgement reconciles the client id and persisted database id', () => {
    const draft = { clientId: 'client-1', text: 'Hello', timestamp: '2026-10-24T09:00:00Z' };
    const saved = { ...draft, _id: 'database-1', timestamp: '2026-10-24T09:00:01Z' };
    const result = mergeMessages([draft], [saved], [saved]);
    assert.deepEqual(result, [saved]);
});

test('history is chronological regardless of source order', () => {
    const result = mergeMessages([
        message('latest', '2026-10-24T09:02:00Z'),
        message('first', '2026-10-24T09:00:00Z'),
        message('middle', '2026-10-24T09:01:00Z'),
    ]);
    assert.deepEqual(result.map(item => item._id), ['first', 'middle', 'latest']);
});

test('chat memory retains the newest 200 messages and ignores malformed events', () => {
    const history = Array.from({ length: 205 }, (_, index) => message(`message-${index}`, new Date(index * 1000).toISOString()));
    const result = mergeMessages([null, undefined, { _id: 'invalid' }, ...history]);
    assert.equal(result.length, 200);
    assert.equal(result[0]._id, 'message-5');
    assert.equal(result[199]._id, 'message-204');
});

test('merging does not mutate the existing message array', () => {
    const existing = Object.freeze([Object.freeze(message('one', '2026-10-24T09:00:00Z'))]);
    const result = mergeMessages(existing, [{ ...existing[0], text: 'Updated' }]);
    assert.equal(existing[0].text, 'one');
    assert.equal(result[0].text, 'Updated');
});
