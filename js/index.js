const moex = new MoexClient();
let allStocks = [];
let cachedPositions = null;

const FILTERS = {
  turnover:  { label: 'Топ по обороту за день',  sort: (a, b) => (b.VALTODAY || 0) - (a.VALTODAY || 0) },
  gainers:   { label: 'Растущие акции',           sort: (a, b) => (b.LASTTOPREVPRICE || 0) - (a.LASTTOPREVPRICE || 0), filter: s => s.LASTTOPREVPRICE > 0 },
  losers:    { label: 'Падающие акции',           sort: (a, b) => (a.LASTTOPREVPRICE || 0) - (b.LASTTOPREVPRICE || 0), filter: s => s.LASTTOPREVPRICE < 0 },
  expensive: { label: 'Самые дорогие акции',      sort: (a, b) => b.LAST - a.LAST },
  cheap:     { label: 'Самые дешёвые акции',      sort: (a, b) => a.LAST - b.LAST },
};

function updatePortfolioCard(positions) {
  if (!positions || !positions.length) {
    document.getElementById('dashboard-portfolio').textContent = '0,00 ₽';
    document.getElementById('dashboard-pnl').textContent = '';
    return;
  }

  let portfolioValue = 0;
  let costBasis = 0;

  for (const pos of positions) {
    const stock = allStocks.find(s => s.SECID === pos.ticker);
    const price = stock?.LAST || parseFloat(pos.avg_buy_price);
    portfolioValue += price * pos.quantity;
    costBasis += parseFloat(pos.avg_buy_price) * pos.quantity;
  }

  document.getElementById('dashboard-portfolio').textContent = fmtRub(portfolioValue);

  const pnl = portfolioValue - costBasis;
  if (costBasis > 0) {
    const pnlSign  = pnl >= 0 ? '+' : '';
    const pnlPct   = ((pnl / costBasis) * 100).toFixed(2);
    const pnlEl    = document.getElementById('dashboard-pnl');
    pnlEl.textContent = `${pnlSign}${fmtRub(pnl)} (${pnlSign}${pnlPct}%)`;
    pnlEl.className   = pnl >= 0 ? 'green' : 'red-text';
  }
}

async function loadCharts(stocks) {
  const { from, till } = weekRange();
  for (const stock of stocks) {
    const el = document.querySelector(`.stock-chart[data-ticker="${stock.SECID}"]`);
    if (!el) continue;
    try {
      const candles = await moex.getStockCandles(stock.SECID, 24, from, till);
      const prices = candles.map(c => c.close).filter(Boolean);
      if (prices.length >= 2) {
        el.classList.remove('sk');
        renderChart(el, prices, { height: 60 });
      }
    } catch {
      el.classList.remove('sk');
    }
  }
}


function applyFilter(key, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const { label, sort, filter } = FILTERS[key];
  document.getElementById('stocks-title').textContent = label;

  let result = filter ? allStocks.filter(filter) : allStocks;
  result = result.slice().sort(sort).slice(0, 9);

  const grid = document.getElementById('stock-grid');
  grid.textContent = '';
  result.forEach(stock => {
    grid.insertAdjacentHTML('beforeend', renderHomeCard(stock));
  });

  loadCharts(result);
}


async function loadTopStocks() {
  const grid = document.getElementById('stock-grid');
  grid.textContent = '';

  Array.from({ length: 9 }, (_, i) => renderSkeletonCard(i)).forEach(html => {
    grid.insertAdjacentHTML('beforeend', html);
  });

  try {
    const { securities, marketdata } = await moex.getAllStocks();
    allStocks = moex.merge(securities, marketdata).filter(s => s.LAST > 0 && s.VALTODAY > 0);

    const initial = allStocks.slice().sort(FILTERS.turnover.sort).slice(0, 9);

    grid.textContent = '';
    initial.forEach(stock => {
      grid.insertAdjacentHTML('beforeend', renderHomeCard(stock));
    });

    loadCharts(initial);

    if (cachedPositions !== null) updatePortfolioCard(cachedPositions);
  } catch (e) {
    grid.textContent = '';
    grid.insertAdjacentHTML('beforeend', '<div class="stock-loading">Ошибка загрузки данных</div>');
    console.error(e);
  }
}


