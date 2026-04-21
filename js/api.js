/**
 * Data access layer — все запросы к Supabase в одном месте.
 *
 * Требует window.supabase (устанавливается auth.js).
 * Методы вызываются только из обработчиков событий, не при инициализации страницы,
 * поэтому window.supabase гарантированно доступен в момент вызова.
 */
const api = {


  getProfile() {
    return window.supabase.from('profiles').select('balance').single().execute();
  },

  updateBalance(userId, balance) {
    return window.supabase.from('profiles')
      .update({ balance })
      .eq('id', userId)
      .execute();
  },


  getPortfolio() {
    return window.supabase.from('portfolio').select('*').execute();
  },

  async getPosition(ticker) {
    const rows = await window.supabase.from('portfolio')
      .select('quantity,avg_buy_price')
      .eq('ticker', ticker)
      .execute();
    return rows?.[0] || null;
  },

  insertPosition(userId, ticker, quantity, avgBuyPrice) {
    return window.supabase.from('portfolio')
      .insert({ user_id: userId, ticker, quantity, avg_buy_price: avgBuyPrice })
      .execute();
  },

  updatePosition(userId, ticker, fields) {
    return window.supabase.from('portfolio')
      .update(fields)
      .eq('user_id', userId)
      .eq('ticker', ticker)
      .execute();
  },

  deletePosition(userId, ticker) {
    return window.supabase.from('portfolio')
      .delete()
      .eq('user_id', userId)
      .eq('ticker', ticker)
      .execute();
  },

  getTransactions(limit) {
    const q = window.supabase.from('transactions').select('*')
      .order('created_at', { ascending: false });
    if (limit) q.limit(limit);
    return q.execute();
  },

  insertTransaction(userId, ticker, type, quantity, price, totalAmount) {
    return window.supabase.from('transactions')
      .insert({ user_id: userId, ticker, type, quantity, price, total_amount: totalAmount })
      .execute();
  },
};
