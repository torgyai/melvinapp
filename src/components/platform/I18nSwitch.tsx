'use client';

import { useEffect } from 'react';
import { walkAndTranslate } from '@/lib/i18n';
import { useApp } from './AppContext';

/**
 * English is produced from the Dutch interface rather than kept as a second copy
 * deck. Everything React renders passes through here on its way to the screen.
 */
export function I18nSwitch() {
  const { lang } = useApp();

  useEffect(() => {
    if (lang !== 'en') {
      // Dutch is what React renders, so a re-render restores it on its own.
      return;
    }
    walkAndTranslate(document.body, 'en');
    const observer = new MutationObserver((muts) => {
      muts.forEach((m) => {
        m.addedNodes.forEach((n) => walkAndTranslate(n, 'en'));
        if (m.type === 'characterData' && m.target.nodeType === Node.TEXT_NODE) {
          walkAndTranslate(m.target, 'en');
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [lang]);

  return null;
}
