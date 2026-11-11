(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;   // user asked for less motion
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;     // mouse (not touch)
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = 'cubic-bezier(.2,.8,.2,1)';
  const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  window.__fobas = 1;                                                      // tells the page that this script loaded

  let locked = false;                                                      // true while the menu / course popup is open
  const lockScroll = on => { locked = on; html.classList.toggle('lock', on); };
  const smoothTo = y => scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });

  function splitWords(el, cls = 'w') {
    let n = 0;
    const walk = node => {
      [...node.childNodes].forEach(ch => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = cls;
            const i = document.createElement('span'); i.className = cls === 'w' ? 'wi' : 'sw';
            i.textContent = part; i.style.setProperty('--wi', n++);
            if (cls === 'w') { w.appendChild(i); frag.appendChild(w); } else { frag.appendChild(i); }
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) walk(ch);
      });
    };
    el.setAttribute('aria-label', el.textContent.trim());
    walk(el);
    return n;
  }
  $$('[data-split]').forEach(el => splitWords(el));
  const scrubEls = $$('[data-scrub]').map(el => { splitWords(el, 'sw'); return { el, words: $$('.sw', el) }; });

  function startReveals() {
    $$('[data-stagger]').forEach(p => {
      $$(':scope > [data-reveal]', p).forEach((k, i) => k.style.setProperty('--d', (Math.min(i, 9) * 0.08) + 's'));
    });
    $$('[data-delay]').forEach(el => el.style.setProperty('--d', el.dataset.delay + 's'));
    const targets = $$('[data-reveal],[data-split]:not([data-hero] [data-split])');
    if (!('IntersectionObserver' in window)) { targets.forEach(t => t.classList.add('is-in')); return; }
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { (en.target._rv || en.target).classList.add('is-in'); io.unobserve(en.target); }
    }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(t => {
      if (t.dataset.reveal === 'mask' && t.parentElement) { t.parentElement._rv = t; io.observe(t.parentElement); }
      else io.observe(t);
    });

    const counters = $$('[data-count]');
    counters.forEach(c => { c.dataset.to = c.dataset.count; c.textContent = '0'; });
    const cio = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return; cio.unobserve(en.target);
      const el = en.target, to = +el.dataset.to, d = 1600, t0 = performance.now();
      (function step(t) {
        const k = clamp((t - t0) / d, 0, 1), v = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
        el.textContent = Math.round(to * v);
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }), { threshold: .6 });
    counters.forEach(c => cio.observe(c));
  }

  let readyDone = false;
  function ready() {
    if (readyDone) return; readyDone = true;
    $$('[data-hero]').forEach(h => {
      $$('.in-hero', h).forEach((el, i) => el.style.setProperty('--k', i));
      $$('[data-split]', h).forEach(t => t.style.setProperty('--d', '.1s'));
      h.classList.add('is-ready');
      $$('[data-split]', h).forEach(t => t.classList.add('is-in'));
    });
    startReveals();
    html.classList.add('is-loaded');
    const hash = decodeURIComponent(location.hash.slice(1));              // e.g. /courses#diploma-in-oil-and-gas opens that course
    if (hash && window.__openCourse) setTimeout(() => window.__openCourse(hash), 350);
  }

  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    let u; try { u = new URL(a.href, location.href); } catch (er) { return; }
    if (u.origin !== location.origin || a.target || a.hasAttribute('download')) return;
    const samePage = u.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '');
    if (samePage && u.hash) {
      const t = document.getElementById(decodeURIComponent(u.hash.slice(1)));
      if (t && !t.classList.contains('course-card')) { e.preventDefault(); closeMenu(); smoothTo(t.getBoundingClientRect().top + scrollY - 70); }
      return;
    }
    if (samePage) { e.preventDefault(); closeMenu(); smoothTo(0); }
  });

  const header = $('#header'), burger = $('#burger'), menu = $('#mobileMenu');
  function openMenu() { menu.classList.add('is-open'); burger.setAttribute('aria-expanded', 'true'); menu.setAttribute('aria-hidden', 'false'); lockScroll(true); header.classList.remove('is-hidden'); }
  function closeMenu() { if (!menu.classList.contains('is-open')) return; menu.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-hidden', 'true'); lockScroll(false); }
  burger.addEventListener('click', () => menu.classList.contains('is-open') ? closeMenu() : openMenu());
  $('#mmClose') && $('#mmClose').addEventListener('click', closeMenu);                 // the X button
  $('[data-mm-close]', menu) && $('[data-mm-close]', menu).addEventListener('click', closeMenu); // tap the dark area
  $$('a', menu).forEach(a => a.addEventListener('click', closeMenu));
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  addEventListener('resize', () => { if (innerWidth > 960) closeMenu(); });
  $('#toTop') && $('#toTop').addEventListener('click', () => smoothTo(0));

  if (fine && !reduce) {
    $$('[data-tilt]').forEach(el => {
      el.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.classList.add('is-tilting');
        el.style.transform = `perspective(1000px) rotateX(${((.5 - py) * 6).toFixed(2)}deg) rotateY(${((px - .5) * 8).toFixed(2)}deg) translateZ(0)`;
      });
      el.addEventListener('pointerleave', () => { el.classList.remove('is-tilting'); el.style.transform = ''; });
    });
  }
  let spotQ = null, spotRaf = 0;
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const t = e.target.closest && e.target.closest('[data-spotlight]'); if (!t) return;
    spotQ = { t, x: e.clientX, y: e.clientY };
    if (!spotRaf) spotRaf = requestAnimationFrame(() => {
      spotRaf = 0; if (!spotQ) return;
      const r = spotQ.t.getBoundingClientRect();
      spotQ.t.style.setProperty('--mx', (spotQ.x - r.left) + 'px'); spotQ.t.style.setProperty('--my', (spotQ.y - r.top) + 'px'); spotQ = null;
    });
  }, { passive: true });

  function setupMarquees() {
    $$('[data-marquee]').forEach(el => {
      const track = $('.marquee-track', el), copies = parseInt(el.dataset.copies || 2, 10), speed = parseFloat(el.dataset.speed || 1);
      const one = track.scrollWidth / copies;                                  // width of a single copy
      if (!one) return;
      track.style.setProperty('--mq-shift', (-100 / copies) + '%');
      track.style.setProperty('--mq-dur', Math.max(12, one / (speed * 60)).toFixed(1) + 's');
      if (el.dataset.dir === '1') track.style.animationDirection = 'reverse';
    });
  }

  const hs = $('[data-hscroll]');
  if (hs) {
    const vp = $('.hs-viewport', hs), bar = $('.hs-progress i', hs), btns = $$('[data-hs]', hs);
    const step = () => { const c = $('.course-card', vp); return c ? c.getBoundingClientRect().width + 26 : 320; };
    btns.forEach(b => b.addEventListener('click', () => vp.scrollBy({ left: +b.dataset.hs * step(), behavior: reduce ? 'auto' : 'smooth' })));
    let hsRaf = 0;
    const upd = () => {
      hsRaf = 0;
      const max = vp.scrollWidth - vp.clientWidth, p = max > 0 ? vp.scrollLeft / max : 0;
      if (bar) bar.style.transform = `scaleX(${clamp(p, 0, 1).toFixed(3)})`;
      btns.forEach(b => b.disabled = (+b.dataset.hs < 0 && vp.scrollLeft < 4) || (+b.dataset.hs > 0 && vp.scrollLeft > max - 4));
    };
    vp.addEventListener('scroll', () => { if (!hsRaf) hsRaf = requestAnimationFrame(upd); }, { passive: true });
    addEventListener('resize', upd); upd();
    if (fine) {
      let down = false, sx = 0, sl = 0, moved = false;
      vp.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = vp.scrollLeft; });
      addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 5) moved = true; vp.scrollLeft = sl - dx; });
      addEventListener('pointerup', () => { down = false; });
      vp.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    }
  }

  const progEls = $$('[data-progress]').map(sec => ({ sec, viz: $('.ssp-viz', sec) || sec }));
  let lastY = scrollY, scrollRaf = 0;
  function onScroll() {
    scrollRaf = 0;
    const y = scrollY, vh = innerHeight, d = y - lastY; lastY = y;
    header.classList.toggle('is-stuck', y > 30);
    if (y < 520 || d < -3 || locked) header.classList.remove('is-hidden');   // show header when scrolling up
    else if (d > 3) header.classList.add('is-hidden');                       // hide when scrolling down
    for (const s of scrubEls) {                                              // words light up as the intro text scrolls in
      const r = s.el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const p = clamp((vh * .86 - r.top) / (vh * .5 + r.height * .6), 0, 1), n = Math.round(p * s.words.length);
      s.words.forEach((w, i) => w.classList.toggle('on', i < n));
    }
    for (const g of progEls) {                                               // SSP circles fill as the section scrolls in
      const r = g.viz.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      g.viz.style.setProperty('--p', clamp((vh * .92 - r.top) / (vh * .55), 0, 1).toFixed(3));
    }
  }
  addEventListener('scroll', () => { if (!scrollRaf) scrollRaf = requestAnimationFrame(onScroll); }, { passive: true });
  onScroll();

  const cv = $('#embers');
  if (cv && !reduce) {
    const ctx = cv.getContext('2d'); let W = 0, H = 0, run = false, last = 0, parts = [];
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const mk = init => ({ x: Math.random() * W, y: init ? Math.random() * H : H + 10, r: .6 + Math.random() * 2.2, vy: .25 + Math.random() * .8, ph: Math.random() * 6.28, a: .25 + Math.random() * .7 });
    const size = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); parts = Array.from({ length: W < 700 ? 16 : 34 }, () => mk(true)); };
    size(); addEventListener('resize', size);
    new IntersectionObserver(es => run = es[0].isIntersecting).observe(cv);
    (function loop(t) {
      requestAnimationFrame(loop);
      if (!run || document.hidden || t - last < 33) return; last = t;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.y -= p.vy; p.x += Math.sin(t * .001 + p.ph) * .35;
        if (p.y < -12) Object.assign(p, mk(false));
        const tw = .6 + .4 * Math.sin(t * .004 + p.ph);
        ctx.beginPath(); ctx.fillStyle = `rgba(255,120,40,${(p.a * tw * .18).toFixed(3)})`; ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.fillStyle = `rgba(255,170,90,${(p.a * tw).toFixed(3)})`; ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
    })(0);
  }

  const grid = $('#courseGrid');
  if (grid) {
    const cards = $$('.course-card', grid);
    $$('.chip').forEach(ch => ch.addEventListener('click', () => {
      $$('.chip').forEach(c => c.classList.toggle('is-on', c === ch));
      const f = ch.dataset.filter;
      const match = c => f === '*' || c.dataset.cat === f;
      cards.filter(c => !match(c) && !c.classList.contains('is-hidden')).forEach(c => c.classList.add('is-out'));
      setTimeout(() => {
        const stay = cards.filter(c => match(c) && !c.classList.contains('is-hidden'));
        const first = new Map(stay.map(c => [c, c.getBoundingClientRect()]));
        cards.forEach(c => { if (match(c)) { c.classList.remove('is-hidden'); requestAnimationFrame(() => c.classList.remove('is-out')); } else { c.classList.add('is-hidden'); } });
        stay.forEach(c => {
          const a = first.get(c), b = c.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
          if (dx || dy) c.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], { duration: 700, easing: ease });
        });
      }, reduce ? 0 : 320);
    }));

    const dataEl = $('#courses-data'), list = dataEl ? JSON.parse(dataEl.textContent) : [];
    const modal = $('#courseModal'); let lastFocus = null;
    const $m = id => $('#' + id);
    const openCourse = key => {
      const i = typeof key === 'number' ? key : list.findIndex(c => c.slug === key);
      const c = list[i]; if (!c) return;
      lastFocus = document.activeElement;
      $m('mImg').src = c.image; $m('mImg').alt = c.title;
      $m('mCat').textContent = c.category; $m('mCat').hidden = !c.category;
      $m('mTitle').textContent = c.title; $m('mShort').textContent = c.short;
      const facts = [['Duration', c.duration], ['Eligibility', c.eligibility]].filter(f => f[1]);
      $m('mFacts').innerHTML = ''; facts.forEach(f => { const d = document.createElement('div'); const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = f[0]; dd.textContent = f[1]; d.append(dt, dd); $m('mFacts').appendChild(d); });
      $m('mFacts').hidden = !facts.length;
      const ul = $m('mList'); ul.innerHTML = '';
      c.modules.forEach((m, k) => { const li = document.createElement('li'); li.textContent = m; li.style.setProperty('--i', k); ul.appendChild(li); });
      $m('mMods').hidden = !c.modules.length;
      $m('mCta').href = '/contact?course=' + encodeURIComponent(c.slug);
      modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); lockScroll(true);
      modal.querySelector('.modal-panel').scrollTop = 0;
      history.replaceState(null, '', '#' + c.slug);
      setTimeout(() => $('.modal-x', modal).focus({ preventScroll: true }), 300);
    };
    const closeCourse = () => {
      if (!modal.classList.contains('is-open')) return;
      modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); lockScroll(false);
      history.replaceState(null, '', location.pathname + location.search);
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };
    window.__openCourse = openCourse;
    cards.forEach(c => c.addEventListener('click', e => { e.preventDefault(); openCourse(+c.dataset.index); }));
    $$('[data-close]', modal).forEach(x => x.addEventListener('click', closeCourse));
    addEventListener('keydown', e => { if (e.key === 'Escape') closeCourse(); });
  }

  $$('form.enq').forEach(form => {
    const sel = $('select[name=course]', form), want = new URLSearchParams(location.search).get('course');
    if (want && sel) [...sel.options].forEach(o => { if (slugify(o.textContent) === want) sel.value = o.textContent; });
    const err = $('.form-error', form), done = $('.form-done', form), btn = $('button[type=submit]', form);
    form.addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = '';
      let bad = false;
      ['name', 'email', 'phone'].forEach(n => {                      // simple checks before sending
        const inp = form.elements[n], f = inp.closest('.field');
        const v = inp.value.trim(); const ok = n === 'email' ? /^\S+@\S+\.\S+$/.test(v) : n === 'phone' ? v.replace(/\D/g, '').length >= 7 : v.length > 1;
        f.classList.toggle('err', !ok); if (!ok) bad = true;
      });
      if (bad) { err.textContent = 'Please fill in your name, a valid email and phone number.'; return; }
      btn.classList.add('is-loading');
      try {                                                          // POST to /api/enquiry (saved in Supabase + Resend email)
        const res = await fetch(form.action, { method: 'POST', body: new URLSearchParams(new FormData(form)), headers: { Accept: 'application/json' } });
        const j = await res.json();
        if (j.ok) { done.classList.add('show'); form.reset(); } else err.textContent = j.error || 'Something went wrong. Please try again.';
      } catch (x) { err.textContent = 'Network error. Please call us or try again.'; }
      btn.classList.remove('is-loading');
    });
    $$('.field input,.field textarea', form).forEach(i => i.addEventListener('input', () => i.closest('.field').classList.remove('err')));
  });

  (() => {
    const items = () => $$('[data-lightbox]');
    if (!items().length) return;                                              // only pages that have posters
    const lb = document.createElement('div');
    lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-hidden', 'true');
    lb.innerHTML = '<button class="lb-x" type="button" aria-label="Close">&times;</button><button class="lb-nav lb-prev" type="button" aria-label="Previous">&#8249;</button><img alt="Enlarged image"><button class="lb-nav lb-next" type="button" aria-label="Next">&#8250;</button>';
    document.body.appendChild(lb);
    const big = $('img', lb); let cur = 0;
    const show = n => { const l = items(); cur = (n + l.length) % l.length; big.src = l[cur].dataset.lightbox; big.alt = ($('img', l[cur]) || {}).alt || ''; };
    const open = n => { show(n); lb.classList.add('on'); lb.setAttribute('aria-hidden', 'false'); lockScroll(true); };
    const close = () => { lb.classList.remove('on'); lb.setAttribute('aria-hidden', 'true'); lockScroll(false); };
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-lightbox]');
      if (t) { open(items().indexOf(t)); return; }
      if (!lb.classList.contains('on')) return;
      if (e.target.closest('.lb-prev')) show(cur - 1);
      else if (e.target.closest('.lb-next')) show(cur + 1);
      else if (e.target.closest('.lb-x') || e.target === lb || e.target === big) close();
    });
    addEventListener('keydown', e => {
      if (!lb.classList.contains('on')) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') show(cur - 1); else if (e.key === 'ArrowRight') show(cur + 1);
    });
  })();

  setupMarquees();
  addEventListener('load', setupMarquees);                                   // re-measure once images/fonts are in
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(ready));
  else requestAnimationFrame(ready);
  setTimeout(() => { if (!readyDone) ready(); }, 3000);                      // safety: never leave the page hidden
})();
