import { request } from './client.js';

class QueryBuilder {
  constructor(table) {
    this._table   = table;
    this._method  = 'GET';
    this._columns = '*';
    this._filters = [];
    this._body    = null;
    this._single  = false;
    this._headers = {};
  }

  select(columns = '*') {
    this._columns = columns;
    return this;
  }

  insert(data) {
    this._method = 'POST';
    this._body   = JSON.stringify(data);
    this._headers['Prefer'] = 'return=representation';
    return this;
  }

  update(data) {
    this._method = 'PATCH';
    this._body   = JSON.stringify(data);
    this._headers['Prefer'] = 'return=representation';
    return this;
  }

  delete() {
    this._method = 'DELETE';
    this._headers['Prefer'] = 'return=representation';
    return this;
  }

  upsert(data) {
    this._method = 'POST';
    this._body   = JSON.stringify(data);
    this._headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
    return this;
  }

  eq(column, value) {
    this._filters.push(`${column}=eq.${value}`);
    return this;
  }

  order(column, { ascending = true } = {}) {
    this._filters.push(`order=${column}.${ascending ? 'asc' : 'desc'}`);
    return this;
  }

  limit(n) {
    this._filters.push(`limit=${n}`);
    return this;
  }

  single() {
    this._single = true;
    this._headers['Accept'] = 'application/vnd.pgrst.object+json';
    return this;
  }

  async execute() {
    const params = new URLSearchParams();
    if (this._method === 'GET') params.set('select', this._columns);

    this._filters.forEach(f => {
      const [key, val] = f.split('=');
      params.set(key, val ?? '');
    });

    const query = params.toString() ? `?${params}` : '';
    const path  = `/rest/v1/${this._table}${query}`;

    const res = await request(path, {
      method:  this._method,
      headers: this._headers,
      body:    this._body,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `DB error: ${res.status}`);
    }

    if (res.status === 204) return null;

    const data = await res.json();
    return this._single ? (Array.isArray(data) ? data[0] : data) : data;
  }
}

function from(table) {
  return new QueryBuilder(table);
}

export { from };
