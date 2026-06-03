(() => {
  const DEFAULTS = {
    host: '127.0.0.1',
    port: '8080',
    endpoint: '/',
    secure: 'false',
    password: '',

    preview: 'false',
    debug: 'false',
    reconnect: 'true',
    reconnectMs: '3000',

    label: 'BREAKING NEWS',
    subtitle: 'STREAM UPDATE',
    headline: 'This is a sample breaking news message.',

    barHeight: '92',
    barBottom: '36',
    barSideMargin: '50',
    labelWidth: '390',
    barRadius: '0',

    labelBg: '#b00020',
    labelText: '#ffffff',
    subtitleBg: '#101010',
    subtitleText: '#ffffff',
    tickerBg: '#f5f5f5',
    tickerText: '#111111',

    fontFamily: 'Arial, Helvetica, sans-serif',
    labelSize: '34',
    subtitleSize: '24',
    headlineSize: '30',

    scrollSpeed: '180',
    defaultDurationSeconds: '12'
  };

  const els = {
    newsBar: document.getElementById('newsBar'),
    labelText: document.getElementById('labelText'),
    subtitleRow: document.getElementById('subtitleRow'),
    tickerWindow: document.getElementById('tickerWindow'),
    tickerTrack: document.getElementById('tickerTrack'),
    connectionStatus: document.getElementById('connectionStatus'),
    connectionStatusText: document.getElementById('connectionStatusText'),
    debugPanel: document.getElementById('debugPanel'),
    debugStatus: document.getElementById('debugStatus'),
    debugSocket: document.getElementById('debugSocket'),
    debugQueue: document.getElementById('debugQueue')
  };

  const state = {
    settings: readSettings(),
    socket: null,
    reconnectTimer: null,
    queue: [],
    current: null,
    hideTimer: null,
    isShowing: false,
    authenticated: false,
    connectedStatusTimer: null,

    tickerFrame: null,
    tickerLastTime: 0,
    tickerX: 0,
    tickerLoopWidth: 0,
    tickerStartX: 0,
    tickerSpeed: 180,
    tickerGap: 96
  };

  init();

  function init() {
    applySettings(state.settings);
    setDebugVisible(toBool(state.settings.debug));

    if (toBool(state.settings.preview)) {
      hideConnectionStatus();
      setDebug('Preview mode', 'WebSocket disabled');
      showNow({
        headline: state.settings.headline,
        subtitle: state.settings.subtitle,
        durationSeconds: 0
      });
      return;
    }

    connect();
  }

  function readSettings() {
    const params = new URLSearchParams(window.location.search);
    const output = { ...DEFAULTS };

    for (const key of Object.keys(DEFAULTS)) {
      if (params.has(key)) output[key] = params.get(key);
    }

    return output;
  }

  function applySettings(settings = {}) {
    state.settings = { ...state.settings, ...settings };

    const cssVarMap = {
      barHeight: ['--bar-height', 'px'],
      barBottom: ['--bar-bottom', 'px'],
      barSideMargin: ['--bar-side-margin', 'px'],
      labelWidth: ['--label-width', 'px'],
      barRadius: ['--bar-radius', 'px'],
      labelBg: ['--label-bg', ''],
      labelText: ['--label-text', ''],
      subtitleBg: ['--subtitle-bg', ''],
      subtitleText: ['--subtitle-text', ''],
      tickerBg: ['--ticker-bg', ''],
      tickerText: ['--ticker-text', ''],
      fontFamily: ['--font-family', ''],
      labelSize: ['--label-size', 'px'],
      subtitleSize: ['--subtitle-size', 'px'],
      headlineSize: ['--headline-size', 'px']
    };

    for (const [key, [cssVar, unit]] of Object.entries(cssVarMap)) {
      if (settings[key] !== undefined && settings[key] !== null && settings[key] !== '') {
        document.documentElement.style.setProperty(cssVar, `${settings[key]}${unit}`);
      }
    }

    if (settings.label) els.labelText.textContent = settings.label;
    if (settings.subtitle) els.subtitleRow.textContent = settings.subtitle;

    state.tickerSpeed = Math.max(60, safeInt(state.settings.scrollSpeed, 180));
  }

  function connect() {
    clearTimeout(state.reconnectTimer);

    const scheme = toBool(state.settings.secure) ? 'wss' : 'ws';
    const endpoint = normalizeEndpoint(state.settings.endpoint || '/');
    const url = `${scheme}://${state.settings.host}:${state.settings.port}${endpoint}`;

    setDebug('Connecting', url);
    showConnectionStatus('connecting', 'Connecting...');

    try {
      state.socket = new WebSocket(url);
    } catch (error) {
      setDebug('Connection error', error.message);
      showConnectionStatus('connecting', 'Connecting...');
      scheduleReconnect();
      return;
    }

    state.socket.addEventListener('open', () => {
      state.authenticated = false;
      setDebug('Connected - subscribing', url);
      showConnectionStatus('connected', 'Connected!', 2000);
      subscribeToStreamerBotEvents();
    });

    state.socket.addEventListener('message', async (event) => {
      await handleSocketMessage(event.data);
    });

    state.socket.addEventListener('close', () => {
      setDebug('Disconnected', 'Socket closed');
      showConnectionStatus('connecting', 'Connecting...');
      scheduleReconnect();
    });

    state.socket.addEventListener('error', () => {
      setDebug('Socket error', 'Check Streamer.bot WebSocket settings');
      showConnectionStatus('connecting', 'Connecting...');
    });
  }

  function scheduleReconnect() {
    if (!toBool(state.settings.reconnect)) return;
    const delay = safeInt(state.settings.reconnectMs, 3000);
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = setTimeout(connect, delay);
  }

  async function handleSocketMessage(raw) {
    const payload = parseJson(raw);
    if (!payload) return;

    if (payload.request === 'Hello') {
      await maybeAuthenticate(payload);
      if (!payload.authentication) subscribeToStreamerBotEvents();
      return;
    }

    if (payload.status && payload.id) {
      if (payload.id === 'breaking-news-auth') {
        state.authenticated = payload.status === 'ok';
        setDebug(state.authenticated ? 'Authenticated - subscribing' : 'Authentication failed', payload.status);
        if (state.authenticated) {
          showConnectionStatus('connected', 'Connected!', 2000);
          subscribeToStreamerBotEvents();
        } else {
          showConnectionStatus('connecting', 'Authentication Required');
        }
      }

      if (payload.id === 'breaking-news-subscribe') {
        setDebug(payload.status === 'ok' ? 'Subscribed' : 'Subscribe failed', JSON.stringify(payload.events || payload.status));
      }

      return;
    }

    const command = extractBreakingNewsPayload(payload);
    if (!command) {
      if (toBool(state.settings.debug)) {
        setDebug('Message ignored', truncate(raw, 120));
      }
      return;
    }

    hideConnectionStatus();
    setDebug('Command received', command.action || command.command || 'queue');
    handleCommand(command);
  }

  async function maybeAuthenticate(helloPayload) {
    if (!helloPayload.authentication) return;

    if (!state.settings.password) {
      setDebug('Authentication required', 'No password URL parameter provided');
      return;
    }

    const { salt, challenge } = helloPayload.authentication;
    const secret = await sha256Base64(`${state.settings.password}${salt}`);
    const authentication = await sha256Base64(`${secret}${challenge}`);

    sendSocket({
      request: 'Authenticate',
      id: 'breaking-news-auth',
      authentication
    });
  }

  function subscribeToStreamerBotEvents() {
    sendSocket({
      request: 'Subscribe',
      id: 'breaking-news-subscribe',
      events: {
        General: ['Custom'],
        Custom: ['Event', 'CodeEvent']
      }
    });
  }

  function sendSocket(payload) {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN) return;
    state.socket.send(JSON.stringify(payload));
  }

  function handleCommand(command) {
    const action = String(command.action || command.command || 'queue').toLowerCase();
    const overrides = command.overrides || command.settings || {};

    if (Object.keys(overrides).length > 0) applySettings(overrides);

    switch (action) {
      case 'show':
      case 'queue':
        enqueue(command);
        break;
      case 'force':
      case 'replace':
        clearQueueOnly();
        showNow(command);
        break;
      case 'update':
        updateCurrent(command);
        break;
      case 'hide':
        hideCurrent(true);
        break;
      case 'clear':
      case 'clearqueue':
        clearQueueOnly();
        break;
      case 'clearandhide':
      case 'reset':
        clearQueueOnly();
        hideCurrent(false);
        break;
      case 'theme':
      case 'settings':
      case 'sync':
        applySettings(overrides);
        break;
      case 'test':
        enqueue({
          headline: command.headline || 'This is a test breaking news headline.',
          subtitle: command.subtitle || state.settings.subtitle,
          durationSeconds: command.durationSeconds ?? state.settings.defaultDurationSeconds,
          overrides
        });
        break;
      default:
        console.warn('[Breaking News Overlay] Unknown action:', action, command);
    }

    updateDebugQueue();
  }

  function enqueue(item) {
    state.queue.push(normalizeItem(item));
    if (!state.isShowing) playNext();
    updateDebugQueue();
  }

  function playNext() {
    if (state.queue.length === 0) {
      state.current = null;
      state.isShowing = false;
      stopTickerAnimation();
      return;
    }

    const next = state.queue.shift();
    showNow(next);
    updateDebugQueue();
  }

  function showNow(item) {
    const normalized = normalizeItem(item);
    state.current = normalized;
    state.isShowing = true;

    if (normalized.overrides && Object.keys(normalized.overrides).length > 0) {
      applySettings(normalized.overrides);
    }

    els.labelText.textContent = normalized.label || state.settings.label;
    els.subtitleRow.textContent = normalized.subtitle || state.settings.subtitle;

    els.newsBar.classList.remove('is-hidden');
    setTickerHeadline(normalized.headline || state.settings.headline);
    restartTickerAnimation();

    clearTimeout(state.hideTimer);
    const duration = safeInt(normalized.durationSeconds, safeInt(state.settings.defaultDurationSeconds, 12));

    if (duration > 0) {
      state.hideTimer = setTimeout(() => hideCurrent(true), duration * 1000);
    }
  }

  function updateCurrent(item) {
    const normalized = normalizeItem({ ...state.current, ...item });

    if (!state.isShowing) {
      showNow(normalized);
      return;
    }

    state.current = normalized;

    if (normalized.overrides && Object.keys(normalized.overrides).length > 0) {
      applySettings(normalized.overrides);
    }

    if (normalized.label) els.labelText.textContent = normalized.label;
    if (normalized.subtitle) els.subtitleRow.textContent = normalized.subtitle;
    if (normalized.headline) {
      setTickerHeadline(normalized.headline);
      restartTickerAnimation();
    }

    if (item.durationSeconds !== undefined) {
      clearTimeout(state.hideTimer);
      const duration = safeInt(item.durationSeconds, 0);
      if (duration > 0) state.hideTimer = setTimeout(() => hideCurrent(true), duration * 1000);
    }
  }

  function hideCurrent(continueQueue) {
    clearTimeout(state.hideTimer);
    els.newsBar.classList.add('is-hidden');
    state.isShowing = false;
    state.current = null;
    stopTickerAnimation();

    if (continueQueue) {
      setTimeout(playNext, 320);
    }
  }

  function clearQueueOnly() {
    state.queue = [];
    updateDebugQueue();
  }

  function normalizeItem(item = {}) {
    return {
      label: item.label || state.settings.label,
      headline: item.headline || item.message || state.settings.headline,
      subtitle: item.subtitle || item.subtext || state.settings.subtitle,
      durationSeconds: item.durationSeconds ?? item.duration ?? state.settings.defaultDurationSeconds,
      overrides: item.overrides || item.settings || {}
    };
  }

  function setTickerHeadline(text) {
    const headline = String(text || '').trim() || state.settings.headline;
    const gap = state.tickerGap;

    els.tickerTrack.innerHTML = '';

    for (let i = 0; i < 3; i += 1) {
      const span = document.createElement('span');
      span.className = 'ticker-item';
      span.textContent = headline;
      els.tickerTrack.appendChild(span);
    }

    // Force layout so widths can be measured reliably in OBS/browser source.
    void els.tickerTrack.offsetWidth;

    const firstItem = els.tickerTrack.querySelector('.ticker-item');
    const itemWidth = firstItem ? firstItem.getBoundingClientRect().width : 0;
    state.tickerLoopWidth = itemWidth + gap;
    state.tickerStartX = els.tickerWindow.getBoundingClientRect().width;
    state.tickerX = state.tickerStartX;

    applyTickerTransform();
  }

  function restartTickerAnimation() {
    stopTickerAnimation();

    // Wait one frame so measurements are correct after content/style updates.
    requestAnimationFrame(() => {
      const firstItem = els.tickerTrack.querySelector('.ticker-item');
      if (!firstItem) return;

      const gapValue = getComputedStyle(els.tickerTrack).columnGap || getComputedStyle(els.tickerTrack).gap || '96px';
      state.tickerGap = safeInt(gapValue, 96);
      state.tickerLoopWidth = firstItem.getBoundingClientRect().width + state.tickerGap;
      state.tickerStartX = els.tickerWindow.getBoundingClientRect().width;
      state.tickerX = state.tickerStartX;
      state.tickerLastTime = 0;

      const tick = (timestamp) => {
        if (!state.isShowing) return;

        if (!state.tickerLastTime) state.tickerLastTime = timestamp;
        const deltaSeconds = (timestamp - state.tickerLastTime) / 1000;
        state.tickerLastTime = timestamp;

        state.tickerX -= state.tickerSpeed * deltaSeconds;

        if (state.tickerLoopWidth > 0 && state.tickerX <= -state.tickerLoopWidth) {
          state.tickerX += state.tickerLoopWidth;
        }

        applyTickerTransform();
        state.tickerFrame = requestAnimationFrame(tick);
      };

      applyTickerTransform();
      state.tickerFrame = requestAnimationFrame(tick);
    });
  }

  function stopTickerAnimation() {
    if (state.tickerFrame) {
      cancelAnimationFrame(state.tickerFrame);
      state.tickerFrame = null;
    }
    state.tickerLastTime = 0;
  }

  function applyTickerTransform() {
    els.tickerTrack.style.transform = `translate3d(${Math.round(state.tickerX)}px, -50%, 0)`;
  }

  function extractBreakingNewsPayload(value, depth = 0) {
    if (depth > 8 || value === null || value === undefined) return null;

    const parsed = parseJson(value);
    if (parsed !== value) return extractBreakingNewsPayload(parsed, depth + 1);

    if (!parsed || typeof parsed !== 'object') return null;
    if (isBreakingNewsPayload(parsed)) return parsed;

    const possibleContainers = [
      parsed.data,
      parsed.args,
      parsed.arguments,
      parsed.payload,
      parsed.message,
      parsed.eventData
    ];

    for (const container of possibleContainers) {
      const found = extractBreakingNewsPayload(container, depth + 1);
      if (found) return found;
    }

    return null;
  }

  function isBreakingNewsPayload(payload) {
    if (!payload || typeof payload !== 'object') return false;
    return payload.overlay === 'breaking-news' || payload.type === 'BREAKING_NEWS';
  }

  function parseJson(value) {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  async function sha256Base64(input) {
    const bytes = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashBinary = hashArray.map((byte) => String.fromCharCode(byte)).join('');
    return btoa(hashBinary);
  }

  function normalizeEndpoint(endpoint) {
    if (!endpoint) return '/';
    return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  }

  function toBool(value) {
    return String(value).toLowerCase() === 'true' || String(value) === '1';
  }

  function safeInt(value, fallback) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function truncate(value, maxLength) {
    const text = String(value || '');
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  }


  function showConnectionStatus(mode, text, hideAfterMs = 0) {
    if (!els.connectionStatus || !els.connectionStatusText) return;

    clearTimeout(state.connectedStatusTimer);
    els.connectionStatus.classList.remove('is-hidden', 'is-connecting', 'is-connected');
    els.connectionStatus.classList.add(mode === 'connected' ? 'is-connected' : 'is-connecting');
    els.connectionStatusText.textContent = text;

    if (hideAfterMs > 0) {
      state.connectedStatusTimer = setTimeout(hideConnectionStatus, hideAfterMs);
    }
  }

  function hideConnectionStatus() {
    clearTimeout(state.connectedStatusTimer);
    if (!els.connectionStatus) return;
    els.connectionStatus.classList.add('is-hidden');
  }

  function setDebugVisible(visible) {
    els.debugPanel.hidden = !visible;
  }

  function setDebug(status, socketText) {
    els.debugStatus.textContent = status;
    els.debugSocket.textContent = socketText;
    updateDebugQueue();
  }

  function updateDebugQueue() {
    els.debugQueue.textContent = String(state.queue.length);
  }
})();
