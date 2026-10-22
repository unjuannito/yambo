-- =============================================================================
-- PREVIEW ENVIRONMENT SEED DATA
-- =============================================================================
-- Realistic but fully anonymized data for PR preview environments.
-- All emails use the @preview.invalid domain (RFC 2606 reserved — never real).
-- All passwords are bcrypt("preview123").
-- No real personal data is present in this file.
--
-- This file is loaded AFTER Liquibase has run all migrations (schema already
-- exists). It is idempotent: safe to run multiple times.
--
-- To regenerate from production run:
--   ./scripts/anonymize-dump.sh
-- =============================================================================

-- bcrypt("preview123") — same hash used throughout this file
-- $2a$12$S0KapdLdqT.R2EVj6mLgBu4LTMlB7Ikxa3ApmIJhrVPO9v9TL/qd2

-- =============================================================================
-- USERS  (profiles created by Liquibase: P0000001=Padre P0000002=Gestor
--          P0000003=Admin  P0000004=Monitor)
-- =============================================================================

INSERT INTO "user" (id, password, email, name, created_at, enabled, system)
VALUES
    -- Admin (one admin besides the Liquibase-created A0000001)
    ('PREV0001', '$2a$12$S0KapdLdqT.R2EVj6mLgBu4LTMlB7Ikxa3ApmIJhrVPO9v9TL/qd2',
     'admin2@preview.invalid',    'Admin Preview',       NOW() - INTERVAL '90 days', true,  false),

    -- Managers (Gestores)
    ('PREV0002', '$2a$12$S0KapdLdqT.R2EVj6mLgBu4LTMlB7Ikxa3ApmIJhrVPO9v9TL/qd2',
     'gestor1@preview.invalid',   'Gestor Uno',          NOW() - INTERVAL '80 days', true,  false),
    ('PREV0003', '$2a$12$S0KapdLdqT.R2EVj6mLgBu4LTMlB7Ikxa3ApmIJhrVPO9v9TL/qd2',
     'gestor2@preview.invalid',   'Gestor Dos',          NOW() - INTERVAL '75 days', true,  false),

    -- Monitors
    ('PREV0004', '$2a$12$S0KapdLdqT.R2EVj6mLgBu4LTMlB7Ikxa3ApmIJhrVPO9v9TL/qd2',
     'monitor1@preview.invalid',  'Monitor Uno',         NOW() - INTERVAL '60 days', true,  false),

    -- Padres (regular users who place orders)
    ('PREV0005', '$2a$12$S0KapdLdqT.R2EVj6mLgBu4LTMlB7Ikxa3ApmIJhrVPO9v9TL/qd2',
     'padre1@preview.invalid',    'Padre Uno',           NOW() - INTERVAL '55 days', true,  false),
    ('PREV0006', '$2a$12$S0KapdLdqT.R2EVj6mLgBu4LTMlB7Ikxa3ApmIJhrVPO9v9TL/qd2',
     'padre2@preview.invalid',    'Padre Dos',           NOW() - INTERVAL '50 days', true,  false),
    ('PREV0007', '$2a$12$S0KapdLdqT.R2EVj6mLgBu4LTMlB7Ikxa3ApmIJhrVPO9v9TL/qd2',
     'padre3@preview.invalid',    'Padre Tres',          NOW() - INTERVAL '45 days', true,  false),
    ('PREV0008', '$2a$12$S0KapdLdqT.R2EVj6mLgBu4LTMlB7Ikxa3ApmIJhrVPO9v9TL/qd2',
     'padre4@preview.invalid',    'Padre Cuatro',        NOW() - INTERVAL '40 days', true,  false),
    ('PREV0009', '$2a$12$S0KapdLdqT.R2EVj6mLgBu4LTMlB7Ikxa3ApmIJhrVPO9v9TL/qd2',
     'padre5@preview.invalid',    'Padre Cinco',         NOW() - INTERVAL '30 days', true,  false),
    ('PREV0010', '$2a$12$S0KapdLdqT.R2EVj6mLgBu4LTMlB7Ikxa3ApmIJhrVPO9v9TL/qd2',
     'padre6@preview.invalid',    'Padre Seis',          NOW() - INTERVAL '20 days', true,  false),

    -- Disabled user (for testing disabled-account flows)
    ('PREV0011', '$2a$12$S0KapdLdqT.R2EVj6mLgBu4LTMlB7Ikxa3ApmIJhrVPO9v9TL/qd2',
     'desactivado@preview.invalid','Usuario Desactivado', NOW() - INTERVAL '15 days', false, false)
