/**
 * Pure data & logic helpers for Part 2 (Page Sheet: About, Numbers, Works,
 * 3D Phone Social Feed, Contact & Brief Form validation/mailto builder, Footer).
 * Decoupled from DOM/WebGL so unit tests can verify all calculations deterministically.
 */

export const WORKS_DATA = [
  {
    id: 'celcheck',
    index: '01',
    title: 'CelCheck',
    titleEn: 'CelCheck',
    titleFil: 'CelCheck',
    coverTitle: 'CelCheck',
    coverWord: 'CelCheck',
    year: '2026',
    role: 'Leader, Programmer (Front/Back End)',
    roleEn: 'Leader, Programmer (Front/Back End)',
    roleFil: 'Leader, Programmer (Front/Back End)',
    descEn:
      'QR entry/exit logging for Celtech College computer labs, with per-PC tracking, failed-checkout flags, and daily/weekly/monthly reports.',
    descFil:
      'QR entry/exit logging para sa computer labs ng Celtech College, may per-PC tracking, failed-checkout flags, at daily/weekly/monthly reports.',
    description: {
      en: 'QR entry/exit logging for Celtech College computer labs, with per-PC tracking, failed-checkout flags, and daily/weekly/monthly reports.',
      fil: 'QR entry/exit logging para sa computer labs ng Celtech College, may per-PC tracking, failed-checkout flags, at daily/weekly/monthly reports.',
    },
    url: 'https://github.com/Rigu3l/Computer-Lab-Log',
    chapterId: 'systems',
    category: 'Systems',
    chapterEn: 'Systems',
    chapterFil: 'Mga Sistema',
    palette: ['#2A1B5E', '#7C5CFF', '#E6E0FF'],
    gradient: ['#2A1B5E', '#7C5CFF'],
    accent: '#7C5CFF',
    accentColor: '#7C5CFF',
    textColor: '#F5F2EB',
    textDark: false,
  },
  {
    id: 'clearance',
    index: '02',
    title: 'Celtech College Online Clearance Dashboard',
    titleEn: 'Celtech College Online Clearance Dashboard',
    titleFil: 'Celtech College Online Clearance Dashboard',
    coverTitle: 'Clearance',
    coverWord: 'Clearance',
    year: '2026',
    role: 'Designer and Developer',
    roleEn: 'Designer and Developer',
    roleFil: 'Designer at Developer',
    descEn:
      'A clearance dashboard that puts scattered student clearance steps into one trusted list.',
    descFil:
      'Isang clearance dashboard na nagtitipon ng hiwa-hiwalay na hakbang sa clearance ng estudyante sa isang maaasahang listahan.',
    description: {
      en: 'A clearance dashboard that puts scattered student clearance steps into one trusted list.',
      fil: 'Isang clearance dashboard na nagtitipon ng hiwa-hiwalay na hakbang sa clearance ng estudyante sa isang maaasahang listahan.',
    },
    url: 'https://github.com/Rigu3l/online-clearance',
    chapterId: 'systems',
    category: 'Systems',
    chapterEn: 'Systems',
    chapterFil: 'Mga Sistema',
    palette: ['#0B1020', '#1E3A8A', '#7FA6FF'],
    gradient: ['#0B1020', '#1E3A8A'],
    accent: '#7FA6FF',
    accentColor: '#7FA6FF',
    textColor: '#F5F2EB',
    textDark: false,
  },
  {
    id: 'management',
    index: '03',
    title: 'Hotel Management System — Management Department Module',
    titleEn: 'Hotel Management System — Management Department Module',
    titleFil: 'Hotel Management System — Modyul ng Management Department',
    coverTitle: 'Management',
    coverWord: 'Management',
    year: '2026',
    role: 'Management Department owner',
    roleEn: 'Management Department owner',
    roleFil: 'May-ari ng Management Department Module',
    descEn:
      'Executive dashboard, 17 report types, budgets and KPI targets, decision tracking, and operational alerts, with CSV and PDF export.',
    descFil:
      'Executive dashboard, 17 uri ng report, badyet at KPI targets, decision tracking, at operational alerts, na may CSV at PDF export.',
    description: {
      en: 'Executive dashboard, 17 report types, budgets and KPI targets, decision tracking, and operational alerts, with CSV and PDF export.',
      fil: 'Executive dashboard, 17 uri ng report, badyet at KPI targets, decision tracking, at operational alerts, na may CSV at PDF export.',
    },
    url: 'https://github.com/Rigu3l/management-department',
    chapterId: 'systems',
    category: 'Systems',
    chapterEn: 'Systems',
    chapterFil: 'Mga Sistema',
    palette: ['#F7F2EB', '#F9CBD6', '#FFB86B'],
    gradient: ['#F7F2EB', '#F9CBD6'],
    accent: '#E11D48',
    accentColor: '#E11D48',
    textColor: '#1F1624',
    textDark: true,
  },
  {
    id: 'manuazine',
    index: '04',
    title: 'Manuazine',
    titleEn: 'Manuazine',
    titleFil: 'Manuazine',
    coverTitle: 'Manuazine',
    coverWord: 'Manuazine',
    year: '2026',
    role: 'Designer and Developer',
    roleEn: 'Designer and Developer',
    roleFil: 'Designer at Developer',
    descEn:
      'A Heyzine-style PDF-to-flipbook viewer with upload, page-flip, thumbnails, and Supabase storage.',
    descFil:
      'Isang Heyzine-style PDF-to-flipbook viewer na may upload, page-flip, thumbnails, at Supabase storage.',
    description: {
      en: 'A Heyzine-style PDF-to-flipbook viewer with upload, page-flip, thumbnails, and Supabase storage.',
      fil: 'Isang Heyzine-style PDF-to-flipbook viewer na may upload, page-flip, thumbnails, at Supabase storage.',
    },
    url: 'https://github.com/Rigu3l/Manuazine',
    chapterId: 'publishing',
    category: 'Publishing',
    chapterEn: 'Publishing',
    chapterFil: 'Paglalathala',
    palette: ['#F7F5EF', '#E6E0FF', '#CBD5E1'],
    gradient: ['#F7F5EF', '#E6E0FF'],
    accent: '#7C5CFF',
    accentColor: '#7C5CFF',
    textColor: '#141413',
    textDark: true,
  },
  {
    id: 'arjuwey',
    index: '05',
    title: 'Arjuwey',
    titleEn: 'Arjuwey',
    titleFil: 'Arjuwey',
    coverTitle: 'Arjuwey',
    coverWord: 'Arjuwey',
    year: '2026',
    role: 'Designer and Developer',
    roleEn: 'Designer and Developer',
    roleFil: 'Designer at Developer',
    descEn:
      'A cinematic, dark, scroll-driven portfolio with a pinned approach section, word-swap statement, marquee, and full-screen menu.',
    descFil:
      'Isang cinematic, dark, scroll-driven na portfolio na may pinned approach section, word-swap statement, marquee, at full-screen menu.',
    description: {
      en: 'A cinematic, dark, scroll-driven portfolio with a pinned approach section, word-swap statement, marquee, and full-screen menu.',
      fil: 'Isang cinematic, dark, scroll-driven na portfolio na may pinned approach section, word-swap statement, marquee, at full-screen menu.',
    },
    url: 'https://github.com/Rigu3l/Arjuwey',
    chapterId: 'portfolios',
    category: 'Portfolios',
    chapterEn: 'Portfolios',
    chapterFil: 'Mga Portfolio',
    palette: ['#070A14', '#141B33', '#7C5CFF'],
    gradient: ['#070A14', '#141B33'],
    accent: '#2DD4BF',
    accentColor: '#2DD4BF',
    textColor: '#F5F2EB',
    textDark: false,
  },
  {
    id: 'rigu3l-portfolio',
    index: '06',
    title: 'Rigu3l.github.io Portfolio',
    titleEn: 'Rigu3l.github.io Portfolio',
    titleFil: 'Rigu3l.github.io Portfolio',
    coverTitle: 'Rj Verceles',
    coverWord: 'Rj Verceles',
    year: '2026',
    role: 'Designer and Developer',
    roleEn: 'Designer and Developer',
    roleFil: 'Designer at Developer',
    descEn:
      'My live portfolio site, rebuilt from source with an auto-build workflow.',
    descFil:
      'Ang aking live portfolio site, binuo ulit mula sa source na may auto-build workflow.',
    description: {
      en: 'My live portfolio site, rebuilt from source with an auto-build workflow.',
      fil: 'Ang aking live portfolio site, binuo ulit mula sa source na may auto-build workflow.',
    },
    url: 'https://rigu3l.github.io/',
    chapterId: 'portfolios',
    category: 'Portfolios',
    chapterEn: 'Portfolios',
    chapterFil: 'Mga Portfolio',
    palette: ['#0B1020', '#1D2849', '#2DD4BF'],
    gradient: ['#0B1020', '#1D2849'],
    accent: '#FFB86B',
    accentColor: '#FFB86B',
    textColor: '#F5F2EB',
    textDark: false,
  },
];

