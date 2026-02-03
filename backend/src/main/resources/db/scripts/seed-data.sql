-- Sample data for Yambo products, families, promotions, and orders
-- Run this script after the database schema is created

-- ========================================
-- 0. PROJECTS
-- ========================================

INSERT INTO project (id, name, active, season)
VALUES
    ('PRJ00001', 'Proyecto Barrio', true, '2026'),
    ('PRJ00002', 'Proyecto Premium', true, '2026');

-- ========================================
-- 1. FAMILY PRODUCTS
-- ========================================

-- Family: Ropa Barrio (expires in 1 year)
INSERT INTO family_product (id, name, end_tms) 
VALUES ('FAM00001', 'Ropa Barrio', CURRENT_TIMESTAMP + INTERVAL '1 year');

-- Family: Ropa Premium (expires in 2 years)
INSERT INTO family_product (id, name, end_tms) 
VALUES ('FAM00002', 'Ropa Premium', CURRENT_TIMESTAMP + INTERVAL '2 years');

-- Family: Accesorios (expires in 6 months)
INSERT INTO family_product (id, name, end_tms) 
VALUES ('FAM00003', 'Accesorios', CURRENT_TIMESTAMP + INTERVAL '6 months');

-- ========================================
-- 2. FAMILY PRODUCT - PROFILE RELATIONS
-- ========================================
-- Assuming you have profiles with IDs like 'STUDENT', 'PREMIUM', etc.
-- Adjust these IDs based on your actual profile data

INSERT INTO family_product_profile (family_product_id, profile_id)
VALUES 
    ('FAM00001', 'STUDENT'),
    ('FAM00001', 'BASIC'),
    ('FAM00002', 'PREMIUM'),
    ('FAM00002', 'VIP'),
    ('FAM00003', 'BASIC'),
    ('FAM00003', 'PREMIUM');

-- ========================================
-- 2.1 FAMILY PRODUCT - PROJECT RELATIONS
-- ========================================

INSERT INTO family_product_project (family_product_id, project_id)
VALUES
    ('FAM00001', 'PRJ00001'),
    ('FAM00002', 'PRJ00002'),
    ('FAM00003', 'PRJ00001');

-- ========================================
-- 3. PRODUCTS
-- ========================================

-- Products for Ropa Barrio family
INSERT INTO product (id, name, project_id, active, base_price, options, family_product_id)
VALUES (
    'PROD0001', 
    'Sudadera Barrio', 
    'PRJ00001', 
    true, 
    20.00, 
    '[{"name":"Talla","type":"select","values":[{"id":"s","label":"S","price":0},{"id":"m","label":"M","price":0},{"id":"l","label":"L","price":0},{"id":"xl","label":"XL","price":2}],"required":true},{"name":"Nombre","type":"text_input","values":[],"required":false,"price":5}]',
    'FAM00001'
);

INSERT INTO product (id, name, project_id, active, base_price, options, family_product_id)
VALUES (
    'PROD0002', 
    'Camiseta Barrio', 
    'PRJ00001', 
    true, 
    15.00, 
    '[{"name":"Talla","type":"select","values":[{"id":"s","label":"S","price":0},{"id":"m","label":"M","price":0},{"id":"l","label":"L","price":0}],"required":true},{"name":"Color","type":"select","values":[{"id":"black","label":"Negro","price":0},{"id":"white","label":"Blanco","price":0},{"id":"red","label":"Rojo","price":1}],"required":true}]',
    'FAM00001'
);

-- Products for Ropa Premium family
INSERT INTO product (id, name, project_id, active, base_price, options, family_product_id)
VALUES (
    'PROD0003', 
    'Sudadera Premium', 
    'PRJ00002', 
    true, 
    35.00, 
    '[{"name":"Talla","type":"select","values":[{"id":"s","label":"S","price":0},{"id":"m","label":"M","price":0},{"id":"l","label":"L","price":0},{"id":"xl","label":"XL","price":3},{"id":"xxl","label":"XXL","price":5}],"required":true},{"name":"Bordado personalizado","type":"text_input","values":[],"required":false,"price":10}]',
    'FAM00002'
);

INSERT INTO product (id, name, project_id, active, base_price, options, family_product_id)
VALUES (
    'PROD0004', 
    'Chaqueta Premium', 
    'PRJ00002', 
    true, 
    50.00, 
    '[{"name":"Talla","type":"select","values":[{"id":"s","label":"S","price":0},{"id":"m","label":"M","price":0},{"id":"l","label":"L","price":0},{"id":"xl","label":"XL","price":5}],"required":true}]',
    'FAM00002'
);

-- Products for Accesorios family
INSERT INTO product (id, name, project_id, active, base_price, options, family_product_id)
VALUES (
    'PROD0005', 
    'Gorra', 
    NULL, 
    true, 
    12.00, 
    '[{"name":"Color","type":"select","values":[{"id":"black","label":"Negro","price":0},{"id":"white","label":"Blanco","price":0},{"id":"navy","label":"Azul marino","price":0}],"required":true},{"name":"Logo","type":"select","values":[{"id":"none","label":"Sin logo","price":0},{"id":"basic","label":"Logo básico","price":3},{"id":"custom","label":"Logo personalizado","price":5}],"required":true}]',
    'FAM00003'
);

