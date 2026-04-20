function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const NAV_LINKS = [
  { label: 'Главная',  href: 'index.html',  key: 'home' },
  { label: 'Торговля', href: 'market.html', key: 'market' },
  { label: 'Портфель', href: 'portfolio.html', key: 'portfolio' },
  { label: 'История',  href: 'history.html', key: 'history' },
];

function renderHeader(activePage) {
  const links = NAV_LINKS.map(l =>
    `<a ${l.key === activePage ? 'class="active"' : ''} href="${l.href}">${l.label}</a>`
  ).join('');

  return `
    <header>
      <div class="logo">📈 StonksSimulator</div>
      <nav>${links}</nav>
      <div class="header-right">
        <div class="profile" id="profile-info" style="display:none">
          <span id="profile-name"></span><br>
          <span id="profile-balance">Баланс: —</span>
        </div>
        <button class="logout-btn" id="logout-btn" style="display:none" onclick="handleLogout()">Выйти</button>
        <button class="login-btn" id="login-btn" onclick="openLoginModal()">Войти</button>
      </div>
    </header>`;
}

function renderSkeletonCard(index) {
  return `
    <div class="stock-card skeleton-card" style="--delay:${index * 80}ms">
      <div class="stock-card-top">
        <div>
          <div class="sk sk-title"></div>
          <div class="sk sk-ticker"></div>
        </div>
      </div>
      <div class="sk sk-chart"></div>
      <div class="sk sk-price"></div>
      <div class="sk sk-change"></div>
      <div class="buttons" style="margin-top:12px">
        <div class="sk sk-btn"></div>
        <div class="sk sk-btn"></div>
      </div>
    </div>`;
}


function renderHomeCard(stock) {
  const change = stock.LASTTOPREVPRICE || 0;
  const changeClass = change >= 0 ? 'green' : 'red-text';
  const changeSign = change >= 0 ? '+' : '';
  const price = stock.LAST.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const safeTicker = encodeURIComponent(stock.SECID);
  return `
    <div class="stock-card">
      <div class="stock-card-top">
        <div>
          <div class="stock-title">${esc(stock.SHORTNAME)}</div>
          <div class="stock-ticker">${esc(stock.SECID)}</div>
        </div>
      </div>
      <div class="stock-chart sk sk-chart" data-ticker="${esc(stock.SECID)}"></div>
      <div class="price">${price} ₽</div>
      <div class="${changeClass}">${changeSign}${change.toFixed(2)}%</div>
      <div class="buttons">
        <button class="btn buy"  onclick="location.href='trade.html?ticker=${safeTicker}&mode=buy'">Купить</button>
        <button class="btn sell" onclick="location.href='trade.html?ticker=${safeTicker}&mode=sell'">Продать</button>
      </div>
    </div>`;
}

function renderMarketCard(stock) {
  const change = stock.LASTTOPREVPRICE || 0;
  const changeClass = change >= 0 ? 'green' : 'red-text';
  const changeSign = change >= 0 ? '+' : '';
  const price = stock.LAST.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const safeTicker = encodeURIComponent(stock.SECID);
  return `
    <div class="card" onclick="location.href='trade.html?ticker=${safeTicker}&mode=buy'">
      <div class="row">
        <span>${esc(stock.SHORTNAME)}</span>
        <span style="color:#888">${esc(stock.SECID)}</span>
      </div>
      <div class="price">${price} ₽</div>
      <div class="${changeClass}">${changeSign}${change.toFixed(2)}%</div>
      <div class="market-chart" data-ticker="${esc(stock.SECID)}"></div>
      <div class="buttons">
        <button class="btn buy"  onclick="event.stopPropagation(); location.href='trade.html?ticker=${safeTicker}&mode=buy'">Купить</button>
        <button class="btn sell" onclick="event.stopPropagation(); location.href='trade.html?ticker=${safeTicker}&mode=sell'">Продать</button>
      </div>
    </div>`;
}
