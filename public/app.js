'use strict';

const FONT_SIZES = [14, 16, 18, 20, 22, 24];
const HISTORY_LINE_OPTIONS = ['0', '200', '1000', '5000'];
const ACTIVITY_BUSY_MS = 10000;
const storedFontSize = Number.parseInt(localStorage.getItem('fontSize') || '', 10);
const storedHistoryLines = localStorage.getItem('historyLines');
const initialLanguage = document.documentElement.lang === 'en' ? 'en' : 'zh-CN';

const TRANSLATIONS = {
  'zh-CN': {
    closeSessionList: '关闭会话列表',
    tagline: '本机会话控制台',
    connectingEllipsis: '正在连接…',
    newSession: '新建',
    refresh: '刷新',
    sessionList: 'tmux 会话',
    connecting: '连接中',
    language: '🌐 语言 / Language',
    chooseLanguage: '选择界面语言',
    openSessionList: '打开会话列表',
    selectPane: '选择一个 tmux 窗格',
    paneContentHere: '会话内容会在这里显示',
    theme: '主题',
    chooseTheme: '选择界面主题',
    lightTheme: '浅色',
    darkTheme: '深色',
    adjustFontSize: '调整字体大小',
    decreaseFont: '减小字体',
    increaseFont: '增大字体',
    history: '回滚',
    historyTitle: '显示历史行数',
    currentScreen: '当前屏',
    lines200: '200 行',
    lines1000: '1000 行',
    lines5000: '5000 行',
    copy: '复制',
    emptyTitle: '连接到一个 tmux 窗格',
    emptyDescription: '从左侧选择会话，即可查看输出并发送输入。',
    terminalOutput: '终端输出',
    quickKeys: '快捷键',
    inputPlaceholder: '向选中的窗格输入…（Enter 发送并回车，Shift+Enter 换行）',
    pasteOnly: '仅粘贴',
    send: '发送 ↵',
    tokenTitle: '需要访问令牌',
    tokenDescription: '服务已启用令牌保护。令牌只保存在当前浏览器标签页中。',
    tokenLabel: '访问令牌',
    connect: '连接',
    createSessionTitle: '新建 tmux 会话',
    createSessionDescription: '新会话会在后台启动，并立即出现在会话列表中。',
    renameSessionTitle: '重命名 tmux 会话',
    currentName: '当前名称：{name}',
    sessionNameLabel: '会话名称',
    cancel: '取消',
    create: '创建',
    save: '保存',
    attached: '已附加',
    busySession: '最近仍在输出',
    idleSession: '目前没有新输出',
    approvalRequired: '需要授权',
    approvalRequiredDetails: 'Codex 正在等待授权或拒绝',
    rename: '改名',
    renameTitle: '重命名 {name}',
    renameAria: '重命名会话 {name}',
    noSessions: '当前没有 tmux 会话。\n可以点击“新建”创建一个会话。',
    sessionCount: ({ sessions, panes }) => `${sessions} 个会话 · ${panes} 个窗格`,
    enterSessionName: '请输入会话名称',
    createdSession: '已创建会话 {name}',
    renamedSession: '会话已改名为 {name}',
    noRunningSessions: '没有正在运行的 tmux 会话',
    paneLabel: '窗格 {index}',
    unknown: '未知',
    connected: '已连接',
    connectionError: '连接异常',
    readFailed: '读取失败',
    authInvalid: '令牌不正确或已失效',
    updated: '更新于 {time}',
    copied: '终端内容已复制',
    clipboardDenied: '浏览器不允许写入剪贴板',
    cannotConnect: '无法连接',
    duplicateSession: '这个会话名称已被使用',
    invalidSessionName: '会话名称须为 1–64 个字符，不能包含冒号、句点或控制字符，也不能以 - 开头',
    invalidSession: '无效的 tmux 会话',
    invalidPane: '无效的 tmux 窗格',
    unsupportedKeys: '不支持这个按键组合',
    tmuxNotInstalled: '服务器上没有安装 tmux',
    tmuxTimeout: 'tmux 操作超时',
    requestTooLarge: '提交的内容过大',
    accessDenied: '访问被拒绝'
  },
  en: {
    closeSessionList: 'Close session list',
    tagline: 'LOCAL SESSION CONSOLE',
    connectingEllipsis: 'Connecting…',
    newSession: 'New',
    refresh: 'Refresh',
    sessionList: 'tmux sessions',
    connecting: 'Connecting',
    language: '🌐 Language / 语言',
    chooseLanguage: 'Choose interface language',
    openSessionList: 'Open session list',
    selectPane: 'Select a tmux pane',
    paneContentHere: 'Session output will appear here',
    theme: 'Theme',
    chooseTheme: 'Choose interface theme',
    lightTheme: 'Light',
    darkTheme: 'Dark',
    adjustFontSize: 'Adjust font size',
    decreaseFont: 'Decrease font size',
    increaseFont: 'Increase font size',
    history: 'History',
    historyTitle: 'Number of history lines to display',
    currentScreen: 'Current screen',
    lines200: '200 lines',
    lines1000: '1000 lines',
    lines5000: '5000 lines',
    copy: 'Copy',
    emptyTitle: 'Connect to a tmux pane',
    emptyDescription: 'Select a session on the left to view output and send input.',
    terminalOutput: 'Terminal output',
    quickKeys: 'Quick keys',
    inputPlaceholder: 'Type into the selected pane… (Enter sends, Shift+Enter adds a line)',
    pasteOnly: 'Paste only',
    send: 'Send ↵',
    tokenTitle: 'Access token required',
    tokenDescription: 'This service is token-protected. The token is stored only in this browser tab.',
    tokenLabel: 'Access token',
    connect: 'Connect',
    createSessionTitle: 'Create tmux session',
    createSessionDescription: 'The new session starts detached and appears in the session list immediately.',
    renameSessionTitle: 'Rename tmux session',
    currentName: 'Current name: {name}',
    sessionNameLabel: 'Session name',
    cancel: 'Cancel',
    create: 'Create',
    save: 'Save',
    attached: 'attached',
    busySession: 'Output is active',
    idleSession: 'No recent output',
    approvalRequired: 'Approval',
    approvalRequiredDetails: 'Codex is waiting for approval or rejection',
    rename: 'Rename',
    renameTitle: 'Rename {name}',
    renameAria: 'Rename session {name}',
    noSessions: 'There are no tmux sessions.\nSelect “New” to create one.',
    sessionCount: ({ sessions, panes }) => `${sessions} session${sessions === 1 ? '' : 's'} · ${panes} pane${panes === 1 ? '' : 's'}`,
    enterSessionName: 'Enter a session name',
    createdSession: 'Created session {name}',
    renamedSession: 'Renamed session to {name}',
    noRunningSessions: 'No tmux sessions are running',
    paneLabel: 'pane {index}',
    unknown: 'unknown',
    connected: 'Connected',
    connectionError: 'Connection error',
    readFailed: 'Read failed',
    authInvalid: 'The token is incorrect or has expired',
    updated: 'updated {time}',
    copied: 'Terminal output copied',
    clipboardDenied: 'The browser denied clipboard access',
    cannotConnect: 'Unable to connect',
    duplicateSession: 'That session name is already in use',
    invalidSessionName: 'Use 1–64 characters without colons, periods, control characters, or a leading hyphen',
    invalidSession: 'Invalid tmux session',
    invalidPane: 'Invalid tmux pane',
    unsupportedKeys: 'Unsupported key sequence',
    tmuxNotInstalled: 'tmux is not installed on the server',
    tmuxTimeout: 'The tmux operation timed out',
    requestTooLarge: 'The submitted content is too large',
    accessDenied: 'Access denied'
  }
};

