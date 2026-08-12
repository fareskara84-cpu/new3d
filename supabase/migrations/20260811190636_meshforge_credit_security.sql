/*
# MeshForge 3D - Secure Credit Operations

## Overview
Moves credit balance changes out of browser-controlled table updates and into server-enforced database functions.

## Security changes
1. Users can no longer update profiles directly; profile updates are server-controlled.
2. Users can no longer insert credit transaction rows directly.
3. `consume_credit` atomically checks and spends one credit for the signed-in user.
4. `grant_credits` atomically adds or removes credits only when called by an admin.
5. Both functions derive the acting user from `auth.uid()` and expose no admin credentials.
*/

REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE INSERT ON public.credit_transactions FROM authenticated;

CREATE OR REPLACE FUNCTION public.consume_credit(p_generation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_balance integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM 1 FROM public.generations
  WHERE id = p_generation_id AND user_id = v_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Generation not found';
  END IF;

  SELECT credits INTO v_balance
  FROM public.profiles
  WHERE id = v_user
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < 1 THEN
    RAISE EXCEPTION 'Not enough credits';
  END IF;

  v_balance := v_balance - 1;
  UPDATE public.profiles SET credits = v_balance WHERE id = v_user;

  INSERT INTO public.credit_transactions (user_id, amount, reason, balance_after)
  VALUES (v_user, -1, 'generation', v_balance);

  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_credits(p_user_id uuid, p_amount integer, p_reason text DEFAULT 'admin_grant')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_admin uuid := auth.uid();
BEGIN
  IF v_admin IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_amount IS NULL OR p_amount = 0 OR abs(p_amount) > 10000 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;
  IF p_reason NOT IN ('admin_grant', 'admin_revoke') THEN
    RAISE EXCEPTION 'Invalid reason';
  END IF;

  SELECT credits INTO v_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  IF v_balance + p_amount < 0 THEN
    RAISE EXCEPTION 'Credit balance cannot be negative';
  END IF;

  v_balance := v_balance + p_amount;
  UPDATE public.profiles SET credits = v_balance WHERE id = p_user_id;
  INSERT INTO public.credit_transactions (user_id, amount, reason, admin_id, balance_after)
  VALUES (p_user_id, p_amount, p_reason, v_admin, v_balance);

  RETURN v_balance;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_credit(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.consume_credit(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_credits(uuid, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.grant_credits(uuid, integer, text) TO authenticated;
