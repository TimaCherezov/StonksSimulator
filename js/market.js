const moex = new MoexClient();
let allStocks = [];
let currentFilter = 'all';
let searchQuery = '';
let currentPage = 1;
const PAGE_SIZE = 20;

const FILTERS = {
  all:       (a, b) => (b.VALTODAY || 0) - (a.VALTODAY || 0),
  gainers:   (a, b) => (b.LASTTOPREVPRICE || 0) - (a.LASTTOPREVPRICE || 0),
  expensive: (a, b) => b.LAST - a.LAST,
  cheap:     (a, b) => a.LAST - b.LAST,
  az:        (a, b) => (a.SHORTNAME || '').localeCompare(b.SHORTNAME || '', 'ru'),
  za:        (a, b) => (b.SHORTNAME || '').localeCompare(a.SHORTNAME || '', 'ru'),
};

async function loadCharts(stocks) {
  const { from, till } = weekRange();
  for (const stock of stocks) {
    const el = document.querySelector(`.market-chart[data-ticker="${stock.SECID}"]`);
    if (!el) continue;
    try {
      const candles = await moex.getStockCandles(stock.SECID, 24, from, till);
      const prices = candles.map(c => c.close).filter(Boolean);
      if (prices.length >= 2) {
        el.style.background = 'none';
        renderChart(el, prices, { height: 60 });
      }
    } catch { }
  }
}

function renderPagination(totalPages) {
  const paginationEl = document.getElementById('pagination');
  paginationEl.textContent = '';
  paginationEl.insertAdjacentHTML('beforeend', buildPaginationHTML(currentPage, totalPages, 'goToPage'));
}

function getFiltered() {
  const q = searchQuery.toLowerCase();
  let result = allStocks.filter(s =>
    !q ||
    (s.SHORTNAME || '').toLowerCase().includes(q) ||
    (s.SECID || '').toLowerCase().includes(q)
  );
  return result.slice().sort(FILTERS[currentFilter]);
}

function renderStocks() {
  const filtered = getFiltered();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) {
    currentPage = 1;
  }

  const page = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const grid = document.getElementById('market-grid');
  grid.textContent = '';

  if (page.length) {
    page.forEach(stock => {
      grid.insertAdjacentHTML('beforeend', renderMarketCard(stock));
    });
  } else {
    grid.insertAdjacentHTML('beforeend', '<div class="market-empty">Ничего не найдено</div>');
  }

  renderPagination(totalPages);
  loadCharts(page);
}

function goToPage(page) {
  const filtered = getFiltered();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderStocks();
}

function applyFilter(key, btn) {
  document.querySelectorAll('.filters button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = key;
  currentPage = 1;
  renderStocks();
}

function handleSearch(value) {
  searchQuery = value;
  currentPage = 1;
  renderStocks();
}

async function loadMarket() {
  const grid = document.getElementById('market-grid');
  grid.textContent = 'Загрузка данных...';
  try {
    const { securities, marketdata } = await moex.getAllStocks();
    allStocks = moex.merge(securities, marketdata).filter(s => s.LAST > 0);
    renderStocks();
  } catch (e) {
    grid.textContent = 'Ошибка загрузки данных';
    console.error(e);
  }
}

function setupEventListeners() {
  // Обработчик для кнопок фильтров
  document.querySelectorAll('.filters button').forEach(btn => {
    btn.addEventListener('click', function() {
      const filterKey = this.dataset.filter;
      applyFilter(filterKey, this);
    });
  });

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      handleSearch(this.value);
    });
  }
}


function initMarketPage() {
  const headerMount = document.getElementById('header-mount');
  headerMount.insertAdjacentHTML('beforebegin', renderHeader('market'));
  headerMount.remove();

  setupEventListeners();
  loadMarket();
}

document.addEventListener('DOMContentLoaded', initMarketPage);