const state = {
  sessions: [],
  sessionsLoaded: false,
  selectedPaneId: sessionStorage.getItem('selectedPaneId'),
  token: sessionStorage.getItem('accessToken') || '',
  theme: localStorage.getItem('theme') === 'dark' ? 'dark' : 'light',
  language: initialLanguage,
  fontSize: FONT_SIZES.includes(storedFontSize) ? storedFontSize : 16,
  historyLines: HISTORY_LINE_OPTIONS.includes(storedHistoryLines) ? storedHistoryLines : '0',
  pollInterval: 750,
  captureTimer: null,
  sessionTimer: null,
  activityTimer: null,
  serverTimeOffset: 0,
  captureInFlight: false,
  captureText: '',
  toastTimer: null,
  selected: null,
  connectionKey: 'connecting',
  capturedAt: null,
  sessionDialogMode: 'create',
  editingSessionId: null
};

const elements = Object.fromEntries([
  'sidebar', 'closeSidebar', 'openSidebar', 'sessionCount', 'newSession', 'refreshSessions', 'sessionList',
  'connectionDot', 'connectionLabel', 'languageSelect', 'panePath', 'paneMeta', 'historyLines', 'copyOutput',
  'themeSelect', 'fontDecrease', 'fontSizeLabel', 'fontIncrease',
  'terminalWrap', 'terminal', 'emptyState', 'captureStatus', 'inputDock', 'inputText',
  'pasteOnly', 'sendInput', 'toast', 'tokenDialog', 'tokenForm', 'tokenInput', 'tokenError',
  'sessionDialog', 'sessionForm', 'sessionDialogTitle', 'sessionDialogDescription',
  'sessionNameInput', 'sessionCancel', 'sessionSubmit', 'sessionError'
].map((id) => [id, document.getElementById(id)]));

