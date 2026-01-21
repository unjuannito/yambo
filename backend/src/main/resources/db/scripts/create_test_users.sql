-- ============================================================================
-- Test Users Creation Script
-- ============================================================================
-- This script creates test users with BCrypt-hashed passwords.
-- Default password for all users: "password123"
-- BCrypt hash: $2a$12$IAa4hHf3bKTL89TE.AaSUecGwjyAVM4u//SCYXF6PPnBIPtELY82K
-- ============================================================================

-- Ensure profiles exist first (ADMIN and USER profiles should be created by Liquibase)
-- If not, uncomment these lines:
-- INSERT INTO profile (id, name) VALUES ('ADMIN', 'Administrator') ON CONFLICT (id) DO NOTHING;
-- INSERT INTO profile (id, name) VALUES ('USER', 'Standard User') ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CREATE TEST USERS
-- ============================================================================
-- Password for all users: "password123"

-- Admin User
INSERT INTO "user" (id, password, email, name, created_at, enabled)
VALUES (
    'UADMIN01',
    '$2a$12$IAa4hHf3bKTL89TE.AaSUecGwjyAVM4u//SCYXF6PPnBIPtELY82K',
    'admin@yambo.com',
    'System Administrator',
    CURRENT_TIMESTAMP,
    true
) ON CONFLICT (id) DO NOTHING;

-- Regular Users
INSERT INTO "user" (id, password, email, name, created_at, enabled)
VALUES (
    'UUSER001',
    '$2a$12$IAa4hHf3bKTL89TE.AaSUecGwjyAVM4u//SCYXF6PPnBIPtELY82K',
    'john.doe@example.com',
    'John Doe',
    CURRENT_TIMESTAMP,
    true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "user" (id, password, email, name, created_at, enabled)
VALUES (
    'UUSER002',
    '$2a$12$IAa4hHf3bKTL89TE.AaSUecGwjyAVM4u//SCYXF6PPnBIPtELY82K',
    'jane.smith@example.com',
    'Jane Smith',
    CURRENT_TIMESTAMP,
    true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "user" (id, password, email, name, created_at, enabled)
VALUES (
    'UUSER003',
    '$2a$12$IAa4hHf3bKTL89TE.AaSUecGwjyAVM4u//SCYXF6PPnBIPtELY82K',
    'bob.wilson@example.com',
    'Bob Wilson',
    CURRENT_TIMESTAMP,
    true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "user" (id, password, email, name, created_at, enabled)
VALUES (
    'UUSER004',
    '$2a$12$IAa4hHf3bKTL89TE.AaSUecGwjyAVM4u//SCYXF6PPnBIPtELY82K',
    'alice.johnson@example.com',
    'Alice Johnson',
    CURRENT_TIMESTAMP,
    true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "user" (id, password, email, name, created_at, enabled)
VALUES (
    'UUSER005',
    '$2a$12$IAa4hHf3bKTL89TE.AaSUecGwjyAVM4u//SCYXF6PPnBIPtELY82K',
    'charlie.brown@example.com',
    'Charlie Brown',
    CURRENT_TIMESTAMP,
    true
) ON CONFLICT (id) DO NOTHING;

-- Disabled User (for testing)
INSERT INTO "user" (id, password, email, name, created_at, enabled)
VALUES (
    'UUSER006',
    '$2a$12$IAa4hHf3bKTL89TE.AaSUecGwjyAVM4u//SCYXF6PPnBIPtELY82K',
    'disabled.user@example.com',
    'Disabled User',
    CURRENT_TIMESTAMP,
    false
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ASSIGN PROFILES TO USERS
-- ============================================================================

-- Admin user gets ADMIN profile
INSERT INTO user_profile (user_id, profile_id)
VALUES ('UADMIN01', 'ADMIN')
ON CONFLICT (user_id, profile_id) DO NOTHING;

-- Regular users get USER profile
INSERT INTO user_profile (user_id, profile_id)
VALUES ('UUSER001', 'USER')
ON CONFLICT (user_id, profile_id) DO NOTHING;

INSERT INTO user_profile (user_id, profile_id)
VALUES ('UUSER002', 'USER')
ON CONFLICT (user_id, profile_id) DO NOTHING;

INSERT INTO user_profile (user_id, profile_id)
VALUES ('UUSER003', 'USER')
ON CONFLICT (user_id, profile_id) DO NOTHING;

INSERT INTO user_profile (user_id, profile_id)
VALUES ('UUSER004', 'USER')
ON CONFLICT (user_id, profile_id) DO NOTHING;

INSERT INTO user_profile (user_id, profile_id)
VALUES ('UUSER005', 'USER')
ON CONFLICT (user_id, profile_id) DO NOTHING;

INSERT INTO user_profile (user_id, profile_id)
VALUES ('UUSER006', 'USER')
ON CONFLICT (user_id, profile_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES (optional - uncomment to verify)
-- ============================================================================
-- SELECT u.id, u.email, u.name, u.enabled, p.name as profile_name
-- FROM "user" u
-- LEFT JOIN user_profile up ON u.id = up.user_id
-- LEFT JOIN profile p ON up.profile_id = p.id
-- ORDER BY u.id;
