/* AU ONE STUDIO · event-bus.js
   Observer pattern. The decoupling backbone of the platform: engines and
   plugins publish/subscribe here instead of calling each other directly.
   Classic script (module pattern) — shares one global scope, no build step. */

const Bus = (() => {
  const map = {};
  return {
    /* subscribe; returns an unsubscribe function */
    on(event, fn) { (map[event] = map[event] || []).push(fn); return () => Bus.off(event, fn); },
    off(event, fn) { map[event] = (map[event] || []).filter(f => f !== fn); },
    /* fire an event; listener errors are isolated so one bad handler can't break others */
    emit(event, ...args) { (map[event] || []).forEach(f => { try { f(...args); } catch (e) { console.warn('[Bus]', event, e); } });
      (map['*'] || []).forEach(f => { try { f(event, ...args); } catch (e) {} }); },
    once(event, fn) { const off = Bus.on(event, (...a) => { off(); fn(...a); }); return off; }
  };
})();

/* AUS — the single global namespace for the platform. Starts empty here (this
   file loads first); main.js's populateAUS() fills engines/builders/ui once
   every other file has loaded, right before emitting 'app:ready'. External
   ERP modules should wait for that event, then read everything through
   window.AUS instead of depending on individual global names. */
const AUS = { version: '1.0.0', bus: Bus, engines: {}, builders: {}, ui: {} };
window.AUS = AUS;