INSERT INTO product (id, name, project_id, active, base_price, options, family_product_id)
VALUES (
    'PROD0006', 
    'Mochila', 
    NULL, 
    true, 
    25.00, 
    '[{"name":"Tamaño","type":"select","values":[{"id":"small","label":"Pequeña","price":0},{"id":"medium","label":"Mediana","price":5},{"id":"large","label":"Grande","price":10}],"required":true}]',
    'FAM00003'
);

-- ========================================
-- 4. PROMOTIONS
-- ========================================

-- Active promotion for STUDENT profile (30 days)
INSERT INTO promotion (id, start_tms, end_tms, profile_id)
VALUES (
    'PROMO001',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP + INTERVAL '25 days',
    'STUDENT'
);

-- Future promotion for PREMIUM profile (starts in 10 days, lasts 60 days)
INSERT INTO promotion (id, start_tms, end_tms, profile_id)
VALUES (
    'PROMO002',
    CURRENT_TIMESTAMP + INTERVAL '10 days',
    CURRENT_TIMESTAMP + INTERVAL '70 days',
    'PREMIUM'
);

-- Expired promotion for BASIC profile
INSERT INTO promotion (id, start_tms, end_tms, profile_id)
VALUES (
    'PROMO003',
    CURRENT_TIMESTAMP - INTERVAL '60 days',
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    'BASIC'
);

-- ========================================
-- 5. SAMPLE ORDERS
-- ========================================

-- Order 1: PENDING_CONFIRMATION (status=0)
INSERT INTO "order" (id, customer_id, status, payment_id, created_at)
VALUES (
    'ORD00001',
    1001,
    0,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
);

INSERT INTO order_product (order_id, product_id, configuration, price, quantity)
VALUES 
    ('ORD00001', 'PROD0001', '{"Talla":"l","Nombre":"Juan"}', 25.00, 1),
    ('ORD00001', 'PROD0005', '{"Color":"black","Logo":"basic"}', 15.00, 2);

-- Order 2: CONFIRMED (status=1)
INSERT INTO "order" (id, customer_id, status, payment_id, created_at)
VALUES (
    'ORD00002',
    1002,
    1,
    5001,
    CURRENT_TIMESTAMP - INTERVAL '1 day'
);

INSERT INTO order_product (order_id, product_id, configuration, price, quantity)
VALUES 
    ('ORD00002', 'PROD0003', '{"Talla":"m","Bordado personalizado":"María"}', 45.00, 1);

-- Order 3: IN_PROGRESS (status=2)
INSERT INTO "order" (id, customer_id, status, payment_id, created_at)
VALUES (
    'ORD00003',
    1001,
    2,
    5002,
    CURRENT_TIMESTAMP - INTERVAL '3 days'
);

INSERT INTO order_product (order_id, product_id, configuration, price, quantity)
VALUES 
    ('ORD00003', 'PROD0002', '{"Talla":"l","Color":"black"}', 15.00, 3),
    ('ORD00003', 'PROD0006', '{"Tamaño":"medium"}', 30.00, 1);

-- Order 4: DELIVERED (status=3)
INSERT INTO "order" (id, customer_id, status, payment_id, created_at)
VALUES (
    'ORD00004',
    1003,
    3,
    5003,
    CURRENT_TIMESTAMP - INTERVAL '7 days'
);

INSERT INTO order_product (order_id, product_id, configuration, price, quantity)
VALUES 
    ('ORD00004', 'PROD0004', '{"Talla":"xl"}', 55.00, 1);

-- Order 5: CANCELLED (status=4)
INSERT INTO "order" (id, customer_id, status, payment_id, created_at)
VALUES (
    'ORD00005',
    1002,
    4,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '5 days'
);

INSERT INTO order_product (order_id, product_id, configuration, price, quantity)
VALUES 
    ('ORD00005', 'PROD0001', '{"Talla":"m"}', 20.00, 1);

-- ========================================
-- NOTES:
-- ========================================
-- 1. Order status values:
--    0 = PENDING_CONFIRMATION
--    1 = CONFIRMED
--    2 = IN_PROGRESS
--    3 = DELIVERED
--    4 = CANCELLED
--
-- 2. Make sure profiles (STUDENT, BASIC, PREMIUM, VIP) exist in your profile table
--    before running this script, or adjust the profile_id values accordingly.
--
-- 3. Customer IDs are arbitrary integers (1001, 1002, 1003).
--    Adjust based on your user/customer management system.
--
-- 4. Product IDs use a simple format: PROD0001, PROD0002, etc.
--    Family IDs: FAM00001, FAM00002, etc.
--    Order IDs: ORD00001, ORD00002, etc.
--
-- 5. The JSON options are PostgreSQL-compatible JSON format.
