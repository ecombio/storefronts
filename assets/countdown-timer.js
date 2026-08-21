/* countdown-timer.js */

if (!customElements.get('countdown-timer')) {
  class CountdownTimer extends HTMLElement {
    connectedCallback() {
      this.type = this.dataset.type || 'fixed';
      this.duration = this.dataset.duration || 'every_month';
      this.dueDate = this.dataset.dueDate || '';

      this.dayEl = this.querySelector('[data-timer-day]');
      this.hourEl = this.querySelector('[data-timer-hour]');
      this.minuteEl = this.querySelector('[data-timer-minute]');
      this.secondEl = this.querySelector('[data-timer-second]');

      this.endTime = this._resolveEndTime();
      if (!this.endTime) return;

      this._tick();
      this._interval = setInterval(() => this._tick(), 1000);
    }

    disconnectedCallback() {
      clearInterval(this._interval);
    }

    _resolveEndTime() {
      if (this.type === 'fixed') {
        if (!this.dueDate) return null;
        const parsed = this._parseDate(this.dueDate);
        return parsed ? parsed.getTime() : null;
      }

      // Evergreen: use localStorage to persist end time across page loads
      const storageKey = `countdown_evergreen_${this.id}`;
      let stored = null;

      try {
        stored = localStorage.getItem(storageKey);
      } catch (e) {}

      if (stored) {
        const ts = parseInt(stored, 10);
        if (!isNaN(ts) && ts > Date.now()) return ts;
      }

      const end = Date.now() + this._evergreenMs();

      try {
        localStorage.setItem(storageKey, String(end));
      } catch (e) {}

      return end;
    }

    _evergreenMs() {
      const day = 24 * 60 * 60 * 1000;
      switch (this.duration) {
        case 'every_day':   return day;
        case 'every_week':  return 7 * day;
        case 'every_month':
        default:            return 30 * day;
      }
    }

    _parseDate(str) {
      if (!str) return null;
      // Accept: YYYY/MM/DD HH:MM  or  YYYY/MM/DD HH:MM AM/PM
      const clean = str.trim().replace(/\//g, '-');
      const ampm = /AM|PM/i.test(clean);

      if (ampm) {
        const match = clean.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return null;
        let [, datePart, hours, minutes, period] = match;
        hours = parseInt(hours, 10);
        if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
        if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
        return new Date(`${datePart}T${String(hours).padStart(2, '0')}:${minutes}:00`);
      }

      const match = clean.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})$/);
      if (!match) return null;
      const [, datePart, hours, minutes] = match;
      return new Date(`${datePart}T${hours}:${minutes}:00`);
    }

    _tick() {
      const remaining = this.endTime - Date.now();

      if (remaining <= 0) {
        this._render(0, 0, 0, 0);
        clearInterval(this._interval);

        // Evergreen: reset
        if (this.type === 'evergreen') {
          const storageKey = `countdown_evergreen_${this.id}`;
          try { localStorage.removeItem(storageKey); } catch (e) {}
          this.endTime = this._resolveEndTime();
          this._interval = setInterval(() => this._tick(), 1000);
        }
        return;
      }

      const days    = Math.floor(remaining / 86400000);
      const hours   = Math.floor((remaining % 86400000) / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      this._render(days, hours, minutes, seconds);
    }

    _render(d, h, m, s) {
      const pad = (n) => String(n).padStart(2, '0');
      if (this.dayEl)    this.dayEl.textContent    = pad(d);
      if (this.hourEl)   this.hourEl.textContent   = pad(h);
      if (this.minuteEl) this.minuteEl.textContent = pad(m);
      if (this.secondEl) this.secondEl.textContent = pad(s);
    }
  }

  customElements.define('countdown-timer', CountdownTimer);
}
