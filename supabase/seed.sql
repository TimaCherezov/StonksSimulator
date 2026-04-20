-- ==============================================
-- StonksSimulator — Seed Data
-- 2 тестовых пользователя, пароль: password123
-- ==============================================

-- ──────────────────────────────────────────────
-- USERS (auth.users)
-- ──────────────────────────────────────────────
insert into auth.users (
  id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data, raw_app_meta_data,
  aud, role
) values
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  'vladislav@test.com',
  crypt('password123', gen_salt('bf')),
  now(), now(), now(),
  '{"username": "Владислав"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated'
),
(
  'a1b2c3d4-0000-0000-0000-000000000002',
  'alexey@test.com',
  crypt('password123', gen_salt('bf')),
  now(), now(), now(),
  '{"username": "Алексей"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated'
);

-- profiles создаются автоматически триггером handle_new_user,
-- но обновим баланс Алексея чтобы данные различались
update profiles set balance = 75000.00
where id = 'a1b2c3d4-0000-0000-0000-000000000002';

-- ──────────────────────────────────────────────
-- TRANSACTIONS
-- ──────────────────────────────────────────────
insert into transactions (user_id, ticker, type, quantity, price, total_amount, created_at) values
-- Владислав
('a1b2c3d4-0000-0000-0000-000000000001', 'SBER', 'buy',  100, 280.50,  28050.00, now() - interval '10 days'),
('a1b2c3d4-0000-0000-0000-000000000001', 'YNDX', 'buy',   10, 3200.00, 32000.00, now() - interval '7 days'),
('a1b2c3d4-0000-0000-0000-000000000001', 'GAZP', 'buy',  200, 160.00,  32000.00, now() - interval '5 days'),
('a1b2c3d4-0000-0000-0000-000000000001', 'SBER', 'sell',  50, 290.00,  14500.00, now() - interval '2 days'),
-- Алексей
('a1b2c3d4-0000-0000-0000-000000000002', 'LKOH', 'buy',    5, 7100.00, 35500.00, now() - interval '8 days'),
('a1b2c3d4-0000-0000-0000-000000000002', 'SBER', 'buy',   50, 275.00,  13750.00, now() - interval '6 days'),
('a1b2c3d4-0000-0000-0000-000000000002', 'LKOH', 'sell',   2, 7300.00, 14600.00, now() - interval '1 day');

-- ──────────────────────────────────────────────
-- PORTFOLIO (текущие позиции)
-- ──────────────────────────────────────────────
insert into portfolio (user_id, ticker, quantity, avg_buy_price) values
-- Владислав: купил 100 SBER, продал 50 → осталось 50
('a1b2c3d4-0000-0000-0000-000000000001', 'SBER', 50,  280.50),
('a1b2c3d4-0000-0000-0000-000000000001', 'YNDX', 10, 3200.00),
('a1b2c3d4-0000-0000-0000-000000000001', 'GAZP', 200, 160.00),
-- Алексей: купил 5 LKOH, продал 2 → осталось 3
('a1b2c3d4-0000-0000-0000-000000000002', 'LKOH', 3, 7100.00),
('a1b2c3d4-0000-0000-0000-000000000002', 'SBER', 50,  275.00);

-- ──────────────────────────────────────────────
-- WATCHLIST
-- ──────────────────────────────────────────────
insert into watchlist (user_id, ticker) values
('a1b2c3d4-0000-0000-0000-000000000001', 'LKOH'),
('a1b2c3d4-0000-0000-0000-000000000001', 'GMKN'),
('a1b2c3d4-0000-0000-0000-000000000002', 'YNDX'),
('a1b2c3d4-0000-0000-0000-000000000002', 'TATN');
