// Animations switch shared by every page: Auto (default), Full or Off, saved per browser.
// Auto stays full unless the device looks slow: data saver, "reduce motion", very low specs, or a low measured frame rate.
(function () {
  var KEY = "edog-motion", SLOW = "edog-motion-slow", root = document.documentElement;
  var get = function (s, k) { try { return s.getItem(k); } catch (e) { return null; } };
  var put = function (s, k, v) { try { s.setItem(k, v); } catch (e) {} };

  var saved = get(localStorage, KEY);
  var choice = saved === "full" || saved === "off" ? saved : "auto";
  var conn = navigator.connection;
  var weak = !!(conn && conn.saveData) ||
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2) ||
    (navigator.deviceMemory > 0 && navigator.deviceMemory <= 2) ||
    get(sessionStorage, SLOW) === "1";

  var listeners = [], off = false;
  var resolve = function () { return choice === "off" || (choice === "auto" && weak); };
  var apply = function () {
    var next = resolve();
    root.classList.toggle("motion-off", next);
    root.setAttribute("data-motion", choice);
    var changed = next !== off;
    off = next;
    label();
    if (changed) listeners.forEach(function (fn) { try { fn(off); } catch (e) {} });
  };

  var btn = null;
  var NAMES = { auto: "Auto", full: "Full", off: "Off" };
  var label = function () {
    if (!btn) return;
    btn.querySelector("b").textContent = NAMES[choice];
    var why = choice === "auto" ? (off ? "Auto: animations are off because this device looks slow." : "Auto: full animations, and they turn off if this device looks slow.")
      : choice === "full" ? "Full: all animations on." : "Off: no animations, best for slower devices.";
    btn.title = why + " Click to change.";
    btn.setAttribute("aria-label", "Animations: " + NAMES[choice] + ". " + why + " Click to change.");
  };

  window.EdogMotion = {
    get off() { return off; },
    get choice() { return choice; },
    onChange: function (fn) { listeners.push(fn); },
    next: function () {
      choice = { auto: "full", full: "off", off: "auto" }[choice];
      put(localStorage, KEY, choice);
      apply();
    }
  };
  off = resolve();
  root.classList.toggle("motion-off", off);
  root.setAttribute("data-motion", choice);

  // Auto: watch the real frame rate for two short windows after the page settles; both must be low, so one hiccup can't trigger it
  function probe() {
    if (weak || choice !== "auto") return;
    if (document.hidden) { setTimeout(probe, 2000); return; }
    var windows = 0, low = 0;
    (function measure() {
      var frames = 0, time = 0, last = performance.now();
      (function frame(now) {
        var d = now - last; last = now;
        if (d < 500) { frames++; time += d; } // a long gap means the tab was hidden, not that the device is slow
        if (time < 2500) { requestAnimationFrame(frame); return; }
        windows++;
        if (frames / (time / 1000) < 28) low++;
        if (windows < 2) { measure(); return; }
        if (low === 2) { weak = true; put(sessionStorage, SLOW, "1"); apply(); }
      })(last);
    })();
  }

  function ready() {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "motion-btn";
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg><span>Animations</span><b></b>';
    btn.addEventListener("click", function () { window.EdogMotion.next(); });
    document.body.appendChild(btn);
    label();
    setTimeout(probe, 1500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
})();
