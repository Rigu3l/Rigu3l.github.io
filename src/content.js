/**
 * Single Source of Truth for Riguel Aleje's Portfolio
 * Edit this file to update bio, stats, projects, skills, or contact links
 * without touching any animation or layout logic.
 */

export const CONTENT = {
  profile: {
    name: 'Riguel Aleje',
    shortName: 'R. Aleje',
    role: 'Full Stack Developer',
    secondaryHeadline: 'Building systems that stay up past midnight so I do not have to.',
    location: 'Olongapo City, Zambales',
    country: 'Philippines',
    timezone: 'Asia/Manila',
    gmtOffset: 'GMT+8',
    stackLine: 'React · Angular · PHP · MySQL · JavaScript',
    forLine: 'Product Teams · SaaS · High-Volume Web Apps',
    availability: 'Available for select projects',
    email: 'riguel.aleje.dev@gmail.com',
    heroBadgeNote: 'Hover or poke the orbital core. It judges unindexed SQL queries.',
  },

  preloader: {
    statusLines: [
      'Indexing MySQL tables that someone swore were temporary...',
      'Convincing React and Angular to share a room politely...',
      'Bribing the PHP runtime with another cup of Zambales coffee...',
      'Compiling layout tokens and suppressing existential dread...',
    ],
    enterLabel: 'Enter Studio',
    skipNote: 'Session cached · Instant boot',
  },

  about: {
    kicker: '01. Editorial & Bio',
    scrubParagraph:
      'I am a Full Stack Developer based in Olongapo City, Zambales, spending my days turning tangled business requirements into calm, fast software across React, Angular, PHP, and MySQL. I enjoy the whole stack—from obsession-level UI motion in JavaScript to database schemas that will not catch fire the moment more than twelve people log in at once. Most of my career has been an ongoing negotiation between making interfaces feel effortless and making sure the backend never becomes a cautionary tale.',
    secondaryLines: [
      'I write clean SQL before blaming the network, and semantic HTML before reaching for a 400KB library.',
      'Equally comfortable modernizing decade-old PHP monoliths or architecting greenfield React & Angular frontends.',
      'Based in Zambales, collaborating worldwide across time zones with unhealthy amounts of black coffee.',
    ],
    stats: [
      {
        value: 6,
        suffix: '+',
        label: 'Years shipping production web systems',
        context: 'From regional logistics to multi-branch ERP platforms',
      },
      {
        value: 42,
        suffix: '',
        label: 'End-to-end applications deployed',
        context: 'React, Angular, PHP & MySQL architectures',
      },
      {
        value: 99.9,
        decimals: 1,
        suffix: '%',
        label: 'Uptime across managed client schemas',
        context: 'Zero unscheduled Friday afternoon outages',
      },
      {
        value: 180,
        suffix: 'ms',
        label: 'Median API + DB query budget',
        context: 'Because spinners are an admission of defeat',
      },
    ],
  },

  marquee: {
    primary:
      'REACT · ANGULAR · PHP · MYSQL · JAVASCRIPT · ZERO UNINDEXED JOINS · SHIPPED FROM ZAMBALES · ',
    secondary:
      'FULL STACK ARCHITECTURE · CLEAN SCHEMAS · OBSESSIVE INTERACTION · NO FRIDAY DEPLOYS · ',
  },

  projects: [
    {
      id: 'ch-01',
      chapter: '01',
      title: 'Subic Vessel Telemetry',
      client: 'Subic Bay Maritime Logistics',
      role: 'Lead Full Stack Developer',
      year: '2026',
      summary:
        'Real-time berth scheduling, AIS transponder tracking, and container manifest dispatch engine cutting port turnaround bottlenecks by 28%.',
      architectureNote:
        'Engineered spatial MySQL indexing for live vessel coordinates paired with a high-frequency PHP 8.3 stream aggregator and a 60fps React command deck.',
      metrics: '14,820 TEU Monthly · 42ms p95 Query Latency · Zero Lock Contention',
      tags: ['React', 'PHP 8.3', 'MySQL Spatial', 'JavaScript'],
      image: '/images/work-01.svg',
      accent: '#F97316',
      liveUrl: 'https://github.com/riguelaleje/subic-vessel-telemetry',
    },
    {
      id: 'ch-02',
      chapter: '02',
      title: 'KapeZambales ERP & POS',
      client: 'Zambales Roastery Collective',
      role: 'Full Stack Architect',
      year: '2025',
      summary:
        'Offline-resilient point-of-sale and green-bean inventory ledger across four specialty cafés that survives regional brownouts without losing a single receipt.',
      architectureNote:
        'Built an Angular storefront terminal backed by IndexedDB mutation queues that reconcile deterministically against a PHP/MySQL double-entry inventory core.',
      metrics: '4 Branches Synced · 100% Offline Receipt Retention · Sub-Second Checkout',
      tags: ['Angular', 'PHP', 'MySQL', 'IndexedDB'],
      image: '/images/work-02.svg',
      accent: '#FB923C',
      liveUrl: 'https://github.com/riguelaleje/kapezambales-erp-pos',
    },
    {
      id: 'ch-03',
      chapter: '03',
      title: 'Luzon Grid Telemetry',
      client: 'Regional Energy Operations',
      role: 'Full Stack & UI Engineer',
      year: '2025',
      summary:
        'Substation load-balancing visualizer and harmonic anomaly alert system ingesting 1.2 million sensor readings per day without melting the browser tab.',
      architectureNote:
        'Combined partitioned MySQL time-series tables and PHP worker pipelines with a custom HTML5 Canvas + React topology inspector.',
      metrics: '1.2M Daily Rows · 876 MW Monitored · 60fps Canvas Topology',
      tags: ['React', 'Canvas 2D', 'PHP', 'MySQL Partitioning'],
      image: '/images/work-03.svg',
      accent: '#38BDF8',
      liveUrl: 'https://github.com/riguelaleje/luzon-grid-telemetry',
    },
    {
      id: 'ch-04',
      chapter: '04',
      title: 'Obra Publishing Engine',
      client: 'Independent Editorial Studio',
      role: 'Creator & Full Stack Developer',
      year: '2024',
      summary:
        'Schema-driven headless CMS and archival monograph reader designed for editors who care about kerning and developers tired of bloated plugin ecosystems.',
      architectureNote:
        'Designed a structured JSON AST block composer in React backed by a lean PHP REST API, MySQL full-text search, and edge-cached payloads.',
      metrics: '18ms TTFB · 100 Lighthouse Score · Zero Third-Party CMS Bloat',
      tags: ['React', 'JavaScript', 'PHP REST', 'MySQL Full-Text'],
      image: '/images/work-04.svg',
      accent: '#F59E0B',
      liveUrl: 'https://github.com/riguelaleje/obra-publishing-engine',
    },
    {
      id: 'ch-05',
      chapter: '05',
      title: 'Talon Ledger & Payroll',
      client: 'Enterprise Workforce FinTech',
      role: 'Senior Full Stack Developer',
      year: '2024',
      summary:
        'Idempotent double-entry payroll disbursement engine calculating statutory deductions and net settlements for 5,000+ employees in under two seconds.',
      architectureNote:
        'Replaced a 22-minute legacy batch script with strict integer-centavo PHP services, MySQL row-level locking, and an Angular audit workbench.',
      metrics: '1.84s Batch Run (down from 22m) · 100% Audit Reconciliation',
      tags: ['Angular', 'PHP', 'MySQL InnoDB', 'JavaScript'],
      image: '/images/work-05.svg',
      accent: '#F97316',
      liveUrl: 'https://github.com/riguelaleje/talon-ledger-payroll',
    },
  ],

  skills: [
    {
      index: '01',
      title: 'Frontend Engineering & Motion',
      subtitle: 'React · Angular · Modern JavaScript · GSAP',
      description:
        'Component architectures that balance rich editorial motion with strict state predictability. Whether it is a reactive React dashboard or a large-scale Angular enterprise portal, the UI responds in under 100ms and never traps keyboard users.',
      deliverables: 'SPA Architecture · State Machines · Scroll Choreography · WCAG AA Accessibility',
      metric: '95+ Lighthouse Desktop & Mobile',
    },
    {
      index: '02',
      title: 'Backend Systems & API Design',
      subtitle: 'PHP 8.x · RESTful Services · Auth & Workers',
      description:
        'Pragmatic, battle-tested PHP backends engineered with strict typing, idempotent endpoints, and predictable error contracts. I build services that are easy to debug at 2 AM—though the whole point is never getting woken up at 2 AM.',
      deliverables: 'Idempotent APIs · Queue Workers · Legacy Modernization · Role-Based Security',
      metric: '< 45ms Median Controller Overhead',
    },
    {
      index: '03',
      title: 'Relational Data & MySQL Tuning',
      subtitle: 'MySQL · Query Profiling · Schema Architecture',
      description:
        'A fast frontend means nothing if the database is doing full-table scans behind the scenes. I design normalized schemas, composite indexes, and ACID-compliant transactions that scale gracefully past millions of rows.',
      deliverables: 'EXPLAIN Plan Tuning · Zero-Downtime Migrations · Double-Entry Ledgers · Spatial & JSON Indexes',
      metric: '10x–40x Query Speedups on Legacy Schemas',
    },
    {
      index: '04',
      title: 'Performance & Reliability Craft',
      subtitle: 'Core Web Vitals · Caching · Progressive Enhancement',
      description:
        'From GPU-composited transforms and WebGL device guards to edge caching and offline IndexedDB queues, every layer is profiled on real hardware—not just a developer MacBook on gigabit fiber.',
      deliverables: 'LCP < 2.0s · Reduced-Motion Fallbacks · Offline Sync · Automated Build Audits',
      metric: 'Zero Layout Shift (CLS 0.00)',
    },
  ],

  socials: [
    { label: 'GitHub', url: 'https://github.com/riguelaleje', handle: '@riguelaleje' },
    { label: 'LinkedIn', url: 'https://linkedin.com/in/riguelaleje', handle: '/in/riguelaleje' },
    { label: 'CodePen', url: 'https://codepen.io/riguelaleje', handle: '@riguelaleje' },
    { label: 'Instagram', url: 'https://instagram.com/riguelaleje', handle: '@riguelaleje' },
  ],

  footer: {
    headline: 'Let us build software that works.',
    subcopy:
      'Need a full stack developer who speaks fluent React, Angular, PHP, and MySQL without blaming the database? Send a note.',
    ctaLabel: 'Start a Project',
    arcadePrompt: 'Still procrastinating? Challenge the Zambales Pong AI',
    wittyNote:
      'Handcrafted in Olongapo City by Riguel Aleje. Powered by caffeine, indexed foreign keys, and unreasonable attention to kerning.',
  },
};
