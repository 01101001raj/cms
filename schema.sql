-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  address_line1 character varying NOT NULL,
  address_line2 character varying,
  city character varying NOT NULL,
  state character varying NOT NULL,
  pincode character varying NOT NULL,
  phone character varying NOT NULL,
  email character varying NOT NULL,
  gstin character varying NOT NULL,
  pan character varying NOT NULL,
  bank_name character varying,
  account_number character varying,
  ifsc_code character varying,
  logo_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);
CREATE TABLE public.distributors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  state text,
  area text,
  credit_limit numeric NOT NULL DEFAULT 0,
  gstin text,
  billing_address text,
  has_special_schemes boolean NOT NULL DEFAULT false,
  asm_name text,
  executive_name text,
  wallet_balance numeric NOT NULL DEFAULT 0,
  date_added timestamp with time zone NOT NULL DEFAULT now(),
  price_tier_id uuid,
  store_id uuid,
  agent_code character varying UNIQUE,
  CONSTRAINT distributors_pkey PRIMARY KEY (id),
  CONSTRAINT distributors_price_tier_id_fkey FOREIGN KEY (price_tier_id) REFERENCES public.price_tiers(id),
  CONSTRAINT distributors_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date timestamp with time zone NOT NULL DEFAULT now(),
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  type USER-DEFINED NOT NULL,
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  sku_id character varying NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  is_freebie boolean NOT NULL,
  returned_quantity integer NOT NULL DEFAULT 0,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.skus(id)
);
CREATE TABLE public.order_returns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  distributor_id uuid NOT NULL,
  status USER-DEFINED NOT NULL,
  initiated_by text,
  initiated_date timestamp with time zone NOT NULL DEFAULT now(),
  confirmed_by text,
  confirmed_date timestamp with time zone,
  remarks text,
  total_credit_amount numeric NOT NULL,
  items jsonb,
  CONSTRAINT order_returns_pkey PRIMARY KEY (id),
  CONSTRAINT order_returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_returns_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES public.distributors(id)
);
CREATE TABLE public.orders (
  id text NOT NULL,
  distributor_id uuid NOT NULL,
  date timestamp with time zone NOT NULL DEFAULT now(),
  total_amount numeric NOT NULL,
  status USER-DEFINED NOT NULL,
  placed_by_exec_id text,
  delivered_date timestamp with time zone,
  approval_granted_by text,
  shipment_size numeric DEFAULT 0,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES public.distributors(id)
);
CREATE TABLE public.price_tier_items (
  tier_id uuid NOT NULL,
  sku_id uuid NOT NULL,
  price numeric NOT NULL,
  CONSTRAINT price_tier_items_pkey PRIMARY KEY (tier_id, sku_id),
  CONSTRAINT price_tier_items_tier_id_fkey FOREIGN KEY (tier_id) REFERENCES public.price_tiers(id)
);
CREATE TABLE public.price_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  CONSTRAINT price_tiers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.schemes (
  id uuid NOT NULL,
  description text NOT NULL,
  buy_sku_id character varying NOT NULL,
  buy_quantity integer NOT NULL,
  get_sku_id character varying NOT NULL,
  get_quantity integer NOT NULL,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  is_global boolean NOT NULL DEFAULT false,
  distributor_id uuid,
  store_id uuid,
  stopped_by text,
  stopped_date timestamp with time zone,
  CONSTRAINT schemes_pkey PRIMARY KEY (id),
  CONSTRAINT schemes_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES public.distributors(id),
  CONSTRAINT schemes_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT schemes_buy_sku_id_fkey FOREIGN KEY (buy_sku_id) REFERENCES public.skus(id),
  CONSTRAINT schemes_get_sku_id_fkey FOREIGN KEY (get_sku_id) REFERENCES public.skus(id)
);
CREATE TABLE public.skus (
  id character varying NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  price numeric NOT NULL,
  hsn_code text,
  gst_percentage numeric NOT NULL,
  category character varying,
  product_type character varying DEFAULT 'Volume'::character varying CHECK (product_type::text = ANY (ARRAY['Volume'::character varying, 'Mass'::character varying]::text[])),
  units_per_carton integer DEFAULT 1,
  unit_size numeric DEFAULT 1000,
  carton_size numeric DEFAULT 0,
  price_net_carton numeric DEFAULT 0,
  price_gross_carton numeric DEFAULT 0,
  status character varying DEFAULT 'Active'::character varying CHECK (status::text = ANY (ARRAY['Active'::character varying, 'Discontinued'::character varying, 'Out of Stock'::character varying]::text[])),
  CONSTRAINT skus_pkey PRIMARY KEY (id)
);
CREATE TABLE public.stock_items (
  sku_id character varying NOT NULL,
  location_id text NOT NULL DEFAULT 'NULL'::text,
  quantity integer NOT NULL DEFAULT 0,
  reserved integer NOT NULL DEFAULT 0,
  CONSTRAINT stock_items_pkey PRIMARY KEY (sku_id, location_id),
  CONSTRAINT stock_items_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.skus(id)
);
CREATE TABLE public.stock_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date timestamp with time zone NOT NULL DEFAULT now(),
  sku_id character varying NOT NULL,
  quantity_change integer NOT NULL,
  balance_after integer NOT NULL,
  type USER-DEFINED NOT NULL,
  location_id text NOT NULL,
  notes text,
  initiated_by text,
  CONSTRAINT stock_ledger_pkey PRIMARY KEY (id),
  CONSTRAINT stock_ledger_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.skus(id)
);
CREATE TABLE public.stock_transfer_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transfer_id text NOT NULL,
  sku_id character varying NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  is_freebie boolean NOT NULL DEFAULT false,
  CONSTRAINT stock_transfer_items_pkey PRIMARY KEY (id),
  CONSTRAINT stock_transfer_items_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.stock_transfers(id),
  CONSTRAINT stock_transfer_items_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.skus(id)
);
CREATE TABLE public.stock_transfers (
  id text NOT NULL,
  destination_store_id uuid NOT NULL,
  date timestamp with time zone NOT NULL DEFAULT now(),
  status USER-DEFINED NOT NULL,
  initiated_by text,
  delivered_date timestamp with time zone,
  total_value numeric NOT NULL,
  CONSTRAINT stock_transfers_pkey PRIMARY KEY (id),
  CONSTRAINT stock_transfers_destination_store_id_fkey FOREIGN KEY (destination_store_id) REFERENCES public.stores(id)
);
CREATE TABLE public.stores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  address_line_1 text,
  address_line_2 text,
  email text,
  phone text,
  gstin text,
  wallet_balance numeric NOT NULL DEFAULT 0,
  CONSTRAINT stores_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  username text NOT NULL UNIQUE,
  role USER-DEFINED NOT NULL,
  store_id uuid,
  permissions ARRAY,
  asm_id text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT users_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);
CREATE TABLE public.wallet_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  distributor_id uuid,
  store_id uuid,
  date timestamp with time zone NOT NULL DEFAULT now(),
  type USER-DEFINED NOT NULL,
  amount numeric NOT NULL,
  balance_after numeric NOT NULL,
  order_id text,
  transfer_id text,
  payment_method USER-DEFINED,
  remarks text,
  initiated_by text,
  CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT wallet_transactions_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES public.distributors(id),
  CONSTRAINT wallet_transactions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);
