CREATE POLICY "Users can insert own subscription"
ON public.shop_subscriptions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscription"
ON public.shop_subscriptions FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());