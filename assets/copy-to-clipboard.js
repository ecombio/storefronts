/* copy-to-clipboard.js */
/* Handles the [is="copy-to-clipboard"] pattern used by the discount code block */

if (!customElements.get('copy-to-clipboard')) {
  class CopyToClipboard extends HTMLElement {
    connectedCallback() {
      this._button = this.querySelector('button');
      this._tooltip = this.querySelector('.tooltip');

      if (this._button) {
        this._button.addEventListener('click', () => this._copy());
      }
    }

    async _copy() {
      const value = this.dataset.copyValue;
      if (!value) return;

      try {
        await navigator.clipboard.writeText(value);
      } catch {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try { document.execCommand('copy'); } catch {}
        document.body.removeChild(ta);
      }

      this._showTooltip();
    }

    _showTooltip() {
      if (!this._tooltip) return;
      this._tooltip.classList.add('tooltip--visible');
      clearTimeout(this._tooltipTimeout);
      this._tooltipTimeout = setTimeout(() => {
        this._tooltip.classList.remove('tooltip--visible');
      }, 2000);
    }
  }

  customElements.define('copy-to-clipboard', CopyToClipboard, { extends: 'div' });
}
