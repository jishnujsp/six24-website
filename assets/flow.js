/* SIX24 one-question-at-a-time form engine. The page sets window.FLOW before loading this file. */
(function () {
'use strict';
const F = window.FLOW, CFG = window.SIX24 || {};
const IC = {
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>', check: '<path d="M20 6 9 17l-5-5"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>', 'chevron-down': '<path d="m6 9 6 6 6-6"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  enter: '<polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>', alert: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', rotate: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'
};
const ic = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.getElementById(s);
const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }, del(k) { try { localStorage.removeItem(k); } catch (e) { } } };
const DRAFT = 'six24.' + F.key + '.draft';
const LIVE = !!(CFG.formsEndpoint && /^https:\/\//.test(CFG.formsEndpoint));

const STEPS = [{ id: 'welcome', type: 'welcome' }].concat(F.steps, [{ id: 'end', type: 'end' }]);
let A = {}, cur = 0, busy = false, started = Date.now(), Q = {}, resultId = '';
let draft = LS.get(DRAFT);

/* theme */
const root = document.documentElement;
function setTheme(t) { root.className = t; LS.set('six24.theme', t); $('themeBtn').innerHTML = ic(t === 'dark' ? 'sun' : 'moon'); }
(function () { let t = null; try { t = localStorage.getItem('six24.theme'); } catch (e) { } t = t && t.replace(/"/g, ''); if (t !== 'dark' && t !== 'light') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; setTheme(t); })();
$('themeBtn').onclick = () => { const b = $('themeBtn'); b.classList.add('spin'); setTimeout(() => b.classList.remove('spin'), 500); setTheme(root.classList.contains('dark') ? 'light' : 'dark'); };
$('upBtn').innerHTML = ic('chevron-up'); $('downBtn').innerHTML = ic('chevron-down'); $('closeBtn').innerHTML = ic('x');

const visible = () => STEPS.filter(s => !s.when || s.when(A));
const qSteps = () => visible().filter(s => !['welcome', 'end'].includes(s.type));
const first = () => esc((A.name || '').trim().split(/\s+/)[0] || '');
const pipe = t => String(typeof t === 'function' ? t(A) : t).replace(/\{first\}/g, first()).replace(/,\s*\?/, '?').replace(/, <em><\/em>\./, '.').replace(/ <em><\/em>/, '');
function saveDraft() { if (Object.keys(A).length) LS.set(DRAFT, { A, step: STEPS[cur].id, started }); }
const optsOf = s => typeof s.opts === 'function' ? s.opts(A) : s.opts;
const val = o => typeof o === 'object' ? o.v : o;
const lab = o => typeof o === 'object' ? `${esc(o.v)}${o.s ? `<small>${esc(o.s)}</small>` : ''}` : esc(o);

function body(s) {
  const v = A[s.id];
  switch (s.type) {
    case 'text': case 'email':
      return `<input class="line-in" id="in" type="${s.type === 'email' ? 'email' : 'text'}" autocomplete="${s.ac || (s.type === 'email' ? 'email' : 'off')}" ${s.max ? `maxlength="${s.max}"` : ''} placeholder="${esc(s.ph)}" value="${esc(v || '')}">`;
    case 'phone':
      return `<div class="phone"><span class="cc">+91</span><input class="line-in" id="in" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="14" placeholder="${esc(s.ph)}" value="${esc(v || '')}"></div>`;
    case 'long':
      return `<textarea class="line-in" id="in" rows="1" maxlength="1500" placeholder="${esc(s.ph)}">${esc(v || '')}</textarea><div class="ta-meta mono"><span id="cnt">${(v || '').length} / 1500</span></div>`;
    case 'single': case 'multi': {
      const opts = optsOf(s), sel = s.type === 'multi' ? (v || []) : [v], keys = opts.map((_, i) => String.fromCharCode(65 + i)), otherV = A[s.id + '_other'] || '';
      return (s.type === 'multi' ? `<div class="multi-note">Choose as many as you like</div>` : '') +
        `<div class="choices ${s.two ? 'two' : ''}" role="${s.type === 'multi' ? 'group' : 'radiogroup'}">` +
        opts.map((o, i) => `<button type="button" class="choice ${sel.includes(val(o)) ? 'on' : ''}" data-v="${esc(val(o))}" data-k="${keys[i]}" role="${s.type === 'multi' ? 'checkbox' : 'radio'}" aria-checked="${sel.includes(val(o))}"><span class="key mono">${keys[i]}</span><span class="lbl">${lab(o)}</span>${ic('check').replace('class="i"', 'class="i tick"')}</button>`).join('') +
        `</div>` + (s.other ? `<div class="other-in ${v === s.other ? 'show' : ''}"><input id="otherIn" placeholder="Tell us…" maxlength="80" value="${esc(otherV)}"></div>` : '');
    }
  }
  return '';
}

function slideHTML(s) {
  if (s.type === 'welcome') {
    const back = draft && draft.A && draft.A.name, W = F.welcome;
    return `<div class="q">
      <div class="hero-eyebrow st mono" style="--i:0">${esc(W.eyebrow)}</div>
      <h1 class="hero-t st" style="--i:1">${back ? `Welcome back, ${esc(draft.A.name.split(' ')[0])}<span class="dot">.</span>` : W.title + '<span class="dot">.</span>'}</h1>
      <p class="hero-p st" style="--i:2">${back ? 'Your answers are saved on this device. Pick up where you left off.' : W.text}</p>
      <div class="meta st" style="--i:3"><span>${ic('clock')}${esc(W.time)}</span><span>${ic('lock')}Read only by the SIX24 founders</span></div>
      <div class="q-actions st" style="--i:4">
        <button class="btn-primary" id="okBtn">${back ? 'Continue' : 'Start'} ${ic('arrow-right')}</button>
        ${back ? `<button class="btn" id="restartBtn">${ic('rotate')}Start over</button>` : ''}
        <span class="hint kb">press <b>Enter</b> ${ic('enter')}</span>
      </div></div>`;
  }
  if (s.type === 'end') {
    const E = F.end(A, esc);
    return `<div class="q">
      <div class="done-mark st" style="--i:0"><span class="ring"></span><span class="ring r2"></span><span class="disc"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span></div>
      <h1 class="hero-t st" style="--i:1">${E.title}<span class="dot">.</span></h1>
      <p class="hero-p st" style="--i:2">${E.text}</p>
      ${E.recap ? `<div class="recap st" style="--i:3">${E.recap.map(r => `<div><small>${esc(r[0])}</small><b>${esc(r[1])}</b></div>`).join('')}</div>` : ''}
      ${resultId ? `<div class="idchip mono st" style="--i:4">Reference <b>${esc(resultId)}</b></div>` : ''}
      <div class="q-actions st" style="--i:5">${E.actions}</div>
    </div>`;
  }
  const list = qSteps(), idx = list.indexOf(s), last = idx === list.length - 1;
  return `<div class="q" id="qbox">
    <div class="q-no mono st" style="--i:0">${String(idx + 1).padStart(2, '0')} ${ic('arrow-right')}</div>
    <h1 class="q-title st" style="--i:1">${pipe(s.title)}${s.req ? '<span class="req">*</span>' : '<span class="opt">Optional</span>'}</h1>
    ${s.help ? `<p class="q-help st" style="--i:2">${pipe(s.help)}</p>` : ''}
    <div class="q-body st" style="--i:3">${body(s)}</div>
    <div class="q-err" id="err">${ic('alert')}<span id="errT"></span></div>
    <div class="q-actions st" style="--i:4">
      <button class="btn-primary" id="okBtn">${last ? `${esc(F.submitLabel || 'Submit')} ${ic('send')}` : `OK ${ic('check')}`}</button>
      <span class="hint kb">${s.type === 'long' ? '<b>Shift ↵</b> for a new line · ' : ''}press <b>Enter</b> ${ic('enter')}</span>
    </div></div>`;
}

function show(i, dir) {
  const stage = $('stage'), old = stage.querySelector('.slide:not(.out)');
  cur = i; const s = STEPS[i];
  if (old) { old.classList.add('out', dir === 'back' ? 'down' : 'up'); setTimeout(() => old.remove(), 480); }
  const el = document.createElement('section');
  el.className = 'slide' + (dir === 'back' ? ' from-top' : '');
  el.innerHTML = slideHTML(s);
  stage.appendChild(el); bind(el, s);
  requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add('in'); el.classList.remove('from-top'); }));
  setTimeout(() => { const f = el.querySelector('#in'); if (f && matchMedia('(hover:hover)').matches) f.focus({ preventScroll: true }); if (f && f.tagName === 'TEXTAREA') grow(f); }, old ? 420 : 200);
  chrome();
}
function chrome() {
  const s = STEPS[cur], list = qSteps(), idx = list.indexOf(s), q = idx >= 0;
  $('count').classList.toggle('show', q);
  if (q) $('count').innerHTML = `<b>${String(idx + 1).padStart(2, '0')}</b> / ${String(list.length).padStart(2, '0')}`;
  $('progBar').style.width = s.type === 'end' ? '100%' : s.type === 'welcome' ? '0%' : (idx / list.length * 100) + '%';
  $('pager').classList.toggle('show', q); $('upBtn').disabled = !q;
}
function grow(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
function bind(el, s) {
  const ok = el.querySelector('#okBtn'); if (ok) ok.onclick = () => s.type === 'welcome' ? begin() : next();
  const rs = el.querySelector('#restartBtn'); if (rs) rs.onclick = () => { LS.del(DRAFT); draft = null; A = {}; started = Date.now(); applyQuery(); go(1, 'fwd'); };
  const inp = el.querySelector('#in');
  if (inp) {
    inp.oninput = () => {
      let v = inp.value; if (s.type === 'phone') { v = v.replace(/[^\d ]/g, ''); inp.value = v; }
      A[s.id] = v; inp.classList.remove('bad'); hideErr();
      if (inp.tagName === 'TEXTAREA') { grow(inp); el.querySelector('#cnt').textContent = v.length + ' / 1500'; }
      saveDraft();
    };
  }
  const oth = el.querySelector('#otherIn'); if (oth) oth.oninput = () => { A[s.id + '_other'] = oth.value; hideErr(); saveDraft(); };
  el.querySelectorAll('.choice').forEach(b => b.onclick = e => { if (e.detail) b.blur(); pick(el, s, b); });
}
function pick(el, s, b) {
  const v = b.dataset.v;
  if (s.type === 'multi') { const arr = new Set(A[s.id] || []); arr.has(v) ? arr.delete(v) : arr.add(v); A[s.id] = [...arr]; b.classList.toggle('on'); b.setAttribute('aria-checked', arr.has(v)); hideErr(); saveDraft(); return; }
  A[s.id] = v; hideErr();
  el.querySelectorAll('.choice').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
  const oi = el.querySelector('.other-in');
  if (s.other && oi) { if (v === s.other) { oi.classList.add('show'); setTimeout(() => el.querySelector('#otherIn').focus(), 60); saveDraft(); return; } oi.classList.remove('show'); }
  b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
  saveDraft(); relabel(s); autoNext(s);
}
let autoT;
function isLast(s) { const v = visible(); return v[v.indexOf(s) + 1].type === 'end'; }
function relabel(s) { const ok = document.querySelector('.slide:not(.out) #okBtn'); if (ok && !busy) ok.innerHTML = isLast(s) ? `${esc(F.submitLabel || 'Submit')} ${ic('send')}` : `OK ${ic('check')}`; chrome(); }
function autoNext(s) {
  clearTimeout(autoT);
  if (isLast(s)) { const ok = document.querySelector('.slide:not(.out) #okBtn'); if (ok) { ok.classList.remove('nudge'); void ok.offsetWidth; ok.classList.add('nudge'); ok.focus({ preventScroll: true }); } return; }
  autoT = setTimeout(() => { if (STEPS[cur] === s) next(); }, 520);
}
function check(s) {
  const v = A[s.id];
  if (s.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'That email doesn’t look right.';
  if (s.type === 'phone' && v && v.replace(/\D/g, '').length !== 10) return 'Please enter a 10-digit mobile number.';
  if (!s.req) return '';
  if (s.type === 'multi') return (v && v.length) ? '' : 'Pick at least one.';
  if (v === undefined || v === null || !String(v).trim()) return s.type === 'single' ? 'Please choose an option.' : 'Please fill this in.';
  if (s.other && v === s.other && !String(A[s.id + '_other'] || '').trim()) return 'Tell us a little more.';
  return '';
}
function showErr(msg) {
  const e = document.querySelector('.slide:not(.out) #err'), q = document.querySelector('.slide:not(.out) #qbox'); if (!e) return;
  e.querySelector('#errT').textContent = msg; e.classList.add('show');
  const b = q.querySelector('.q-body'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
  const inp = q.querySelector('#in'); if (inp) inp.classList.add('bad');
}
function hideErr() { const e = document.querySelector('.slide:not(.out) #err'); if (e) e.classList.remove('show'); }

function go(i, dir) { if (i >= 0 && i < STEPS.length) show(i, dir); }
function begin() {
  if (draft && draft.A && draft.A.name) { A = Object.assign({}, A, draft.A); started = draft.started || Date.now(); const j = STEPS.findIndex(x => x.id === draft.step); draft = null; go(j > 0 ? j : 1, 'fwd'); return; }
  go(1, 'fwd');
}
function next() {
  if (busy) return;
  const s = STEPS[cur]; if (s.type === 'welcome') return begin(); if (s.type === 'end') return;
  const m = check(s); if (m) return showErr(m);
  const vis = visible(), i = vis.indexOf(s), nx = vis[i + 1];
  if (nx.type === 'end') return submit();
  go(STEPS.indexOf(nx), 'fwd'); LS.set(DRAFT, { A, step: nx.id, started });
}
function prev() { const vis = visible(), i = vis.indexOf(STEPS[cur]); if (i > 0) { const p = vis[i - 1]; go(STEPS.indexOf(p), 'back'); if (p.type !== 'welcome') LS.set(DRAFT, { A, step: p.id, started }); } }
$('upBtn').onclick = prev; $('downBtn').onclick = next;

/* submit */
function payload() {
  const p = { form: F.key, secs: Math.round((Date.now() - started) / 1000), src: Q.src || '', page: location.pathname, hp: ($('hp') || {}).value || '' };
  STEPS.forEach(s => {
    if (['welcome', 'end'].includes(s.type) || (s.when && !s.when(A))) return;
    let v = A[s.id];
    if (Array.isArray(v)) v = v.join(', ');
    if (s.other && v === s.other) v = s.other + ': ' + (A[s.id + '_other'] || '');
    if (s.type === 'phone' && v) v = '+91 ' + String(v).replace(/\s/g, '');
    p[s.id] = v == null ? '' : String(v).trim();
  });
  return p;
}
function submit() {
  busy = true; const ok = document.querySelector('.slide:not(.out) #okBtn');
  if (ok) { ok.disabled = true; ok.innerHTML = '<span class="spinner"></span> Sending'; }
  const done = r => {
    busy = false;
    if (!r || !r.ok) { if (ok) { ok.disabled = false; ok.innerHTML = `${esc(F.submitLabel || 'Submit')} ${ic('send')}`; } toast((r && r.error) || 'That didn’t go through. Check your connection and try again.'); return; }
    resultId = r.id || ''; LS.del(DRAFT); draft = null; go(STEPS.length - 1, 'fwd');
  };
  const p = payload();
  if (LIVE) {
    fetch(CFG.formsEndpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(p) })
      .then(r => r.json()).then(done).catch(() => done({ ok: false, error: 'That didn’t go through. Try again, or write to ' + (CFG.email || 'us') + '.' }));
  } else setTimeout(() => { const all = LS.get('six24.forms.preview') || []; all.push(p); LS.set('six24.forms.preview', all); done({ ok: true, id: (F.key === 'demo' ? 'DM-' : 'WL-') + String(all.length).padStart(4, '0') }); }, 900);
}

/* leave guard (Esc or the close button) */
const scrim = $('scrim');
const dirty = () => Object.keys(A).some(k => !Q[k] || A[k] !== Q[k]) && !['end', 'welcome'].includes(STEPS[cur].type);
function openGuard() { scrim.classList.add('show'); setTimeout(() => $('dCont').focus(), 50); }
function closeGuard() { scrim.classList.remove('show'); const f = document.querySelector('.slide:not(.out) #in'); if (f) f.focus({ preventScroll: true }); }
$('dCont').onclick = closeGuard;
scrim.onclick = e => { if (e.target === scrim) closeGuard(); };
$('dSave').onclick = () => { saveDraft(); location.href = F.home; };
$('dDiscard').onclick = () => { LS.del(DRAFT); location.href = F.home; };
$('closeBtn').onclick = e => { if (dirty()) { e.preventDefault(); openGuard(); } };
let toastT;
function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3800); }

/* keyboard */
document.addEventListener('keydown', e => {
  if (scrim.classList.contains('show')) { if (e.key === 'Escape') { e.preventDefault(); closeGuard(); } return; }
  const s = STEPS[cur], t = e.target, typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA';
  if (e.key === 'Escape') { if (dirty()) { e.preventDefault(); openGuard(); } return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'Enter') {
    if (t.tagName === 'TEXTAREA' && e.shiftKey) return;
    if (t.tagName === 'A') return;
    if (t.tagName === 'BUTTON' && !/okBtn/.test(t.id) && t.closest('.choices,.dlg,.pager,.top')) return;
    e.preventDefault(); next(); return;
  }
  if (typing || s.type === 'end' || s.type === 'welcome') return;
  const k = e.key.toUpperCase();
  if (['single', 'multi'].includes(s.type) && /^[A-Z]$/.test(k)) { const b = document.querySelector(`.slide:not(.out) .choice[data-k="${k}"]`); if (b) { e.preventDefault(); b.click(); } return; }
  if (e.key === 'ArrowUp') { e.preventDefault(); prev(); }
  if (e.key === 'ArrowDown') { e.preventDefault(); next(); }
});

/* prefill from the link: ?plan=Twelve&src=pricing&name=&email= */
function applyQuery() {
  try { Q = {}; new URLSearchParams(location.search).forEach((v, k) => { Q[k] = String(v).slice(0, 80); }); } catch (e) { Q = {}; }
  (F.prefill || []).forEach(k => { if (Q[k] && !A[k]) A[k] = Q[k]; });
  if (Q.plan && !Q.src) Q.src = 'pricing';
}
if (!LIVE) $('pv').classList.add('show');
applyQuery();
show(0, 'fwd');
})();