ON CONFLICT (id) DO NOTHING;

-- Staff data (1:1 extension of user). PREV0004 is added to the staff manually;
-- PREV0002 only keeps dormant data (not currently staff).
INSERT INTO staff (user_id, bio, fun_fact, manual)
VALUES
    ('PREV0002', 'Gestor del equipo A', NULL, false),
    ('PREV0004', NULL, 'Me gusta el deporte', true)
ON CONFLICT (user_id) DO NOTHING;

-- Profile assignments
INSERT INTO user_profile (user_id, profile_id)
VALUES
    ('PREV0001', 'P0000003'),  -- Admin
    ('PREV0002', 'P0000002'),  -- Gestor
    ('PREV0003', 'P0000002'),  -- Gestor
    ('PREV0004', 'P0000004'),  -- Monitor
    ('PREV0005', 'P0000001'),  -- Padre
    ('PREV0006', 'P0000001'),
    ('PREV0007', 'P0000001'),
    ('PREV0008', 'P0000001'),
    ('PREV0009', 'P0000001'),
    ('PREV0010', 'P0000001'),
    ('PREV0011', 'P0000001')
ON CONFLICT (user_id, profile_id) DO NOTHING;

-- =============================================================================
-- PROJECTS
-- =============================================================================

INSERT INTO project (id, name, active, season)
VALUES
    ('PRJPREV1', 'Proyecto Primaria',   true,  '2026'),
    ('PRJPREV2', 'Proyecto Secundaria', true,  '2026'),
    ('PRJPREV3', 'Proyecto Bachiller',  false, '2025')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- FAMILY PRODUCTS (drops)
-- =============================================================================

INSERT INTO family_product (id, name, start_tms, end_tms, status)
VALUES
    ('FAMPREV1', 'Ropa Deportiva Primaria',
     NOW() - INTERVAL '20 days', NOW() + INTERVAL '10 days', 0),
    ('FAMPREV2', 'Uniforme Secundaria',
     NOW() - INTERVAL '30 days', NOW() + INTERVAL '30 days', 0),
    ('FAMPREV3', 'Sudaderas Fin de Curso',
     NOW() - INTERVAL '60 days', NOW() - INTERVAL '5 days',  1)  -- completed
ON CONFLICT (id) DO NOTHING;

-- Profiles that can see each family product
INSERT INTO family_product_profile (family_product_id, profile_id)
VALUES
    ('FAMPREV1', 'P0000001'),
    ('FAMPREV1', 'P0000002'),
    ('FAMPREV2', 'P0000001'),
    ('FAMPREV2', 'P0000002'),
    ('FAMPREV3', 'P0000001'),
    ('FAMPREV3', 'P0000002')
ON CONFLICT DO NOTHING;

-- Projects linked to each family product
INSERT INTO family_product_project (family_product_id, project_id)
VALUES
    ('FAMPREV1', 'PRJPREV1'),
    ('FAMPREV2', 'PRJPREV2'),
    ('FAMPREV3', 'PRJPREV1'),
    ('FAMPREV3', 'PRJPREV2')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- PRODUCTS
-- =============================================================================

