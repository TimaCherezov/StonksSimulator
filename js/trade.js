const moex = new MoexClient();
const params = new URLSearchParams(location.search);
const ticker = params.get('ticker');

let stockPrice = 0;
let mode = params.get('mode') === 'sell' ? 'sell' : 'buy';
let userPosition = null;


function initTradePage() {
  if (!ticker) {
    location.href = 'market.html';
    return;
  }

  const headerMount = document.getElementById('header-mount');
  headerMount.insertAdjacentHTML('beforebegin', renderHeader('market'));
  headerMount.remove();

  document.addEventListener('app:userReady', () => {
    if (document.getElementById('position-info')) loadUserPosition();
  });

  document.addEventListener('app:userLogout', () => {
    userPosition = null;
    updatePositionDisplay();
  });

  load();
}

async function loadUserPosition() {
  if (!window.supabase) return;
  try {
    const user = await window.supabase.auth.getUser();
    if (!user) return;
    userPosition = await api.getPosition(ticker);
    updatePositionDisplay();
  } catch (e) {
    console.error('loadUserPosition:', e);
  }
}

function updatePositionDisplay() {
  const el = document.getElementById('position-info');
  if (!el) return;

  if (userPosition) {
    const avgFmt = userPosition.avg_buy_price.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    el.textContent = `У вас: ${userPosition.quantity} шт. по ср. цене ${avgFmt} ₽`;
    el.className = 'position-info has-position';
  } else if (mode === 'sell') {
    el.textContent = 'У вас нет этой акции';
    el.className = 'position-info no-position';
  } else {
    el.textContent = '';
    el.className = 'position-info';
  }
}

function switchMode(newMode) {
  mode = newMode;

  if (mode === 'buy') {
    document.getElementById('tab-buy').classList.add('tab-active');
    document.getElementById('tab-sell').classList.remove('tab-active');
  } else {
    document.getElementById('tab-buy').classList.remove('tab-active');
    document.getElementById('tab-sell').classList.add('tab-active');
  }

  document.getElementById('trade-title').textContent = mode === 'buy' ? 'Купить акции' : 'Продать акции';

  const btn = document.getElementById('confirm-btn');
  btn.textContent = mode === 'buy' ? 'Подтвердить покупку' : 'Подтвердить продажу';
  btn.className = `btn ${mode}`;

  history.replaceState(null, '', `?ticker=${ticker}&mode=${mode}`);
  updatePositionDisplay();
}

function updateTotal() {
  const qty = parseInt(document.getElementById('qty-input').value) || 0;
  const total = qty * stockPrice;
  document.getElementById('trade-total').textContent =
    total.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';
}

let toastTimer;

