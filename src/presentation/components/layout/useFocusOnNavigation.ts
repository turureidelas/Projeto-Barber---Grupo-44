import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/** id of the <main> of every layout (target of "Pular para o conteúdo"). */
export const MAIN_ID = 'conteudo';

/**
 * After moving to another screen (not on the first load), focus its title, so keyboard and
 * screen reader users start from the new content instead of the menu they clicked.
 */
export function useFocusOnNavigation() {
  const { pathname } = useLocation();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    const frame = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`#${MAIN_ID} h1`)?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [pathname]);
}