export const SOCIAL_POSTS = [
  {
    id: 'post-1',
    theme: 'sketchbook',
    bg: '#2A1B5E',
    gradient: ['#2A1B5E', '#7C5CFF'],
    accent: '#7C5CFF',
    captionEn: 'Started on paper. Still start on paper.',
    captionFil: 'Nagsimula sa papel. Nagsisimula pa rin sa papel.',
    caption: {
      en: 'Started on paper. Still start on paper.',
      fil: 'Nagsimula sa papel. Nagsisimula pa rin sa papel.',
    },
    tag: 'ZAMBALES',
  },
  {
    id: 'post-2',
    theme: 'qr',
    bg: '#0D3B3E',
    gradient: ['#0D3B3E', '#2DD4BF'],
    accent: '#2DD4BF',
    captionEn: 'Scan. In. Out. No paper log.',
    captionFil: 'Scan. Pasok. Labas. Walang listahang papel.',
    caption: {
      en: 'Scan. In. Out. No paper log.',
      fil: 'Scan. Pasok. Labas. Walang listahang papel.',
    },
    tag: 'CELCHECK',
  },
  {
    id: 'post-3',
    theme: 'dashboard',
    bg: '#3D2314',
    gradient: ['#3D2314', '#FFB86B'],
    accent: '#FFB86B',
    captionEn: 'Numbers first. Decoration second.',
    captionFil: 'Numero muna. Pangalawa ang dekorasyon.',
    caption: {
      en: 'Numbers first. Decoration second.',
      fil: 'Numero muna. Pangalawa ang dekorasyon.',
    },
    tag: 'CLEARANCE KPI',
  },
  {
    id: 'post-4',
    theme: 'flipbook',
    bg: '#FAF8F5',
    gradient: ['#EAE4D7', '#F7F5EF'],
    accent: '#7C5CFF',
    captionEn: 'A PDF that actually turns.',
    captionFil: 'Isang PDF na talagang nabubuklat.',
    caption: {
      en: 'A PDF that actually turns.',
      fil: 'Isang PDF na talagang nabubuklat.',
    },
    tag: 'MANUAZINE',
  },
  {
    id: 'post-5',
    theme: 'scroll',
    bg: '#291811',
    gradient: ['#291811', '#C87D55'],
    accent: '#FFB86B',
    captionEn: 'Calm beats loud.',
    captionFil: 'Talo ng kalmado ang maingay.',
    caption: {
      en: 'Calm beats loud.',
      fil: 'Talo ng kalmado ang maingay.',
    },
    tag: 'ARJUWEY',
  },
  {
    id: 'post-6',
    theme: 'code',
    bg: '#0B1020',
    gradient: ['#0B1020', '#1E2952'],
    accent: '#7FA6FF',
    captionEn: 'One line, one test, one fix.',
    captionFil: 'Isang linya, isang test, isang ayos.',
    caption: {
      en: 'One line, one test, one fix.',
      fil: 'Isang linya, isang test, isang ayos.',
    },
    tag: 'BUILD LOG',
  },
  {
    id: 'post-7',
    theme: 'tablet',
    bg: '#172554',
    gradient: ['#172554', '#7FA6FF'],
    accent: '#2DD4BF',
    captionEn: 'Shipped the calm version.',
    captionFil: 'Nailabas ang kalmadong bersyon.',
    caption: {
      en: 'Shipped the calm version.',
      fil: 'Nailabas ang kalmadong bersyon.',
    },
    tag: 'SHIPPED',
  },
];

