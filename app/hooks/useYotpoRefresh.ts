import {useEffect} from 'react';
import {useLocation} from 'react-router';

declare global {
  interface Window {
    yotpo?: {
      refreshWidgets?: () => void;
      initWidgets?: () => void;
    };
    yotpoWidgetsContainer?: {
      initWidgets?: () => void;
    };
  }
}

/**
 * Yotpo's loader script scans the DOM once on initial page load.
 * React Router client-side navigations swap the DOM without a full
 * reload, so Yotpo never notices new `.yotpo-widget-instance` nodes
 * (or that an existing node's product id changed).
 *
 * Call this once per route that renders Yotpo widgets. It re-triggers
 * Yotpo's scan after each navigation, once the new DOM has committed.
 */
export function useYotpoRefresh() {
  const location = useLocation();
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      if (window.yotpo?.refreshWidgets) {
        window.yotpo.refreshWidgets();
      } else if (window.yotpoWidgetsContainer?.initWidgets) {
        window.yotpoWidgetsContainer.initWidgets();
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [location.key]);
}