function t(key, values = {}) {
  const localized = TRANSLATIONS[state.language][key] ?? TRANSLATIONS['zh-CN'][key] ?? key;
  if (typeof localized === 'function') return localized(values);
  return localized.replace(/\{(\w+)\}/g, (match, name) => (
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match
  ));
}

function updateCaptureStatus() {
  elements.captureStatus.textContent = state.capturedAt
    ? t('updated', { time: new Date(state.capturedAt).toLocaleTimeString(state.language) })
    : '';
}

function applyLanguage(language) {
  state.language = language === 'en' ? 'en' : 'zh-CN';
  document.documentElement.lang = state.language;
  elements.languageSelect.value = state.language;
  localStorage.setItem('language', state.language);

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  for (const [dataAttribute, attribute] of [
    ['i18nTitle', 'title'],
    ['i18nAriaLabel', 'aria-label'],
    ['i18nPlaceholder', 'placeholder']
  ]) {
    document.querySelectorAll(`[data-${dataAttribute.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}]`).forEach((element) => {
      element.setAttribute(attribute, t(element.dataset[dataAttribute]));
    });
  }

  if (state.sessionsLoaded) {
    renderSessions();
    updateSelectionDetails();
  }
  updateCaptureStatus();
  elements.connectionLabel.textContent = t(state.connectionKey);
  if (elements.sessionDialog.open) refreshSessionDialogText();
}

function localizeError(error) {
  if (error.status === 401) return t('authInvalid');
  if (error.status === 403) return t('accessDenied');
  if (error.status === 409) return t('duplicateSession');
  if (error.status === 413) return t('requestTooLarge');
  const keysByCode = {
    INVALID_SESSION_NAME: 'invalidSessionName',
    INVALID_SESSION: 'invalidSession',
    INVALID_PANE: 'invalidPane',
    INVALID_KEYS: 'unsupportedKeys',
    NOT_INSTALLED: 'tmuxNotInstalled',
    TIMEOUT: 'tmuxTimeout'
  };
  return keysByCode[error.code] ? t(keysByCode[error.code]) : error.message;
}

function applyTheme(theme) {
  state.theme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = state.theme;
  elements.themeSelect.value = state.theme;
  localStorage.setItem('theme', state.theme);
}

applyTheme(state.theme);

