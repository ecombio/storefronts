(function () {
  'use strict';

  function initDescPanel() {
    var overlay = document.getElementById('PdOverlay');
    if (!overlay) return;

    document.body.appendChild(overlay);

    var panels = [
      { triggerId: 'PdTriggerDescription', panelId: 'PdPanelDescription' },
      { triggerId: 'PdTriggerShipping',    panelId: 'PdPanelShipping'    },
      { triggerId: 'PdTriggerRefund',      panelId: 'PdPanelRefund'      },
      { triggerId: 'PdTriggerWarranty',    panelId: 'PdPanelWarranty'    }
    ];

    var activePanel   = null;
    var activeTrigger = null;
    var lastFocus     = null;

    panels.forEach(function (def) {
      var trigger = document.getElementById(def.triggerId);
      var panel   = document.getElementById(def.panelId);
      if (!trigger || !panel) return;

      document.body.appendChild(panel);

      var closeBtn = panel.querySelector('.pd-panel__close');

      trigger.addEventListener('click', function () {
        openPanel(trigger, panel);
      });

      if (closeBtn) {
        closeBtn.addEventListener('click', closeActive);
      }
    });

    overlay.addEventListener('click', closeActive);

    function openPanel(trigger, panel) {
      if (activePanel && activePanel !== panel) closeActive(true);

      lastFocus     = document.activeElement;
      activePanel   = panel;
      activeTrigger = trigger;

      overlay.classList.add('is-visible');
      requestAnimationFrame(function () {
        overlay.classList.add('is-open');
        panel.classList.add('is-open');
      });

      panel.setAttribute('aria-hidden', 'false');
      overlay.setAttribute('aria-hidden', 'false');
      trigger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      setTimeout(function () { panel.focus(); }, 50);
    }

    function closeActive(instant) {
      if (!activePanel) return;

      var panel   = activePanel;
      var trigger = activeTrigger;

      panel.classList.remove('is-open');
      overlay.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      overlay.setAttribute('aria-hidden', 'true');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';

      if (!instant) {
        setTimeout(function () { overlay.classList.remove('is-visible'); }, 300);
      } else {
        overlay.classList.remove('is-visible');
      }

      activePanel   = null;
      activeTrigger = null;
      if (lastFocus) lastFocus.focus();
    }

    document.addEventListener('keydown', function (e) {
      if (!activePanel) return;

      if (e.key === 'Escape') {
        closeActive();
        return;
      }

      if (e.key === 'Tab') {
        var focusable = activePanel.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        var first = focusable[0];
        var last  = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDescPanel);
  } else {
    initDescPanel();
  }

})();