(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CFG = window.SIX24 || {};
  root.classList.remove('no-js');

  /* ---------- Theme ---------- */
  var ICON = {
    moon: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
    sun: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>'
  };
  function paintThemeBtn() {
    var dark = root.classList.contains('dark');
    $$('[data-theme-btn]').forEach(function (b) { b.innerHTML = dark ? ICON.sun : ICON.moon; b.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme'); });
  }
  $$('[data-theme-btn]').forEach(function (b) {
    b.addEventListener('click', function () {
      var next = root.classList.contains('dark') ? 'light' : 'dark';
      root.classList.remove('light', 'dark'); root.classList.add(next);
      try { localStorage.setItem('six24.theme', next); } catch (e) { /* storage blocked */ }
      paintThemeBtn();
    });
  });
  paintThemeBtn();

  /* ---------- Header: one class toggle per state change, no layout change ---------- */
  var head = $('.site-head'), ticking = false, on = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var s = window.scrollY > 8;
      if (s !== on) { on = s; head.classList.toggle('scrolled', s); }
      ticking = false;
    });
  }
  if (head) { window.addEventListener('scroll', onScroll, { passive: true }); onScroll(); }

  /* Mobile menu */
  var mb = $('.menu-btn'), mn = $('.mob-nav');
  function setMenu(open) { if (!mn) return; mn.classList.toggle('open', open); mb.setAttribute('aria-expanded', String(open)); }
  if (mb && mn) {
    mb.addEventListener('click', function () { setMenu(!mn.classList.contains('open')); });
    $$('a', mn).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    document.addEventListener('click', function (e) { if (mn.classList.contains('open') && !mn.contains(e.target) && !mb.contains(e.target)) setMenu(false); });
  }

  /* ---------- Email links ---------- */
  $$('[data-mail]').forEach(function (a) {
    var sub = a.getAttribute('data-subject');
    a.href = 'mailto:' + CFG.email + (sub ? '?subject=' + encodeURIComponent(sub) : '');
    if (!a.textContent.trim()) a.textContent = CFG.email;
  });
  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- Chat demo: WhatsApp, Slack, Teams, looping ---------- */
  var APPS = {
    wa: { name: "WhatsApp", sub: "Business account", me: "Peter Parker", meI: "PP", mgr: "Tony Stark",
      steps: [
        { bot: "Hi Peter 👋 What would you like to do?", opts: ["Apply leave", "Get my payslip", "Mark attendance"], pick: 0 },
        { bot: "Which leave would you like to take?", opts: ["Casual leave (6 left)", "Sick leave (4 left)", "Earned leave (12 left)"], pick: 0 },
        { bot: "Pick your dates", opts: ["Fri, 13 Nov 2026", "Mon, 16 Nov 2026", "Choose other dates"], pick: 0 },
        { status: "Sent to <b>Tony Stark</b> for approval. Nobody else on your team is off that day.", wait: 1500 },
        { status: "<b>Approved by Tony Stark.</b> It's on the team calendar and payroll already knows. 5 casual leaves left.", ok: true }
      ] },
    sl: { name: "Slack", sub: "App in #people-desk", me: "Wanda Maximoff", meI: "WM", mgr: "Steve Rogers",
      steps: [
        { bot: "Morning Wanda. What do you need today?", opts: ["Apply leave", "Payslip", "Attendance"], pick: 0 },
        { bot: "Choose a leave type", opts: ["Casual", "Sick", "Earned"], pick: 2 },
        { bot: "Which dates?", opts: ["Mon 16 to Tue 17 Nov", "Fri, 20 Nov", "Other dates"], pick: 0 },
        { status: "Request for 2 days of earned leave sent to <b>Steve Rogers</b>.", wait: 1500 },
        { status: "<b>Steve Rogers approved your leave.</b> Your out-of-office is set for 16 to 17 Nov.", ok: true }
      ] },
    tm: { name: "Teams", sub: "Chat with SIX24", me: "Bruce Banner", meI: "BB", mgr: "Natasha Romanoff",
      steps: [
        { bot: "Hi Bruce, how can I help?", opts: ["Apply leave", "View payslip", "Check attendance"], pick: 0 },
        { bot: "What kind of leave?", opts: ["Casual leave", "Sick leave", "Earned leave"], pick: 1 },
        { bot: "When are you off?", opts: ["Today, 30 Oct", "Tomorrow, 31 Oct", "Other dates"], pick: 0 },
        { status: "Sick leave for today sent to <b>Natasha Romanoff</b>. Your meetings have been flagged.", wait: 1500 },
        { status: "<b>Approved by Natasha Romanoff.</b> Get well soon, Bruce. No documents needed for one day.", ok: true }
      ] }
  };
  var ORDER = ["wa", "sl", "tm"];
  var phone = $(".phone"), chat = $("[data-chat]");
  if (phone && chat) {
    var tabs = $$(".demo-tab");
    var gen = 0, cur = 0, timers = [], raf = 0;
    var clock = function (i) { var m = 2 + i; return "10:" + (m < 10 ? "0" + m : m); };

    var clear = function () { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); };
    var later = function (fn, ms, g) { timers.push(setTimeout(function () { if (g === gen) fn(); }, ms)); };

    var msg = function (key, side, html, i) {
      var app = APPS[key], el = document.createElement("div");
      el.className = "m " + side;
      var t = '<span class="t">' + clock(i) + (side === "me" ? " ✓✓" : "") + "</span>";
      if (key === "sl") {
        var who = side === "bot" ? 'SIX24<em>APP</em>' : app.me;
        el.innerHTML = '<span class="sav">' + (side === "bot" ? "S24" : app.meI) + '</span><div class="bub"><div class="who">' + who + "<small>" + clock(i) + '</small></div><div class="txt">' + html + "</div></div>";
      } else if (key === "tm" && side === "bot") {
        el.innerHTML = '<div class="bub"><div style="font-size:.72rem;font-weight:700;color:#5B5FC7;margin-bottom:2px">SIX24</div><div class="txt">' + html + "</div>" + t + "</div>";
      } else {
        el.innerHTML = '<div class="bub"><div class="txt">' + html + "</div>" + t + "</div>";
      }
      return el;
    };
    var add = function (el) {
      chat.appendChild(el);
      while (chat.children.length > 9) chat.removeChild(chat.firstChild);
    };
    var typing = function () { var d = document.createElement("div"); d.className = "typing"; d.innerHTML = "<i></i><i></i><i></i>"; return d; };

    var setApp = function (idx) {
      var key = ORDER[idx], app = APPS[key];
      cur = idx;
      phone.setAttribute("data-app", key);
      $("[data-appname]", phone).textContent = app.name;
      $("[data-sub]", phone).textContent = app.sub;
      tabs.forEach(function (t, i) { t.setAttribute("aria-selected", String(i === idx)); t.style.setProperty("--p", 0); });
      chat.innerHTML = '<span class="ph-day">Today</span>';
      return key;
    };

    var renderFinal = function (idx) {
      var key = setApp(idx), app = APPS[key];
      app.steps.forEach(function (s, i) {
        if (s.bot) {
          var b = msg(key, "bot", s.bot, i);
          var o = document.createElement("div"); o.className = "opts";
          s.opts.forEach(function (txt, j) { var bt = document.createElement("span"); bt.className = "opt " + (j === s.pick ? "chosen" : "used"); bt.textContent = txt; o.appendChild(bt); });
          $(".bub", b).appendChild(o); add(b);
          add(msg(key, "me", s.opts[s.pick], i));
        } else {
          var st = msg(key, "bot", s.status, i); st.classList.add("status");
          if (s.ok) $(".bub", st).insertAdjacentHTML("afterbegin", '<span class="tick">✓</span>');
          add(st);
        }
      });
    };

    var play = function (idx) {
      clear(); gen++; var g = gen;
      var key = setApp(idx), app = APPS[key];
      var t = 500, total = 0;
      app.steps.forEach(function (s, i) {
        later(function () { var ty = typing(); ty.setAttribute("data-ty", ""); add(ty); }, t, g);
        t += 850;
        if (s.bot) {
          (function (s, i, at) {
            var b, opts = [];
            later(function () {
              var ty = $("[data-ty]", chat); if (ty) ty.remove();
              b = msg(key, "bot", s.bot, i);
              var o = document.createElement("div"); o.className = "opts";
              s.opts.forEach(function (txt) { var bt = document.createElement("span"); bt.className = "opt"; bt.textContent = txt; o.appendChild(bt); opts.push(bt); });
              $(".bub", b).appendChild(o); add(b);
            }, at, g);
            later(function () { opts[s.pick].classList.add("tap", "chosen"); opts.forEach(function (o, j) { if (j !== s.pick) o.classList.add("used"); }); }, at + 1300, g);
            later(function () { opts[s.pick].classList.remove("tap"); add(msg(key, "me", s.opts[s.pick], i)); }, at + 1750, g);
          })(s, i, t);
          t += 2100;
        } else {
          (function (s, i, at) {
            later(function () {
              var ty = $("[data-ty]", chat); if (ty) ty.remove();
              var st = msg(key, "bot", s.status, i); st.classList.add("status");
              if (s.ok) $(".bub", st).insertAdjacentHTML("afterbegin", '<span class="tick">✓</span>');
              add(st);
            }, at, g);
          })(s, i, t);
          t += (s.wait || 0) + 400;
        }
      });
      total = t + 2600;
      var start = performance.now(), tab = tabs[idx];
      var step = function (now) { if (g !== gen) return; var p = Math.min(1, (now - start) / total); tab.style.setProperty("--p", p); if (p < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
      later(function () { play((idx + 1) % ORDER.length); }, total, g);
    };

    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { if (reduce) renderFinal(i); else play(i); });
    });

    if (reduce) { renderFinal(0); }
    else if ("IntersectionObserver" in window) {
      var started = false;
      new IntersectionObserver(function (e, io) { if (e[0].isIntersecting && !started) { started = true; play(0); io.disconnect(); } }, { threshold: .25 }).observe(phone);
    } else { play(0); }
  }

  /* ---------- Reveal ---------- */
  var rv = $$('.rv');
  if (reduce || !('IntersectionObserver' in window)) rv.forEach(function (e) { e.classList.add('in'); });
  else {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    rv.forEach(function (e) { io.observe(e); });
  }

  /* ---------- Product tour ---------- */
  var tour = $('[data-tour]');
  if (tour) {
    var tabs = $$('.tour-tab', tour), slides = $$('.slide', tour), capT = $('[data-cap-t]', tour), capP = $('[data-cap-p]', tour);
    var cur = 0, raf = 0, start = 0, paused = false, elapsed = 0, DUR = 6500, visible = false;
    function load(i) { $$('img[data-src]', slides[i]).forEach(function (im) { im.src = im.getAttribute('data-src'); im.removeAttribute('data-src'); }); }
    function show(i, user) {
      cur = (i + slides.length) % slides.length;
      load(cur); load((cur + 1) % slides.length);
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === cur)); t.tabIndex = k === cur ? 0 : -1; t.style.setProperty('--p', 0); });
      slides.forEach(function (s, k) { s.classList.toggle('on', k === cur); s.setAttribute('aria-hidden', String(k !== cur)); });
      capT.textContent = tabs[cur].getAttribute('data-t'); capP.textContent = tabs[cur].getAttribute('data-p');
      elapsed = 0; start = performance.now();
      if (user) { paused = true; tabs[cur].style.setProperty('--p', 1); }
    }
    function tick(now) {
      if (!paused && visible && !reduce) {
        elapsed += now - start;
        var p = Math.min(1, elapsed / DUR); tabs[cur].style.setProperty('--p', p);
        if (p >= 1) show(cur + 1);
      }
      start = now; raf = requestAnimationFrame(tick);
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(i, true); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); show(cur + (e.key === 'ArrowRight' ? 1 : -1), true); tabs[cur].focus(); }
      });
    });
    $$('[data-tour-prev]', tour).forEach(function (b) { b.addEventListener('click', function () { show(cur - 1, true); }); });
    $$('[data-tour-next]', tour).forEach(function (b) { b.addEventListener('click', function () { show(cur + 1, true); }); });
    var box = $('.slides', tour), x0 = null;
    box.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    box.addEventListener('pointerup', function (e) { if (x0 === null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1), true); });
    tour.addEventListener('mouseenter', function () { paused = true; });
    tour.addEventListener('mouseleave', function () { paused = false; start = performance.now(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: .35 }).observe(tour); else visible = true;
    show(0); raf = requestAnimationFrame(tick);
  }

  /* ---------- Pricing ---------- */
  var plansEl = $('[data-plans]');
  if (plansEl) {
    var P = {
      six: { name: 'Six', incl: 25, annual: { base: 1975, rate: 79 }, monthly: { base: 2225, rate: 89 } },
      twelve: { name: 'Twelve', incl: 50, annual: { base: 5950, rate: 119 }, monthly: { base: 6950, rate: 139 } },
      tf: { name: 'Twenty-Four', incl: 100, annual: { base: 18900, rate: 189 }, monthly: { base: 21900, rate: 219 } }
    };
    var mode = 'annual';
    var inr = function (n) { return '₹' + Math.round(n).toLocaleString('en-IN'); };
    var cost = function (k, n) { var p = P[k], r = p[mode]; return r.base + Math.max(0, n - p.incl) * r.rate; };
    function paint() {
      $$('[data-bill]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-bill') === mode)); });
      Object.keys(P).forEach(function (k) {
        var r = P[k][mode];
        $$('[data-base="' + k + '"]').forEach(function (e) { e.textContent = inr(r.base); });
        $$('[data-rate="' + k + '"]').forEach(function (e) { e.textContent = inr(r.rate); });
        $$('[data-gst="' + k + '"]').forEach(function (e) { e.textContent = inr(r.base * 1.18); });
      });
      $$('[data-mode-label]').forEach(function (e) { e.textContent = mode === 'annual' ? 'billed yearly, paid upfront' : 'billed monthly, no lock-in'; });
      $$('[data-addon]').forEach(function (e) { e.textContent = e.getAttribute('data-' + mode); });
      calc();
    }
    $$('[data-bill]').forEach(function (b) { b.addEventListener('click', function () { mode = b.getAttribute('data-bill'); paint(); }); });
    var num = $('#hc'), rng = $('#hc-range');
    function calc() {
      if (!num) return;
      var n = Math.max(1, Math.min(5000, parseInt(num.value, 10) || 1)), best = null;
      Object.keys(P).forEach(function (k) {
        var m = cost(k, n), box = $('[data-calc="' + k + '"]');
        $('b', box).textContent = inr(m) + '/mo';
        $('span', box).textContent = inr(m / n) + ' per employee · ' + inr(m * 1.18) + ' with GST';
        box.classList.remove('best');
        var fits = k === 'six' ? n <= 100 : k === 'twelve' ? n >= 30 && n <= 500 : n >= 300;
        if (fits && !best) best = k;
      });
      if (best) $('[data-calc="' + best + '"]').classList.add('best');
      var note = $('[data-calc-note]');
      if (note) note.textContent = 'For ' + n + ' employees, ' + (mode === 'annual' ? 'billed yearly' : 'billed monthly') + '. Highlighted: the plan built for a team your size. Six covers one legal company; a second company needs Twelve.';
    }
    if (num && rng) {
      num.addEventListener('input', function () { rng.value = Math.min(1000, num.value || 1); calc(); });
      rng.addEventListener('input', function () { num.value = rng.value; calc(); });
    }
    paint();
  }
})();
