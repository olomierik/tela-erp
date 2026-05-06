import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const CACHE_PREFIX = 'tela_tx_v1::';
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'KBD', 'TEXTAREA', 'INPUT', 'SVG']);
// Don't translate dynamic data containers (tables, monospace numerics, etc.)
const SKIP_SELECTOR = '[data-no-translate], .font-mono, code, pre, kbd';
const ATTR_ORIGINAL = 'data-i18n-original';
const ATTR_LANG = 'data-i18n-lang';
const NUMERIC_RE = /^[\s\d.,:%+\-/$€£¥₹*#@()]+$/;

function getCache(lang: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_PREFIX + lang) || '{}');
  } catch {
    return {};
  }
}
function saveCache(lang: string, cache: Record<string, string>) {
  try {
    localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(cache));
  } catch {}
}

function shouldSkip(node: Node): boolean {
  let el: HTMLElement | null = node.parentElement;
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.matches?.(SKIP_SELECTOR)) return true;
    if (el.getAttribute?.('contenteditable') === 'true') return true;
    el = el.parentElement;
  }
  return false;
}

function collectTextNodes(root: Node): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const t = (n.nodeValue || '').trim();
      if (!t) return NodeFilter.FILTER_REJECT;
      if (t.length < 2) return NodeFilter.FILTER_REJECT;
      if (NUMERIC_RE.test(t)) return NodeFilter.FILTER_REJECT;
      if (shouldSkip(n)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Node | null;
  while ((n = walker.nextNode())) out.push(n as Text);
  return out;
}

async function batchTranslate(texts: string[], target: string): Promise<string[]> {
  if (!texts.length) return [];
  try {
    const { data, error } = await supabase.functions.invoke('translate-batch', {
      body: { texts, target },
    });
    if (error) throw error;
    const arr = (data as any)?.translations;
    if (Array.isArray(arr) && arr.length === texts.length) return arr;
  } catch (e) {
    console.warn('[translator] batch failed', e);
  }
  return texts;
}

/**
 * Runtime page translator: scans DOM text nodes, translates non-English UI strings
 * via Lovable AI, caches results in localStorage, and observes future DOM changes.
 */
export function PageTranslator() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const observerRef = useRef<MutationObserver | null>(null);
  const inFlightRef = useRef<Set<string>>(new Set());
  const lang = i18n.language || 'en';

  useEffect(() => {
    // Restore originals when switching back to English
    if (lang === 'en') {
      document.querySelectorAll(`[${ATTR_ORIGINAL}]`).forEach((el) => {
        const orig = el.getAttribute(ATTR_ORIGINAL);
        if (orig != null) {
          // Restore on text nodes — el here is the parent with single text child marker
          for (const child of Array.from(el.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE) {
              child.nodeValue = orig;
              break;
            }
          }
          el.removeAttribute(ATTR_ORIGINAL);
          el.removeAttribute(ATTR_LANG);
        }
      });
      observerRef.current?.disconnect();
      observerRef.current = null;
      return;
    }

    const cache = getCache(lang);

    const translatePending = async (nodes: Text[]) => {
      // Map original text -> list of nodes referencing it
      const buckets = new Map<string, Text[]>();
      for (const n of nodes) {
        const parent = n.parentElement;
        if (!parent) continue;
        const existingLang = parent.getAttribute(ATTR_LANG);
        if (existingLang === lang) continue;
        const original = parent.getAttribute(ATTR_ORIGINAL) ?? n.nodeValue ?? '';
        const key = original.trim();
        if (!key) continue;
        if (!parent.getAttribute(ATTR_ORIGINAL)) parent.setAttribute(ATTR_ORIGINAL, original);

        if (cache[key]) {
          n.nodeValue = (n.nodeValue || '').replace(original, cache[key]);
          parent.setAttribute(ATTR_LANG, lang);
          continue;
        }
        if (inFlightRef.current.has(key)) continue;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(n);
      }

      const keys = Array.from(buckets.keys());
      if (!keys.length) return;
      keys.forEach((k) => inFlightRef.current.add(k));

      // Chunk to keep prompt reasonable
      const CHUNK = 40;
      for (let i = 0; i < keys.length; i += CHUNK) {
        const slice = keys.slice(i, i + CHUNK);
        const translations = await batchTranslate(slice, lang);
        slice.forEach((k, idx) => {
          const tx = translations[idx] || k;
          cache[k] = tx;
          for (const node of buckets.get(k) || []) {
            const parent = node.parentElement;
            if (!parent) continue;
            const orig = parent.getAttribute(ATTR_ORIGINAL) || k;
            node.nodeValue = (node.nodeValue || '').replace(orig, tx);
            parent.setAttribute(ATTR_LANG, lang);
          }
          inFlightRef.current.delete(k);
        });
        saveCache(lang, cache);
      }
    };

    // Initial scan
    const initial = collectTextNodes(document.body);
    translatePending(initial);

    // Observe DOM changes for newly added text
    let pending: Text[] = [];
    let scheduled = false;
    const flush = () => {
      scheduled = false;
      const batch = pending;
      pending = [];
      if (batch.length) translatePending(batch);
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      setTimeout(flush, 350);
    };
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              if (!shouldSkip(node)) pending.push(node as Text);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              pending.push(...collectTextNodes(node));
            }
          });
        } else if (m.type === 'characterData') {
          const node = m.target as Text;
          const parent = node.parentElement;
          // Skip if we just changed it ourselves
          if (parent?.getAttribute(ATTR_LANG) === lang && parent?.getAttribute(ATTR_ORIGINAL) === node.nodeValue) continue;
          if (!shouldSkip(node)) pending.push(node);
        }
      }
      if (pending.length) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [lang, location.pathname]);

  return null;
}

export default PageTranslator;
