--
-- PostgreSQL database dump
--

-- Dumped from database version 14.19 (Debian 14.19-1.pgdg13+1)
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: permission; Type: TABLE DATA; Schema: public; Owner: yambo_user
--

INSERT INTO public.permission (id, resource, action, has_condition) VALUES ('P0000001', 'product', 'read', true);
INSERT INTO public.permission (id, resource, action, has_condition) VALUES ('P0000002', 'order', 'read', true);
INSERT INTO public.permission (id, resource, action, has_condition) VALUES ('P0000003', 'p_order', 'create', true);
INSERT INTO public.permission (id, resource, action, has_condition) VALUES ('P0000004', 'order', 'read', false);
INSERT INTO public.permission (id, resource, action, has_condition) VALUES ('P0000005', 'product', 'read', false);
INSERT INTO public.permission (id, resource, action, has_condition) VALUES ('P0000006', 'product', 'create', false);
INSERT INTO public.permission (id, resource, action, has_condition) VALUES ('P0000007', 'order', 'create', true);


--
-- Data for Name: condition; Type: TABLE DATA; Schema: public; Owner: yambo_user
--

INSERT INTO public.condition (id, permission_id, resource_field, operator, source_object, source_field, depends_on_permission, description) VALUES ('C0000001', 'P0000003', 'product_id', 'IN', 'product', 'id', 'read', 'Can create p_orders only for products the user can view');
INSERT INTO public.condition (id, permission_id, resource_field, operator, source_object, source_field, depends_on_permission, description) VALUES ('C0000002', 'P0000002', 'owner_id', '=', 'currentUser', 'id', NULL, 'Can view only their own orders');
INSERT INTO public.condition (id, permission_id, resource_field, operator, source_object, source_field, depends_on_permission, description) VALUES ('C0000003', 'P0000001', 'project_id', 'IN', 'project', 'id', 'read', 'Can view only products from their own project');
INSERT INTO public.condition (id, permission_id, resource_field, operator, source_object, source_field, depends_on_permission, description) VALUES ('C0000004', 'P0000007', 'id', 'IN', 'p_order', 'order_id', 'read', 'Can create orders only for p_orders the user can view and are related');


--
-- Data for Name: family_product; Type: TABLE DATA; Schema: public; Owner: yambo_user
--



--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: yambo_user
--

INSERT INTO public."user" (id, password, email, name, created_at, created_by, enabled) VALUES ('A0000001', '$2a$12$MgH0iPLT7/rTOpIAuVkLoOZ.3I4SY8vdT4qcDZFnvFuhca31nWj4O', 'admin@yambo.local', 'Admin', '2025-11-04 18:23:15.537683', NULL, true);
-- email: admin@yambo.local password: password123


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: yambo_user
--



--
-- Data for Name: profile; Type: TABLE DATA; Schema: public; Owner: yambo_user
--

INSERT INTO public.profile (id, name) VALUES ('P0000001', 'Padre');
INSERT INTO public.profile (id, name) VALUES ('P0000002', 'Gestor');
INSERT INTO public.profile (id, name) VALUES ('P0000003', 'Admin');


--
-- Data for Name: invitation_profile; Type: TABLE DATA; Schema: public; Owner: yambo_user
--



--
-- Data for Name: order; Type: TABLE DATA; Schema: public; Owner: yambo_user
--



--
-- Data for Name: project; Type: TABLE DATA; Schema: public; Owner: yambo_user
--



--
-- Data for Name: product; Type: TABLE DATA; Schema: public; Owner: yambo_user
--



--
-- Data for Name: order_product; Type: TABLE DATA; Schema: public; Owner: yambo_user
--



--
-- Data for Name: profile_permission; Type: TABLE DATA; Schema: public; Owner: yambo_user
--

INSERT INTO public.profile_permission (profile_id, permission_id) VALUES ('P0000001', 'P0000005');
INSERT INTO public.profile_permission (profile_id, permission_id) VALUES ('P0000001', 'P0000001');
INSERT INTO public.profile_permission (profile_id, permission_id) VALUES ('P0000001', 'P0000004');
INSERT INTO public.profile_permission (profile_id, permission_id) VALUES ('P0000001', 'P0000002');
INSERT INTO public.profile_permission (profile_id, permission_id) VALUES ('P0000001', 'P0000003');
INSERT INTO public.profile_permission (profile_id, permission_id) VALUES ('P0000001', 'P0000007');
INSERT INTO public.profile_permission (profile_id, permission_id) VALUES ('P0000002', 'P0000004');
INSERT INTO public.profile_permission (profile_id, permission_id) VALUES ('P0000002', 'P0000002');
INSERT INTO public.profile_permission (profile_id, permission_id) VALUES ('P0000002', 'P0000005');
INSERT INTO public.profile_permission (profile_id, permission_id) VALUES ('P0000002', 'P0000001');
INSERT INTO public.profile_permission (profile_id, permission_id) VALUES ('P0000002', 'P0000006');
INSERT INTO public.profile_permission (profile_id, permission_id) VALUES ('P0000003', 'P0000001');
INSERT INTO public.profile_permission (profile_id, permission_id) VALUES ('P0000003', 'P0000002');
INSERT INTO public.profile_permission (profile_id, permission_id) VALUES ('P0000003', 'P0000003');
INSERT INTO public.profile_permission (profile_id, permission_id) VALUES ('P0000003', 'P0000004');
INSERT INTO public.profile_permission (profile_id, permission_id) VALUES ('P0000003', 'P0000005');
INSERT INTO public.profile_permission (profile_id, permission_id) VALUES ('P0000003', 'P0000006');
INSERT INTO public.profile_permission (profile_id, permission_id) VALUES ('P0000003', 'P0000007');


--
-- Data for Name: promotion; Type: TABLE DATA; Schema: public; Owner: yambo_user
--



--
-- Data for Name: user_permission; Type: TABLE DATA; Schema: public; Owner: yambo_user
--



--
-- Data for Name: user_profile; Type: TABLE DATA; Schema: public; Owner: yambo_user
--

INSERT INTO public.user_profile (user_id, profile_id) VALUES ('A0000001', 'P0000003');


--
-- Data for Name: user_project; Type: TABLE DATA; Schema: public; Owner: yambo_user
--



--
-- Name: invitations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yambo_user
--

SELECT pg_catalog.setval('public.invitations_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