function showToast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast toast-${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

async function confirmTrade() {
  if (!window.supabase) {
    showToast('Войдите в аккаунт для совершения сделок', 'error');
    return;
  }

  const user = await window.supabase.auth.getUser();
  if (!user) {
    window.openLoginModal();
    return;
  }

  const qty = parseInt(document.getElementById('qty-input').value);
  if (!qty || qty < 1) {
    showToast('Введите количество акций', 'error');
    return;
  }

  const btn = document.getElementById('confirm-btn');
  btn.disabled = true;
  const origText = btn.textContent;
  btn.textContent = 'Обработка...';

  try {
    if (mode === 'buy') {
      await executeBuy(user.id, qty);
    } else {
      await executeSell(user.id, qty);
    }

    const verb = mode === 'buy' ? 'Куплено' : 'Продано';
    showToast(`${verb}: ${qty} шт. ${ticker}`, 'success');
    await loadUserPosition();
    window.refreshBalance?.();
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = origText;
  }
}

async function executeBuy(userId, qty) {
  const total = qty * stockPrice;
  const profile = await api.getProfile();

  if (!profile) throw new Error('Не удалось получить баланс');
  if (profile.balance < total) {
    throw new Error(`Недостаточно средств. Баланс: ${fmtRub(profile.balance)}`);
  }

  const pos = await api.getPosition(ticker);
  await api.updateBalance(userId, profile.balance - total);

  if (pos) {
    const newQty = pos.quantity + qty;
    const newAvg = (pos.quantity * pos.avg_buy_price + qty * stockPrice) / newQty;
    await api.updatePosition(userId, ticker, { quantity: newQty, avg_buy_price: newAvg });
  } else {
    await api.insertPosition(userId, ticker, qty, stockPrice);
  }

  await api.insertTransaction(userId, ticker, 'buy', qty, stockPrice, total);
  await savePortfolioSnapshot(userId);
}

async function executeSell(userId, qty) {
  if (!userPosition) throw new Error('У вас нет этой акции');
  if (userPosition.quantity < qty) {
    throw new Error(`Недостаточно акций. У вас: ${userPosition.quantity} шт.`);
  }

  const total = qty * stockPrice;
  const profile = await api.getProfile();

  if (!profile) throw new Error('Не удалось получить баланс');

  await api.updateBalance(userId, profile.balance + total);

  const remaining = userPosition.quantity - qty;
  if (remaining === 0) {
    await api.deletePosition(userId, ticker);
  } else {
    await api.updatePosition(userId, ticker, { quantity: remaining });
  }

  await api.insertTransaction(userId, ticker, 'sell', qty, stockPrice, total);
  await savePortfolioSnapshot(userId);
}

async function load() {
  try {
    const { security, marketdata } = await moex.getStock(ticker);

    if (!security || !marketdata || !marketdata.LAST) {
      const contentEl = document.getElementById('trade-content');
      contentEl.textContent = 'Акция не найдена или торги закрыты';
      contentEl.className = 'trade-loading';
      return;
    }

    stockPrice = marketdata.LAST;
    const change = marketdata.LASTTOPREVPRICE || 0;
    const changeSign = change >= 0 ? '+' : '';
    const changeClass = change >= 0 ? 'positive' : 'negative';
    const priceFmt = stockPrice.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    const tradeHTML = `
      <div class="grid">
        <div class="card">
          <div class="title-row">
            <strong>${security.SHORTNAME}</strong>
            <div class="badge gray">${ticker}</div>
          </div>
          <div class="price">${priceFmt} ₽</div>
          <div class="${changeClass}">${changeSign}${change.toFixed(2)}%</div>
          <div id="stock-chart" class="chart"></div>
        </div>

        <div class="card">
          <div class="tabs">
            <button id="tab-buy" class="tab tab-active" data-mode="buy">Купить</button>
            <button id="tab-sell" class="tab" data-mode="sell">Продать</button>
          </div>

          <h3 id="trade-title">Купить акции</h3>

          <div id="position-info" class="position-info"></div>

          <input id="qty-input" class="input" type="number" min="1" placeholder="Количество акций" value="1" />

          <div class="row">
            <span>Цена за акцию</span>
            <span>${priceFmt} ₽</span>
          </div>
          <div class="row">
            <span>Стоимость сделки</span>
            <span id="trade-total">${priceFmt} ₽</span>
          </div>

          <button id="confirm-btn" class="btn buy">Подтвердить покупку</button>
          <button class="btn cancel" id="cancel-btn">Отмена</button>
        </div>
      </div>
    `;

    const contentEl = document.getElementById('trade-content');
    contentEl.textContent = '';
    contentEl.insertAdjacentHTML('beforeend', tradeHTML);

    setupEventListeners();

    if (mode === 'sell') switchMode('sell');

    const { from, till } = weekRange();
    try {
      const candles = await moex.getStockCandles(ticker, 24, from, till);
      const prices = candles.map(c => c.close).filter(Boolean);
      if (prices.length >= 2) {
        const chartEl = document.getElementById('stock-chart');
        chartEl.style.background = 'none';
        renderChart(chartEl, prices, { height: 220 });
      }
    } catch (e) {
      console.warn('chart load failed:', e);
    }

    loadUserPosition();

  } catch (e) {
    const contentEl = document.getElementById('trade-content');
    contentEl.textContent = 'Ошибка загрузки данных';
    contentEl.className = 'trade-loading';
    console.error(e);
  }
}

function setupEventListeners() {
  document.querySelectorAll('.tabs button').forEach(btn => {
    btn.addEventListener('click', function() {
      const newMode = this.dataset.mode;
      switchMode(newMode);
    });
  });

  const qtyInput = document.getElementById('qty-input');
  if (qtyInput) {
    qtyInput.addEventListener('input', updateTotal);
  }

  const confirmBtn = document.getElementById('confirm-btn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', confirmTrade);
  }

  const cancelBtn = document.getElementById('cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => history.back());
  }
}

async function savePortfolioSnapshot(userId) {
  try {
    const [profile, positions] = await Promise.all([
      api.getProfile(),
      api.getPortfolio()
    ]);

    const cashBalance = Number(profile?.balance ?? 0);
    let portfolioValue = 0;

    if (positions && positions.length) {
      const { securities, marketdata } = await moex.getAllStocks();
      const allCurrentStocks = moex.merge(securities, marketdata);

      for (const pos of positions) {
        const stock = allCurrentStocks.find(s => s.SECID === pos.ticker);
        const price = stock?.LAST || Number(pos.avg_buy_price) || 0;
        portfolioValue += price * Number(pos.quantity);
      }
    }

    console.log(cashBalance)
    await api.insertPortfolioSnapshot(userId, {
      total_value: cashBalance + portfolioValue,
      recorded_at: new Date().toISOString()
    });

  } catch (e) {
    console.warn('snapshot failed:', e);
  }
}

document.addEventListener('DOMContentLoaded', initTradePage);

