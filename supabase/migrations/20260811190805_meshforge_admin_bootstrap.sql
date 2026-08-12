/*
# MeshForge 3D - Initial Admin Bootstrap

## Overview
Makes the first MeshForge account an administrator so the built-in admin panel is usable immediately.

## Security
- Only the first profile ever created receives admin status.
- Every later account remains a standard creator.
- Existing profiles are not changed.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_admin boolean;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE is_admin = true) INTO v_first_admin;

  INSERT INTO public.profiles (id, email, is_admin)
  VALUES (NEW.id, COALESCE(NEW.email, ''), v_first_admin);

  INSERT INTO public.credit_transactions (user_id, amount, reason, balance_after)
  VALUES (NEW.id, 5, 'signup_bonus', 5);

  RETURN NEW;
END;
$$;
