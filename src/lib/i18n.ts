'use client';

import { EN } from '@/data/en';

export type Lang = 'nl' | 'en';

const KEYS = Object.keys(EN).sort((a, b) => b.length - a.length);

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const RE = new RegExp(
  KEYS.map((k) => {
    const left = /^[\wÀ-ÿ]/.test(k) ? '\\b' : '';
    const right = /[\wÀ-ÿ]$/.test(k) ? '\\b' : '';
    return left + escapeRe(k) + right;
  }).join('|'),
  'g',
);

export function translateStr(txt: string, lang: Lang): string {
  if (lang !== 'en' || !txt) return txt;
  RE.lastIndex = 0;
  return txt.replace(RE, (m) => EN[m] ?? m);
}

/**
 * Walk a subtree and translate its text nodes. The Dutch interface is the single
 * source of copy; English is produced from it, so a new screen is translated the
 * moment its words are in the dictionary.
 */
export function walkAndTranslate(node: Node, lang: Lang): void {
  if (lang !== 'en') return;
  if (node.nodeType === Node.TEXT_NODE) {
    const out = translateStr(node.nodeValue ?? '', lang);
    if (out !== node.nodeValue) node.nodeValue = out;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  const ph = el.getAttribute?.('placeholder');
  if (ph) el.setAttribute('placeholder', translateStr(ph, lang));
  const title = el.getAttribute?.('title');
  if (title) el.setAttribute('title', translateStr(title, lang));
  el.childNodes.forEach((child) => walkAndTranslate(child, lang));
}
