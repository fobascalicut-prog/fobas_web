'use strict';
const ICONS = require('./icons');
const DIMS = require('../data/img-dims.json');
const BUILD = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.BUILD_ID || 'dev').slice(0, 8);

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
const e = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ESC[m]);
const rt = (s) => e(s).replace(/\*(.+?)\*/gs, '<em class="hl">$1</em>');
const plain = (s) => String(s == null ? '' : s).replace(/\*/g, '');
const br = (s) => e(s).replace(/\n/g, '<br>');
const paras = (s) => String(s || '').trim().split(/\n{2,}/).filter((p) => p.trim()).map((p) => `<p>${rt(p)}</p>`).join('');
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const tel = (p) => 'tel:' + String(p).replace(/[^0-9+]/g, '');
const phoneLink = (p, cls = '') => `<a${cls ? ` class="${cls}"` : ''} href="${e(tel(p))}">${e(p)}</a>`;
const pad = (n) => String(n).padStart(2, '0');
const href = (u) => { const s = String(u == null ? '' : u).trim(); return /^(https?:|mailto:|tel:|\/|#|[\w-]+(\.[\w]+)?(\?|#|$))/i.test(s) && !/^\s*(javascript|data|vbscript):/i.test(s) ? e(s) : '#'; };
const hex = (s) => (/^#[0-9a-f]{6}$/i.test(String(s)) ? s : '#ff5b14');

const ARROW = '<svg class="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const PATHS = { home: '/', about: '/about', courses: '/courses', placement: '/placement', contact: '/contact' };

function create(C, { comments = [], base = '' } = {}) {
  const CATEGORY_ALIASES = { Quality: 'QA/QC' };

  const STUDENTS_TRAINED = '1000';
  if (C && C.home && Array.isArray(C.home.stats)) {
    C = { ...C, home: { ...C.home, stats: C.home.stats.map((s) => (/students trained/i.test(s.label || '') ? { ...s, value: STUDENTS_TRAINED, suffix: '+' } : s)) } };
  }

  const SOCIAL_FALLBACK = {
    instagram: 'https://www.instagram.com/fobas_institute_official/',
    facebook: 'https://www.facebook.com/profile.php?id=61586702114953',
    youtube: 'https://www.youtube.com/@Fobas-institute',
  };
  if (C && Array.isArray(C.courses)) C = { ...C, courses: C.courses.map((x) => ({ ...x, category: CATEGORY_ALIASES[x.category] || x.category })) };

  if (C && Array.isArray(C.courses)) {
    let list = C.courses.filter((x) => !/\bHR\s+Administration\b/i.test(x.title || ''))
      .map((x) => (/^x-?ray\s+welding/i.test(x.title || '') ? { ...x, title: String(x.title).replace(/^x-?ray\s+welding/i, 'X-Ray Quality Welding') } : x))
      .map((x) => (/^qa\/qc\s+mechanical/i.test(x.title || '') ? { ...x, title: 'QA/QC Mechanical (NDT / Pipeline Engineering)' } : x));
    const seenTitles = new Set();
    list = list.filter((x) => { const k = String(x.title || '').toLowerCase().replace(/[^a-z0-9]/g, ''); if (seenTitles.has(k)) return false; seenTitles.add(k); return true; });
    const welding = list.find((x) => /^x-?ray\s+quality\s+welding/i.test(x.title || ''));
    const logistics = list.find((x) => /logistics/i.test(x.title || ''));
    list = list.filter((x) => x !== welding && x !== logistics);
    if (welding) list.splice(Math.min(2, list.length), 0, welding);
    if (logistics) list.splice(Math.min(4, list.length), 0, logistics);
    C = { ...C, courses: list };
  }
  const c = (path, def = '') => {
    let v = C;
    for (const k of String(path).split('.')) {
      if (v && typeof v === 'object' && k in v) v = v[k]; else return def;
    }
    return v == null ? def : v;
  };
  const isLocal = (p) => !/^(https?:)?\/\//i.test(String(p));
  const url = (p) => (isLocal(p) ? '/' + String(p).replace(/^\/+/, '') : String(p));
  const asset = (p) => e(isLocal(p) ? `${url(p)}?v=${BUILD}` : p);
  function img(path, alt = '', cls = '', lazy = true, extra = '') {
    if (!path) return '';
    const d = isLocal(path) ? DIMS[String(path).replace(/^\/+/, '')] : null;
    return `<img src="${asset(path)}" alt="${e(alt)}"${d ? ` width="${d[0]}" height="${d[1]}"` : ''}${cls ? ` class="${e(cls)}"` : ''}${lazy ? ' loading="lazy" decoding="async"' : ' fetchpriority="high"'}${extra ? ' ' + extra : ''}>`;
  }
  const phones = () => [c('site.phone'), c('site.phone2')].map((x) => String(x || '').trim()).filter(Boolean);
  const wa = () => {
    const n = String(c('site.whatsapp')).replace(/\D/g, '');
    return n ? `https://wa.me/${n}?text=${encodeURIComponent(c('site.whatsapp_message'))}` : '';
  };
  const btn = (b, v = 'primary', extra = '') => (!b || !b.label ? '' :
    `<a class="btn btn-${e(v)}" href="${href(b.url || '#')}" ${extra}><span class="btn-fill"></span><span class="btn-label">${e(b.label)}</span>${ARROW}</a>`);
  const eyebrow = (t) => (t ? `<p class="eyebrow" data-reveal="fade"><i></i>${e(t)}</p>` : '');

  const recentPlacements = () => (c('recent_placements', []) || []).filter((x) => x && x.image);
  const posterCard = (item, i) => {
    const alt = `Recently placed student ${i + 1}`;
    return `<button type="button" class="poster" data-reveal="up" data-lightbox="${asset(item.image)}" aria-label="View larger: ${e(alt)}">${img(item.image, alt)}</button>`;
  };

  const pageHero = (h = {}) => `
<section class="page-hero theme-dark" data-hero>
  <div class="ph-media">${img(h.image, '', 'ph-img', false)}</div>
  <div class="ph-shade"></div>
  <div class="wrap ph-in">
    <p class="eyebrow in-hero"><i></i>${e(h.eyebrow)}</p>
    <h1 class="display" data-split="hero">${rt(h.title)}</h1>
    <p class="lead in-hero">${e(h.text)}</p>
  </div>
  <div class="ph-line"></div>
</section>`;

  const statsRow = (stats = []) => `<div class="stats" data-stagger>${stats.map((s) => `
    <div class="stat" data-reveal="up">
      <b><span data-count="${parseInt(s.value, 10) || 0}">${e(s.value)}</span><em>${e(s.suffix)}</em></b>
      <span class="stat-label">${e(s.label)}</span>
    </div>`).join('')}</div>`;

  const courseCard = (co, i, mode) => {
    const slug = slugify(co.title);
    const h = mode === 'link' ? `/courses#${slug}` : `#${slug}`;
    return `
<a class="course-card" id="${e(slug)}" href="${e(h)}"${mode === 'modal' ? ' data-reveal="up"' : ''} data-tilt data-spotlight data-cursor="View" data-cat="${e(co.category)}" data-index="${i}">
  <div class="cc-media">${img(co.image, co.title)}<span class="cc-num">${pad(i + 1)}</span></div>
  <div class="cc-body">
    ${co.category ? `<span class="cc-cat">${e(co.category)}</span>` : ''}
    <h3>${/^QA\/QC/i.test(co.title) ? e(co.title).replace(' (', '<br>(') : e(co.title)}</h3>
    <p>${e(co.short)}</p>
    <div class="cc-foot">
      <span class="cc-meta">${co.duration ? `<b>${e(co.duration)}</b>` : ''}</span>
      <span class="cc-more">Learn more ${ARROW}</span>
    </div>
  </div>
</a>`;
  };

  const studentCard = (s, placed) => `
<article class="student" data-tilt data-spotlight data-reveal="up">
  <div class="st-photo">${img(s.photo, s.name)}</div>
  <div class="st-body">
    <h3>${e(s.name)}</h3>
    ${s.placed_at ? `<p><small>${e(placed)}</small>${e(s.placed_at)}</p>` : ''}
  </div>
</article>`;

  const partnersMarquee = (title = '') => {
    const p = c('partners', []);
    if (!p.length) return '';
     const tiles = p.map((x) => {   const isAdaniPipeline = /adani.*pipeline|pipeline.*adani/i.test(x.name || '');    const logo = x.logo || (     isAdaniPipeline       ? 'p-adani-pipeline.webp'       : ''   );    return `     <figure class="logo-tile" tabindex="0" data-reveal="up" data-native-cursor>       <span class="lt-img">         ${logo ? img(logo, x.name) : `<span class="lt-text">${e(x.name)}</span>`}       </span>       <figcaption>${e(x.name)}</figcaption>     </figure>   `; }).join('');
    return `
<div class="partners">
  ${title ? `<p class="eyebrow center" data-reveal="fade"><i></i>${e(title)}</p>` : ''}
  <div class="partner-grid" data-stagger>${tiles}</div>
</div>`;
  };

  const enqForm = (prefix, title, mod = '') => {
    const f = c('contact.form', {});
    const ts = Math.floor(Date.now() / 1000);
    return `
    <form class="enq ${mod}" ${prefix === 'c' ? 'id="enquiry"' : ''} method="post" action="/api/enquiry" novalidate data-reveal="up">
      ${title ? `<h2 class="h2">${e(title)}</h2>` : ''}
      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <input type="hidden" name="ts" value="${ts}">
      <div class="field"><input id="${prefix}-name" name="name" type="text" placeholder=" " required autocomplete="name"><label for="${prefix}-name">${e(f.label_name)}</label><i></i></div>
      <div class="field"><input id="${prefix}-email" name="email" type="email" placeholder=" " required autocomplete="email"><label for="${prefix}-email">${e(f.label_email)}</label><i></i></div>
      <div class="field"><input id="${prefix}-phone" name="phone" type="tel" placeholder=" " required autocomplete="tel"><label for="${prefix}-phone">${e(f.label_phone)}</label><i></i></div>
      <div class="field field-select"><select id="${prefix}-course" name="course"><option value="">${e(f.course_placeholder)}</option>${c('courses', []).map((co) => `<option>${e(co.title)}</option>`).join('')}</select><label for="${prefix}-course" class="on">${e(f.label_course)}</label><i></i></div>
      <div class="field"><textarea id="${prefix}-msg" name="message" rows="3" placeholder=" "></textarea><label for="${prefix}-msg">${e(f.label_message)}</label><i></i></div>
      <button class="btn btn-primary btn-block" type="submit"><span class="btn-fill"></span><span class="btn-label">${e(f.button)}</span>${ARROW}</button>
      <p class="form-error" role="alert"></p>
      <div class="form-done" aria-live="polite">
        <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 27l8 8 14-16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <h3>${e(f.success_title)}</h3><p>${e(f.success_text)}</p>
      </div>
    </form>`;
  };

  const ctaBand = (cta = {}) => `
<section class="cta theme-accent" data-spotlight>
  <div class="wrap cta-in">
    <div class="cta-copy">
      <h2 class="h1" data-split>${rt(cta.title)}</h2>
      <p data-reveal="up">${e(cta.text)}</p>
      <ul class="cta-contact" data-reveal="up">
        ${phones().map((p) => `<li>${phoneLink(p)}</li>`).join('')}
        <li><a href="mailto:${e(c('site.email'))}">${e(c('site.email'))}</a></li>
      </ul>
    </div>
    ${enqForm('cta', cta.form_title || 'Send us a message', 'enq-cta')}
  </div>
</section>`;

  const SEO_KEY = { home: 'home', about: 'about', courses: 'courses_page', placement: 'placement_page', contact: 'contact' };
  const header = (page, title, desc, image, extraLd = []) => {
    const siteName = c('site.name', 'Fobas Group');
    const sk = SEO_KEY[page];
    const full = c(sk + '.seo_title') || (page === 'home' ? `${siteName} | ${c('site.tagline')} · Best Oil & Gas Course in Kerala` : `${title} | ${siteName}`);
    const metaDesc = c(sk + '.seo_description') || desc || c('site.description');
    const keywords = c('site.seo_keywords');
    const cur0 = PATHS[page];
    const pageUrl = base + (cur0 === '/' ? '/' : cur0);
    const og = image ? (isLocal(image) ? base + url(image) : image) : (base + url(c('site.logo_dark')));
    const orgId = base + '/#organization';
    const socials = ['instagram', 'facebook', 'youtube', 'linkedin', 'twitter'].map((k) => c('site.' + k) || SOCIAL_FALLBACK[k] || '').filter(Boolean);
    const branches = (c('contact.branches', []) || []).filter((b) => b && b.name && b.address);
    const addr = (text, locality) => ({
      '@type': 'PostalAddress', streetAddress: String(text).replace(/\n/g, ', '), addressLocality: locality || 'Kozhikode', addressRegion: 'Kerala',
      postalCode: (String(text).match(/\b\d{6}\b/) || [''])[0] || undefined, addressCountry: 'IN',
    });
    const org = {
      '@type': ['EducationalOrganization', 'LocalBusiness'], '@id': orgId, name: siteName, alternateName: 'Fobas Institute', url: base + '/',
      logo: base + url(c('site.logo_dark')), image: og, description: c('site.description'), slogan: c('site.tagline'),
      email: c('site.email'), telephone: phones(), address: addr(c('site.address'), 'Kozhikode'),
      areaServed: { '@type': 'State', name: 'Kerala' },
      contactPoint: phones().map((t) => ({ '@type': 'ContactPoint', telephone: t, contactType: 'admissions', areaServed: 'IN' })),
      ...(socials.length ? { sameAs: socials } : {}),
      ...(branches.length ? { department: branches.map((b) => ({
        '@type': ['EducationalOrganization', 'LocalBusiness'], name: `${siteName} ${b.name}`, parentOrganization: { '@id': orgId },
        address: addr(b.address, b.name), telephone: phones(), ...(b.map_url ? { hasMap: b.map_url } : {}),
      })) } : {}),
    };
    const graph = [
      org,
      { '@type': 'WebSite', '@id': base + '/#website', url: base + '/', name: siteName, inLanguage: 'en-IN', publisher: { '@id': orgId } },
      { '@type': 'WebPage', '@id': pageUrl + '#webpage', url: pageUrl, name: plain(full), description: metaDesc, inLanguage: 'en-IN', isPartOf: { '@id': base + '/#website' }, about: { '@id': orgId }, ...(og ? { primaryImageOfPage: { '@type': 'ImageObject', url: og } } : {}) },
    ];
    if (page !== 'home') {
      graph.push({ '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: base + '/' },
        { '@type': 'ListItem', position: 2, name: plain(title), item: pageUrl },
      ] });
    }
    (extraLd || []).forEach((x) => graph.push(x));
    const ld = { '@context': 'https://schema.org', '@graph': graph };
    const nav = c('nav', []);
    const cur = PATHS[page];
    return `<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${e(plain(full))}</title>
<meta name="description" content="${e(plain(metaDesc))}">
${keywords ? `<meta name="keywords" content="${e(keywords)}">` : ''}
<meta name="author" content="${e(siteName)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
${process.env.GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${e(process.env.GOOGLE_SITE_VERIFICATION)}">` : ''}
${process.env.BING_SITE_VERIFICATION ? `<meta name="msvalidate.01" content="${e(process.env.BING_SITE_VERIFICATION)}">` : ''}
<meta name="geo.region" content="IN-KL">
<meta name="geo.placename" content="Kozhikode, Kochi, Kerala">
<meta name="theme-color" content="#0a0c14">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${e(siteName)}">
<meta property="og:locale" content="en_IN">
<meta property="og:url" content="${e(pageUrl)}">
<meta property="og:title" content="${e(plain(full))}">
<meta property="og:description" content="${e(plain(metaDesc))}">
${og ? `<meta property="og:image" content="${e(og)}">\n<meta property="og:image:alt" content="${e(plain(title) + ' - ' + siteName)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(plain(full))}">
<meta name="twitter:description" content="${e(plain(metaDesc))}">
${og ? `<meta name="twitter:image" content="${e(og)}">` : ''}
<link rel="canonical" href="${e(pageUrl)}">
<link rel="alternate" hreflang="en-IN" href="${e(pageUrl)}">
<link rel="alternate" hreflang="x-default" href="${e(pageUrl)}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/assets/img/favicon-192.png" type="image/png" sizes="192x192">
<link rel="icon" href="/assets/img/favicon-512.png" type="image/png" sizes="512x512">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png" sizes="180x180">
<link rel="preload" href="/assets/fonts/display-700.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="/assets/fonts/inter-400.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="/assets/css/style.css?v=${BUILD}">
<style>:root{--accent:${hex(c('site.accent_color'))}}</style>
<script>/* mark JS as available; if main.js ever fails to load, reveal all content after 5s */var d=document.documentElement;d.className='js';setTimeout(function(){if(!window.__fobas)d.classList.add('rv-fallback')},5000)</script>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body data-page="${e(page)}">

<a class="skip" href="#main">Skip to content</a>

<header class="site-header" id="header">
  <div class="wrap header-in">
    <a class="logo" href="/" aria-label="${e(siteName)} home">
      <img src="${asset(c('site.logo_light'))}" alt="${e(siteName)}" width="257" height="177">
    </a>
    <nav class="nav" aria-label="Primary">
      ${nav.map((n) => `<a class="nav-link${n.url === cur ? ' is-active' : ''}" href="${href(n.url)}"><span>${e(n.label)}</span></a>`).join('')}
    </nav>
    <div class="header-actions">
      ${btn(c('header_cta', {}), 'primary', 'data-cursor="Enquire"')}
      <button class="burger" id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="mobileMenu"><i></i><i></i></button>
    </div>
  </div>
</header>

<div class="mobile-menu" id="mobileMenu" aria-hidden="true">
  <div class="mm-bg" data-mm-close></div>
  <button class="mm-close" id="mmClose" type="button" aria-label="Close menu"><i></i><i></i></button>
  <nav class="mm-nav" aria-label="Mobile">
    ${nav.map((n, i) => `<a href="${href(n.url)}" style="--i:${i}"><small>${pad(i + 1)}</small><span>${e(n.label)}</span></a>`).join('')}
  </nav>
  <div class="mm-foot">
    ${phones().map((p) => phoneLink(p)).join('')}
    <a href="mailto:${e(c('site.email'))}">${e(c('site.email'))}</a>
  </div>
</div>

<main id="main">
`;
  };

  const footer = () => {
    const w = wa();
    return `
</main>

<footer class="site-footer theme-dark">
  <div class="wrap">
    <div class="foot-top" data-stagger>
      <div class="foot-brand" data-reveal="up">
        <img src="${asset(c('site.logo_light'))}" alt="${e(c('site.name'))}" width="257" height="177" loading="lazy">
        <p>${e(c('footer.about'))}</p>
      </div>
      <div class="foot-col foot-links" data-reveal="up">
        <h4>Quick links</h4>
        <div class="foot-stack">
          ${c('nav', []).slice(0, 5).map((n) => `<a href="${href(n.url)}">${e(n.label)}</a>`).join('')}
        </div>
      </div>
      <div class="foot-col foot-links" data-reveal="up">
        <h4>Courses</h4>
        <div class="foot-stack">
          ${c('courses', []).map((co) => `<a href="/courses#${e(slugify(co.title))}">${e(co.title)}</a>`).join('')}
        </div>
      </div>
      <div class="foot-col foot-contact" data-reveal="up">
        <h4>Contact</h4>
        ${phones().map((p) => phoneLink(p, 'foot-phone')).join('')}
        <a class="foot-mail" href="mailto:${e(c('site.email'))}">${e(c('site.email'))}</a>
        <div class="socials">
          ${[['instagram', 'Instagram'], ['facebook', 'Facebook'], ['youtube', 'YouTube'], ['linkedin', 'LinkedIn']]
    .map(([k, label]) => [k, label, c('site.' + k) || SOCIAL_FALLBACK[k] || '']).filter((x) => x[2])
    .map(([k, label, link]) => `<a href="${href(link)}" target="_blank" rel="noopener" aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICONS[k]}</svg></a>`).join('')}
          <a href="${e(wa() || 'https://wa.me/918606797539')}" target="_blank" rel="noopener" aria-label="WhatsApp" title="WhatsApp"><svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 3C8.800 3 3 8.800 3 16c0 2.300.6 4.500 1.700 6.400L3 29l6.800-1.700A13 13 0 0 0 16 29c7.200 0 13-5.800 13-13S23.200 3 16 3zm0 23.700c-2 0-3.900-.6-5.500-1.600l-.4-.2-4 1 1.100-3.900-.3-.4A10.600 10.600 0 1 1 16 26.700zm5.800-7.900c-.3-.2-1.900-.9-2.200-1-.3-.1-.5-.2-.7.200-.2.300-.8 1-1 1.200-.2.200-.4.200-.7.100-.3-.2-1.400-.5-2.600-1.600-1-.9-1.600-1.900-1.800-2.200-.2-.3 0-.5.100-.7l.5-.5c.1-.2.200-.3.300-.5.100-.2 0-.4 0-.5l-1-2.300c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.100-.8.400-.3.300-1.100 1.100-1.100 2.600s1.100 3 1.300 3.200c.2.200 2.200 3.400 5.300 4.700 2 .8 2.700.9 3.700.7.600-.1 1.900-.8 2.100-1.500.3-.7.300-1.400.2-1.500-.1-.2-.3-.3-.6-.4z"/></svg></a>
        </div>
        ${(c('contact.branches', []).filter((b) => b.map_url).length ? c('contact.branches', []).filter((b) => b.map_url) : [{ name: 'Directions', map_url: c('site.map_directions_url') }]).filter((b) => b.map_url).slice(0, 2).map((b) => `<a class="dir-link" href="${href(b.map_url)}" target="_blank" rel="noopener"><b>${e(b.name)}</b><span>${e(c('footer.directions_label', 'Get directions'))}</span>${ARROW}</a>`).join('')}
      </div>
    </div>
    <div class="foot-bottom" data-reveal="fade">
      <span class="foot-copy">${e(c('footer.copyright'))}</span>
      <span class="foot-credit">Designed &amp; Developed by <b>GROWFERRY INDIA</b></span>
    </div>
  </div>
</footer>

${w ? `<a class="wa-float" href="${e(w)}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp" data-cursor="Chat">
  <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 3C8.800 3 3 8.800 3 16c0 2.300.6 4.500 1.700 6.400L3 29l6.800-1.700A13 13 0 0 0 16 29c7.200 0 13-5.800 13-13S23.200 3 16 3zm0 23.700c-2 0-3.900-.6-5.500-1.600l-.4-.2-4 1 1.100-3.900-.3-.4A10.600 10.600 0 1 1 16 26.700zm5.800-7.900c-.3-.2-1.900-.9-2.200-1-.3-.1-.5-.2-.7.200-.2.300-.8 1-1 1.200-.2.200-.4.200-.7.100-.3-.2-1.400-.5-2.600-1.600-1-.9-1.600-1.900-1.800-2.200-.2-.3 0-.5.100-.7l.5-.5c.1-.2.200-.3.300-.5.100-.2 0-.4 0-.5l-1-2.300c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.100-.8.400-.3.300-1.100 1.100-1.100 2.600s1.100 3 1.300 3.200c.2.200 2.200 3.400 5.300 4.700 2 .8 2.700.9 3.700.7.600-.1 1.900-.8 2.100-1.500.3-.7.300-1.400.2-1.500-.1-.2-.3-.3-.6-.4z"/></svg>
  <span class="wa-ping"></span>
</a>` : ''}

<script src="/assets/js/main.js?v=${BUILD}" defer></script>
</body>
</html>`;
  };

  const pages = {};

  pages.home = () => {
    const h = c('home.hero', {});
    const courses = c('courses', []);
    const students = c('students', []).slice(0, 6);
    const placed = c('placement_page.placed_label', 'Placed at');
    return {
      title: 'Home', desc: c('site.description'), image: h.image,
      body: `
<section class="hero theme-dark" data-hero id="top">
  <div class="hero-media">${img(h.image, '', 'hero-img', false)}</div>
  <div class="hero-shade"></div>
  <div class="hero-grid" aria-hidden="true"></div>
  <canvas class="embers" id="embers" aria-hidden="true"></canvas>
  <div class="wrap hero-in">
    <p class="eyebrow in-hero"><i></i>${e(h.eyebrow)}</p>
    <h1 class="display hero-title" data-split="hero">${rt(h.title)}</h1>
    <p class="lead in-hero">${e(h.text)}</p>
    <div class="hero-cta in-hero">
      ${btn(h.button_primary, 'primary', 'data-cursor="Go"')}
      ${btn(h.button_secondary, 'ghost')}
    </div>
  </div>
  <a class="scroll-cue in-hero" href="#about-intro" aria-label="Scroll down"><span>${e(h.scroll_label)}</span><i></i></a>
</section>

<div class="band" aria-hidden="true">
  <div class="marquee" data-marquee data-speed="0.7" data-copies="4">
    <div class="marquee-track">
      ${[0, 1, 2, 3].map(() => c('home.marquee', []).map((w) => `<span class="band-word">${e(w)}</span><span class="band-star"></span>`).join('')).join('')}
    </div>
  </div>
</div>

<section class="sec theme-light intro" id="about-intro">
  <div class="wrap">
    ${eyebrow(c('home.intro.eyebrow'))}
    <p class="scrub-text" data-scrub>${e(c('home.intro.text'))}</p>
    <a class="link-arrow" href="${href(c('home.intro.link_url'))}" data-reveal="up">${e(c('home.intro.link_label'))} ${ARROW}</a>
    ${statsRow(c('home.stats', []))}
  </div>
</section>

<section class="sec theme-dark ssp" data-progress>
  <div class="wrap ssp-grid">
    <div class="ssp-copy">
      ${eyebrow(c('home.ssp.eyebrow'))}
      <h2 class="h1" data-split>${rt(c('home.ssp.title'))}</h2>
      <p class="lead" data-reveal="up">${e(c('home.ssp.text'))}</p>
    </div>
    <div class="ssp-viz" aria-hidden="false">
      <div class="orb orb-a"><span>${e(c('home.ssp.left_title'))}</span></div>
      <div class="orb orb-b"><span>${e(c('home.ssp.right_title'))}</span></div>
      <div class="orb-core"><b>${e(c('home.ssp.center_label'))}</b></div>
    </div>
    <div class="ssp-lists">
      <ul data-stagger>${c('home.ssp.left_items', []).map((it) => `<li data-reveal="up">${e(it)}</li>`).join('')}</ul>
      <ul data-stagger>${c('home.ssp.right_items', []).map((it) => `<li data-reveal="up">${e(it)}</li>`).join('')}</ul>
    </div>
  </div>
</section>

<section class="hscroll theme-dark" data-hscroll>
  <div class="hs-sticky">
    <div class="wrap hs-head">
      <div>${eyebrow(c('home.courses.eyebrow'))}<h2 class="h1" data-split>${rt(c('home.courses.title'))}</h2></div>
      <div class="hs-side">
        <p data-reveal="up">${e(c('home.courses.text'))}</p>
        <a class="link-arrow" href="${href(c('home.courses.link_url'))}">${e(c('home.courses.link_label'))} ${ARROW}</a>
      </div>
    </div>
    <div class="hs-stage">
      <div class="hs-viewport"><div class="hs-track">${courses.map((co, i) => courseCard(co, i, 'link')).join('')}</div></div>
      <button type="button" class="hs-btn" data-hs="-1" aria-label="Previous course">${ARROW}</button>
      <button type="button" class="hs-btn" data-hs="1" aria-label="Next course">${ARROW}</button>
    </div>
    <div class="hs-foot"><div class="hs-progress"><i></i></div></div>
  </div>
</section>

<section class="sec theme-light why">
  <div class="wrap why-grid">
    <div class="why-head">${eyebrow(c('home.why.eyebrow'))}<h2 class="h1" data-split>${rt(c('home.why.title'))}</h2>
      ${c('home.why.text') ? `<p class="why-lead" data-reveal="up">${e(c('home.why.text'))}</p>` : ''}
      <ul class="why-points" data-stagger>${c('home.why.points', []).map((p) => `<li data-reveal="up">${e(p)}</li>`).join('')}</ul>
      ${btn(c('home.why.button'), 'primary', 'data-reveal="up"')}
    </div>
    <ol class="why-list">
      ${c('home.why.items', []).map((it, i) => `
        <li class="why-item" data-reveal="up" data-spotlight>
          <span class="why-n">${pad(i + 1)}</span>
          <div><h3>${e(it.title)}</h3><p>${e(it.text)}</p></div>
          <span class="why-line"></span>
        </li>`).join('')}
    </ol>
  </div>
</section>

<section class="sec theme-dark place">
  <div class="wrap">
    <div class="sec-head">
      <div>${eyebrow(c('home.placement.eyebrow'))}<h2 class="h1" data-split>${rt(c('home.placement.title'))}</h2></div>
      <div class="hs-side">
        <p data-reveal="up">${e(c('home.placement.text'))}</p>
        <a class="link-arrow" href="${href(c('home.placement.link_url'))}">${e(c('home.placement.link_label'))} ${ARROW}</a>
      </div>
    </div>
    <div class="poster-grid three" data-stagger>${recentPlacements().slice(0, 6).map(posterCard).join('')}</div>
    ${partnersMarquee(c('home.partners_title'))}
  </div>
</section>

${ctaBand(c('home.cta', {}))}`,
    };
  };

  pages.about = () => ({
    title: 'About Us',
    desc: 'Learn about Fobas Institute, our vision, mission and the Student Success Program (SSP) that makes students industry ready.',
    image: c('about.hero.image'),
    body: `
${pageHero(c('about.hero', {}))}

<section class="sec theme-light story">
  <div class="wrap story-grid">
    <div class="story-copy">
      ${eyebrow(c('about.story.eyebrow'))}
      <h2 class="h1" data-split>${rt(c('about.story.title'))}</h2>
      <div class="rich" data-reveal="up">${paras(c('about.story.text'))}</div>
    </div>
    <div class="story-media" data-reveal="mask">
      ${img(c('about.story.image'), 'Fobas', '', true)}
      <div class="story-tag"><b>${e(c('home.stats.0.value'))}${e(c('home.stats.0.suffix'))}</b><span>${e(c('home.stats.0.label'))}</span></div>
    </div>
  </div>
</section>

<section class="sec theme-dark vm">
  <div class="wrap vm-grid">
    <article class="vm-card" data-reveal="up" data-spotlight data-tilt>
      <span class="vm-n">01</span><h2 class="h2">${e(c('about.vision.title'))}</h2><p>${e(c('about.vision.text'))}</p>
    </article>
    <article class="vm-card" data-reveal="up" data-delay="0.12" data-spotlight data-tilt>
      <span class="vm-n">02</span><h2 class="h2">${e(c('about.mission.title'))}</h2><p>${e(c('about.mission.text'))}</p>
    </article>
  </div>
</section>

<section class="sec theme-light stats-sec"><div class="wrap">${statsRow(c('home.stats', []))}</div></section>

<section class="sec theme-dark hl-sec">
  <div class="wrap">
    <div class="sec-head"><div>${eyebrow(c('about.highlights.eyebrow'))}<h2 class="h1" data-split>${rt(c('about.highlights.title'))}</h2></div></div>
    <div class="hl-grid" data-stagger>
      ${c('about.highlights.items', []).map((it, i) => `
        <article class="hl-card" data-reveal="up" data-spotlight>
          <span class="hl-n">${pad(i + 1)}</span>
          <h3>${e(it.title)}</h3><p>${e(it.text)}</p>
        </article>`).join('')}
    </div>
  </div>
</section>

<section class="sec theme-light certs">
  <div class="wrap">
    <div class="sec-head"><div>${eyebrow(c('about.certifications.eyebrow'))}<h2 class="h1" data-split>${rt(c('about.certifications.title'))}</h2></div></div>
    <div class="cert-grid" data-stagger>
      ${c('certifications', []).map((x) => `<figure class="cert" data-reveal="scale">${img(x.logo, x.name)}<figcaption>${e(x.name)}</figcaption></figure>`).join('')}
    </div>
  </div>
</section>

<section class="sec theme-dark place"><div class="wrap">${partnersMarquee(c('home.partners_title'))}</div></section>

${ctaBand(c('home.cta', {}))}`,
  });

  pages.courses = () => {
    const courses = c('courses', []);
    const cats = [...new Set(courses.map((co) => co.category).filter(Boolean))];
    const data = courses.map((co) => ({
      slug: slugify(co.title), title: co.title, category: co.category || '', short: co.short || '', duration: co.duration || '',
      eligibility: co.eligibility || '', image: isLocal(co.image || '') ? url(co.image || '') : co.image, modules: Array.isArray(co.modules) ? co.modules : [],
    }));
    const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/&/g, '\\u0026');
    const faq = (c('courses_page.faq', []) || []).filter((f) => f && f.question && f.answer);
    const ld = [{
      '@type': 'ItemList', name: 'Courses at Fobas Institute', itemListElement: courses.map((co, i) => ({
        '@type': 'ListItem', position: i + 1, item: {
          '@type': 'Course', name: co.title, description: co.short || co.title, url: `${base}/courses#${slugify(co.title)}`,
          ...(co.image ? { image: isLocal(co.image) ? base + url(co.image) : co.image } : {}),
          provider: { '@type': 'EducationalOrganization', '@id': base + '/#organization', name: c('site.name', 'Fobas Group'), url: base + '/' },
          ...(co.category ? { about: co.category } : {}), ...(co.duration ? { timeRequired: co.duration } : {}),
        },
      })),
    }];
    if (faq.length) ld.push({ '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) });
    const faqHtml = faq.length ? `
<section class="sec theme-dark faq-sec">
  <div class="wrap faq-grid">
    <div class="faq-head">
      ${eyebrow(c('courses_page.faq_eyebrow', 'FAQ'))}
      <h2 class="h1" data-split>${rt(c('courses_page.faq_title', 'Frequently asked questions'))}</h2>
    </div>
    <div class="faq-list" data-stagger>${faq.map((f) => `<details class="faq-item" data-reveal="up"><summary>${e(f.question)}</summary><p>${e(f.answer)}</p></details>`).join('')}</div>
  </div>
</section>` : '';
    return {
      ld,
      title: 'Courses',
      desc: 'Oil & Gas, Logistics, Fire & Safety, QA/QC and AI-integrated administration diplomas at Fobas Institute, Kozhikode, with 100% placement assistance.',
      image: c('courses_page.hero.image'),
      body: `
${pageHero(c('courses_page.hero', {}))}

<section class="sec theme-light courses-sec">
  <div class="wrap">
    <div class="filters" role="tablist" aria-label="Course categories" data-reveal="up">
      <button class="chip is-on" data-filter="*">${e(c('courses_page.filter_all_label', 'All'))}</button>
      ${cats.map((k) => `<button class="chip" data-filter="${e(k)}">${e(k)}</button>`).join('')}
    </div>
    <div class="course-grid" id="courseGrid">${courses.map((co, i) => courseCard(co, i, 'modal')).join('')}</div>
  </div>
</section>

<div class="modal" id="courseModal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="mTitle">
  <div class="modal-back" data-close></div>
  <div class="modal-panel" data-lenis-prevent>
    <button class="modal-x" data-close aria-label="Close"><i></i><i></i></button>
    <div class="m-media"><img id="mImg" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" alt=""></div>
    <div class="m-body">
      <span class="cc-cat" id="mCat"></span>
      <h2 id="mTitle"></h2>
      <p class="m-short" id="mShort"></p>
      <dl class="m-facts" id="mFacts"></dl>
      <div class="m-mods" id="mMods"><h4>What you will learn</h4><ul id="mList"></ul></div>
      <a class="btn btn-primary" id="mCta" href="/contact"><span class="btn-fill"></span><span class="btn-label">${e(c('courses_page.enquire_label', 'Enquire'))}</span>${ARROW}</a>
    </div>
  </div>
</div>
<script type="application/json" id="courses-data">${json}</script>
${faqHtml}

${ctaBand(c('courses_page.cta', {}))}`,
    };
  };

  pages.placement = () => {
    const pp = c('placement_page', {});
    const placed = pp.placed_label || 'Placed at';
    const ts = Math.floor(Date.now() / 1000);
    const fmt = (d) => { try { return new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); } catch { return ''; } };
    return {
      title: 'Placement',
      desc: 'Meet the Fobas students placed at KNPC, Aramco, Mumbai Offshore and other leading oil & gas companies.',
      image: c('placement_page.hero.image'),
      body: `
${pageHero(pp.hero || {})}

<section class="sec theme-dark place stats-dark"><div class="wrap">${statsRow(c('home.stats', []))}</div></section>

<section class="sec theme-light place-grid-sec">
  <div class="wrap">
    <div class="sec-head"><div>${eyebrow(pp.hero && pp.hero.eyebrow)}<h2 class="h1" data-split>${rt(pp.students_title)}</h2></div></div>
    <div class="poster-grid" data-stagger>${recentPlacements().map(posterCard).join('')}</div>
  </div>
</section>

<section class="sec theme-dark place">
  <div class="wrap">
    <div class="sec-head"><div><h2 class="h1" data-split>${rt(pp.partners_title)}</h2></div></div>
    ${partnersMarquee()}
  </div>
</section>

<section class="sec theme-dark comments-sec" id="comments">
  <div class="wrap cm-grid">
    <div class="cm-left">
      ${eyebrow(pp.comments_eyebrow)}
      <h2 class="h1" data-split>${rt(pp.comments_title)}</h2>
      <p class="lead" data-reveal="up">${e(pp.comments_text)}</p>
      <div class="cm-list" data-stagger>
        ${comments.length ? comments.map((m) => `
          <article class="cm-card" data-reveal="up" data-spotlight>
            <p>${br(m.message)}</p>
            <footer><b>${e(m.name)}</b><span>${e(fmt(m.created_at))}</span></footer>
          </article>`).join('') : `<p class="cm-empty">${e(pp.comments_empty)}</p>`}
      </div>
    </div>
    <form class="enq" id="commentForm" method="post" action="/api/comment" novalidate data-reveal="up">
      <h2 class="h2">${e(pp.comment_form_title)}</h2>
      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <input type="hidden" name="ts" value="${ts}">
      <div class="field"><input id="cm-name" name="name" type="text" maxlength="60" placeholder=" " required autocomplete="name"><label for="cm-name">${e(pp.comment_label_name)}</label><i></i></div>
      <div class="field"><textarea id="cm-msg" name="message" rows="4" maxlength="600" placeholder=" " required></textarea><label for="cm-msg">${e(pp.comment_label_message)}</label><i></i></div>
      <button class="btn btn-primary btn-block" type="submit"><span class="btn-fill"></span><span class="btn-label">${e(pp.comment_button)}</span>${ARROW}</button>
      <p class="form-error" id="cmError" role="alert"></p>
      <div class="form-done" id="cmDone" aria-live="polite">
        <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 27l8 8 14-16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <h3>${e(pp.comment_success_title)}</h3><p>${e(pp.comment_success_text)}</p>
      </div>
    </form>
  </div>
</section>
<script>
(function(){var f=document.getElementById('commentForm');if(!f)return;
f.addEventListener('submit',function(ev){ev.preventDefault();
var err=document.getElementById('cmError'),done=document.getElementById('cmDone'),b=f.querySelector('button[type=submit]');
err.textContent='';if(f.elements.name.value.trim().length<2||f.elements.message.value.trim().length<3){err.textContent='Please enter your name and a comment.';return}
b.disabled=true;
fetch(f.action,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams(new FormData(f))})
.then(function(r){return r.json()}).then(function(j){if(j.ok){done.classList.add('show');f.reset()}else{err.textContent=j.error||'Something went wrong.'}})
.catch(function(){err.textContent='Network error. Please try again.'}).then(function(){b.disabled=false})})})();
</script>

${ctaBand(pp.cta || {})}`,
    };
  };

  pages.contact = () => {
    const f = c('contact.form', {});
    const ts = Math.floor(Date.now() / 1000);
    const ico = {
      phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.100 4.200 2 2 0 0 1 4.100 2h3a2 2 0 0 1 2 1.700c.1 1 .4 1.900.7 2.800a2 2 0 0 1-.5 2.100L8.100 9.900a16 16 0 0 0 6 6l1.300-1.300a2 2 0 0 1 2.100-.4c.9.300 1.800.6 2.800.7a2 2 0 0 1 1.700 2z"/>',
      mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
      pin: '<path d="M12 22s7-6.300 7-12a7 7 0 1 0-14 0c0 5.700 7 12 7 12z"/><circle cx="12" cy="10" r="2.500"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    };
    const li = (k, label, inner) => `<li data-reveal="up" data-spotlight><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ico[k]}</svg></span><div><small>${label}</small>${inner}</div></li>`;
    const w = wa();
    return {
      title: 'Contact Us',
      desc: 'Contact Fobas Institute in Kozhikode, Kerala for course details, admissions and career guidance.',
      image: c('contact.hero.image'),
      body: `
${pageHero(c('contact.hero', {}))}

<section class="sec theme-dark contact-sec">
  <div class="wrap contact-grid">
    <div class="contact-info">
      <h2 class="h2" data-split>${e(c('contact.info_title'))}</h2>
      <ul class="info-list" data-stagger>
        ${li('phone', 'Phone', phones().map((p) => phoneLink(p)).join(''))}
        ${li('mail', 'Email', `<a href="mailto:${e(c('site.email'))}">${e(c('site.email'))}</a>`)}
        ${c('contact.branches', []).length
    ? c('contact.branches', []).map((b) => li('pin', `${b.name}${b.tag ? ' — ' + b.tag : ''}`, `<span>${br(b.address)}</span>${b.map_url ? `<a class="info-dir" href="${e(b.map_url)}" target="_blank" rel="noopener">${e(c('footer.directions_label', 'Get directions'))} &rarr;</a>` : ''}`)).join('')
    : li('pin', 'Address', `<span>${br(c('site.address'))}</span>`)}
        ${c('site.hours') ? li('clock', 'Hours', `<span>${br(c('site.hours'))}</span>`) : ''}
      </ul>
      ${w ? `<a class="btn btn-wa" data-reveal="up" href="${e(w)}" target="_blank" rel="noopener"><span class="btn-fill"></span><span class="btn-label">Chat on WhatsApp</span>${ARROW}</a>` : ''}
    </div>

    ${enqForm('c', f.title)}
  </div>
</section>

<section class="sec theme-light branches">
  <div class="wrap">
    <div class="sec-head"><div><h2 class="h1" data-split>${e(c('contact.branches_title'))}</h2></div></div>
    <div class="branch-grid" data-stagger>
      ${c('contact.branches', []).map((b) => `
        <article class="branch" data-reveal="up" data-spotlight>
          ${b.tag ? `<span class="cc-cat">${e(b.tag)}</span>` : ''}
          <h3>${e(b.name)}</h3>
          <p>${b.address ? br(b.address) : '<span class="muted">Details coming soon</span>'}</p>
          ${b.map_url ? `<a class="branch-link" href="${e(b.map_url)}" target="_blank" rel="noopener">${e(c('footer.directions_label', 'Get directions'))} ${ARROW}</a>` : ''}
        </article>`).join('')}
    </div>
  </div>
</section>`,
    };
  };

  return {
    render(page) {
      const p = pages[page]();
      return header(page, p.title, p.desc, p.image, p.ld) + p.body + footer();
    },
  };
}

module.exports = { create, PATHS };
