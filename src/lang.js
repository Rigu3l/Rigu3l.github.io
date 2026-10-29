/**
 * Classic (non-module) script loaded in <head>.
 * Defines window.L(primary, secondary), language dictionary, data-i18n and data-i18n-attr
 * application, document title/meta updates, Intl formatters, and language toggle persistence
 * so every module and canvas drawing can call L() from line 1.
 */
(function () {
  var STORAGE_KEY = 'rj_portfolio_lang';
  var saved = null;
  try {
    saved = window.localStorage.getItem(STORAGE_KEY);
  } catch (e) {}

  var navLang = '';
  try {
    navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
  } catch (e) {}

  var htmlEl = document.documentElement;
  var initialLang =
    saved === 'fil' || saved === 'en'
      ? saved
      : navLang.indexOf('fil') === 0 || navLang.indexOf('tl') === 0
      ? 'fil'
      : 'en';

  window.__LANG = initialLang;
  if (htmlEl) {
    htmlEl.setAttribute('lang', initialLang);
  }

  /**
   * Returns primary (English) or secondary (Filipino) string according to active language.
   */
  window.L = function (en, fil) {
    if (window.__LANG === 'fil' && typeof fil === 'string' && fil.length > 0) {
      return fil;
    }
    return en;
  };

  /**
   * Locale-aware number and date formatters.
   */
  window.formatNumber = function (num) {
    try {
      var loc = window.__LANG === 'fil' ? 'fil-PH' : 'en-US';
      return new Intl.NumberFormat(loc).format(num);
    } catch (e) {
      return String(num);
    }
  };

  window.formatDate = function (dateInput, options) {
    try {
      var loc = window.__LANG === 'fil' ? 'fil-PH' : 'en-US';
      var d = dateInput instanceof Date ? dateInput : new Date(dateInput);
      return new Intl.DateTimeFormat(loc, options || { year: 'numeric', month: 'short' }).format(d);
    } catch (e) {
      return String(dateInput);
    }
  };

  /**
   * Central dictionary of all story beats, loader boot stages, UI labels, and page-sheet copy.
   */
  window.STORY_COPY = {
    meta: {
      name: 'Rj Verceles',
      roleEn: 'Full Stack Developer & Web Designer',
      roleFil: 'Full Stack Developer at Web Designer',
      location: 'Zambales',
      chipEn: 'Rj Verceles · Zambales',
      chipFil: 'Rj Verceles · Zambales',
      firstLine1En: "I DON'T DECORATE —",
      firstLine2En: 'I SOLVE THE TASK.',
      firstLine1Fil: 'HINDI AKO NAGDEDEKORASYON —',
      firstLine2Fil: 'NILULUTAS KO ANG PROBLEMA.',
      docTitleEn: 'Rj Verceles — Full Stack Developer & Web Designer · Zambales',
      docTitleFil: 'Rj Verceles — Full Stack Developer at Web Designer · Zambales',
      docDescEn:
        "Interactive 3D portfolio of Rj Verceles, Full Stack Developer & Web Designer in Zambales. I don't decorate — I solve the task.",
      docDescFil:
        'Interactive 3D portfolio ni Rj Verceles, Full Stack Developer at Web Designer sa Zambales. Hindi ako nagdedekorasyon — nilulutas ko ang problema.',
    },
    loader: [
      { threshold: 0, en: 'Curious?', fil: 'Kuryoso?', file: 'boot/curiosity.sys' },
      { threshold: 25, en: 'Drawing', fil: 'Gumuguhit', file: 'desk/sketchbook_v1.drw' },
      { threshold: 55, en: 'Testing', fil: 'Sinusubok', file: 'room/cardboard_mesh.shd' },
      { threshold: 85, en: 'Fixing', fil: 'Inaayos', file: 'canvas/pipeline_v11.bin' },
      { threshold: 96, en: 'Ready to work', fil: 'Handa nang magtrabaho', file: 'zambales/studio_ready.ok' },
    ],
    loaderWarmup: {
      en: 'Warming up shaders',
      fil: 'Inihahanda ang shaders',
    },
    loaderError: {
      en: "Couldn't load 3D scene, please refresh",
      fil: 'Hindi ma-load ang 3D, paki-refresh ang pahina',
    },
    connectPrompt: {
      line1En: 'DRAG THE STYLUS CABLE TO THE CANVAS PORT',
      line2En: 'OR PRESS ENTER TO CONNECT',
      line1Fil: 'IHILA ANG KABLE SA CANVAS PORT',
      line2Fil: 'O PINDUTIN ANG ENTER PARA KUMONEKTA',
    },
    beats: {
      b1: {
        en: 'It all starts with curiosity. I kept asking how a drawing becomes something people can actually use.',
        fil: 'Lahat ay nagsisimula sa kuryusidad. Lagi kong tinatanong kung paano nagiging bagay na magagamit ng tao ang isang guhit.',
      },
      b2: {
        en: 'I started on paper, in Zambales. A sketch, a pencil, a problem to solve — not decoration.',
        fil: 'Nagsimula ako sa papel, sa Zambales. Isang sketch, isang lapis, isang problemang kailangang lutasin — hindi dekorasyon.',
      },
      b3: {
        en: "Then the desk got glossy. Bright, loud, impressive — and hard to use. Beauty for beauty's sake doesn't sell.",
        fil: 'Pagkatapos, naging makintab ang mesa. Maliwanag, maingay, kahanga-hanga — pero mahirap gamitin. Ang ganda para sa ganda lang ay hindi nagbebenta.',
      },
      b4: {
        en: "I don't decorate. I solve the task: so people notice it, and so it works.",
        fil: 'Hindi ako nagdedekorasyon. Nilulutas ko ang problema: para mapansin ito, at para gumana ito.',
      },
      b5: {
        en: "One launch broke. Sketch not found. Blank page. The deadline didn't move.",
        fil: 'May isang launch na nasira. Sketch not found. Blangkong page. Hindi umusad ang deadline.',
      },
      b6: {
        en: 'I fixed it line by line. No magic, no excuses — test, fix, test again.',
        fil: 'Inayos ko ito linya por linya. Walang magic, walang dahilan — test, ayos, test ulit.',
      },
      b7: {
        en: 'The calm version shipped. Not the loudest work — the one that worked. People used it, and it sold.',
        fil: 'Nailabas ang kalmadong bersyon. Hindi ang pinakamaingay — ang gumana. Ginamit ito ng mga tao, at nagbenta ito.',
      },
      b8: {
        en: "Still curious. Still solving. If you have a task, not just a pretty idea — let's build it.",
        fil: 'Kuryoso pa rin. Lumulutas pa rin. Kung may problema kang kailangang lutasin, hindi lang magandang ideya — buuin natin.',
      },
    },
    wall1: {
      leadEn: 'It all starts with curiosity. I started on paper, in Zambales.',
      bigEn: 'A PROBLEM TO SOLVE — NOT DECORATION.',
      leadFil: 'Nagsisimula sa kuryusidad. Nagsimula ako sa papel, sa Zambales.',
      bigFil: 'PROBLEMANG LULUTASIN — HINDI DEKORASYON.',
    },
    wall2: {
      leadEn: 'Then the desk got glossy. Bright, loud — and hard to use.',
      bigEn: "BEAUTY FOR BEAUTY'S SAKE DOESN'T SELL.",
      leadFil: 'Naging makintab ang mesa. Maliwanag, maingay — mahirap gamitin.',
      bigFil: 'ANG GANDA LANG AY HINDI NAGBEBENTA.',
    },
  };

  window.I18N_STRINGS = {
    // Accessibility & Skip Link
    'a11y.skipContent': ['Skip to content', 'Lumaktaw sa nilalaman'],
    'sr.h1': [
      "Rj Verceles — Full Stack Developer & Web Designer in Zambales. I don't decorate — I solve the task.",
      'Rj Verceles — Full Stack Developer at Web Designer sa Zambales. Hindi ako nagdedekorasyon — nilulutas ko ang problema.',
    ],

    // Header & Navigation
    'header.role': [
      'Full Stack Developer & Web Designer · Zambales',
      'Full Stack Developer at Web Designer · Zambales',
    ],
    'header.nav.about': ['About', 'Tungkol'],
    'header.nav.work': ['Work', 'Mga Gawa'],
    'header.nav.contact': ['Contact', 'Kontak'],
    'header.sound': ['Sound', 'Tunog'],
    'header.sound.aria': ['Toggle sound', 'I-toggle ang tunog'],

    // Story Controls & Hints
    'ui.skip': ['Skip the story', 'Laktawan ang kwento'],
    'ui.hint.scroll': ['Scroll to look around', 'Mag-scroll para tumingin'],
    'ui.hint.hold': ['Press and hold', 'Pindutin nang matagal'],
    'ui.hint.button': ['Press the button', 'Pindutin ang button'],
    'ui.hint.drag': ['Drag to explore', 'I-drag para tuklasin'],
    'ui.hint.open': ['Click to open', 'I-click para buksan'],
    'ui.era.modern': ['Switching to the modern setup', 'Lumilipat sa modernong setup'],
    'ui.replay': ['Watch the story again', 'Panoorin ulit ang kwento'],
    'end.lead': ['Still curious. Still solving.', 'Kuryoso pa rin. Lumulutas pa rin.'],
    'end.big': [
      "IF YOU HAVE A TASK, NOT JUST A PRETTY IDEA — LET'S BUILD IT.",
      'KUNG MAY PROBLEMA KANG LULUTASIN — BUUIN NATIN.',
    ],

    // OS Layer & Dialogs
    'os.aria': ['Computer screen', 'Screen ng computer'],
    'os.icon.projects': ['My projects', 'Mga proyekto'],
    'os.icon.sketches': ['My sketches', 'Mga sketch ko'],
    'os.icon.drafts': ['Old drafts', 'Lumang draft'],
    'os.win.header': ['canvas-updater.exe', 'canvas-updater.exe'],
    'os.win.title': ['Update available', 'May bagong update'],
    'os.btn.hold': ['PRESS AND HOLD', 'PINDUTIN NANG MATAGAL'],
    'os.btn.updating': ['UPDATING...', 'INA-UPDATE...'],
    'os.btn.keep': ['KEEP HOLDING', 'HUWAG BITAWAN'],
    'dlg.statement.eyebrow': [
      'It all starts with curiosity — from paper in Zambales to real tools',
      'Nagsimula sa kuryusidad — mula sa papel sa Zambales hanggang sa totoong gamit',
    ],
    'dlg.statement.line1': ["I DON'T DECORATE.", 'HINDI AKO NAGDEDEKORASYON.'],
    'dlg.statement.line2': [
      'I SOLVE THE TASK: SO PEOPLE NOTICE IT, AND SO IT WORKS.',
      'NILULUTAS KO ANG PROBLEMA: PARA MAPANSIN AT GUMANA ITO.',
    ],
    'dlg.statement.btn': ['Continue', 'Magpatuloy'],
    'dlg.error.eyebrow': ['Error: sketch_not_found', 'Error: sketch_not_found'],
    'dlg.error.line1': ['ONE LAUNCH BROKE. BLANK PAGE.', 'NASIRA ANG LAUNCH. BLANGKONG PAGE.'],
    'dlg.error.line2': [
      "THE DEADLINE DIDN'T MOVE. I FIXED IT LINE BY LINE — TEST, FIX, TEST AGAIN.",
      'HINDI UMUSAD ANG DEADLINE. INAYOS KO LINYA POR LINYA — TEST, AYOS, TEST ULIT.',
    ],
    'dlg.error.btn': ['Try again', 'Subukan ulit'],
    'dlg.success.eyebrow': ['Update complete · Canvas 11', 'Tapos na ang update · Canvas 11'],
    'dlg.success.line1': ['THE CALM VERSION SHIPPED.', 'NAILABAS ANG KALMADONG BERSYON.'],
    'dlg.success.line2': ['NOT THE LOUDEST WORK — THE ONE THAT WORKED.', 'HINDI ANG PINAKAMAINGAY — ANG GUMANA.'],
    'dlg.success.line3': ['PEOPLE USED IT, AND IT SOLD.', 'GINAMIT ITO NG MGA TAO, AT NAGBENTA ITO.'],
    'dlg.success.btn': ['Done', 'Tapos na'],
    'beat.1': [window.STORY_COPY.beats.b1.en, window.STORY_COPY.beats.b1.fil],
    'beat.2': [window.STORY_COPY.beats.b2.en, window.STORY_COPY.beats.b2.fil],
    'beat.3': [window.STORY_COPY.beats.b3.en, window.STORY_COPY.beats.b3.fil],
    'beat.4': [window.STORY_COPY.beats.b4.en, window.STORY_COPY.beats.b4.fil],
    'beat.5': [window.STORY_COPY.beats.b5.en, window.STORY_COPY.beats.b5.fil],
    'beat.6': [window.STORY_COPY.beats.b6.en, window.STORY_COPY.beats.b6.fil],
    'beat.7': [window.STORY_COPY.beats.b7.en, window.STORY_COPY.beats.b7.fil],
    'beat.8': [window.STORY_COPY.beats.b8.en, window.STORY_COPY.beats.b8.fil],

    // ========================================================================
    // PART 2: PAGE SHEET (ABOUT, NUMBERS, MESH, WORKS, PHONE, CONTACT, FOOTER)
    // ========================================================================
    'about.index': ['(01) About', '(01) Tungkol'],
    'about.greeting': ["Hi, I'm Rj.", 'Kumusta, ako si Rj.'],
    'about.roleLoc': [
      'Full Stack Developer & Web Designer · Zambales',
      'Full Stack Developer at Web Designer · Zambales',
    ],
    'about.statement': [
      "I'm Rj Verceles, a Full Stack Developer and Web Designer in Zambales. I don't decorate websites. I solve the task: so people notice it, and so it works.",
      'Ako si Rj Verceles, isang Full Stack Developer at Web Designer sa Zambales. Hindi ako nagdedekorasyon ng mga website. Nilulutas ko ang problema: para mapansin ito, at para gumana ito.',
    ],
    'about.body1': [
      'It started on paper, with a sketch and a pencil. Now I build the whole thing — the front end you see, the backend that holds it up, and the database behind it.',
      'Nagsimula ito sa papel, gamit ang sketch at lapis. Ngayon, binubuo ko na ang kabuuan — ang front end na nakikita mo, ang backend na sumusuporta rito, at ang database sa likod nito.',
    ],
    'about.body2': [
      'I like work that ships and gets used, not just work that looks good in a screenshot.',
      'Gusto ko ang gawang nailalabas at talagang nagagamit, hindi iyong maganda lang tingnan sa screenshot.',
    ],
    'about.whatTitle': ['What I do', 'Ang ginagawa ko'],
    'about.do.1.title': ['Web design and front-end builds', 'Web design at paggawa ng front-end'],
    'about.do.1.desc': [
      'Clean layouts, sharp typography, and responsive interfaces built to guide attention and work on every screen.',
      'Malinis na layout, matalas na tipograpiya, at responsive na interface na gumagana sa bawat screen.',
    ],
    'about.do.2.title': ['Full-stack web systems in PHP and MySQL', 'Full-stack web systems sa PHP at MySQL'],
    'about.do.2.desc': [
      'End-to-end architecture from relational schemas and role-based auth to fast server-rendered and API-driven views.',
      'Buong arkitektura mula sa relational schema at auth hanggang sa mabilis na server at API views.',
    ],
    'about.do.3.title': ['QR, logging, and dashboard systems', 'QR, logging, at mga dashboard system'],
    'about.do.3.desc': [
      'Real-time entry/exit tracking, per-station monitoring, operational alerts, and exportable CSV/PDF reporting.',
      'Real-time na entry/exit tracking, pagbabantay sa bawat istasyon, alerto, at CSV/PDF reports.',
    ],
    'about.do.4.title': ['PDF flipbooks and publishing tools', 'PDF flipbooks at mga tool sa paglalathala'],
    'about.do.4.desc': [
      'Interactive page-flip readers with document upload, thumbnail navigation, and cloud storage.',
      'Interactive na page-flip reader na may upload ng dokumento, thumbnail navigation, at cloud storage.',
    ],
    'about.do.5.title': ['Portfolio and landing sites', 'Mga portfolio at landing site'],
    'about.do.5.desc': [
      'Scroll-driven storytelling and focused product pages that load fast and make the point clear.',
      'Scroll-driven na pagkukwento at malinaw na landing page na mabilis mag-load.',
    ],
    'about.link.work': ['Selected work', 'Mga piling gawa'],
    'about.link.contact': ['Start a brief', 'Magpadala ng brief'],

    // Kinetic drifting lines
    'kinetic.line1': [
      'SOLVE THE TASK · SHIP THE CALM VERSION · BUILT IN ZAMBALES ·',
      'LUTASIN ANG PROBLEMA · ILABAS ANG GUMAGANA · GAWA SA ZAMBALES ·',
    ],
    'kinetic.line2': [
      'FRONT END · BACKEND · DATABASE · NO DECORATION FOR ITS OWN SAKE ·',
      'FRONT END · BACKEND · DATABASE · WALANG DEKORASYON PARA LANG SA GANDA ·',
    ],

    // Numbers Band
    'numbers.index': ['(02) By the Numbers', '(02) Sa Bilang'],
    'numbers.heading': ['PROOF OVER ADJECTIVES.', 'PATUNAY KAYSA PANG-URI.'],
    'numbers.sub': ['Scroll to inspect the work in numbers', 'Mag-scroll para makita ang bilang ng mga gawa'],
    'numbers.1.label': ['Projects built', 'Proyektong nabuo'],
    'numbers.1.detail': [
      'Shipped web systems, publishing tools, and interactive portfolios.',
      'Mga nailabas na web system, publishing tool, at interactive portfolio.',
    ],
    'numbers.2.label': [
      'Features in my largest module, the Management Department',
      'Mga feature sa pinakamalaki kong modyul, ang Management Department',
    ],
    'numbers.2.detail': [
      '17 report types, KPI targets, budgets, alerts, and CSV/PDF exports.',
      '17 uri ng report, KPI target, badyet, alerto, at CSV/PDF export.',
    ],
    'numbers.3.label': [
      'Student records in the CelCheck test data',
      'Rekord ng estudyante sa CelCheck test data',
    ],
    'numbers.3.detail': [
      'QR entry/exit logs, per-PC tracking, and automated checkout flags.',
      'QR entry/exit log, per-PC tracking, at automated checkout flags.',
    ],
    'numbers.4.label': [
      'Core tools I build with: HTML/CSS, JavaScript, PHP, MySQL, Supabase',
      'Pangunahing gamit sa pagbuo: HTML/CSS, JavaScript, PHP, MySQL, Supabase',
    ],
    'numbers.4.detail': [
      'Front end you see, backend that holds it up, and database behind it.',
      'Front end na nakikita mo, backend na sumusuporta, at database sa likod nito.',
    ],

    // Mesh Gradient Section
    'mesh.index': ['(03) Approach', '(03) Pamamaraan'],
    'mesh.title': [
      'DESIGN IS A TASK TO SOLVE — SO PEOPLE NOTICE IT, AND SO IT WORKS.',
      'ANG DISENYO AY PROBLEMANG LULUTASIN — PARA MAPANSIN AT GUMANA ITO.',
    ],
    'mesh.sub': [
      'From paper sketches in Zambales to full-stack systems that hold up under real use.',
      'Mula sa sketch sa papel sa Zambales hanggang sa full-stack system na maaasahan sa totoong gamit.',
    ],
    'mesh.cta': ['Explore the 6 shipped projects', 'Tingnan ang 6 na proyektong nabuo'],

    // Works Tunnel & Grid
    'works.index': ['(04) Selected Works · 2026', '(04) Mga Piling Gawa · 2026'],
    'works.heading': ['SIX SHIPPED PROJECTS.', 'ANIM NA PROYEKTONG NAILABAS.'],
    'works.toggle.list': ['View as list', 'Tingnan bilang listahan'],
    'works.toggle.tunnel': ['View 3D tunnel', 'Tingnan sa 3D tunnel'],
    'works.openProject': ['Open repository', 'Buksan ang proyekto'],
    'works.station.prev': ['Previous project', 'Nakaraang proyekto'],
    'works.station.next': ['Next project', 'Susunod na proyekto'],

    // 3D Phone Social Feed Section
    'phone.index': ['(05) Build Log & Notes', '(05) Tala sa Pagbuo'],
    'phone.heading': ['NOTES FROM THE DESK.', 'MGA TALA MULA SA MESA.'],
    'phone.lead': [
      'Short snapshots of how each system started — from paper wireframes and QR kiosks to flipbooks and clean dark interfaces.',
      'Maiikling tala kung paano nagsimula ang bawat sistema — mula sa papel at QR kiosk hanggang sa flipbook at malinis na interface.',
    ],
    'phone.hint': [
      'Move your pointer or scroll to tilt the device and browse the 7 desk notes.',
      'Igalaw ang pointer o mag-scroll para ikiling ang telepono at basahin ang 7 tala.',
    ],

    // Contact & Brief Form
    'contact.index': ['(06) Contact & Brief', '(06) Kontak at Brief'],
    'contact.heading': [
      "HAVE A TASK TO SOLVE? LET'S BUILD IT.",
      'MAY PROBLEMANG KAILANGANG LUTASIN? BUUIN NATIN.',
    ],
    'contact.lead': [
      'Direct email, source repositories, or send a quick project brief right here.',
      'Direktang email, mga repositoryo, o magpadala ng maikling project brief dito mismo.',
    ],
    'contact.copyEmail': ['Copy email', 'Kopyahin ang email'],
    'contact.copied': ['Copied', 'Nakopya na'],
    'contact.github': ['GitHub — @Rigu3l', 'GitHub — @Rigu3l'],
    'contact.portfolio': ['Live Portfolio — rigu3l.github.io', 'Live Portfolio — rigu3l.github.io'],

    'form.title': ['Send a project brief', 'Magpadala ng project brief'],
    'form.sub': [
      'Tell me what you are building. If no server endpoint is active, this opens a pre-filled email to rjverceles1@gmail.com so your message is never lost.',
      'Sabihin kung ano ang binubuo mo. Kung walang server endpoint, bubuksan nito ang nakahandang email sa rjverceles1@gmail.com para hindi mawala ang mensahe mo.',
    ],
    'form.name.label': ['Your name', 'Iyong pangalan'],
    'form.name.placeholder': ['e.g. Maria Santos', 'hal. Maria Santos'],
    'form.email.label': ['Your email', 'Iyong email'],
    'form.email.placeholder': ['name@organization.com', 'pangalan@organisasyon.com'],
    'form.project.label': ['What are you building?', 'Ano ang ipapagawa o binubuo mo?'],
    'form.project.placeholder': [
      'A web dashboard, QR logging system, flipbook tool, or portfolio site...',
      'Isang web dashboard, QR logging system, flipbook tool, o portfolio site...',
    ],
    'form.scope.label': ['Project scope (optional)', 'Saklaw ng proyekto (opsyonal)'],
    'form.scope.opt1': ['Web Design / Landing', 'Web Design / Landing'],
    'form.scope.opt2': ['Full-Stack PHP & MySQL', 'Full-Stack PHP at MySQL'],
    'form.scope.opt3': ['Dashboard / QR System', 'Dashboard / QR System'],
    'form.scope.opt4': ['Custom / Not sure yet', 'Custom / Hindi pa tiyak'],
    'form.submit': ['Send brief', 'Ipadala ang brief'],
    'form.sending': ['Sending...', 'Ipinapadala...'],
    'form.success': [
      'Thank you! Your brief has been prepared for rjverceles1@gmail.com.',
      'Salamat! Nakahanda na ang iyong brief para sa rjverceles1@gmail.com.',
    ],
    'form.fallbackNote': [
      'No /api/brief backend is configured on this static host — your brief is ready in your mail app (or click the mailto link below) addressed to rjverceles1@gmail.com.',
      'Walang /api/brief backend sa static host na ito — handa na ang iyong brief gamit ang mailto link sa ibaba para sa rjverceles1@gmail.com.',
    ],
    'form.openMailClient': ['Open in email client (mailto:rjverceles1@gmail.com)', 'Buksan sa email app (mailto:rjverceles1@gmail.com)'],

    // Footer
    'footer.signoff': ['Still curious. Still solving.', 'Kuryoso pa rin. Lumulutas pa rin.'],
    'footer.care': ['Built with care in Zambales', 'Maingat na binuo sa Zambales'],
    'footer.backTop': ['Back to top', 'Balik sa itaas'],
  };

  window.applyLang = function (nextLang) {
    if (nextLang === 'en' || nextLang === 'fil') {
      window.__LANG = nextLang;
      try {
        window.localStorage.setItem(STORAGE_KEY, nextLang);
      } catch (e) {}
    }
    var lang = window.__LANG;
    if (document.documentElement) {
      document.documentElement.setAttribute('lang', lang);
    }

    // Update document title & meta descriptions
    var metaInfo = window.STORY_COPY.meta;
    if (metaInfo) {
      var nextTitle = lang === 'fil' ? metaInfo.docTitleFil : metaInfo.docTitleEn;
      var nextDesc = lang === 'fil' ? metaInfo.docDescFil : metaInfo.docDescEn;
      document.title = nextTitle;
      var descEl = document.querySelector('meta[name="description"]');
      if (descEl) descEl.setAttribute('content', nextDesc);
      var ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', nextTitle);
      var ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', nextDesc);
      var twTitle = document.querySelector('meta[name="twitter:title"]');
      if (twTitle) twTitle.setAttribute('content', nextTitle);
      var twDesc = document.querySelector('meta[name="twitter:description"]');
      if (twDesc) twDesc.setAttribute('content', nextDesc);
    }

    // Apply data-i18n text content
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute('data-i18n');
      var pair = window.I18N_STRINGS[key];
      if (pair) {
        var targetText = lang === 'fil' ? pair[1] : pair[0];
        if (el.getAttribute('data-reveal') === 'words') {
          el.setAttribute('data-raw-text', targetText);
        }
        el.textContent = targetText;
      }
    }

    // Apply data-i18n-aria
    var ariaNodes = document.querySelectorAll('[data-i18n-aria]');
    for (var j = 0; j < ariaNodes.length; j++) {
      var aEl = ariaNodes[j];
      var aKey = aEl.getAttribute('data-i18n-aria');
      var aPair = window.I18N_STRINGS[aKey];
      if (aPair) {
        aEl.setAttribute('aria-label', lang === 'fil' ? aPair[1] : aPair[0]);
      }
    }

    // Apply data-i18n-attr="attrName:dictKey,attrName2:dictKey2"
    var attrNodes = document.querySelectorAll('[data-i18n-attr]');
    for (var k = 0; k < attrNodes.length; k++) {
      var atEl = attrNodes[k];
      var spec = atEl.getAttribute('data-i18n-attr') || '';
      var parts = spec.split(',');
      for (var p = 0; p < parts.length; p++) {
        var kv = parts[p].split(':');
        if (kv.length === 2) {
          var attrName = kv[0].trim();
          var dictKey = kv[1].trim();
          var dPair = window.I18N_STRINGS[dictKey];
          if (dPair) {
            atEl.setAttribute(attrName, lang === 'fil' ? dPair[1] : dPair[0]);
          }
        }
      }
    }

    // Language toggle button shows the OTHER language's name so user knows what clicking switches to
    var langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
      langBtn.textContent = lang === 'fil' ? 'EN' : 'FIL';
      langBtn.setAttribute(
        'aria-label',
        lang === 'fil'
          ? 'Switch language to English (Current: Filipino)'
          : 'Palitan ang wika sa Filipino (Current: English)'
      );
    }

    window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
  };

  window.toggleLang = function () {
    var next = window.__LANG === 'en' ? 'fil' : 'en';
    window.applyLang(next);
  };
})();
