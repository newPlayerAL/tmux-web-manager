'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  FIELD_SEPARATOR,
  TmuxClient,
  isCodexActionRequired,
  isPaneId,
  isSessionId,
  normalizeSessionName,
  parsePaneRows
} = require('../tmux');

test('isPaneId only accepts tmux pane ids', () => {
  assert.equal(isPaneId('%0'), true);
  assert.equal(isPaneId('%123'), true);
  assert.equal(isPaneId('0'), false);
  assert.equal(isPaneId('%1; display-message hacked'), false);
  assert.equal(isPaneId(null), false);
});

test('isSessionId only accepts tmux session ids', () => {
  assert.equal(isSessionId('$0'), true);
  assert.equal(isSessionId('$123'), true);
  assert.equal(isSessionId('work'), false);
  assert.equal(isSessionId('$1; display-message hacked'), false);
});

test('normalizeSessionName accepts useful names and rejects ambiguous targets', () => {
  assert.equal(normalizeSessionName('  work 中文  '), 'work 中文');
  assert.throws(() => normalizeSessionName(''), /1 to 64/);
  assert.throws(() => normalizeSessionName('name.with.period'), /colon or period/);
  assert.throws(() => normalizeSessionName('name:with:colon'), /colon or period/);
  assert.throws(() => normalizeSessionName('-option'), /unsupported/);
  assert.throws(() => normalizeSessionName('line\nbreak'), /unsupported/);
});

test('isCodexActionRequired only matches action prompts from Codex panes', () => {
  assert.equal(isCodexActionRequired('[ . ] Action Required | run command', 'codex'), true);
  assert.equal(isCodexActionRequired('Action Required', 'codex.exe'), true);
  assert.equal(isCodexActionRequired('Working on Action Required styles', 'node'), false);
  assert.equal(isCodexActionRequired('⠴ Working on Action Required styles | project', 'codex'), false);
  assert.equal(isCodexActionRequired('Implement the next task', 'codex'), false);
});

test('parsePaneRows creates a session/window/pane hierarchy', () => {
  const rows = [
    ['$1', 'work', '1700000000', '1', '@2', '0', 'editor', '1', '1700000040', '%3', '0', 'vim', '1', 'nvim', '120', '40'],
    ['$1', 'work', '1700000000', '1', '@2', '0', 'editor', '1', '1700000040', '%4', '1', '[ . ] Action Required | run command', '0', 'codex', '80', '40'],
    ['$1', 'work', '1700000000', '1', '@5', '1', 'server', '0', '1700000090', '%6', '0', 'node', '1', 'node', '100', '30']
  ].map((fields) => fields.join(FIELD_SEPARATOR)).join('\n');

  const sessions = parsePaneRows(rows);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].name, 'work');
  assert.equal(sessions[0].activityAt, 1700000090);
  assert.equal(sessions[0].actionRequired, true);
  assert.equal(sessions[0].attached, true);
  assert.equal(sessions[0].windows.length, 2);
  assert.equal(sessions[0].windows[0].activityAt, 1700000040);
  assert.deepEqual(sessions[0].windows[0].panes.map((pane) => pane.id), ['%3', '%4']);
  assert.equal(sessions[0].windows[0].panes[1].actionRequired, true);
  assert.equal(sessions[0].windows[1].panes[0].command, 'node');
});

test('parsePaneRows ignores malformed rows', () => {
  assert.deepEqual(parsePaneRows('garbage\n'), []);
});

test('sendText uses bracketed paste for applications that request it', async () => {
  const client = new TmuxClient();
  const calls = [];

  client.pipeInput = async (args, input) => {
    calls.push({ method: 'pipeInput', args, input });
  };
  client.run = async (args) => {
    calls.push({ method: 'run', args });
  };

  await client.sendText('%7', 'first line\nsecond line');

  assert.equal(calls.length, 2);
  assert.equal(calls[0].method, 'pipeInput');
  assert.deepEqual(calls[0].args.slice(0, 3), ['load-buffer', '-b', calls[0].args[2]]);
  assert.match(calls[0].args[2], /^awm-\d+-[0-9a-f]{12}$/);
  assert.equal(calls[0].args[3], '-');
  assert.equal(calls[0].input, 'first line\nsecond line');
  assert.deepEqual(calls[1], {
    method: 'run',
    args: ['paste-buffer', '-d', '-p', '-b', calls[0].args[2], '-t', '%7']
  });
});
