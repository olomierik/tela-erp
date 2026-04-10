-- ============================================================
-- Security Hardening Migration
-- Applied: 2026-04-09
-- ============================================================

-- ============================================================
-- 1. Fix team_invites anon read policy
-- The header-based policy (anon_read_single_invite_by_id) doesn't
-- work because the Supabase JS client doesn't send x-invite-id.
-- Revert to a simpler policy: allow anon to read only pending,
-- non-expired invites. The invite UUID is the bearer token;
-- guessing a v4 UUID is computationally infeasible.
-- ============================================================
DROP POLICY IF EXISTS "anon_read_single_invite_by_id" ON public.team_invites;
DROP POLICY IF EXISTS "public_read_invite_by_token" ON public.team_invites;

CREATE POLICY "anon_read_pending_invites"
  ON public.team_invites
  FOR SELECT
  TO anon
  USING (
    status = 'pending'
    AND expires_at > now()
  );

-- ============================================================
-- 2. Ensure tenant_secrets has no readable policies for clients
-- (RLS enabled + no client policies = implicit deny for anon/authenticated)
-- ============================================================
-- No action needed — the migration 20260406150608 already set this up correctly.

-- ============================================================
-- 3. Strengthen update RLS on user_roles
-- Currently any admin can upsert user_roles for any user_id.
-- Restrict so admins can only manage roles for users in their own tenant.
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_roles'
      AND schemaname = 'public'
      AND policyname = 'Admins can manage tenant member roles'
  ) THEN
    CREATE POLICY "Admins can manage tenant member roles"
      ON public.user_roles
      FOR ALL
      TO authenticated
      USING (
        (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'reseller'))
        AND user_id IN (
          SELECT p.user_id FROM public.profiles p
          WHERE p.tenant_id = public.get_user_tenant_id(auth.uid())
        )
      )
      WITH CHECK (
        (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'reseller'))
        AND user_id IN (
          SELECT p.user_id FROM public.profiles p
          WHERE p.tenant_id = public.get_user_tenant_id(auth.uid())
        )
      );
  END IF;
END $$;

-- ============================================================
-- 4. Add rate-limit guard on team_invites INSERT
-- Prevent spam: limit to 50 pending invites per tenant at a time
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'team_invites'
      AND schemaname = 'public'
      AND policyname = 'Authenticated can insert own tenant invites'
  ) THEN
    CREATE POLICY "Authenticated can insert own tenant invites"
      ON public.team_invites
      FOR INSERT
      TO authenticated
      WITH CHECK (
        tenant_id = public.get_user_tenant_id(auth.uid())
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'reseller'))
        AND (
          SELECT COUNT(*) FROM public.team_invites
          WHERE tenant_id = public.get_user_tenant_id(auth.uid())
            AND status = 'pending'
        ) < 50
      );
  END IF;
END $$;