export const NUMBERS_DATA = [
  {
    id: 'stat-1',
    count: 6,
    prefix: '',
    suffix: '',
    labelEn: 'Projects built',
    labelFil: 'Proyektong nabuo',
    detailEn: 'Shipped web systems, publishing tools, and interactive portfolios.',
    detailFil: 'Mga nailabas na web system, publishing tool, at interactive portfolio.',
  },
  {
    id: 'stat-2',
    count: 25,
    prefix: '',
    suffix: '',
    labelEn: 'Features in my largest module, the Management Department',
    labelFil: 'Mga feature sa pinakamalaki kong modyul, ang Management Department',
    detailEn: '17 report types, KPI targets, budgets, alerts, and CSV/PDF exports.',
    detailFil: '17 uri ng report, KPI target, badyet, alerto, at CSV/PDF export.',
  },
  {
    id: 'stat-3',
    count: 150,
    prefix: '',
    suffix: '+',
    labelEn: 'Student records in the CelCheck test data',
    labelFil: 'Rekord ng estudyante sa CelCheck test data',
    detailEn: 'QR entry/exit logs, per-PC tracking, and automated checkout flags.',
    detailFil: 'QR entry/exit log, per-PC tracking, at automated checkout flags.',
  },
  {
    id: 'stat-4',
    count: 5,
    prefix: '',
    suffix: '',
    labelEn: 'Core tools I build with: HTML/CSS, JavaScript, PHP, MySQL, Supabase',
    labelFil: 'Pangunahing gamit sa pagbuo: HTML/CSS, JavaScript, PHP, MySQL, Supabase',
    detailEn: 'Front end you see, backend that holds it up, and database behind it.',
    detailFil: 'Front end na nakikita mo, backend na sumusuporta, at database sa likod nito.',
  },
];

