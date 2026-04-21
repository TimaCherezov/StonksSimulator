function renderChart(container, prices, options = {}) {
  if (typeof container === 'string') container = document.querySelector(container);
  if (!container || !prices || prices.length < 2) return;

  const W = 200;
  const H = options.height ?? 60;
  const PAD = 3;

  const trend = prices[prices.length - 1] >= prices[0];
  const color = (!options.color || options.color === 'auto')
    ? (trend ? '#22c55e' : '#ef4444')
    : options.color;
  const showDot = options.dot !== false;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const toX = i  => PAD + (i / (prices.length - 1)) * (W - PAD * 2);
  const toY = v  => PAD + (H - PAD * 2) - ((v - min) / range) * (H - PAD * 2);

  const pts = prices.map((v, i) => ({ x: toX(i), y: toY(v) }));

  function buildPath(points) {
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const cpX = (points[i - 1].x + points[i].x) / 2;
      d += ` C ${cpX} ${points[i - 1].y} ${cpX} ${points[i].y} ${points[i].x} ${points[i].y}`;
    }
    return d;
  }

  const linePath = buildPath(pts);
  const last     = pts[pts.length - 1];
  const areaPath = `${linePath} L ${last.x} ${H - PAD} L ${pts[0].x} ${H - PAD} Z`;

  const gid = 'cg' + Math.random().toString(36).slice(2, 8);

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}"
         preserveAspectRatio="none"
         style="width:100%;height:${H}px;display:block;overflow:visible">
      <defs>
        <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="${color}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#${gid})"/>
      <path d="${linePath}" fill="none" stroke="${color}"
            stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${showDot ? `<circle cx="${last.x}" cy="${last.y}" r="2.5" fill="${color}"/>` : ''}
    </svg>`;
}
