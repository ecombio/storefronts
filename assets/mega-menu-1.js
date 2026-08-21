/**
 * Mega Menu
 * File: assets/mega-menu.js
 *
 * The mega-menu panel in mega-menu.css opens on :hover by default, which
 * works for mouse users but isn't reachable by keyboard. This file adds
 * an .is-open class hook (toggled on the trigger's click, and managed via
 * aria-expanded + Escape + outside-click) so the exact same panel also
 * opens for keyboard/touch users — no markup or CSS duplication needed.
 *
 * Pure JS — no Liquid, no build step, no dependencies.
 *
 * Expected markup (rendered inline by sections/header-menu.liquid):
 *
 *   <li class="menu-bar__item menu-bar__item--has-mega">
 *     <a class="mega-menu-trigger" data-mega-trigger
 *        aria-haspopup="true" aria-expanded="false">...</a>
 *     <div class="mega-menu" data-mega-panel>...</div>
 *   </li>
 */
(function () {
  "use strict";

  function MegaMenu(trigger) {
    this.trigger = trigger;
    this.item = trigger.closest(".menu-bar__item--has-mega");
    this.panel = this.item ? this.item.querySelector("[data-mega-panel]") : null;
  }

  MegaMenu.prototype.isOpen = function () {
    return this.item.classList.contains("is-open");
  };

  MegaMenu.prototype.open = function () {
    this.item.classList.add("is-open");
    this.trigger.setAttribute("aria-expanded", "true");
  };

  MegaMenu.prototype.close = function () {
    this.item.classList.remove("is-open");
    this.trigger.setAttribute("aria-expanded", "false");
  };

  MegaMenu.prototype.toggle = function () {
    this.isOpen() ? this.close() : this.open();
  };

  function init() {
    var triggers = document.querySelectorAll("[data-mega-trigger]");
    var instances = [];

    triggers.forEach(function (trigger) {
      var instance = new MegaMenu(trigger);
      if (!instance.panel) return;
      instances.push(instance);

      trigger.addEventListener("click", function (event) {
        event.preventDefault();

        // Close any other open mega menu before opening this one.
        instances.forEach(function (other) {
          if (other !== instance && other.isOpen()) other.close();
        });

        instance.toggle();
      });

      instance.item.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && instance.isOpen()) {
          instance.close();
          instance.trigger.focus();
        }
      });

      // Close when focus moves out of the item entirely (tabbing through).
      instance.item.addEventListener("focusout", function () {
        requestAnimationFrame(function () {
          if (instance.isOpen() && !instance.item.contains(document.activeElement)) {
            instance.close();
          }
        });
      });
    });

    if (!instances.length) return;

    // Click outside any open mega menu closes it.
    document.addEventListener("click", function (event) {
      instances.forEach(function (instance) {
        if (instance.isOpen() && !instance.item.contains(event.target)) {
          instance.close();
        }
      });
    });

    // Global Escape fallback.
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        instances.forEach(function (instance) {
          instance.close();
        });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
