-- Atomic warranty ticket creation.
-- Replaces the previous client-side multi-step write (ticket -> warranty repair
-- -> per-part stock deduction -> defective parts -> expense) which could leave
-- partial state on network failure. Mirrors the create_sale atomic pattern.

create or replace function public.create_warranty_ticket(
  p_original_repair_id uuid,
  p_return_reason text,
  p_action_taken text default null,
  p_labor_cost numeric default 0,
  p_parts_cost numeric default 0,
  p_total_cost numeric default 0,
  p_amount_paid numeric default 0,
  p_notes text default null,
  p_replaced_parts jsonb default '[]'::jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_ticket record;
  v_repair record;
  v_part jsonb;
  v_product record;
  v_parts_loss numeric := 0;
begin
  v_owner := auth.uid();
  if v_owner is null then
    raise exception 'Not authenticated';
  end if;

  -- The original repair must belong to this shop.
  if not exists (
    select 1 from repairs
    where id = p_original_repair_id and user_id = v_owner
  ) then
    raise exception 'Original repair not found';
  end if;

  -- 1. Warranty ticket
  insert into warranty_tickets (
    user_id, original_repair_id, return_reason, action_taken,
    labor_cost, parts_cost, total_cost, amount_paid, notes
  ) values (
    v_owner, p_original_repair_id, p_return_reason, p_action_taken,
    coalesce(p_labor_cost, 0), coalesce(p_parts_cost, 0),
    coalesce(p_total_cost, 0), coalesce(p_amount_paid, 0), p_notes
  )
  returning id, created_at into v_ticket;

  -- 2. Follow-up warranty repair (inherits the original customer/device so
  --    reports and lists stay coherent)
  insert into repairs (
    user_id, customer_id, device_model, imei, problem_description,
    is_warranty, warranty_ticket_id, total_cost, labor_cost, parts_cost,
    amount_paid, status
  )
  select
    v_owner, r.customer_id,
    'Garantie — ' || r.device_model,
    r.imei,
    'Retour garantie: ' || p_return_reason,
    true, v_ticket.id,
    coalesce(p_total_cost, 0), coalesce(p_labor_cost, 0),
    coalesce(p_parts_cost, 0), coalesce(p_amount_paid, 0),
    'pending'
  from repairs r
  where r.id = p_original_repair_id
  returning id into v_repair;

  -- 3. Replaced parts: deduct stock, register defective part, accumulate loss
  for v_part in
    select * from jsonb_array_elements(coalesce(p_replaced_parts, '[]'::jsonb))
  loop
    select id, quantity, cost_price
      into v_product
      from products
     where id = (v_part->>'product_id')::uuid
       and user_id = v_owner
     for update;

    if found then
      update products
         set quantity = greatest(0, quantity - (v_part->>'quantity')::int)
       where id = v_product.id;
      v_parts_loss := v_parts_loss
        + coalesce(v_product.cost_price, 0) * (v_part->>'quantity')::int;
    end if;

    insert into defective_parts (
      user_id, warranty_ticket_id, product_id, product_name, quantity, supplier_id
    ) values (
      v_owner,
      v_ticket.id,
      (v_part->>'product_id')::uuid,
      coalesce(v_part->>'product_name', 'Pièce'),
      greatest(1, (v_part->>'quantity')::int),
      nullif(v_part->>'supplier_id', '')::uuid
    );
  end loop;

  -- 4. Parts cost booked as a warranty loss expense
  if v_parts_loss > 0 then
    insert into expenses (user_id, category, description, amount, expense_date)
    values (
      v_owner,
      'Perte garantie',
      'Pièces garantie - Ticket #' || left(v_ticket.id::text, 8),
      v_parts_loss,
      current_date
    );
  end if;

  return json_build_object('ticket_id', v_ticket.id, 'repair_id', v_repair.id);
end;
$$;

revoke all on function public.create_warranty_ticket(uuid, text, text, numeric, numeric, numeric, numeric, text, jsonb) from public, anon;
grant execute on function public.create_warranty_ticket(uuid, text, text, numeric, numeric, numeric, numeric, text, jsonb) to authenticated;