INSERT INTO product (id, name, project_id, active, base_price, options, family_product_id)
VALUES
    ('PRPREV01', 'Sudadera con capucha', 'PRJPREV1', true, 22.00,
     '[{"name":"Talla","type":"select","values":[{"id":"s","label":"S","price":0},{"id":"m","label":"M","price":0},{"id":"l","label":"L","price":0},{"id":"xl","label":"XL","price":2}],"required":true},{"name":"Nombre","type":"text_input","values":[],"required":false,"price":5}]',
     'FAMPREV1'),
    ('PRPREV02', 'Camiseta técnica', 'PRJPREV1', true, 14.00,
     '[{"name":"Talla","type":"select","values":[{"id":"s","label":"S","price":0},{"id":"m","label":"M","price":0},{"id":"l","label":"L","price":0}],"required":true},{"name":"Color","type":"select","values":[{"id":"azul","label":"Azul","price":0},{"id":"rojo","label":"Rojo","price":0}],"required":true}]',
     'FAMPREV1'),
    ('PRPREV03', 'Pantalón deportivo', 'PRJPREV1', true, 18.00,
     '[{"name":"Talla","type":"select","values":[{"id":"s","label":"S","price":0},{"id":"m","label":"M","price":0},{"id":"l","label":"L","price":0},{"id":"xl","label":"XL","price":2}],"required":true}]',
     'FAMPREV1'),
    ('PRPREV04', 'Polo Uniforme',       'PRJPREV2', true, 16.00,
     '[{"name":"Talla","type":"select","values":[{"id":"s","label":"S","price":0},{"id":"m","label":"M","price":0},{"id":"l","label":"L","price":0}],"required":true}]',
     'FAMPREV2'),
    ('PRPREV05', 'Pantalón Uniforme',   'PRJPREV2', true, 20.00,
     '[{"name":"Talla","type":"select","values":[{"id":"s","label":"S","price":0},{"id":"m","label":"M","price":0},{"id":"l","label":"L","price":0}],"required":true}]',
     'FAMPREV2'),
    ('PRPREV06', 'Sudadera Fin de Curso','PRJPREV1', false, 25.00,
     '[{"name":"Talla","type":"select","values":[{"id":"s","label":"S","price":0},{"id":"m","label":"M","price":0},{"id":"l","label":"L","price":0}],"required":true},{"name":"Nombre","type":"text_input","values":[],"required":false,"price":5}]',
     'FAMPREV3')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ORDERS
-- =============================================================================
-- status: 0=PENDING_CONFIRMATION 1=CONFIRMED 2=IN_PROGRESS 3=DELIVERED 4=CANCELLED

INSERT INTO "order" (id, customer_id, status, created_at, closed_at)
VALUES
    ('ORDPREV1', 'PREV0005', 0, NOW() - INTERVAL '2 hours',  NULL),             -- pending
    ('ORDPREV2', 'PREV0006', 1, NOW() - INTERVAL '3 days',   NULL),             -- confirmed
    ('ORDPREV3', 'PREV0007', 2, NOW() - INTERVAL '7 days',   NULL),             -- in progress
    ('ORDPREV4', 'PREV0008', 3, NOW() - INTERVAL '20 days',  NOW() - INTERVAL '5 days'),  -- delivered
    ('ORDPREV5', 'PREV0009', 4, NOW() - INTERVAL '15 days',  NOW() - INTERVAL '12 days'), -- cancelled
    ('ORDPREV6', 'PREV0010', 1, NOW() - INTERVAL '1 day',    NULL),             -- confirmed
    ('ORDPREV7', 'PREV0005', 3, NOW() - INTERVAL '25 days',  NOW() - INTERVAL '10 days'), -- delivered
    ('ORDPREV8', 'PREV0006', 0, NOW() - INTERVAL '1 hour',   NULL)              -- pending
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ORDER PRODUCTS
-- =============================================================================

