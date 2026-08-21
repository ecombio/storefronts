/**
 * Flyout Menu
 * File: assets/flyout-menu.js
 *
 * Core logic for the sidebar-style flyout panel rendered by
 * snippets/flyout-menu.liquid (called from the 'flyout' case in
 * sections/header-menu.liquid): a left-hand list of categories, and a
 * right-hand content area where only one category's panel is visible
 * at a time.
 *
 * Replaces assets/flyout.js.
 *
 * Pure JS — no Liquid, no build step, no dependencies.
 *
 * CHANGELOG (this revision):
 * - Added hover-intent open/close on the whole menu item (not just
 *   click), matching the hover behavior of the rest of the nav bar.
 *   Click still works for touch devices and keyboard Enter/Space.
 * - OPEN_DELAY avoids accidentally opening while sweeping the mouse
 *   across the bar; CLOSE_DELAY gives users time to move from the
 *   trigger into the panel without it closing on them.
 * - showCategory() now also toggles aria-hidden on each panel, not
 *   just the .is-active class, so assistive tech doesn't rely purely
 *   on CSS display to know what's hidden.
 * - open() accepts a focusFirst flag so keyboard activation (click /
 *   Enter on the trigger) moves focus into the first category, while
 *   hover-open does not steal focus.
 *
 * Expected markup (rendered by snippets/flyout-menu.liquid):
 *
 *   <li class="menu-bar__item menu-bar__item--has-flyout">
 *     <a data-flyout-trigger aria-haspopup="true" aria-expanded="false">...</a>
 *     <div class="flyout-panel" data-flyout-panel>
 *       <div class="flyout-panel__container">
 *         <ul>
 *           <li class="flyout-panel__category is-active">
 *             <a data-flyout-category-trigger data-flyout-target="flyout-panel-x-1">...</a>
 *           </li>
 *           ...
 *         </ul>
 *         <div data-flyout-content>
 *           <div class="flyout-panel__panel is-active" id="flyout-panel-x-1" data-flyout-panel-item>...</div>
 *           ...
 *         </div>
 *       </div>
 *     </div>
 *   </li>
 */
(function () {
  "use strict";

  var HOVER_DELAY = 80;   // ms, debounce for swapping categories inside an open panel
  var OPEN_DELAY = 120;   // ms, debounce before opening the flyout on item hover
  var CLOSE_DELAY = 200;  // ms, grace period before closing on mouseleave

  function FlyoutMenu(trigger) {
    this.trigger = trigger;
    this.item = trigger.closest(".menu-bar__item--has-flyout");
    this.panel = this.item ? this.item.querySelector("[data-flyout-panel]") : null;
    if (!this.panel) return;

    this.categoryLinks = Array.prototype.slice.call(
      this.panel.querySelectorAll("[data-flyout-category-trigger]")
    );
    this.panels = Array.prototype.slice.call(
      this.panel.querySelectorAll("[data-flyout-panel-item]")
    );
    this.hoverTimer = null;
    this.openTimer = null;
    this.closeTimer = null;

    this.bind();
  }

  FlyoutMenu.prototype.isOpen = function () {
    return this.item.classList.contains("is-open");
  };

  FlyoutMenu.prototype.open = function (focusFirst) {
    clearTimeout(this.closeTimer);
    this.item.classList.add("is-open");
    this.trigger.setAttribute("aria-expanded", "true");
    if (focusFirst && this.categoryLinks[0]) {
      this.categoryLinks[0].focus();
    }
  };

  FlyoutMenu.prototype.close = function () {
    clearTimeout(this.openTimer);
    this.item.classList.remove("is-open");
    this.trigger.setAttribute("aria-expanded", "false");
  };

  FlyoutMenu.prototype.toggle = function () {
    this.isOpen() ? this.close() : this.open(true);
  };

  FlyoutMenu.prototype.showCategory = function (targetId) {
    this.categoryLinks.forEach(function (link) {
      var li = link.closest(".flyout-panel__category");
      if (!li) return;
      li.classList.toggle("is-active", link.getAttribute("data-flyout-target") === targetId);
    });
    this.panels.forEach(function (panel) {
      var active = panel.id === targetId;
      panel.classList.toggle("is-active", active);
      panel.setAttribute("aria-hidden", active ? "false" : "true");
    });
  };

  FlyoutMenu.prototype.bind = function () {
    var self = this;

    // Click: primary path for touch devices and keyboard Enter/Space activation.
    this.trigger.addEventListener("click", function (event) {
      event.preventDefault();
      self.toggle();
    });

    // Hover-intent open/close, scoped to the whole item (trigger + panel)
    // so moving the mouse from the trigger down into the panel doesn't
    // trigger a close in between.
    this.item.addEventListener("mouseenter", function () {
      clearTimeout(self.closeTimer);
      self.openTimer = setTimeout(function () {
        self.open(false);
      }, OPEN_DELAY);
    });

    this.item.addEventListener("mouseleave", function () {
      clearTimeout(self.openTimer);
      self.closeTimer = setTimeout(function () {
        self.close();
      }, CLOSE_DELAY);
    });

    // Escape closes the whole flyout and returns focus to the trigger.
    this.item.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && self.isOpen()) {
        self.close();
        self.trigger.focus();
      }
    });

    // Close when focus leaves the item entirely.
    this.item.addEventListener("focusout", function () {
      requestAnimationFrame(function () {
        if (self.isOpen() && !self.item.contains(document.activeElement)) {
          self.close();
        }
      });
    });

    // Category list: hover/focus swaps the active content panel.
    this.categoryLinks.forEach(function (link, index) {
      var targetId = link.getAttribute("data-flyout-target");

      link.addEventListener("mouseenter", function () {
        clearTimeout(self.hoverTimer);
        self.hoverTimer = setTimeout(function () {
          self.showCategory(targetId);
        }, HOVER_DELAY);
      });

      link.addEventListener("focus", function () {
        clearTimeout(self.hoverTimer);
        self.showCategory(targetId);
      });

      // Up/down arrow keys move between categories without leaving the list.
      link.addEventListener("keydown", function (event) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          (self.categoryLinks[index + 1] || self.categoryLinks[0]).focus();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          (self.categoryLinks[index - 1] || self.categoryLinks[self.categoryLinks.length - 1]).focus();
        }
      });
    });
  };

  function init() {
    var triggers = document.querySelectorAll("[data-flyout-trigger]");
    var instances = [];

    triggers.forEach(function (trigger) {
      var instance = new FlyoutMenu(trigger);
      if (instance.panel) instances.push(instance);
    });

    if (!instances.length) return;

    // Click outside any open flyout closes it.
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
