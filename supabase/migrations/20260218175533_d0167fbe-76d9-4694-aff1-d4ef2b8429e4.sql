
-- 1. Create team_members table FIRST
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  member_user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'employee',
  allowed_pages text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, member_user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage team members"
ON public.team_members FOR ALL TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Members can view own membership"
ON public.team_members FOR SELECT TO authenticated
USING (auth.uid() = member_user_id);

-- 2. Create team_tasks table
CREATE TABLE public.team_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  assigned_to uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage tasks"
ON public.team_tasks FOR ALL TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Members can view assigned tasks"
ON public.team_tasks FOR SELECT TO authenticated
USING (auth.uid() = assigned_to);

CREATE POLICY "Members can update assigned tasks"
ON public.team_tasks FOR UPDATE TO authenticated
USING (auth.uid() = assigned_to);

-- 3. Now create is_team_member function (table exists now)
CREATE OR REPLACE FUNCTION public.is_team_member(_owner_id uuid, _member_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE owner_id = _owner_id
      AND member_user_id = _member_id
      AND status = 'active'
  )
$$;

-- 4. get_team_owner_id helper
CREATE OR REPLACE FUNCTION public.get_team_owner_id(_member_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_id FROM team_members
  WHERE member_user_id = _member_id
    AND status = 'active'
  LIMIT 1
$$;

-- 5. Profiles: allow authenticated search, drop old restrictive SELECT
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Authenticated users can search profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- 6. Update RLS on data tables

-- PRODUCTS
DROP POLICY IF EXISTS "Users can manage own products" ON public.products;
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
CREATE POLICY "Owner or team can view products"
ON public.products FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));
CREATE POLICY "Owner or team can manage products"
ON public.products FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));

-- REPAIRS
DROP POLICY IF EXISTS "Users can manage own repairs" ON public.repairs;
DROP POLICY IF EXISTS "Users can view own repairs" ON public.repairs;
CREATE POLICY "Owner or team can view repairs"
ON public.repairs FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));
CREATE POLICY "Owner or team can manage repairs"
ON public.repairs FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));

-- SALES
DROP POLICY IF EXISTS "Users can manage own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can view own sales" ON public.sales;
CREATE POLICY "Owner or team can view sales"
ON public.sales FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));
CREATE POLICY "Owner or team can manage sales"
ON public.sales FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));

-- CUSTOMERS
DROP POLICY IF EXISTS "Users can delete own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view own customers" ON public.customers;
CREATE POLICY "Owner or team can view customers"
ON public.customers FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));
CREATE POLICY "Owner or team can manage customers"
ON public.customers FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));

-- SUPPLIERS
DROP POLICY IF EXISTS "Users can manage own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view own suppliers" ON public.suppliers;
CREATE POLICY "Owner or team can view suppliers"
ON public.suppliers FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));
CREATE POLICY "Owner or team can manage suppliers"
ON public.suppliers FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));

-- EXPENSES
DROP POLICY IF EXISTS "Users can manage own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
CREATE POLICY "Owner or team can view expenses"
ON public.expenses FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));
CREATE POLICY "Owner or team can manage expenses"
ON public.expenses FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));

-- INVOICES
DROP POLICY IF EXISTS "Users can manage own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
CREATE POLICY "Owner or team can view invoices"
ON public.invoices FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));
CREATE POLICY "Owner or team can manage invoices"
ON public.invoices FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));

-- CATEGORIES
DROP POLICY IF EXISTS "Users can manage own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Owner or team can view categories"
ON public.categories FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));
CREATE POLICY "Owner or team can manage categories"
ON public.categories FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));

-- SALE_ITEMS
DROP POLICY IF EXISTS "Users can manage own sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Users can view own sale items" ON public.sale_items;
CREATE POLICY "Owner or team can view sale items"
ON public.sale_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM sales
  WHERE sales.id = sale_items.sale_id
    AND (sales.user_id = auth.uid() OR public.is_team_member(sales.user_id, auth.uid()))
));
CREATE POLICY "Owner or team can manage sale items"
ON public.sale_items FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM sales
  WHERE sales.id = sale_items.sale_id
    AND (sales.user_id = auth.uid() OR public.is_team_member(sales.user_id, auth.uid()))
));

-- REPAIR_PARTS
DROP POLICY IF EXISTS "Users can manage own repair parts" ON public.repair_parts;
DROP POLICY IF EXISTS "Users can view own repair parts" ON public.repair_parts;
CREATE POLICY "Owner or team can view repair parts"
ON public.repair_parts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM repairs
  WHERE repairs.id = repair_parts.repair_id
    AND (repairs.user_id = auth.uid() OR public.is_team_member(repairs.user_id, auth.uid()))
));
CREATE POLICY "Owner or team can manage repair parts"
ON public.repair_parts FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM repairs
  WHERE repairs.id = repair_parts.repair_id
    AND (repairs.user_id = auth.uid() OR public.is_team_member(repairs.user_id, auth.uid()))
));

-- SHOP_SETTINGS
DROP POLICY IF EXISTS "Users can manage own settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Users can view own settings" ON public.shop_settings;
CREATE POLICY "Owner can manage settings"
ON public.shop_settings FOR ALL TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Owner or team can view settings"
ON public.shop_settings FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));
