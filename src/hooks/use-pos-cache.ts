import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface POSProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit_cost: number;
  reorder_level: number;
  status: string;
  image_url?: string;
}

export interface POSCartItem {
  product: POSProduct;
  quantity: number;
  discount: number; // percentage
  unitPrice: number;
}

export interface OfflineTransaction {
  id: string;
  items: POSCartItem[];
  total: number;
  paymentMethod: string;
  customerName: string;
  timestamp: string;
  synced: boolean;
}

const IDB_NAME = 'tela_pos_cache';
const IDB_VERSION = 1;
const PRODUCTS_STORE = 'products';
const OFFLINE_TX_STORE = 'offline_transactions';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
        db.createObjectStore(PRODUCTS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(OFFLINE_TX_STORE)) {
        db.createObjectStore(OFFLINE_TX_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function usePOSCache() {
  const { tenant, isDemo } = useAuth();
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const productMapRef = useRef<Map<string, POSProduct>>(new Map());
  const skuMapRef = useRef<Map<string, POSProduct>>(new Map());

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const cacheProducts = useCallback(async (items: POSProduct[]) => {
    try {
      const db = await openDB();
      const tx = db.transaction(PRODUCTS_STORE, 'readwrite');
      const store = tx.objectStore(PRODUCTS_STORE);
      for (const item of items) {
        store.put(item);
      }
    } catch {}
  }, []);

  const loadCachedProducts = useCallback(async (): Promise<POSProduct[]> => {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(PRODUCTS_STORE, 'readonly');
        const store = tx.objectStore(PRODUCTS_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    if (isDemo || !tenant?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('inventory_items')
        .select('id, name, sku, category, quantity, unit_cost, reorder_level, status, image_url')
        .eq('tenant_id', tenant.id)
        .order('name');
      if (error) throw error;
      const items: POSProduct[] = data || [];
      setProducts(items);
      buildMaps(items);
      cacheProducts(items);
    } catch {
      // Fallback to cached
      const cached = await loadCachedProducts();
      setProducts(cached);
      buildMaps(cached);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, isDemo, cacheProducts, loadCachedProducts]);

  const buildMaps = (items: POSProduct[]) => {
    const idMap = new Map<string, POSProduct>();
    const skuMap = new Map<string, POSProduct>();
    for (const item of items) {
      idMap.set(item.id, item);
      if (item.sku) skuMap.set(item.sku.toLowerCase(), item);
    }
    productMapRef.current = idMap;
    skuMapRef.current = skuMap;
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const findByBarcode = useCallback((barcode: string): POSProduct | null => {
    return skuMapRef.current.get(barcode.toLowerCase()) || null;
  }, []);

  const findById = useCallback((id: string): POSProduct | null => {
    return productMapRef.current.get(id) || null;
  }, []);

  // Offline transaction queue
  const saveOfflineTransaction = useCallback(async (tx: OfflineTransaction) => {
    try {
      const db = await openDB();
      const dbTx = db.transaction(OFFLINE_TX_STORE, 'readwrite');
      dbTx.objectStore(OFFLINE_TX_STORE).put(tx);
    } catch {}
  }, []);

  const getOfflineTransactions = useCallback(async (): Promise<OfflineTransaction[]> => {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(OFFLINE_TX_STORE, 'readonly');
        const req = tx.objectStore(OFFLINE_TX_STORE).getAll();
        req.onsuccess = () => resolve((req.result || []).filter((t: OfflineTransaction) => !t.synced));
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }, []);

  const markTransactionSynced = useCallback(async (id: string) => {
    try {
      const db = await openDB();
      const tx = db.transaction(OFFLINE_TX_STORE, 'readwrite');
      const store = tx.objectStore(OFFLINE_TX_STORE);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          store.put({ ...req.result, synced: true });
        }
      };
    } catch {}
  }, []);

  return {
    products,
    loading,
    isOnline,
    findByBarcode,
    findById,
    fetchProducts,
    saveOfflineTransaction,
    getOfflineTransactions,
    markTransactionSynced,
  };
}