function setupEventListeners() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const filterKey = this.dataset.filter;
      applyFilter(filterKey, this);
    });
  });

  const portfolioCard = document.getElementById('portfolio-card');
  if (portfolioCard) {
    portfolioCard.addEventListener('click', () => {
      location.href = 'portfolio.html';
    });
  }
}


async function loadDashboardCharts() {
  try {
    const txRes = await api.getTransactions();
    const txs = txRes?.data || txRes || [];

    if (!txs || !txs.length) return;

    txs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const profileRes = await api.getProfile();
    const profile = profileRes?.data || profileRes;
    const currentBalance = profile?.balance || 100000;

    let initialBalance = currentBalance;
    for (const tx of txs) {
      if (tx.type === 'buy') {
        initialBalance += parseFloat(tx.total_amount);
      } else if (tx.type === 'sell') {
        initialBalance -= parseFloat(tx.total_amount);
      }
    }

    const balancePoints = [initialBalance];
    let runningBalance = initialBalance;

    for (const tx of txs) {
      if (tx.type === 'buy') {
        runningBalance -= parseFloat(tx.total_amount);
      } else if (tx.type === 'sell') {
        runningBalance += parseFloat(tx.total_amount);
      }
      balancePoints.push(Math.max(0, runningBalance));
    }


    // const snapRes = await api.getPortfolioSnapshots();
    // const snapshots = snapRes?.data || snapRes || [];
    //
    // const portfolioPoints = snapshots.map(s => Number(s.value));
    //
    // if (portfolioPoints.length < 2) {
    //   portfolioPoints.push(portfolioPoints[0] || 0);
    // }
    const portfolioPoints = [];


    if (balancePoints.length >= 2) {
      const balanceChart = document.querySelector('.cards .card:first-child .chart');
      if (balanceChart) {
        balanceChart.style.background = 'none';
        balanceChart.classList.remove('sk');
        renderChart(balanceChart, balancePoints, { height: 80 });
      }
    }

    if (portfolioPoints.length >= 2) {
      const portfolioChart = document.querySelector('.cards .card:nth-child(2) .chart');
      if (portfolioChart) {
        portfolioChart.style.background = 'none';
        portfolioChart.classList.remove('sk');
        renderChart(portfolioChart, portfolioPoints, { height: 80 });
      }
    }
  } catch (e) {
    console.warn('Dashboard charts load failed:', e);
  }
}
function initHomePage() {
  const headerMount = document.getElementById('header-mount');
  headerMount.insertAdjacentHTML('beforebegin', renderHeader('home'));
  headerMount.remove();

  document.addEventListener('app:userReady', async function () {
    if (!window.supabase) return;
    const user = await window.supabase.auth.getUser();
    if (!user) return;

    try {
      const [profile, positions] = await Promise.all([
        api.getProfile(),
        api.getPortfolio(),
      ]);

      if (profile?.balance !== undefined) {
        document.getElementById('dashboard-balance').textContent = fmtRub(profile.balance);
        document.getElementById('dashboard-balance-sub').textContent = '';
      }

      cachedPositions = positions || [];
      updatePortfolioCard(cachedPositions);

      await loadDashboardCharts();
    } catch (e) {
      console.error(e);
    }
  });

  document.addEventListener('app:userLogout', function () {
    cachedPositions = null;
    document.getElementById('dashboard-balance').textContent    = '—';
    document.getElementById('dashboard-balance-sub').textContent = 'Войдите в аккаунт';
    document.getElementById('dashboard-portfolio').textContent  = '—';
    document.getElementById('dashboard-pnl').textContent        = '';
  });

  setupEventListeners();
  loadTopStocks();
}

document.addEventListener('DOMContentLoaded', initHomePage);
