-- Add HR fields to team_members
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS base_salary numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hire_date date;

-- Employee transactions ledger
CREATE TABLE IF NOT EXISTS public.employee_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('avance_salaire','prime_bonus','remboursement_frais','salary_payment')),
  amount numeric NOT NULL DEFAULT 0,
  description text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  expense_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_transactions_user ON public.employee_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_transactions_employee ON public.employee_transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_transactions_date ON public.employee_transactions(transaction_date);

ALTER TABLE public.employee_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or team can view employee_transactions"
  ON public.employee_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));

CREATE POLICY "Owner can insert employee_transactions"
  ON public.employee_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update employee_transactions"
  ON public.employee_transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete employee_transactions"
  ON public.employee_transactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Platform admin can view all employee_transactions"
  ON public.employee_transactions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'::app_role));