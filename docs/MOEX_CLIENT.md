# MOEX ISS API Client — Документация

JavaScript-клиент для работы с официальным REST API Московской биржи (ISS MOEX).

---

## Подключение

```html

<script src="../moex.js"></script>
```

```js
const moex = new MoexClient();
```

### Опции конструктора

```js
const moex = new MoexClient({
  baseUrl:    'https://iss.moex.com/iss', // по умолчанию
  rateLimitMs: 500,                       // задержка между запросами (мс)
});
```

---

## Акции (stock / shares / TQBR)

### Все акции с текущими котировками

```js
const { securities, marketdata } = await moex.getAllStocks();

// Объединить в один массив объектов по SECID
const stocks = moex.merge(securities, marketdata);

console.log(stocks[0]);
// { SECID: 'SBER', SHORTNAME: 'Сбербанк', LAST: 281.5, CHANGE: 1.3, ... }
```

### Котировка одной акции

```js
const { security, marketdata } = await moex.getStock('SBER');

console.log(security.SHORTNAME);    // 'Сбербанк'
console.log(marketdata.LAST);       // последняя цена
console.log(marketdata.CHANGE);     // изменение в рублях
console.log(marketdata.LASTTOPREVPRICE); // изменение в %
```

---

## Исторические данные (OHLCV)

### За период (с авто-пагинацией)

```js
const history = await moex.getStockHistory('GAZP', '2024-01-01', '2024-12-31');

history.forEach(day => {
  console.log(day.TRADEDATE, day.OPEN, day.HIGH, day.LOW, day.CLOSE, day.VOLUME);
});
```

### Одна страница истории (вручную)

```js
const page = await moex.getHistory('stock', 'shares', 'TQBR', 'LKOH', {
  from:  '2025-01-01',
  till:  '2025-03-27',
  start: 0,
  limit: 50,
});
```

---

## Свечи (candleborders)

### Получить свечи

```js
// Часовые свечи за период
const candles = await moex.getStockCandles('YNDX', 60, '2025-03-01', '2025-03-27');

// Дневные свечи (interval = 24)
const daily = await moex.getStockCandles('SBER', 24, '2025-01-01', '2025-03-27');

candles.forEach(c => {
  console.log(c.BEGIN, c.OPEN, c.HIGH, c.LOW, c.CLOSE, c.VOLUME);
});
```

Доступные интервалы:

| Значение | Период свечи |
|----------|-------------|
| `1`      | 1 минута    |
| `10`     | 10 минут    |
| `60`     | 1 час       |
| `24`     | 1 день      |

---

## Стакан заявок (order book)

```js
const { bids, asks } = await moex.getOrderBook('stock', 'shares', 'TQBR', 'SBER');

console.log('Покупка:', bids[0]); // { PRICE: 281.4, QUANTITY: 500, ... }
console.log('Продажа:', asks[0]); // { PRICE: 281.5, QUANTITY: 300, ... }
```

---

## Сделки

```js
const trades = await moex.getTrades('stock', 'shares', 'TQBR', 'GAZP', { limit: 50 });

trades.forEach(t => {
  console.log(t.TRADETIME, t.PRICE, t.QUANTITY, t.BUYSELL);
  // '14:32:01'  162.3   10   'B'
});
```

---

## Другие рынки

### Облигации

```js
// Корпоративные облигации (TQCB)
const { security, marketdata } = await moex.getBond('RU000A106HB5');

// ОФЗ (TQOB)
const { security, marketdata } = await moex.getBond('SU26238RMFS4', 'TQOB');
```

### Валюта

```js
const { marketdata } = await moex.getCurrency('USD000UTSTOM'); // USD/RUB
const { marketdata } = await moex.getCurrency('EUR000UTSTOM'); // EUR/RUB
const { marketdata } = await moex.getCurrency('CNY000UTSTOM'); // CNY/RUB

console.log(marketdata.LAST); // курс
```

### Фьючерсы

```js
const { security, marketdata } = await moex.getFutures('SiM5'); // фьючерс USD/RUB
const { security, marketdata } = await moex.getFutures('GZM5'); // фьючерс на газ
```

---

## Универсальные методы

Все convenience-методы построены поверх универсальных. Используй их для нестандартных запросов.

### getSecurities — список бумаг доски

```js
const { securities, marketdata } = await moex.getSecurities(
  'stock',    // engine
  'shares',   // market
  'TQBR',     // board
  { start: 0, limit: 20 } // опционально
);
```

### getSecurity — одна бумага

```js
const { security, marketdata } = await moex.getSecurity(
  'currency', 'selt', 'CETS', 'USD000UTSTOM'
);
```

### getHistory — история одной страницей

```js
const rows = await moex.getHistory(
  'futures', 'forts', 'RFUD', 'SiM5',
  { from: '2025-01-01', till: '2025-03-27' }
);
```

### getFullHistory — история с пагинацией

```js
const rows = await moex.getFullHistory(
  'stock', 'bonds', 'TQOB', 'SU26238RMFS4',
  { from: '2020-01-01', till: '2025-03-27' }
);
```

### getCandles — свечи

```js
const candles = await moex.getCandles(
  'stock', 'shares', 'TQBR', 'SBER',
  { interval: 10, from: '2025-03-27', till: '2025-03-27' }
);
```

### getOrderBook — стакан

```js
const { bids, asks } = await moex.getOrderBook(
  'stock', 'shares', 'TQBR', 'SBER'
);
```

### getTrades — сделки

```js
const trades = await moex.getTrades(
  'stock', 'shares', 'TQBR', 'SBER',
  { limit: 200, start: 0 }
);
```

---

## Вспомогательный метод merge()

ISS возвращает блоки `securities` и `marketdata` отдельно. `merge()` объединяет их по полю `SECID`:

```js
const { securities, marketdata } = await moex.getAllStocks();
const stocks = moex.merge(securities, marketdata);

// Теперь у каждого объекта есть и справочные поля, и текущие котировки
stocks.filter(s => s.LAST > 0).forEach(s => {
  console.log(`${s.SECID}: ${s.LAST} ₽ (${s.SHORTNAME})`);
});
```

---

## Формат ответа ISS

ISS возвращает данные в колончатом формате. Клиент автоматически конвертирует их в объекты:

```json
// Сырой ответ ISS
{
  "securities": {
    "columns": ["SECID", "SHORTNAME", "LATNAME"],
    "data":    [["SBER", "Сбербанк", "Sberbank"]]
  }
}

// После _toObjects() — массив объектов
[{ "SECID": "SBER", "SHORTNAME": "Сбербанк", "LATNAME": "Sberbank" }]
```

---

## Справка: engine / market / board

| Рынок          | engine     | market  | board  |
|----------------|-----------|---------|--------|
| Акции (основной) | `stock`  | `shares` | `TQBR` |
| ETF / ПИФы     | `stock`   | `shares` | `TQTF` |
| Корп. облигации | `stock`  | `bonds`  | `TQCB` |
| ОФЗ            | `stock`   | `bonds`  | `TQOB` |
| Валюта         | `currency` | `selt`  | `CETS` |
| Фьючерсы       | `futures`  | `forts`  | `RFUD` |
| Опционы        | `futures`  | `forts`  | `ROPT` |

---

## Ограничения

- Данные задержаны на **15 минут** для бесплатного доступа
- Авторизация не требуется для публичных эндпоинтов
- Рекомендуемый темп запросов: **не чаще 1–2 в секунду** (по умолчанию 500 мс)
- При использовании с `file://` протоколом может потребоваться прокси из-за ограничений CORS