/**
 * Computes the 3 phases of the Numbers Band given normalized scroll progress p in [0, 1]:
 * a) OPEN (0 - 0.25): clip-path inset(Y% X% round R) animating to inset(0% 0% round 0px)
 * b) RUN (0.25 - 0.85): horizontal translation progress in [0, 1]
 * c) FADE (0.85 - 1.0): stage fade to flat navy (0 -> 1)
 */
export function computeNumbersBandState(progress) {
  const p = Math.max(0, Math.min(1, progress));
  const openRaw = Math.max(0, Math.min(1, p / 0.25));
  // Cubic ease-out for opening clip-path
  const openEase = 1 - Math.pow(1 - openRaw, 3);
  const insetY = (1 - openEase) * 14; // 14% -> 0%
  const insetX = (1 - openEase) * 8; // 8% -> 0%
  const radiusPx = (1 - openEase) * 36; // 36px -> 0px

  const runRaw = p <= 0.25 ? 0 : p >= 0.85 ? 1 : (p - 0.25) / 0.6;
  const fadeOut = p <= 0.85 ? 0 : Math.min(1, (p - 0.85) / 0.15);

  const clipPath = `inset(${insetY.toFixed(2)}% ${insetX.toFixed(2)}% round ${radiusPx.toFixed(1)}px)`;

  return {
    progress: p,
    openEase,
    insetY,
    insetX,
    radiusPx,
    clipPath,
    runProgress: runRaw,
    translateProgress: runRaw,
    fadeOut,
    isDarkActive: p >= 0.06,
  };
}