function applyFontSize(fontSize) {
  state.fontSize = FONT_SIZES.includes(fontSize) ? fontSize : 16;
  document.documentElement.style.fontSize = `${state.fontSize}px`;
  elements.fontSizeLabel.textContent = `${Math.round((state.fontSize / 16) * 100)}%`;
  elements.fontDecrease.disabled = state.fontSize === FONT_SIZES[0];
  elements.fontIncrease.disabled = state.fontSize === FONT_SIZES[FONT_SIZES.length - 1];
  localStorage.setItem('fontSize', String(state.fontSize));
}

function changeFontSize(direction) {
  const currentIndex = FONT_SIZES.indexOf(state.fontSize);
  const nextIndex = Math.max(0, Math.min(FONT_SIZES.length - 1, currentIndex + direction));
  applyFontSize(FONT_SIZES[nextIndex]);
}

applyFontSize(state.fontSize);

function applyHistoryLines(historyLines, refresh = false) {
  state.historyLines = HISTORY_LINE_OPTIONS.includes(historyLines) ? historyLines : '0';
  elements.historyLines.value = state.historyLines;
  localStorage.setItem('historyLines', state.historyLines);
  if (refresh) {
    state.captureText = '';
    capturePane();
  }
}

applyHistoryLines(state.historyLines);

function headers(json = false) {
  const value = {};
  if (json) value['Content-Type'] = 'application/json';
  if (state.token) value.Authorization = `Bearer ${state.token}`;
  return value;
}

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { ...headers(Boolean(options.body)), ...options.headers } });
  const data = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
  if (!response.ok) {
    const error = new Error(data.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.code = data.code || '';
    throw error;
  }
  return data;
}

function showToast(message, isError = false) {
  clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle('error', isError);
  elements.toast.classList.add('show');
  state.toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 2600);
}

function setConnection(kind, label) {
  state.connectionKey = label;
  elements.connectionDot.className = `status-dot ${kind}`;
  elements.connectionLabel.textContent = t(label);
}

function allPanes() {
  const result = [];
  for (const session of state.sessions) {
    for (const window of session.windows) {
      for (const pane of window.panes) result.push({ session, window, pane });
    }
  }
  return result;
}

