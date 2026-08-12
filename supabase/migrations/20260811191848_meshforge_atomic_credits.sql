/*
# MeshForge 3D - Atomic Generation & Credit Purchase

## Overview
Replaces the old two-step generation flow (insert row then call consume_credit) with a single
atomic function that checks credits, deducts them, creates the generation record, and logs the
transaction — all in one transaction. Also adds a buy_credits function for purchasing credit packs.

## Security
- start_generation: derives user from auth.uid(), checks balance, deducts atomically
- buy_credits: derives user from auth.uid(), adds credits, logs transaction
- Both are SECURITY DEFINER with SET search_path = public
*/

-- Atomic generation starter: check credits + deduct + create record + log transaction
CREATE OR REPLACE FUNCTION public.start_generation(
  p_texture boolean DEFAULT false,
  p_quality text DEFAULT 'Balanced',
  p_model_format text DEFAULT 'glb'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_balance integer;
  v_gen_id uuid;
  v_credits_cost integer := 1;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Lock the profile row and check balance
  SELECT credits INTO v_balance
  FROM public.profiles
  WHERE id = v_user
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_balance < v_credits_cost THEN
    RAISE EXCEPTION 'Not enough credits';
  END IF;

  -- Deduct credit
  v_balance := v_balance - v_credits_cost;
  UPDATE public.profiles SET credits = v_balance WHERE id = v_user;

  -- Create generation record
  INSERT INTO public.generations (user_id, status, texture, model_format, credits_used)
  VALUES (v_user, 'processing', p_texture, p_model_format, v_credits_cost)
  RETURNING id INTO v_gen_id;

  -- Log transaction
  INSERT INTO public.credit_transactions (user_id, amount, reason, balance_after)
  VALUES (v_user, -v_credits_cost, 'generation', v_balance);

  RETURN v_gen_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.start_generation(boolean, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.start_generation(boolean, text, text) TO authenticated;

-- Buy credits: add credits to own account (for credit pack purchases)
CREATE OR REPLACE FUNCTION public.buy_credits(
  p_amount integer,
  p_reason text DEFAULT 'credit_pack'
)
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
  IF p_amount IS NULL OR p_amount < 1 OR p_amount > 10000 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;

  SELECT credits INTO v_balance
  FROM public.profiles
  WHERE id = v_user
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  v_balance := v_balance + p_amount;
  UPDATE public.profiles SET credits = v_balance WHERE id = v_user;

  INSERT INTO public.credit_transactions (user_id, amount, reason, balance_after)
  VALUES (v_user, p_amount, p_reason, v_balance);

  RETURN v_balance;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.buy_credits(integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.buy_credits(integer, text) TO authenticated;

-- Allow users to update their own generation's status/task_id (for tracking)
DROP POLICY IF EXISTS "generations_update_own" ON public.generations;
CREATE POLICY "generations_update_own"
ON public.generations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
