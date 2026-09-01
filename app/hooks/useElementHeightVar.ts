// app/hooks/useElementHeightVar.ts
import {useEffect} from 'react';
import type {RefObject} from 'react';

/**
 * useElementHeightVar
 *
 * Mirrors the Liquid theme's collection-toolbar.js `syncToolbarHeight`
 * pattern: measures an element's own rendered height and writes it to
 * a CSS custom property on <html>, kept in sync via ResizeObserver.
 *
 * Generic on purpose — useHeaderHeightSync stays header-specific
 * (it also owns the header-hidden class toggle), but the toolbar just
 * needs its own height exposed, the same way the Liquid version's
 * toolbar does independently of the header's own height sync.
 *
 * Usage in CollectionToolbar.tsx:
 *   const toolbarRef = useRef<HTMLElement>(null);
 *   useElementHeightVar(toolbarRef, '--toolbar-height');
 *   return <div ref={toolbarRef} className="collection-toolbar sticky-under-header">...
 */
export function useElementHeightVar(
  ref: RefObject<HTMLElement | null>,
  cssVarName: string,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const sync = () => {
      document.documentElement.style.setProperty(
        cssVarName,
        `${el.offsetHeight}px`,
      );
    };

    sync();

    const resizeObserver = new ResizeObserver(sync);
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, [ref, cssVarName]);
}