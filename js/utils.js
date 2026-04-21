function fmtRub(n) {
  return parseFloat(n).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' ₽';
}

function fmtPct(n) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtDate(s, withTime = false) {
  const opts = { day: '2-digit', month: '2-digit', year: 'numeric' };
  if (withTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
  return withTime
    ? new Date(s).toLocaleString('ru-RU', opts)
    : new Date(s).toLocaleDateString('ru-RU', opts);
}


function weekRange() {
  const iso  = d => d.toISOString().slice(0, 10);
  const till = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 14);
  return { from: iso(from), till: iso(till) };
}

function buildPaginationHTML(currentPage, totalPages, goToFn) {
  if (totalPages <= 1) return '';
  const W = 2;
  const pages = [1];
  if (currentPage - W > 2) pages.push('…');
  for (let p = Math.max(2, currentPage - W); p <= Math.min(totalPages - 1, currentPage + W); p++) {
    pages.push(p);
  }
  if (currentPage + W < totalPages - 1) pages.push('…');
  if (totalPages > 1) pages.push(totalPages);

  return `
    <button class="page-btn" onclick="${goToFn}(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>
    ${pages.map(p =>
      p === '…'
        ? '<span class="page-ellipsis">…</span>'
        : `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="${goToFn}(${p})">${p}</button>`
    ).join('')}
    <button class="page-btn" onclick="${goToFn}(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>›</button>`;
}


function showLoginPrompt(rootId, message) {
  document.getElementById(rootId).innerHTML = `
    <div class="login-prompt">
      <p>${message}</p>
      <button class="login-prompt-btn" onclick="openLoginModal()">Войти</button>
    </div>`;
}
