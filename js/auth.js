import { supabase } from './supabaseclient/index.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

supabase.init(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabase;

// ── Inject modals into DOM ──────────────────────────────────────────────────
document.body.insertAdjacentHTML('beforeend', `
  <div id="login-modal" class="modal-overlay" style="display:none" onclick="closeLoginModal(event)">
    <div class="modal">
      <h3>Вход</h3>
      <input id="login-email"    class="modal-input" type="email"    placeholder="Email" />
      <input id="login-password" class="modal-input" type="password" placeholder="Пароль" />
      <div id="login-error" class="modal-error"></div>
      <button class="modal-btn" id="login-submit" onclick="handleLogin()">Войти</button>
      <div class="modal-switch">Нет аккаунта? <a href="#" onclick="switchToRegister()">Зарегистрироваться</a></div>
    </div>
  </div>

  <div id="register-modal" class="modal-overlay" style="display:none" onclick="closeRegisterModal(event)">
    <div class="modal">
      <h3>Регистрация</h3>
      <input id="reg-username" class="modal-input" type="text"     placeholder="Имя пользователя" />
      <input id="reg-email"    class="modal-input" type="email"    placeholder="Email" />
      <input id="reg-password" class="modal-input" type="password" placeholder="Пароль" />
      <div id="reg-error" class="modal-error"></div>
      <button class="modal-btn" id="reg-submit" onclick="handleRegister()">Создать аккаунт</button>
      <div class="modal-switch">Уже есть аккаунт? <a href="#" onclick="switchToLogin()">Войти</a></div>
    </div>
  </div>
`);

// ── Helpers ─────────────────────────────────────────────────────────────────
function showProfile(name) {
  document.getElementById('login-btn').style.display    = 'none';
  document.getElementById('logout-btn').style.display   = 'block';
  document.getElementById('profile-info').style.display = 'block';
  document.getElementById('profile-name').textContent   = name;
}

async function loadBalance() {
  try {
    const profile = await supabase.from('profiles').select('balance').single().execute();
    if (profile?.balance !== undefined) {
      const fmt = profile.balance.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      document.getElementById('profile-balance').textContent = `Баланс: ${fmt} ₽`;
    }
  } catch (e) { console.error('loadBalance error:', e); }
}

window.refreshBalance = loadBalance;

// ── Window functions (для onclick атрибутов) ────────────────────────────────
window.openLoginModal     = () => document.getElementById('login-modal').style.display = 'flex';
window.closeLoginModal    = (e) => { if (e.target.id === 'login-modal') document.getElementById('login-modal').style.display = 'none'; };
window.closeRegisterModal = (e) => { if (e.target.id === 'register-modal') document.getElementById('register-modal').style.display = 'none'; };

window.switchToRegister = () => {
  document.getElementById('login-modal').style.display    = 'none';
  document.getElementById('register-modal').style.display = 'flex';
};
window.switchToLogin = () => {
  document.getElementById('register-modal').style.display = 'none';
  document.getElementById('login-modal').style.display    = 'flex';
};

window.handleLogin = async () => {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn      = document.getElementById('login-submit');
  const errorEl  = document.getElementById('login-error');

  errorEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Входим...';

  try {
    const user = await supabase.auth.signIn(email, password);
    const name = user.user_metadata?.username || user.email;
    document.getElementById('login-modal').style.display = 'none';
    showProfile(name);
    await loadBalance();
    document.dispatchEvent(new CustomEvent('app:userReady', { detail: user }));
  } catch (e) {
    errorEl.textContent = e.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Войти';
  }
};

window.handleRegister = async () => {
  const username = document.getElementById('reg-username').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const btn      = document.getElementById('reg-submit');
  const errorEl  = document.getElementById('reg-error');

  if (!username) { errorEl.textContent = 'Введите имя пользователя'; return; }

  errorEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Создаём аккаунт...';

  try {
    await supabase.auth.signUp(email, password, username);
    await supabase.auth.signIn(email, password);
    const me = await supabase.auth.getUser();
    await supabase.from('profiles').insert({ id: me.id, username }).execute();
    document.getElementById('register-modal').style.display = 'none';
    showProfile(username);
    await loadBalance();
    document.dispatchEvent(new CustomEvent('app:userReady', { detail: { user_metadata: { username } } }));
  } catch (e) {
    errorEl.textContent = e.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Создать аккаунт';
  }
};

window.handleLogout = async () => {
  await supabase.auth.signOut();
  document.getElementById('profile-info').style.display  = 'none';
  document.getElementById('logout-btn').style.display    = 'none';
  document.getElementById('login-btn').style.display     = 'block';
  document.getElementById('profile-balance').textContent = 'Баланс: —';
  document.dispatchEvent(new CustomEvent('app:userLogout'));
};

// ── Проверка сессии при загрузке ────────────────────────────────────────────
const user = await supabase.auth.getUser();
if (user) {
  showProfile(user.user_metadata?.username || user.email);
  await loadBalance();
  document.dispatchEvent(new CustomEvent('app:userReady', { detail: user }));
}
