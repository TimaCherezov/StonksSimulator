const TOKEN_KEY   = 'sb_access_token';
const REFRESH_KEY = 'sb_refresh_token';

let _url    = '';
let _anonKey = '';

function init(url, anonKey) {
  _url     = url.replace(/\/$/, '');
  _anonKey = anonKey;
}

function getAccessToken()  { return localStorage.getItem(TOKEN_KEY); }
function getRefreshToken() { return localStorage.getItem(REFRESH_KEY); }

function saveSession(session) {
  if (!session) return;
  localStorage.setItem(TOKEN_KEY,   session.access_token);
  localStorage.setItem(REFRESH_KEY, session.refresh_token);
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

function headers(extra = {}) {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    'apikey': _anonKey,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function request(path, options = {}, retry = true) {
  const res = await fetch(`${_url}${path}`, {
    ...options,
    headers: { ...headers(), ...options.headers },
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request(path, options, false);
    clearSession();
  }

  return res;
}

async function tryRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(`${_url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) return false;
  const data = await res.json();
  saveSession(data);
  return true;
}

export { init, request, saveSession, clearSession, getAccessToken, headers, _url, _anonKey };
