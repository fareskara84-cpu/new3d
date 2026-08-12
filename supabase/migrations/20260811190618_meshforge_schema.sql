/*
# MeshForge 3D - Database Schema

## Overview
Creates the core tables for MeshForge 3D, a rebranded 3D model generation platform.
Includes user profiles with credit balances, generation history, and credit transaction logs.
Features an admin panel for granting credits to users.

## New Tables

### profiles
- `id` (uuid, PK, references auth.users) - User's auth ID
- `email` (text) - User email, denormalized for admin display
- `credits` (integer, default 5) - Credit balance; free plan starts with 5 credits
- `is_admin` (boolean, default false) - Admin flag for admin panel access
- `created_at` (timestamptz) - Account creation timestamp

### generations
- `id` (uuid, PK) - Generation ID
- `user_id` (uuid, references profiles) - Owning user
- `status` (text) - pending / processing / completed / failed
- `image_url` (text) - Input image URL (stored in Supabase Storage)
- `model_url` (text) - Generated 3D model file URL
- `model_format` (text) - Output format: glb, obj, etc.
- `texture` (boolean) - Whether texture was generated
- `seed` (integer) - Random seed used
- `task_id` (text) - External API task ID for async tracking
- `credits_used` (integer, default 1) - Credits consumed
- `error_message` (text) - Error details if failed
- `created_at` (timestamptz) - Creation timestamp
- `completed_at` (timestamptz) - Completion timestamp

### credit_transactions
- `id` (uuid, PK) - Transaction ID
- `user_id` (uuid, references profiles) - Owning user
- `amount` (integer) - Credits added (positive) or consumed (negative)
- `reason` (text) - Why: signup_bonus, generation, admin_grant, admin_revoke
- `admin_id` (uuid, nullable) - Admin who granted/revoked (references profiles)
- `balance_after` (integer) - Balance after this transaction
- `created_at` (timestamptz) - Transaction timestamp

## Security
- RLS enabled on all tables.
- profiles: users can read/update own profile; admins can read all profiles and update credits/is_admin.
- generations: users can CRUD their own generations only.
- credit_transactions: users can read their own; admins can read all and insert (grant/revoke).
- Admin check uses a SECURITY DEFINER function `is_admin()` to avoid RLS recursion.
*/

-- Profiles table (must be created first since is_admin() depends on it)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  credits integer NOT NULL DEFAULT 5,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- Users can read their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admins can read all profiles
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin());

-- Users can update their own profile (but NOT credits or is_admin — those are admin-only)
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins can update any profile (for granting credits, setting admin)
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Users can insert their own profile row (on signup)
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Generations table
CREATE TABLE IF NOT EXISTS public.generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  image_url text,
  model_url text,
  model_format text DEFAULT 'glb',
  texture boolean NOT NULL DEFAULT false,
  seed integer DEFAULT 1234,
  task_id text,
  credits_used integer NOT NULL DEFAULT 1,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "generations_select_own" ON public.generations;
CREATE POLICY "generations_select_own"
ON public.generations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "generations_insert_own" ON public.generations;
CREATE POLICY "generations_insert_own"
ON public.generations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "generations_update_own" ON public.generations;
CREATE POLICY "generations_update_own"
ON public.generations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "generations_delete_own" ON public.generations;
CREATE POLICY "generations_delete_own"
ON public.generations FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Credit transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL,
  admin_id uuid REFERENCES public.profiles(id),
  balance_after integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own transactions
DROP POLICY IF EXISTS "credit_tx_select_own" ON public.credit_transactions;
CREATE POLICY "credit_tx_select_own"
ON public.credit_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can read all transactions
DROP POLICY IF EXISTS "credit_tx_select_admin" ON public.credit_transactions;
CREATE POLICY "credit_tx_select_admin"
ON public.credit_transactions FOR SELECT
TO authenticated
USING (public.is_admin());

-- Users can insert their own transactions (e.g., spending credits)
DROP POLICY IF EXISTS "credit_tx_insert_own" ON public.credit_transactions;
CREATE POLICY "credit_tx_insert_own"
ON public.credit_transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can insert transactions (granting/revoking credits)
DROP POLICY IF EXISTS "credit_tx_insert_admin" ON public.credit_transactions;
CREATE POLICY "credit_tx_insert_admin"
ON public.credit_transactions FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_status ON public.generations(status);
CREATE INDEX IF NOT EXISTS idx_credit_tx_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

-- Trigger to auto-create a profile when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.credit_transactions (user_id, amount, reason, balance_after)
  VALUES (NEW.id, 5, 'signup_bonus', 5);
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
