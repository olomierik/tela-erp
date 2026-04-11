/**
 * AuthContext.desktop.tsx
 * Offline AuthContext for Electron desktop mode.
 * Reads session from localStorage (`tela_local_session`).
 * On first launch (no session), shows DesktopSetup screen.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { localDB, localAuth } from '@/lib/local-db';

// ------------------------------------------------------------------
// Types (mirroring the online AuthContext interface)
// ------------------------------------------------------------------
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug?: string;
}

export interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  tenant: Tenant | null;
  role: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ------------------------------------------------------------------
// DesktopSetup — first-launch company setup screen
// ------------------------------------------------------------------
interface DesktopSetupProps {
  onComplete: () => void;
}

function DesktopSetup({ onComplete }: DesktopSetupProps) {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!companyName.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // Create tenant
      const tenantId = crypto.randomUUID?.() ?? generateSimpleId();
      await localDB.from('tenants').insert({
        id: tenantId,
        name: companyName.trim(),
        slug: companyName.trim().toLowerCase().replace(/\s+/g, '-'),
      });

      // Create admin profile
      const profileId = crypto.randomUUID?.() ?? generateSimpleId();
      await localDB.from('profiles').insert({
        id: profileId,
        tenant_id: tenantId,
        email: email.trim().toLowerCase(),
        full_name: 'Admin',
        role: 'admin',
        // SECURITY TODO: passwords are stored plaintext in the local SQLite DB.
        // Before shipping desktop builds, hash passwords with bcrypt or argon2
        // via an Electron IPC call so the plaintext never reaches the renderer process.
        // Reference: https://www.npmjs.com/package/bcryptjs
        password_hash: password,
      });

      // Create session
      const session = {
        user: { id: profileId, email: email.trim().toLowerCase() },
        tenant: { id: tenantId, name: companyName.trim() },
        role: 'admin',
        access_token: 'local-desktop-token',
      };
      localStorage.setItem('tela_local_session', JSON.stringify(session));

      onComplete();
    } catch (err: any) {
      setError(err?.message ?? 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          background: '#1e293b',
          borderRadius: 12,
          padding: '2.5rem',
          width: 420,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          color: '#f1f5f9',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#38bdf8' }}>TELA ERP</h1>
          <p style={{ margin: '0.5rem 0 0', color: '#94a3b8' }}>First-time setup</p>
        </div>

        {error && (
          <div
            style={{
              background: '#7f1d1d',
              color: '#fca5a5',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              marginBottom: '1rem',
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Company Name</label>
          <input
            style={inputStyle}
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Ltd"
            required
          />

          <label style={labelStyle}>Admin Email</label>
          <input
            style={inputStyle}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@company.com"
            required
          />

          <label style={labelStyle}>Password</label>
          <input
            style={inputStyle}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 6 characters"
            required
          />

          <label style={labelStyle}>Confirm Password</label>
          <input
            style={inputStyle}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat password"
            required
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: loading ? '#0369a1' : '#0ea5e9',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '1rem',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Setting up...' : 'Set Up TELA ERP'}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#94a3b8',
  marginBottom: '0.25rem',
  marginTop: '0.75rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#f1f5f9',
  fontSize: 15,
  boxSizing: 'border-box',
  outline: 'none',
};

function generateSimpleId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ------------------------------------------------------------------
// AuthProvider
// ------------------------------------------------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  async function loadSession() {
    setLoading(true);
    try {
      const raw = localStorage.getItem('tela_local_session');
      if (!raw) {
        setShowSetup(true);
        return;
      }
      const session = JSON.parse(raw);
      setUser(session.user ?? null);
      setProfile(
        session.user
          ? {
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.full_name,
              role: session.role ?? 'admin',
            }
          : null
      );
      setTenant(session.tenant ?? null);
      setRole(session.role ?? null);
      setShowSetup(false);
    } catch {
      setShowSetup(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSession();
  }, []);

  async function signIn(email: string, password: string) {
    const result = await localAuth.signInWithPassword({ email, password });
    if (!result.error) {
      await loadSession();
    }
    return { error: result.error };
  }

  async function signOut() {
    await localAuth.signOut();
    setUser(null);
    setProfile(null);
    setTenant(null);
    setRole(null);
    setShowSetup(true);
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          color: '#38bdf8',
          fontSize: 18,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Loading TELA ERP…
      </div>
    );
  }

  if (showSetup) {
    return <DesktopSetup onComplete={loadSession} />;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        tenant,
        role,
        loading: false,
        signIn,
        signOut,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ------------------------------------------------------------------
// useAuth hook
// ------------------------------------------------------------------
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