function makeNode(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function isSessionBusy(session) {
  const activityAt = Number(session.activityAt) * 1000;
  const serverNow = Date.now() + state.serverTimeOffset;
  return activityAt > 0 && serverNow - activityAt <= ACTIVITY_BUSY_MS;
}

function updateActivityIndicators() {
  const sessionsById = new Map(state.sessions.map((session) => [session.id, session]));
  document.querySelectorAll('.session-group[data-session-id]').forEach((group) => {
    const session = sessionsById.get(group.dataset.sessionId);
    const busy = Boolean(session && !session.actionRequired && isSessionBusy(session));
    const indicator = group.querySelector('.session-activity');
    const label = t(busy ? 'busySession' : 'idleSession');
    group.classList.toggle('is-busy', busy);
    indicator.classList.toggle('busy', busy);
    indicator.classList.toggle('idle', !busy);
    indicator.title = label;
    indicator.setAttribute('aria-label', label);
  });
}

function renderSessions() {
  const fragment = document.createDocumentFragment();
  let paneCount = 0;

  for (const session of state.sessions) {
    const group = makeNode('section', 'session-group');
    group.dataset.sessionId = session.id;
    group.classList.toggle('action-required', Boolean(session.actionRequired));
    const name = makeNode('div', 'session-name');
    name.append(makeNode('span', 'session-label', session.name));
    if (session.actionRequired) {
      const approval = makeNode('span', 'approval-badge', t('approvalRequired'));
      approval.title = t('approvalRequiredDetails');
      name.append(approval);
    }
    const activity = makeNode('span', 'session-activity');
    activity.setAttribute('role', 'img');
    for (let index = 0; index < 6; index += 1) {
      activity.append(makeNode('span', 'activity-dot'));
    }
    name.append(activity);
    if (session.attached && !session.actionRequired) name.append(makeNode('span', 'attached', t('attached')));
    const renameButton = makeNode('button', 'session-rename', t('rename'));
    renameButton.type = 'button';
    renameButton.title = t('renameTitle', { name: session.name });
    renameButton.setAttribute('aria-label', t('renameAria', { name: session.name }));
    renameButton.addEventListener('click', () => openSessionDialog('rename', session));
    name.append(renameButton);
    group.append(name);

    for (const window of session.windows) {
      group.append(makeNode('div', 'window-label', `${window.index}: ${window.name}`));
      for (const pane of window.panes) {
        paneCount += 1;
        const button = makeNode('button', 'pane-button');
        button.type = 'button';
        button.dataset.paneId = pane.id;
        button.classList.toggle('selected', pane.id === state.selectedPaneId);
        button.append(
          makeNode('span', 'pane-index', `${window.index}.${pane.index}`),
          makeNode('span', 'pane-title', pane.title || pane.command || pane.id),
          makeNode('span', 'pane-command', pane.command)
        );
        button.addEventListener('click', () => selectPane(pane.id));
        group.append(button);
      }
    }
    fragment.append(group);
  }

  if (state.sessions.length === 0) {
    fragment.append(makeNode('div', 'no-sessions', t('noSessions')));
  }
  elements.sessionList.replaceChildren(fragment);
  elements.sessionCount.textContent = t('sessionCount', { sessions: state.sessions.length, panes: paneCount });
  updateActivityIndicators();
}

function refreshSessionDialogText() {
  const renaming = state.sessionDialogMode === 'rename';
  elements.sessionDialogTitle.textContent = t(renaming ? 'renameSessionTitle' : 'createSessionTitle');
  elements.sessionDialogDescription.textContent = renaming
    ? t('currentName', { name: elements.sessionNameInput.value })
    : t('createSessionDescription');
  elements.sessionSubmit.textContent = t(renaming ? 'save' : 'create');
}

function openSessionDialog(mode, session = null) {
  state.sessionDialogMode = mode;
  state.editingSessionId = session ? session.id : null;
  const renaming = mode === 'rename';
  elements.sessionNameInput.value = renaming ? session.name : '';
  refreshSessionDialogText();
  elements.sessionError.textContent = '';
  if (!elements.sessionDialog.open) elements.sessionDialog.showModal();
  requestAnimationFrame(() => {
    elements.sessionNameInput.focus({ preventScroll: true });
    if (renaming) elements.sessionNameInput.select();
  });
}

async function saveSession(event) {
  event.preventDefault();
  const name = elements.sessionNameInput.value.trim();
  if (!name) {
    elements.sessionError.textContent = t('enterSessionName');
    return;
  }

  elements.sessionSubmit.disabled = true;
  elements.sessionCancel.disabled = true;
  elements.sessionError.textContent = '';
  try {
    const creating = state.sessionDialogMode === 'create';
    const path = creating
      ? '/api/sessions'
      : `/api/sessions/${encodeURIComponent(state.editingSessionId)}`;
    const data = await api(path, { method: creating ? 'POST' : 'PATCH', body: JSON.stringify({ name }) });
    elements.sessionDialog.close();
    await loadSessions();
    if (creating) {
      const firstPane = allPanes().find(({ session }) => session.id === data.session.id);
      if (firstPane) selectPane(firstPane.pane.id);
      showToast(t('createdSession', { name: data.session.name }));
    } else {
      showToast(t('renamedSession', { name: data.session.name }));
    }
  } catch (error) {
    elements.sessionError.textContent = localizeError(error);
  } finally {
    elements.sessionSubmit.disabled = false;
    elements.sessionCancel.disabled = false;
  }
}

function updateSelectionDetails() {
  const entry = allPanes().find(({ pane }) => pane.id === state.selectedPaneId) || null;
  state.selected = entry;
  const enabled = Boolean(entry);
  elements.inputText.disabled = !enabled;
  elements.pasteOnly.disabled = !enabled;
  elements.sendInput.disabled = !enabled;
  elements.copyOutput.disabled = !enabled;
  document.querySelectorAll('.quick-keys button').forEach((button) => { button.disabled = !enabled; });

  if (!entry) {
    state.capturedAt = null;
    elements.panePath.textContent = t('selectPane');
    elements.paneMeta.textContent = state.sessions.length ? t('paneContentHere') : t('noRunningSessions');
    elements.emptyState.classList.remove('hidden');
    elements.terminal.classList.remove('visible');
    elements.captureStatus.textContent = '';
    return;
  }
  const { session, window, pane } = entry;
  elements.panePath.textContent = `${session.name} / ${window.index}:${window.name} / ${t('paneLabel', { index: pane.index })}`;
  elements.paneMeta.textContent = `${pane.id} · ${pane.width}×${pane.height} · ${pane.command || t('unknown')}`;
  elements.emptyState.classList.add('hidden');
  elements.terminal.classList.add('visible');
}

function selectPane(paneId) {
  if (paneId === state.selectedPaneId && state.selected) {
    elements.sidebar.classList.remove('open');
    return;
  }
  state.selectedPaneId = paneId;
  sessionStorage.setItem('selectedPaneId', paneId);
  renderSessions();
  updateSelectionDetails();
  state.captureText = '';
  state.capturedAt = null;
  elements.terminal.textContent = '';
  updateCaptureStatus();
  elements.sidebar.classList.remove('open');
  capturePane();
  elements.inputText.focus();
}

async function loadSessions(showErrors = true) {
  try {
    const data = await api('/api/sessions');
    const fetchedAt = Date.parse(data.fetchedAt);
    if (Number.isFinite(fetchedAt)) state.serverTimeOffset = fetchedAt - Date.now();
    state.sessions = data.sessions;
    state.sessionsLoaded = true;
    const panes = allPanes();
    if (state.selectedPaneId && !panes.some(({ pane }) => pane.id === state.selectedPaneId)) {
      state.selectedPaneId = null;
      sessionStorage.removeItem('selectedPaneId');
    }
    if (!state.selectedPaneId && panes.length) state.selectedPaneId = panes.find(({ pane }) => pane.active)?.pane.id || panes[0].pane.id;
    renderSessions();
    updateSelectionDetails();
    setConnection('online', 'connected');
  } catch (error) {
    setConnection('error', 'connectionError');
    if (error.status === 401) return requestToken('authInvalid');
    if (showErrors) showToast(localizeError(error), true);
  }
}

async function capturePane() {
  if (!state.selectedPaneId || state.captureInFlight || document.hidden) return;
  state.captureInFlight = true;
  const selectedWhenStarted = state.selectedPaneId;
  try {
    const history = state.historyLines;
    const data = await api(`/api/panes/${encodeURIComponent(selectedWhenStarted)}/capture?history=${history}`);
    if (selectedWhenStarted !== state.selectedPaneId) return;
    const nearBottom = elements.terminalWrap.scrollHeight - elements.terminalWrap.scrollTop - elements.terminalWrap.clientHeight < 80;
    if (data.text !== state.captureText) {
      state.captureText = data.text;
      elements.terminal.textContent = data.text || ' ';
      if (nearBottom || history === '0') elements.terminalWrap.scrollTop = elements.terminalWrap.scrollHeight;
    }
    state.capturedAt = data.capturedAt;
    updateCaptureStatus();
    setConnection('online', 'connected');
  } catch (error) {
    setConnection('error', 'readFailed');
    if (error.status === 401) requestToken('authInvalid');
    else elements.captureStatus.textContent = localizeError(error);
  } finally {
    state.captureInFlight = false;
  }
}

async function sendText(enter) {
  const text = elements.inputText.value;
  if (!state.selectedPaneId || !text) return;
  elements.sendInput.disabled = true;
  elements.pasteOnly.disabled = true;
  try {
    await api(`/api/panes/${encodeURIComponent(state.selectedPaneId)}/input`, {
      method: 'POST', body: JSON.stringify({ text, enter })
    });
    elements.inputText.value = '';
    await capturePane();
    elements.inputText.focus();
  } catch (error) {
    showToast(localizeError(error), true);
  } finally {
    if (state.selected) {
      elements.sendInput.disabled = false;
      elements.pasteOnly.disabled = false;
    }
  }
}

async function sendKeys(keys) {
  if (!state.selectedPaneId) return;
  try {
    await api(`/api/panes/${encodeURIComponent(state.selectedPaneId)}/keys`, {
      method: 'POST', body: JSON.stringify({ keys })
    });
    setTimeout(capturePane, 70);
  } catch (error) {
    showToast(localizeError(error), true);
  }
}

function requestToken(errorKey = '') {
  clearInterval(state.captureTimer);
  clearInterval(state.sessionTimer);
  clearInterval(state.activityTimer);
  elements.tokenError.textContent = errorKey ? t(errorKey) : '';
  if (!elements.tokenDialog.open) elements.tokenDialog.showModal();
  setTimeout(() => elements.tokenInput.focus(), 0);
}

function startTimers() {
  clearInterval(state.captureTimer);
  clearInterval(state.sessionTimer);
  clearInterval(state.activityTimer);
  state.captureTimer = setInterval(capturePane, state.pollInterval);
  state.sessionTimer = setInterval(() => loadSessions(false), 5000);
  state.activityTimer = setInterval(updateActivityIndicators, 1000);
}

elements.newSession.addEventListener('click', () => openSessionDialog('create'));
elements.refreshSessions.addEventListener('click', () => loadSessions());
elements.languageSelect.addEventListener('change', () => applyLanguage(elements.languageSelect.value));
elements.themeSelect.addEventListener('change', () => applyTheme(elements.themeSelect.value));
elements.fontDecrease.addEventListener('click', () => changeFontSize(-1));
elements.fontIncrease.addEventListener('click', () => changeFontSize(1));
elements.historyLines.addEventListener('change', () => applyHistoryLines(elements.historyLines.value, true));
elements.openSidebar.addEventListener('click', () => elements.sidebar.classList.add('open'));
elements.closeSidebar.addEventListener('click', () => elements.sidebar.classList.remove('open'));
elements.sendInput.addEventListener('click', () => sendText(true));
elements.pasteOnly.addEventListener('click', () => sendText(false));
elements.inputText.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    sendText(true);
  }
});
document.querySelectorAll('.quick-keys button').forEach((button) => {
  button.addEventListener('click', () => sendKeys([button.dataset.key]));
});
elements.copyOutput.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(state.captureText);
    showToast(t('copied'));
  } catch {
    showToast(t('clipboardDenied'), true);
  }
});
elements.tokenForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  state.token = elements.tokenInput.value;
  sessionStorage.setItem('accessToken', state.token);
  try {
    await api('/api/health');
    elements.tokenDialog.close();
    elements.tokenError.textContent = '';
    elements.tokenInput.value = '';
    await loadSessions();
    startTimers();
  } catch (error) {
    elements.tokenError.textContent = localizeError(error);
    elements.tokenInput.select();
  }
});
elements.sessionForm.addEventListener('submit', saveSession);
elements.sessionCancel.addEventListener('click', () => elements.sessionDialog.close());
document.addEventListener('visibilitychange', () => { if (!document.hidden) { loadSessions(false); capturePane(); } });

applyLanguage(state.language);

async function init() {
  try {
    const config = await api('/api/config');
    state.pollInterval = config.pollInterval || 750;
    if (config.authRequired && !state.token) {
      requestToken();
      return;
    }
    await loadSessions();
    startTimers();
  } catch (error) {
    setConnection('error', 'cannotConnect');
    showToast(localizeError(error), true);
  }
}

init();
