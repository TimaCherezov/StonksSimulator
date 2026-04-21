class MoexClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'https://iss.moex.com/iss';
    this.rateLimitMs = options.rateLimitMs || 500; // ~2 req/sec
    this._queue = Promise.resolve();
    this._cache = new Map();
  }


  _throttle() {
    this._queue = this._queue.then(() => new Promise(r => setTimeout(r, this.rateLimitMs)));
    return this._queue;
  }

  async _fetch(path, params = {}) {
    const cacheKey = path + JSON.stringify(params);
    const cached = this._cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < 60_000) return cached.data;

    await this._throttle();

    const url = new URL(`${this.baseUrl}/${path}.json`);
    url.searchParams.set('iss.meta', 'off');
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    }

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`MOEX API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    this._cache.set(cacheKey, { data, ts: Date.now() });
    return data;
  }

  _toObjects(block) {
    if (!block) return [];
    const { columns, data } = block;
    return data.map(row =>
      Object.fromEntries(columns.map((col, i) => [col, row[i]]))
    );
  }

  async getSecurities(engine, market, board, params = {}) {
    const raw = await this._fetch(
      `engines/${engine}/markets/${market}/boards/${board}/securities`,
      params
    );
    return {
      securities: this._toObjects(raw.securities),
      marketdata: this._toObjects(raw.marketdata),
    };
  }


  async getSecurity(engine, market, board, ticker, params = {}) {
    const raw = await this._fetch(
      `engines/${engine}/markets/${market}/boards/${board}/securities/${ticker}`,
      params
    );
    return {
      security: this._toObjects(raw.securities)[0] || null,
      marketdata: this._toObjects(raw.marketdata)[0] || null,
    };
  }


  async getHistory(engine, market, board, ticker, params = {}) {
    const raw = await this._fetch(
      `history/engines/${engine}/markets/${market}/boards/${board}/securities/${ticker}`,
      params
    );
    return this._toObjects(raw.history);
  }


  async getFullHistory(engine, market, board, ticker, params = {}) {
    const pageSize = 100;
    const all = [];
    let start = 0;

    while (true) {
      const page = await this.getHistory(engine, market, board, ticker, {
        ...params,
        start,
        limit: pageSize,
      });
      all.push(...page);
      if (page.length < pageSize) break;
      start += pageSize;
    }
    return all;
  }

  async getCandles(engine, market, board, ticker, params = {}) {
    const raw = await this._fetch(
      `engines/${engine}/markets/${market}/boards/${board}/securities/${ticker}/candles`,
      params
    );
    return this._toObjects(raw.candles);
  }

  async getOrderBook(engine, market, board, ticker) {
    const raw = await this._fetch(
      `engines/${engine}/markets/${market}/boards/${board}/securities/${ticker}/orderbook`
    );
    const rows = this._toObjects(raw.orderbook);
    return {
      bids: rows.filter(r => r.BUYSELL === 'B'),
      asks: rows.filter(r => r.BUYSELL === 'S'),
    };
  }

  async getTrades(engine, market, board, ticker, params = {}) {
    const raw = await this._fetch(
      `engines/${engine}/markets/${market}/boards/${board}/securities/${ticker}/trades`,
      { limit: 100, ...params }
    );
    return this._toObjects(raw.trades);
  }

  async getStock(ticker, params) {
    return this.getSecurity('stock', 'shares', 'TQBR', ticker, params);
  }

  async getAllStocks(params) {
    return this.getSecurities('stock', 'shares', 'TQBR', params);
  }

  async getBond(ticker, board = 'TQCB', params) {
    return this.getSecurity('stock', 'bonds', board, ticker, params);
  }

  async getCurrency(ticker, params) {
    return this.getSecurity('currency', 'selt', 'CETS', ticker, params);
  }

  async getFutures(ticker, params) {
    return this.getSecurity('futures', 'forts', 'RFUD', ticker, params);
  }

  async getStockHistory(ticker, from, till, params) {
    return this.getFullHistory('stock', 'shares', 'TQBR', ticker, { from, till, ...params });
  }

  async getStockCandles(ticker, interval = 60, from, till) {
    return this.getCandles('stock', 'shares', 'TQBR', ticker, { interval, from, till });
  }

  merge(securities, marketdata) {
    const mdMap = new Map(marketdata.map(m => [m.SECID, m]));
    return securities.map(s => ({ ...s, ...mdMap.get(s.SECID) }));
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MoexClient;
} else {
  window.MoexClient = MoexClient;
}