INSERT INTO order_product (id, order_id, product_id, configuration, price, quantity, status)
VALUES
    -- ORDPREV1 (pending)
    (gen_random_uuid(), 'ORDPREV1', 'PRPREV01', '{"Talla":"l","Nombre":"Hijo Uno"}',       27.00, 1, 0),
    (gen_random_uuid(), 'ORDPREV1', 'PRPREV02', '{"Talla":"m","Color":"azul"}',             14.00, 2, 0),

    -- ORDPREV2 (confirmed)
    (gen_random_uuid(), 'ORDPREV2', 'PRPREV04', '{"Talla":"s"}',                            16.00, 1, 0),
    (gen_random_uuid(), 'ORDPREV2', 'PRPREV05', '{"Talla":"s"}',                            20.00, 1, 0),

    -- ORDPREV3 (in progress — one product will have an issue)
    (gen_random_uuid(), 'ORDPREV3', 'PRPREV01', '{"Talla":"xl","Nombre":"Hijo Tres"}',      29.00, 1, 0),
    (gen_random_uuid(), 'ORDPREV3', 'PRPREV03', '{"Talla":"m"}',                            18.00, 1, 0),

    -- ORDPREV4 (delivered)
    (gen_random_uuid(), 'ORDPREV4', 'PRPREV06', '{"Talla":"l","Nombre":"Hijo Cuatro"}',     30.00, 1, 0),

    -- ORDPREV5 (cancelled)
    (gen_random_uuid(), 'ORDPREV5', 'PRPREV02', '{"Talla":"s","Color":"rojo"}',             14.00, 1, 4),

    -- ORDPREV6 (confirmed)
    (gen_random_uuid(), 'ORDPREV6', 'PRPREV04', '{"Talla":"m"}',                            16.00, 2, 0),

    -- ORDPREV7 (delivered)
    (gen_random_uuid(), 'ORDPREV7', 'PRPREV01', '{"Talla":"m","Nombre":"Hijo Cinco"}',      27.00, 1, 0),

    -- ORDPREV8 (pending)
    (gen_random_uuid(), 'ORDPREV8', 'PRPREV05', '{"Talla":"l"}',                            20.00, 3, 0)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ISSUES  (linked to the in-progress order ORDPREV3)
-- issue.ordered_product_id → one of the order_product rows in ORDPREV3
-- =============================================================================

DO $$
DECLARE
    v_op_id UUID;
BEGIN
    -- Pick the first order_product row from ORDPREV3 that doesn't already have an issue
    SELECT op.id INTO v_op_id
    FROM order_product op
    WHERE op.order_id = 'ORDPREV3'
      AND NOT EXISTS (SELECT 1 FROM issue i WHERE i.ordered_product_id = op.id)
    ORDER BY op.product_id
    LIMIT 1;

    IF v_op_id IS NOT NULL THEN
        INSERT INTO issue (id, ordered_product_id, title, description, status, created_by, created_at, updated_at)
        VALUES (
            'ISSPREV1',
            v_op_id,
            'Talla incorrecta en el pedido',
            'El producto llegó en talla M en lugar de XL como se pidió en el formulario.',
            0,  -- OPEN
            'PREV0007',
            NOW() - INTERVAL '5 days',
            NOW() - INTERVAL '5 days'
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- =============================================================================
-- OPEN (generic) INVITATIONS  — test link-based registration flows
-- =============================================================================

INSERT INTO invitations (token, created_at, start_tms, expires_at, invited_by)
VALUES
    ('PREVIEW-TOKEN-OPEN-001', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days',
     NOW() + INTERVAL '20 days', 'PREV0002'),
    ('PREVIEW-TOKEN-OPEN-002', NOW() - INTERVAL '5 days',  NOW() - INTERVAL '5 days',
     NOW() + INTERVAL '25 days', 'PREV0002')
ON CONFLICT (token) DO NOTHING;

-- Assign Padre profile to the open invitations
INSERT INTO invitation_profile (invitation_id, profile_id)
SELECT i.id, 'P0000001'
FROM invitations i
WHERE i.token IN ('PREVIEW-TOKEN-OPEN-001', 'PREVIEW-TOKEN-OPEN-002')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- NOMINATIVE INVITATIONS  — test named-invite registration flows
-- =============================================================================

INSERT INTO nominative_invitations (email, token, used, created_at, expires_at, invited_by)
VALUES
    ('invitado1@preview.invalid', 'NOM-PREV-TOKEN-001', false,
     NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days', 'PREV0002'),
    ('invitado2@preview.invalid', 'NOM-PREV-TOKEN-002', true,
     NOW() - INTERVAL '8 days', NOW() + INTERVAL '1 day',  'PREV0003')
ON CONFLICT DO NOTHING;
