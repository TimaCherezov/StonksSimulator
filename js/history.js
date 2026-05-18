document.getElementById('header-mount').outerHTML = renderHeader('history');

let allTxs = [];
let filterType = 'all';
let searchTicker = '';
let currentPage = 1;
let dateFilter = 'all';
let customDateFrom = '';
let customDateTo = '';
const PAGE_SIZE = 20;

function getDateThreshold() {
    const now = new Date();
    switch (dateFilter) {
        case 'today':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        case 'week':
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case 'month':
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case 'year':
            return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        case 'custom':
            return new Date(customDateFrom);
        default:
            return new Date(0);
    }
}

function getDateCeiling() {
    if (dateFilter === 'custom' && customDateTo) {
        const toDate = new Date(customDateTo);
        toDate.setDate(toDate.getDate() + 1);
        return toDate;
    }
    return new Date();
}

function getFiltered() {
    const q = searchTicker.trim().toUpperCase();
    const threshold = getDateThreshold();
    const ceiling = getDateCeiling();
    return allTxs.filter(t => {
        if (filterType !== 'all' && t.type !== filterType)
            return false;
        if (q && !t.ticker.includes(q))
            return false;
        const txDate = new Date(t.created_at);

        return !(txDate < threshold || txDate >= ceiling);
    });
}

function renderSummary() {
    const buys = allTxs.filter(t => t.type === 'buy');
    const sells = allTxs.filter(t => t.type === 'sell');
    const totalBought = buys.reduce((s, t) => s + parseFloat(t.total_amount), 0);
    const totalSold = sells.reduce((s, t) => s + parseFloat(t.total_amount), 0);

    const realized = totalSold - totalBought;
    const realizedClass = realized >= 0 ? 'green' : 'red';
    const realizedSign = realized >= 0 ? '+' : '';

    return `
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">Всего сделок</div>
        <div class="summary-value">${allTxs.length}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Покупок</div>
        <div class="summary-value">${buys.length}</div>
        <div class="muted">${fmtRub(totalBought)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Продаж</div>
        <div class="summary-value">${sells.length}</div>
        <div class="muted">${fmtRub(totalSold)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Реализованный P&amp;L</div>
        <div class="summary-value ${realizedClass}">${realizedSign}${fmtRub(realized)}</div>
      </div>
    </div>`;
}

function renderPagination(totalPages) {
    const paginationEl = document.getElementById('pagination');
    if (!paginationEl)
        return;
    paginationEl.textContent = '';
    const html = buildPaginationHTML(currentPage, totalPages, 'goToPage');
    if (html)
        paginationEl.insertAdjacentHTML('beforeend', html);
}

