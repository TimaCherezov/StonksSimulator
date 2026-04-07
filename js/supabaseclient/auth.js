/**
 * Supabase Auth
 * signup, signin, signout, getUser, onAuthStateChange
 */

import { request, saveSession, clearSession, getAccessToken } from './client.js';

const _listeners = [];

function _notify(event, user) {
  _listeners.forEach(cb => cb(event, user));
}

async function signUp(email, password, username) {
  const res = await request('/auth/v1/signup', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      data: { username },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error_description || 'Ошибка регистрации');

  // Если email confirmation выключен — data содержит access_token + user
  // Если включён — data это сам объект пользователя без токенов
  const user = data.user ?? data;
  saveSession(data);
  _notify('SIGNED_IN', user);
  return user;
}

async function signIn(email, password) {
  const res = await request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Неверный email или пароль');

  saveSession(data);
  _notify('SIGNED_IN', data.user);
  return data.user;
}

async function signOut() {
  await request('/auth/v1/logout', { method: 'POST' });
  clearSession();
  _notify('SIGNED_OUT', null);
}

async function getUser() {
  if (!getAccessToken()) return null;

  const res = await request('/auth/v1/user');
  if (!res.ok) return null;

  return (await res.json());
}

function onAuthStateChange(callback) {
  _listeners.push(callback);
  // возвращаем unsubscribe
  return () => {
    const i = _listeners.indexOf(callback);
    if (i !== -1) _listeners.splice(i, 1);
  };
}

export { signUp, signIn, signOut, getUser, onAuthStateChange };
