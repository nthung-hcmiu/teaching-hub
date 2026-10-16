// ============================================================
//  ATTENDANCE BACKEND — shared by index.html (teacher) and checkin.html (student)
//
//  Two storage modes with the same small API:
//   - firebase: Firebase Realtime Database (real class, many phones)
//   - local:    localStorage + storage events (demo, same browser only)
//
//  Data layout:  att/{sessionId}/meta | scans/{scanId} | checkins/{attemptId} | verdicts/{attemptId}
// ============================================================
(function () {
  const FIREBASE_VERSION = '10.12.2';
  const LOCAL_KEY = 'teaching_hub_attendance_local';
  const URL_KEY = 'teaching_hub_firebase_url';
  const DEVICE_KEY = 'teaching_hub_device_id';
  const WINDOW_MS = 10000; // QR rotates every 10 seconds

  const randomId = (len = 12) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const buf = new Uint32Array(len);
    crypto.getRandomValues(buf);
    return Array.from(buf, n => chars[n % chars.length]).join('');
  };

  const normalizeUrl = (u) => {
    u = (u || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    return u.replace(/\/+$/, '');
  };
  const shortHost = (u) => (u || '').replace(/^https?:\/\//i, '');
  const getSavedUrl = () => { try { return localStorage.getItem(URL_KEY) || ''; } catch { return ''; } };
  const saveUrl = (u) => {
    const v = normalizeUrl(u);
    if (v) localStorage.setItem(URL_KEY, v); else localStorage.removeItem(URL_KEY);
    return v;
  };

  // Student IDs become database keys, so keep only safe characters.
  const sanitizeId = (s) => (s || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');

  const deviceId = () => {
    try {
      let id = localStorage.getItem(DEVICE_KEY);
      if (!id) { id = randomId(16); localStorage.setItem(DEVICE_KEY, id); }
      return id;
    } catch { return 'nodevice'; }
  };

  // ---- Rotating token: "<window index base36>.<signature>" ----
  // The signature is a keyed hash; the secret never leaves the teacher's browser.
  const cyrb53 = (str, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  };
  const sign = (secret, idx) => cyrb53(secret + ':' + idx).toString(36).padStart(8, '0').slice(0, 8);
  const makeToken = (secret, idx) => idx.toString(36) + '.' + sign(secret, idx);
  const verifyToken = (secret, token) => {
    const [a, b] = (token || '').split('.');
    const idx = parseInt(a, 36);
    if (!Number.isFinite(idx) || !b || sign(secret, idx) !== b) return null;
    return { idx, issuedAt: idx * WINDOW_MS };
  };

  // ---- local backend ----
  const pathKeys = (p) => p.split('/').filter(Boolean);
  const getAt = (tree, path) => pathKeys(path).reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), tree);
  const setAt = (tree, path, val) => {
    const keys = pathKeys(path);
    let o = tree;
    keys.slice(0, -1).forEach(k => { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
    const last = keys[keys.length - 1];
    if (val === null || val === undefined) delete o[last]; else o[last] = val;
  };

  function localBackend() {
    const read = () => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}; } catch { return {}; } };
    const listeners = new Set();
    const fire = () => listeners.forEach(fn => fn());
    window.addEventListener('storage', e => { if (e.key === LOCAL_KEY) fire(); });
    const write = (fn) => { const t = read(); fn(t); localStorage.setItem(LOCAL_KEY, JSON.stringify(t)); fire(); };
    return {
      kind: 'local',
      url: '',
      now: () => Date.now(),
      stamp: () => Date.now(),
      get: async (path) => { const v = getAt(read(), path); return v === undefined ? null : JSON.parse(JSON.stringify(v)); },
      set: async (path, val) => write(t => setAt(t, path, val)),
      update: async (path, obj) => write(t => Object.entries(obj).forEach(([k, v]) => setAt(t, path + '/' + k, v))),
      on: (path, cb) => {
        let last;
        const run = () => {
          const v = getAt(read(), path);
          const s = JSON.stringify(v === undefined ? null : v);
          if (s !== last) { last = s; cb(JSON.parse(s)); }
        };
        listeners.add(run); run();
        return () => listeners.delete(run);
      },
    };
  }

  // ---- firebase backend ----
  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve;
    s.onerror = () => reject(new Error('Không tải được ' + src));
    document.head.appendChild(s);
  });
  const withTimeout = (p, ms, msg) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);

  async function firebaseBackend(url) {
    if (!window.firebase || !window.firebase.database) {
      const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
      await loadScript(`${base}/firebase-app-compat.js`);
      await loadScript(`${base}/firebase-database-compat.js`);
    }
    const fb = window.firebase;
    const name = 'th-' + shortHost(url);
    const app = fb.apps.find(a => a.name === name) || fb.initializeApp({ databaseURL: url }, name);
    const db = app.database();
    let offset = 0;
    db.ref('.info/serverTimeOffset').on('value', s => { offset = s.val() || 0; });
    const timeoutMsg = 'Không kết nối được Firebase (hết thời gian chờ). Kiểm tra Database URL và rules.';
    return {
      kind: 'firebase',
      url,
      now: () => Date.now() + offset,
      stamp: () => fb.database.ServerValue.TIMESTAMP,
      get: (path) => withTimeout(db.ref(path).get().then(s => s.val()), 10000, timeoutMsg),
      set: (path, val) => withTimeout(db.ref(path).set(val), 10000, timeoutMsg),
      update: (path, obj) => withTimeout(db.ref(path).update(obj), 10000, timeoutMsg),
      on: (path, cb) => {
        const ref = db.ref(path);
        const handler = s => cb(s.val());
        ref.on('value', handler);
        return () => ref.off('value', handler);
      },
    };
  }

  const connect = (url) => (url ? firebaseBackend(normalizeUrl(url)) : Promise.resolve(localBackend()));

  window.AttendanceBackend = {
    WINDOW_MS, connect, randomId, normalizeUrl, shortHost, getSavedUrl, saveUrl,
    sanitizeId, deviceId, makeToken, verifyToken,
  };
})();
