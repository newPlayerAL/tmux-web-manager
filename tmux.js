'use strict';

const { execFile, spawn } = require('node:child_process');
const crypto = require('node:crypto');

const FIELD_SEPARATOR = '\x1f';
const PANE_FORMAT = [
  '#{session_id}',
  '#{session_name}',
  '#{session_created}',
  '#{session_attached}',
  '#{window_id}',
  '#{window_index}',
  '#{window_name}',
  '#{window_active}',
  '#{window_activity}',
  '#{pane_id}',
  '#{pane_index}',
  '#{pane_title}',
  '#{pane_active}',
  '#{pane_current_command}',
  '#{pane_width}',
  '#{pane_height}'
].join(FIELD_SEPARATOR);

const ALLOWED_KEYS = new Set([
  'Enter', 'Escape', 'Tab', 'BSpace', 'DC', 'Space',
  'Up', 'Down', 'Left', 'Right', 'Home', 'End', 'PPage', 'NPage',
  'C-c', 'C-d', 'C-z', 'C-l', 'C-a', 'C-e', 'C-u', 'C-k', 'C-w',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
]);

function isPaneId(value) {
  return typeof value === 'string' && /^%\d+$/.test(value);
}

function isSessionId(value) {
  return typeof value === 'string' && /^\$\d+$/.test(value);
}

function isCodexActionRequired(paneTitle, paneCommand) {
  return /^codex(?:\.exe)?$/i.test(String(paneCommand || '').trim())
    && /^(?:\[[^\]\r\n]{0,12}\]\s*)?Action Required(?:\s*\||\s*$)/i.test(String(paneTitle || '').trim());
}

function normalizeSessionName(value) {
  if (typeof value !== 'string') {
    throw new TmuxError('Session name must be a string', 'INVALID_SESSION_NAME');
  }
  const name = value.trim();
  if (!name || name.length > 64) {
    throw new TmuxError('Session name must contain 1 to 64 characters', 'INVALID_SESSION_NAME');
  }
  if (/[:.]/.test(name)) {
    throw new TmuxError('Session name cannot contain a colon or period', 'INVALID_SESSION_NAME');
  }
  if (/^[\-]/.test(name) || /[\x00-\x1f\x7f]/.test(name)) {
    throw new TmuxError('Session name contains unsupported characters', 'INVALID_SESSION_NAME');
  }
  return name;
}

function parseInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePaneRows(output) {
  const sessions = [];
  const sessionMap = new Map();

  for (const line of output.split('\n')) {
    if (!line) continue;
    const fields = line.split(FIELD_SEPARATOR);
    if (fields.length !== 16) continue;

    const [
      sessionId, sessionName, sessionCreated, sessionAttached,
      windowId, windowIndex, windowName, windowActive, windowActivity,
      paneId, paneIndex, paneTitle, paneActive, paneCommand, paneWidth, paneHeight
    ] = fields;
    if (!isPaneId(paneId)) continue;

    let session = sessionMap.get(sessionId);
    if (!session) {
      session = {
        id: sessionId,
        name: sessionName,
        createdAt: parseInteger(sessionCreated),
        activityAt: 0,
        actionRequired: false,
        attached: sessionAttached === '1',
        windows: []
      };
      sessionMap.set(sessionId, session);
      sessions.push(session);
    }

    let window = session.windows.find((item) => item.id === windowId);
    if (!window) {
      window = {
        id: windowId,
        index: parseInteger(windowIndex),
        name: windowName,
        active: windowActive === '1',
        activityAt: parseInteger(windowActivity),
        panes: []
      };
      session.windows.push(window);
    }
    session.activityAt = Math.max(session.activityAt, window.activityAt);

    const actionRequired = isCodexActionRequired(paneTitle, paneCommand);
    session.actionRequired ||= actionRequired;

    window.panes.push({
      id: paneId,
      index: parseInteger(paneIndex),
      title: paneTitle,
      active: paneActive === '1',
      command: paneCommand,
      actionRequired,
      width: parseInteger(paneWidth),
      height: parseInteger(paneHeight)
    });
  }

  return sessions;
}

class TmuxError extends Error {
  constructor(message, code = 'TMUX_ERROR') {
    super(message);
    this.name = 'TmuxError';
    this.code = code;
  }
}