function renderTable() {
    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPages)
        currentPage = 1;

    const page = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const rows = page.length
        ? page.map(t => `
      <tr>
        <td class="muted">${fmtDate(t.created_at, true)}</td>
        <td>
          <span class="ticker-badge" onclick="filterByTicker('${t.ticker}')">${t.ticker}</span>
        </td>
        <td class="${t.type === 'buy' ? 'badge-buy' : 'badge-sell'}">
          ${t.type === 'buy' ? 'Покупка' : 'Продажа'}
        </td>
        <td class="right">${t.quantity} шт.</td>
        <td class="right">${fmtRub(t.price)}</td>
        <td class="right">${fmtRub(t.total_amount)}</td>
        <td class="right">
          <a href="trade.html?ticker=${t.ticker}&mode=buy" style="color:#3b82f6;font-size:12px;text-decoration:none">Перейти →</a>
        </td>
      </tr>`).join('')
        : `<tr><td colspan="7" class="td-empty">Нет сделок по заданным фильтрам</td></tr>`;

    return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Дата и время</th>
            <th>Тикер</th>
            <th>Тип</th>
            <th class="right">Кол-во</th>
            <th class="right">Цена</th>
            <th class="right">Сумма</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div id="pagination" class="pagination"></div>`;
}

function render() {
    const root = document.getElementById('history-root');
    if (!allTxs.length) {
        root.textContent = '';
        root.insertAdjacentHTML('beforeend', `
      <div class="table-wrap">
        <table><tbody>
          <tr><td class="td-empty">Сделок пока не было. <a href="../market.html">Перейти на рынок →</a></td></tr>
        </tbody></table>
      </div>`);
        return;
    }

    root.textContent = '';
    root.insertAdjacentHTML('beforeend', renderSummary() + renderControls() + renderTable());
    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    renderPagination(totalPages);
}

function renderControls() {
    const q = searchTicker;
    return `
    <div class="controls">
      <div class="filters">
        <button class="filter-btn ${filterType === 'all'  ? 'active' : ''}" onclick="setType('all')">Все</button>
        <button class="filter-btn ${filterType === 'buy'  ? 'active' : ''}" onclick="setType('buy')">Покупки</button>
        <button class="filter-btn ${filterType === 'sell' ? 'active' : ''}" onclick="setType('sell')">Продажи</button>
      </div>
      <input class="search" placeholder="Тикер" value="${q}"
             oninput="handleSearch(this.value)" />
    </div>
    <div class="controls">
      <div class="filters">
        <button class="filter-btn ${dateFilter === 'all'   ? 'active' : ''}" onclick="setDateFilter('all')">За всё время</button>
        <button class="filter-btn ${dateFilter === 'today' ? 'active' : ''}" onclick="setDateFilter('today')">Сегодня</button>
        <button class="filter-btn ${dateFilter === 'week'  ? 'active' : ''}" onclick="setDateFilter('week')">Последние 7 дней</button>
        <button class="filter-btn ${dateFilter === 'month' ? 'active' : ''}" onclick="setDateFilter('month')">Последний месяц</button>
        <button class="filter-btn ${dateFilter === 'year'  ? 'active' : ''}" onclick="setDateFilter('year')">Последний год</button>
      </div>
    </div>
    <div class="controls controls-range">
      <div class="date-range-group">
        <label>Период</label>
        <div class="date-range-inputs">
          <input type="date" class="date-input ${dateFilter === 'custom' ? 'active' : ''}"
                 value="${customDateFrom}"
                 oninput="setCustomDateFrom(this.value)"
                 placeholder="От">
          <span class="date-separator">→</span>
          <input type="date" class="date-input ${dateFilter === 'custom' ? 'active' : ''}"
                 value="${customDateTo}"
                 oninput="setCustomDateTo(this.value)"
                 placeholder="До">
          <button class="filter-btn ${dateFilter === 'custom' && customDateFrom ? 'active' : ''}"
                  onclick="applyCustomDateFilter()"
                  style="margin-left: 8px;">Применить</button>
          ${dateFilter === 'custom' ? '<button class="filter-btn" onclick="clearCustomDateFilter()" style="margin-left: 4px; background: #8b5cf6;">Очистить</button>' : ''}
        </div>
      </div>
    </div>`;
}

function setType(type) {
    filterType = type;
    currentPage = 1;
    render();
}

function setDateFilter(period) {
    dateFilter = period;
    customDateFrom = '';
    customDateTo = '';
    currentPage = 1;
    render();
}

function setCustomDateFrom(value) {
    customDateFrom = value;
}

function setCustomDateTo(value) {
    customDateTo = value;
}

function applyCustomDateFilter() {
    if (!customDateFrom) {
        alert('Пожалуйста, выберите дату начала периода');
        return;
    }

    if (!customDateTo) {
        alert('Пожалуйста, выберите дату конца периода');
        return;
    }

    if (new Date(customDateFrom) > new Date(customDateTo)) {
        alert('Дата начала не может быть позже даты конца');
        return;
    }

    dateFilter = 'custom';
    currentPage = 1;
    render();
}

function clearCustomDateFilter() {
    dateFilter = 'all';
    customDateFrom = '';
    customDateTo = '';
    currentPage = 1;
    render();
}

function handleSearch(value) {
    searchTicker = value;
    currentPage = 1;
    render();
}

function filterByTicker(ticker) {
    searchTicker = ticker;
    currentPage = 1;
    render();
}

function goToPage(page) {
    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (page < 1 || page > totalPages)
        return;
    currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    render();
}

document.addEventListener('app:userLogout', () => {
    allTxs = [];
    showLoginPrompt('history-root', 'Войдите в аккаунт, чтобы увидеть историю сделок');
});

document.addEventListener('app:userReady', async function () {
    if (!window.supabase)
        return;
    const user = await window.supabase.auth.getUser();
    if (!user) {
        showLoginPrompt('history-root', 'Войдите в аккаунт, чтобы увидеть историю сделок');
        return;
    }

    const root = document.getElementById('history-root');
    root.textContent = '';
    root.insertAdjacentHTML('beforeend', `
    <div class="table-wrap">
      <table><tbody><tr><td class="td-loading">Загрузка...</td></tr></tbody></table>
    </div>`);

    try {
        const txs = await api.getTransactions();
        allTxs = txs || [];
        render();
    } catch (e) {
        root.textContent = '';
        root.insertAdjacentHTML('beforeend', `
      <div class="table-wrap">
        <table><tbody><tr><td class="td-empty">Ошибка загрузки данных</td></tr></tbody></table>
      </div>`);
        console.error(e);
    }
});