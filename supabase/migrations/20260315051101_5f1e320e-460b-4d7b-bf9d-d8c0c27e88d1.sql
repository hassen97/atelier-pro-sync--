
-- Add SELECT policies for platform_admin on all tenant data tables
-- This allows the admin to read any tenant's data for impersonation (view-only)

CREATE POLICY "Platform admin can view all products"
ON public.products FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all customers"
ON public.customers FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all repairs"
ON public.repairs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all sales"
ON public.sales FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all sale_items"
ON public.sale_items FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all expenses"
ON public.expenses FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all suppliers"
ON public.suppliers FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all invoices"
ON public.invoices FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all categories"
ON public.categories FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all warranty_tickets"
ON public.warranty_tickets FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all defective_parts"
ON public.defective_parts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all team_members"
ON public.team_members FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all team_tasks"
ON public.team_tasks FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all shop_settings"
ON public.shop_settings FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all repair_parts"
ON public.repair_parts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all repair_status_history"
ON public.repair_status_history FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all supplier_transactions"
ON public.supplier_transactions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all supplier_purchases"
ON public.supplier_purchases FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all product_returns"
ON public.product_returns FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all expense_categories"
ON public.expense_categories FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all activity_log"
ON public.activity_log FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can view all inventory_access_codes"
ON public.inventory_access_codes FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));