class TmuxClient {
  constructor(options = {}) {
    this.binary = options.binary || 'tmux';
    this.timeout = options.timeout || 4000;
    this.maxBuffer = options.maxBuffer || 8 * 1024 * 1024;
  }

  run(args) {
    return new Promise((resolve, reject) => {
      execFile(
        this.binary,
        args,
        { timeout: this.timeout, maxBuffer: this.maxBuffer, encoding: 'utf8' },
        (error, stdout, stderr) => {
          if (!error) return resolve(stdout);
          const detail = String(stderr || error.message).trim();
          reject(new TmuxError(detail || 'tmux command failed', error.code === 'ENOENT' ? 'NOT_INSTALLED' : 'COMMAND_FAILED'));
        }
      );
    });
  }

  async listSessions() {
    try {
      const output = await this.run(['list-panes', '-a', '-F', PANE_FORMAT]);
      return parsePaneRows(output);
    } catch (error) {
      if (error instanceof TmuxError && /no server running|no sessions/i.test(error.message)) return [];
      throw error;
    }
  }

  async createSession(name) {
    const sessionName = normalizeSessionName(name);
    const output = await this.run(['new-session', '-d', '-P', '-F', '#{session_id}', '-s', sessionName]);
    const sessionId = output.trim();
    if (!isSessionId(sessionId)) throw new TmuxError('tmux returned an invalid session id');
    return { id: sessionId, name: sessionName };
  }

  async renameSession(sessionId, name) {
    if (!isSessionId(sessionId)) throw new TmuxError('Invalid session id', 'INVALID_SESSION');
    const sessionName = normalizeSessionName(name);
    await this.run(['rename-session', '-t', sessionId, sessionName]);
    return { id: sessionId, name: sessionName };
  }

  async paneExists(paneId) {
    if (!isPaneId(paneId)) return false;
    const sessions = await this.listSessions();
    return sessions.some((session) => session.windows.some((window) => window.panes.some((pane) => pane.id === paneId)));
  }

  async capturePane(paneId, historyLines = 0) {
    if (!isPaneId(paneId)) throw new TmuxError('Invalid pane id', 'INVALID_PANE');
    const args = ['capture-pane', '-p', '-t', paneId];
    if (historyLines > 0) args.push('-S', `-${historyLines}`);
    return this.run(args);
  }

  pipeInput(args, input) {
    return new Promise((resolve, reject) => {
      const child = spawn(this.binary, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      let stderr = '';
      let settled = false;
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        if (!settled) {
          settled = true;
          reject(new TmuxError('tmux command timed out', 'TIMEOUT'));
        }
      }, this.timeout);

      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('error', (error) => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          reject(new TmuxError(error.message, error.code === 'ENOENT' ? 'NOT_INSTALLED' : 'COMMAND_FAILED'));
        }
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (settled) return;
        settled = true;
        if (code === 0) resolve();
        else reject(new TmuxError(stderr.trim() || `tmux exited with code ${code}`));
      });
      child.stdin.on('error', () => {});
      child.stdin.end(input, 'utf8');
    });
  }

  async sendText(paneId, text) {
    if (!isPaneId(paneId)) throw new TmuxError('Invalid pane id', 'INVALID_PANE');
    const bufferName = `awm-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
    await this.pipeInput(['load-buffer', '-b', bufferName, '-'], text);
    try {
      await this.run(['paste-buffer', '-d', '-p', '-b', bufferName, '-t', paneId]);
    } catch (error) {
      this.run(['delete-buffer', '-b', bufferName]).catch(() => {});
      throw error;
    }
  }

  async sendKeys(paneId, keys) {
    if (!isPaneId(paneId)) throw new TmuxError('Invalid pane id', 'INVALID_PANE');
    if (!Array.isArray(keys) || keys.length === 0 || keys.length > 16 || keys.some((key) => !ALLOWED_KEYS.has(key))) {
      throw new TmuxError('Unsupported key sequence', 'INVALID_KEYS');
    }
    await this.run(['send-keys', '-t', paneId, ...keys]);
  }
}

module.exports = {
  ALLOWED_KEYS,
  FIELD_SEPARATOR,
  PANE_FORMAT,
  TmuxClient,
  TmuxError,
  isCodexActionRequired,
  isPaneId,
  isSessionId,
  normalizeSessionName,
  parsePaneRows
};