/**
 * Formats an animated counter value using Intl.NumberFormat per language.
 * Supports both (val, lang, prefix, suffix) and (target, progress01, { prefix, suffix, locale }) signatures.
 */
export function formatCounterValue(valOrTarget, langOrProgress = 'en', prefix = '', suffix = '') {
  if (typeof langOrProgress === 'number') {
    const t = Math.max(0, Math.min(1, langOrProgress));
    const eased = 1 - Math.pow(1 - t, 3);
    const current = Math.round(valOrTarget * eased);
    const opts = typeof prefix === 'object' && prefix !== null ? prefix : {};
    const pre = opts.prefix || '';
    const suf = opts.suffix || '';
    const loc = opts.locale || 'en-US';
    try {
      return `${pre}${new Intl.NumberFormat(loc).format(current)}${suf}`;
    } catch (e) {
      return `${pre}${current}${suf}`;
    }
  }

  const rounded = Math.round(valOrTarget);
  const locale = langOrProgress === 'fil' ? 'fil-PH' : 'en-US';
  let formatted;
  try {
    formatted = new Intl.NumberFormat(locale).format(rounded);
  } catch (e) {
    formatted = String(rounded);
  }
  return `${prefix}${formatted}${suffix}`;
}

/**
 * Computes the font-size scale factor (clamped to [0.6, 1.0]) so single-line
 * input text always fits within availableWidthPx without horizontal scrolling.
 */
export function computeFitLineScale(measuredWidthPx, availableWidthPx, minScale = 0.6) {
  if (!measuredWidthPx || !availableWidthPx || measuredWidthPx <= availableWidthPx) {
    return 1.0;
  }
  return Math.max(minScale, Math.min(1.0, availableWidthPx / measuredWidthPx));
}

/**
 * Validates the Brief Form fields per field or all at once, returning localized error messages.
 * Supports both `project` and `message` field names.
 */
export function validateBriefForm(fields = {}, lang = 'en') {
  const errors = {};
  const trimmedName = String(fields.name || '').trim();
  const trimmedEmail = String(fields.email || '').trim();
  const rawMessage = fields.project !== undefined ? fields.project : fields.message;
  const trimmedProject = String(rawMessage || '').trim();

  if (trimmedName.length < 2) {
    errors.name =
      lang === 'fil'
        ? 'Pakilagay ang iyong pangalan (hindi bababa sa 2 titik).'
        : 'Please enter your name (at least 2 characters).';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
    errors.email =
      lang === 'fil'
        ? 'Pakilagay ang wastong email address.'
        : 'Please enter a valid email address.';
  }

  if (trimmedProject.length < 10) {
    const msgErr =
      lang === 'fil'
        ? 'Pakilarawan ang ipapagawa mo (hindi bababa sa 10 titik).'
        : 'Please describe what you are building (at least 10 characters).';
    errors.project = msgErr;
    errors.message = msgErr;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Builds the fallback mailto: URL for rjverceles1@gmail.com with encodeURIComponent,
 * truncating the raw body to ~1800 characters so mail clients never reject the URI.
 */
export function buildBriefMailtoUrl(fields = {}) {
  const recipient = fields.recipient || 'rjverceles1@gmail.com';
  const cleanName = String(fields.name || '').trim() || 'Visitor';
  const cleanEmail = String(fields.email || '').trim();
  const rawMsg = fields.project !== undefined ? fields.project : fields.message;
  const cleanProject = String(rawMsg || '').trim();
  const cleanScope = String(fields.scope || '').trim();
  const cleanBudget = String(fields.budget || '').trim();

  const subject = `Project Brief from ${cleanName}`;
  const lines = [
    `Name: ${cleanName}`,
    `Email: ${cleanEmail}`,
    cleanScope ? `Scope: ${cleanScope}` : null,
    cleanBudget ? `Scope / Budget: ${cleanBudget}` : null,
    '',
    'What we are building:',
    cleanProject,
  ]
    .filter((line) => line !== null)
    .join('\n')
    .slice(0, 1800);

  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines)}`;
}
