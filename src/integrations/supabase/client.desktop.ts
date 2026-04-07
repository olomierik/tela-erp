/**
 * client.desktop.ts
 * Supabase-compatible client for Electron desktop mode.
 * Swaps out the real Supabase client with localDB + localAuth.
 */
import { localDB, localAuth } from '@/lib/local-db';

export const supabase = {
  ...localDB,
  auth: localAuth,
  rpc: (_fn: string, _args?: any) => Promise.resolve({ data: null, error: null }),
  storage: {
    from: (_bucket: string) => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      download: () => Promise.resolve({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      remove: () => Promise.resolve({ data: null, error: null }),
      list: () => Promise.resolve({ data: [], error: null }),
    }),
  },
  channel: (_name: string) => ({
    on: () => ({ subscribe: () => {} }),
  }),
  removeChannel: () => {},
} as any;
