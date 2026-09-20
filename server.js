'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseCliArgs, resolveHost } = require('./config');
const { TmuxClient, TmuxError, isPaneId, isSessionId } = require('./tmux');

const CLI_OPTIONS = parseCliArgs(process.argv.slice(2));
if (CLI_OPTIONS.help) {
  console.log('Usage: node server.js [--public]');
  console.log('  --public  listen on all IPv4 interfaces (0.0.0.0)');
  process.exit(0);
}

const PUBLIC_DIR = path.join(__dirname, 'public');
const HOST = resolveHost(CLI_OPTIONS);
const PORT = parsePort(process.env.AWM_PORT, 7681);
const CONFIGURED_TOKEN = process.env.AWM_TOKEN || '';
const TOKEN_WAS_GENERATED = !CONFIGURED_TOKEN;
const TOKEN = CONFIGURED_TOKEN || crypto.randomBytes(32).toString('base64url');
const tmux = new TmuxClient({ binary: process.env.AWM_TMUX_BIN || 'tmux' });

const STATIC_FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/theme.js', ['theme.js', 'text/javascript; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']]
]);

function parsePort(value, fallback) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid AWM_PORT: ${value}`);
  }
  return parsed;
}

function securityHeaders(extra = {}) {
  return {
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    ...extra
  };
}

function sendJson(res, status, value) {
  const payload = JSON.stringify(value);
  res.writeHead(status, securityHeaders({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store'
  }));
  res.end(payload);
}

function timingSafeTokenMatch(header) {
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
  const actual = Buffer.from(header.slice(7));
  const expected = Buffer.from(TOKEN);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function isSameOrigin(req) {
  if (!req.headers.origin) return true;
  try {
    return new URL(req.headers.origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function isAllowedHost(req) {
  if (HOST !== '127.0.0.1' && HOST !== '::1' && HOST !== 'localhost') return true;
  try {
    const hostname = new URL(`http://${req.headers.host || ''}`).hostname;
    return hostname === '127.0.0.1' || hostname === '[::1]' || hostname === 'localhost';
  } catch {
    return false;
  }
}

async function readJson(req, limit = 64 * 1024) {
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    const error = new Error('Content-Type must be application/json');
    error.status = 415;
    throw error;
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) {
      const error = new Error('Request body is too large');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Invalid JSON body');
    error.status = 400;
    throw error;
  }
}

async function serveStatic(pathname, res) {
  const entry = STATIC_FILES.get(pathname);
  if (!entry) return false;
  const [fileName, contentType] = entry;
  try {
    const body = await fs.readFile(path.join(PUBLIC_DIR, fileName));
    res.writeHead(200, securityHeaders({
      'Content-Type': contentType,
      'Content-Length': body.length,
      'Cache-Control': 'no-cache'
    }));
    res.end(body);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: 'Unable to load application asset' });
  }
  return true;
}

function paneRoute(pathname, suffix) {
  const match = pathname.match(new RegExp(`^/api/panes/(%25\\d+)/${suffix}$`));
  if (!match) return null;
  const paneId = decodeURIComponent(match[1]);
  return isPaneId(paneId) ? paneId : null;
}

function sessionRoute(pathname) {
  const match = pathname.match(/^\/api\/sessions\/(%24\d+)$/);
  if (!match) return null;
  const sessionId = decodeURIComponent(match[1]);
  return isSessionId(sessionId) ? sessionId : null;
}

function tmuxErrorStatus(error) {
  if (['INVALID_PANE', 'INVALID_KEYS', 'INVALID_SESSION', 'INVALID_SESSION_NAME'].includes(error.code)) return 400;
  if (/duplicate session/i.test(error.message)) return 409;
  if (/can't find session|no server running|no sessions/i.test(error.message)) return 404;
  return 503;
}

async function handleApi(req, res, url) {
  // Reject DNS-rebinding access when the service is configured for localhost.
  if (!isAllowedHost(req)) {
    sendJson(res, 403, { error: 'Host is not allowed' });
    return;
  }

  if (url.pathname === '/api/config' && req.method === 'GET') {
    sendJson(res, 200, { authRequired: true, pollInterval: 750 });
    return;
  }

  if (!timingSafeTokenMatch(req.headers.authorization)) {
    sendJson(res, 401, { error: 'A valid access token is required' });
    return;
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !isSameOrigin(req)) {
    sendJson(res, 403, { error: 'Cross-origin requests are not allowed' });
    return;
  }

  if (url.pathname === '/api/health' && req.method === 'GET') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === '/api/sessions' && req.method === 'GET') {
    const sessions = await tmux.listSessions();
    sendJson(res, 200, { sessions, fetchedAt: new Date().toISOString() });
    return;
  }

  if (url.pathname === '/api/sessions' && req.method === 'POST') {
    const body = await readJson(req, 4096);
    const session = await tmux.createSession(body && body.name);
    sendJson(res, 201, { ok: true, session });
    return;
  }

  const targetSession = sessionRoute(url.pathname);
  if (targetSession && req.method === 'PATCH') {
    const body = await readJson(req, 4096);
    const session = await tmux.renameSession(targetSession, body && body.name);
    sendJson(res, 200, { ok: true, session });
    return;
  }

  const capturePane = paneRoute(url.pathname, 'capture');
  if (capturePane && req.method === 'GET') {
    const requestedHistory = Number.parseInt(url.searchParams.get('history') || '0', 10);
    const history = Number.isFinite(requestedHistory) ? Math.max(0, Math.min(5000, requestedHistory)) : 0;
    const text = await tmux.capturePane(capturePane, history);
    sendJson(res, 200, { paneId: capturePane, text, capturedAt: new Date().toISOString() });
    return;
  }

  const inputPane = paneRoute(url.pathname, 'input');
  if (inputPane && req.method === 'POST') {
    const body = await readJson(req);
    if (!body || typeof body.text !== 'string' || body.text.length === 0) {
      sendJson(res, 400, { error: 'text must be a non-empty string' });
      return;
    }
    if (Buffer.byteLength(body.text, 'utf8') > 64 * 1024) {
      sendJson(res, 413, { error: 'Input is too large' });
      return;
    }
    await tmux.sendText(inputPane, body.text);
    if (body.enter === true) await tmux.sendKeys(inputPane, ['Enter']);
    sendJson(res, 200, { ok: true });
    return;
  }

  const keysPane = paneRoute(url.pathname, 'keys');
  if (keysPane && req.method === 'POST') {
    const body = await readJson(req, 4096);
    await tmux.sendKeys(keysPane, body && body.keys);
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
}

async function requestHandler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      if (await serveStatic(url.pathname, res)) return;
    }
    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    if (error instanceof TmuxError) {
      const status = tmuxErrorStatus(error);
      sendJson(res, status, { error: error.message, code: error.code });
      return;
    }
    console.error(error);
    sendJson(res, error.status || 500, { error: error.status ? error.message : 'Internal server error' });
  }
}

const server = http.createServer(requestHandler);
server.listen(PORT, HOST, () => {
  console.log(`tmux web manager listening on http://${HOST}:${PORT} (token protection enabled)`);
  if (CLI_OPTIONS.publicMode) {
    console.warn('public mode is enabled; use HTTPS or a trusted private network');
  }
  if (TOKEN_WAS_GENERATED) {
    console.log(`generated access token: ${TOKEN}`);
    console.log('the generated token changes on every restart; set AWM_TOKEN to use a stable token');
  }
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 3000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { isAllowedHost, isSameOrigin, parsePort, readJson, requestHandler, tmuxErrorStatus };
