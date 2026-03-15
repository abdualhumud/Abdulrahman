'use client';

import { useState, useEffect } from 'react';

const PROD_URL    = 'https://abdualhumud.github.io/REMS/';
const STAGING_URL = 'https://abdualhumud.github.io/REMS/staging/';
const DEMO_URL    = 'https://abdualhumud.github.io/REMS/demo/';
const TERMS_URL   = 'https://abdualhumud.github.io/REMS/terms/';

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT — Bilingual EN / AR
// ═══════════════════════════════════════════════════════════════════════════
const T = {
  en: {
    dir: 'ltr' as const,
    nav: {
      logo: 'REMS', tagline: 'Property Management',
      login: 'Login', start: 'Get Started Free',
      about: 'About', contact: 'Contact', terms: 'Terms',
      demo: 'View Demo',
    },
    hero: {
      badge: 'Trusted by Saudi Property Owners',
      h1a: 'Manage Your Real Estate',
      h1b: 'Like a Pro.',
      h1c: 'Automated. Integrated. Verified.',
      sub: 'Stop managing chaos. REMS unifies bookings, channels, payments, and cleaning workflows — in one platform built for Saudi landlords.',
      cta: 'Start for Free →',
      ctaDemo: 'View Live Demo',
      ctaNote: '14-day free trial · No credit card required',
      stats: [
        { n: '10,000+', l: 'Properties Managed' },
        { n: '3 OTAs', l: 'Native Integrations' },
        { n: '<500ms', l: 'Booking Sync Speed' },
        { n: '99.9%', l: 'Platform Uptime' },
      ],
    },
    partners: { heading: 'Integrated with the Platforms You Already Use' },
    features: {
      badge: 'WHY REMS',
      heading: "Everything You Need. Nothing You Don't.",
      sub: 'Purpose-built for the Saudi real estate market — from SPL national address verification to real-time OTA channel sync.',
      cards: [
        { icon: 'location', color: 'blue',    title: 'SPL-Verified Addresses',    body: 'Every property is cross-verified with the Saudi Post (SPL) National Address database. Government-grade GPS accuracy with a certified short address (e.g. RYYY1234).' },
        { icon: 'sync',     color: 'violet',  title: 'Unified Channel Manager',   body: 'Real-time two-way sync with Booking.com, Airbnb, and Gathern. One calendar, zero double-bookings — our exclusive-lock engine guarantees it.' },
        { icon: 'payment',  color: 'emerald', title: 'Moyasar Smart Payments',    body: 'MADA, Visa, Apple Pay, STC Pay — all covered. Auto-generated invoices and a live financial dashboard per property.' },
        { icon: 'broom',    color: 'amber',   title: 'Smart Housekeeping',        body: 'Auto-trigger cleaning tasks on checkout. Assign to internal teams or external providers and track status in real-time.' },
        { icon: 'shield',   color: 'red',     title: 'Overlap Protection Engine', body: 'Exclusive-lock algorithm prevents double-bookings across all OTAs in under 500ms. The most advanced in the Saudi market.' },
        { icon: 'chart',    color: 'indigo',  title: 'Revenue Intelligence',      body: 'Track RevPAR, ADR, occupancy rate, and net payouts — with channel-by-channel breakdowns and monthly trend graphs.' },
      ],
    },
    about: {
      badge: 'OUR STORY',
      heading: 'Built for Saudi Property Owners',
      act1Label: 'The Problem',
      act1Title: "Managing 10 properties shouldn't feel like managing a crisis.",
      act1Points: [
        'Double bookings across channels causing guest complaints',
        'Unverified property locations causing guest confusion',
        '3am phone calls, manual spreadsheets, and lost revenue',
      ],
      act2Label: 'The Solution',
      act2Title: 'Then came REMS — built for Saudi property owners, by people who understand the market.',
      act2Points: [
        'SPL National Address integration: GPS-verified locations',
        'OTA sync in <500ms: Booking.com, Airbnb, Gathern all updated instantly',
        'Automated cleaning workflow triggered on checkout',
      ],
      act3Label: 'The Vision',
      act3Title: 'Our vision: every Saudi property owner managing their portfolio like an enterprise.',
      act3Points: [
        'Scale from 1 unit to 500+ without changing software',
        'Built for Vision 2030: bilingual, compliant, integrated',
        'Saudi-first: MADA, STC Pay, SPL, and VAT-ready',
      ],
    },
    pricing: {
      badge: 'PRICING',
      heading: 'Simple, Transparent Pricing',
      sub: 'Start free, scale as your portfolio grows. Cancel anytime.',
      sar: 'SAR', mo: '/mo', popular: '✦ Most Popular', cta: 'Start Free Trial',
      plans: [
        { key: 'basic', name: 'Basic', price: 149, desc: 'For individual landlords',
          features: ['Up to 5 properties', 'Booking.com sync', 'SPL address lookup', 'Financial reports', 'Email support (48h)'] },
        { key: 'pro', name: 'Pro', price: 349, desc: 'For growing portfolios', popular: true,
          features: ['Up to 25 properties', 'All 3 OTA channels (Booking.com, Airbnb, Gathern)', 'Moyasar payment links', 'Advanced analytics + RevPAR', 'Housekeeping workflows', 'Priority support (4h)'] },
        { key: 'enterprise', name: 'Enterprise', price: 799, desc: 'For large agencies',
          features: ['Unlimited properties', 'All Pro features included', 'Dedicated account manager', 'Custom integrations', '99.9% SLA guarantee', 'White-label option'] },
      ],
    },
    faq: {
      badge: 'FAQ', heading: 'Got Questions?', sub: 'Everything you need to know about REMS.',
      items: [
        { q: 'How does REMS prevent double bookings?', a: 'REMS uses an exclusive-lock overlap prevention engine that processes booking confirmations in under 500ms. The moment a booking is confirmed on any platform, all other channels are instantly blocked for those dates — no manual intervention needed.' },
        { q: 'Is my property address officially verified?', a: 'Yes. REMS integrates with the Saudi Post (SPL) National Address API. Every property gets GPS-accurate coordinates and a verified short address (e.g. RYYY1234) recognized by government entities and logistics providers.' },
        { q: 'Which payment methods are supported?', a: 'Through Moyasar, REMS supports MADA, Visa, Mastercard, Apple Pay, and STC Pay — covering all major Saudi payment preferences. Guests receive a secure payment link; funds arrive directly in your Saudi bank account.' },
        { q: 'Can I manage properties for multiple owners?', a: "Absolutely. The Enterprise plan supports unlimited properties with full multi-tenant data isolation. Each owner's data is completely separate, accessible only through their own account." },
        { q: 'Is there a mobile app?', a: 'REMS is a Progressive Web App (PWA) that runs beautifully on any device — no app store download required. Your cleaning team gets mobile-optimized task workflows directly in their browser.' },
        { q: 'What kind of support is available?', a: 'Basic: email support with 48h response time. Pro: priority queue with 4h response. Enterprise: dedicated account manager and fully custom onboarding.' },
      ],
    },
    contact: {
      badge: 'CONTACT US',
      heading: 'Get in Touch',
      sub: "Have a question about REMS? Our team responds within 24 hours.",
      name: 'Full Name',
      email: 'Email Address',
      phone: 'Phone Number',
      subject: 'Subject',
      message: 'Message',
      send: 'Send Message',
      sending: 'Sending...',
      successTitle: 'Message Sent!',
      successSub: "Thank you! We'll respond within 24 hours.",
      subjects: ['General Inquiry', 'Technical Support', 'Sales', 'Partnership'],
      phonePlaceholder: '+966 5X XXX XXXX',
      namePlaceholder: 'Your full name',
      emailPlaceholder: 'you@company.com',
      messagePlaceholder: 'Tell us how we can help you...',
    },
    footer: {
      tagline: 'The future of Saudi property management.',
      ctaBanner: 'Ready to transform your property business?', ctaBtn: 'Start Free Trial',
      links: [
        { label: 'About', href: '#about' },
        { label: 'Contact', href: '#contact' },
        { label: 'Terms of Service', href: TERMS_URL },
        { label: 'Privacy Policy', href: '#' },
      ],
      copy: '© 2026 REMS Real Estate Management System. All rights reserved.',
    },
  },
  ar: {
    dir: 'rtl' as const,
    nav: {
      logo: 'REMS', tagline: 'إدارة العقارات',
      login: 'تسجيل الدخول', start: 'ابدأ مجاناً',
      about: 'من نحن', contact: 'تواصل معنا', terms: 'الشروط',
      demo: 'جرّب العرض',
    },
    hero: {
      badge: 'موثوق من مُلاك العقارات السعوديين',
      h1a: 'أدر عقاراتك',
      h1b: 'كالمحترفين.',
      h1c: 'آلياً. متكاملاً. موثقاً.',
      sub: 'أنهِ الفوضى. REMS يوحّد حجوزاتك وقنواتك ومدفوعاتك وسير عمل التنظيف — في منصة واحدة مبنية لأصحاب العقارات السعوديين.',
      cta: '← ابدأ مجانًا',
      ctaDemo: 'جرّب العرض الحي',
      ctaNote: 'تجربة مجانية 14 يوماً · بدون بطاقة ائتمانية',
      stats: [
        { n: '+10,000', l: 'عقار تحت الإدارة' },
        { n: '3 منصات', l: 'تكامل أصيل' },
        { n: '<500ms', l: 'سرعة مزامنة الحجوزات' },
        { n: '99.9%', l: 'وقت تشغيل المنصة' },
      ],
    },
    partners: { heading: 'متكامل مع المنصات التي تستخدمها بالفعل' },
    features: {
      badge: 'لماذا REMS',
      heading: 'كل ما تحتاجه. لا أكثر ولا أقل.',
      sub: 'مُصمَّم خصيصاً للسوق العقاري السعودي — من التحقق بالعنوان الوطني SPL إلى المزامنة الآنية متعددة القنوات.',
      cards: [
        { icon: 'location', color: 'blue',    title: 'عناوين موثقة بـ SPL',          body: 'كل عقار يتحقق منه عبر قاعدة بيانات العنوان الوطني لمؤسسة البريد السعودي. دقة GPS بمستوى حكومي وعنوان قصير معتمد مثل RYYY1234.' },
        { icon: 'sync',     color: 'violet',  title: 'مدير القنوات الموحّد',          body: 'مزامنة فورية ثنائية الاتجاه مع Booking.com وAirbnb وGathern. تقويم واحد، صفر حجوزات مزدوجة — يضمنه محرك القفل الحصري.' },
        { icon: 'payment',  color: 'emerald', title: 'مدفوعات ذكية عبر ميسر',        body: 'مدى وفيزا وApple Pay وSTC Pay — كلها مدعومة. فواتير تُولَّد تلقائياً ولوحة مالية حية لكل عقار.' },
        { icon: 'broom',    color: 'amber',   title: 'تنظيف وصيانة ذكية',            body: 'تشغيل مهام التنظيف تلقائياً عند المغادرة. تعيين للفرق الداخلية أو المزودين الخارجيين مع تتبع الحالة في الوقت الفعلي.' },
        { icon: 'shield',   color: 'red',     title: 'محرك الحماية من التداخل',       body: 'خوارزمية القفل الحصري تمنع الحجوزات المزدوجة عبر جميع القنوات في أقل من 500 مللي ثانية. الأكثر تقدماً في السوق السعودي.' },
        { icon: 'chart',    color: 'indigo',  title: 'ذكاء الإيرادات',               body: 'تتبع RevPAR وADR ومعدل الإشغال وصافي المدفوعات — مع تفاصيل كل قناة على حدة والاتجاهات الشهرية.' },
      ],
    },
    about: {
      badge: 'قصتنا',
      heading: 'مبني لأصحاب العقارات السعوديين',
      act1Label: 'المشكلة',
      act1Title: 'إدارة ١٠ عقارات لا ينبغي أن تشعر وكأنك تدير أزمة.',
      act1Points: [
        'حجوزات مزدوجة عبر القنوات تسبب شكاوى الضيوف',
        'مواقع عقارات غير موثقة تُربك الضيوف',
        'اتصالات الساعة 3 صباحاً وجداول البيانات اليدوية والإيرادات الضائعة',
      ],
      act2Label: 'الحل',
      act2Title: 'ثم جاء REMS — مبني لملاك العقارات السعوديين، من أناس يفهمون السوق.',
      act2Points: [
        'تكامل العنوان الوطني SPL: مواقع موثقة بنظام GPS',
        'مزامنة OTA في أقل من 500 مللي ثانية: Booking.com وAirbnb وGathern تُحدَّث فوراً',
        'سير عمل تنظيف آلي يُشغَّل عند المغادرة',
      ],
      act3Label: 'الرؤية',
      act3Title: 'رؤيتنا: كل مالك عقار سعودي يدير محفظته كمؤسسة كبرى.',
      act3Points: [
        'التوسع من وحدة واحدة إلى أكثر من 500 دون تغيير البرنامج',
        'مبني لرؤية 2030: ثنائي اللغة، متوافق، متكامل',
        'سعودي أولاً: مدى، STC Pay، SPL، وضريبة القيمة المضافة',
      ],
    },
    pricing: {
      badge: 'الأسعار',
      heading: 'أسعار واضحة وشفافة',
      sub: 'ابدأ مجاناً وتوسع مع محفظتك العقارية. إلغاء في أي وقت.',
      sar: 'ريال', mo: '/شهر', popular: '✦ الأكثر شعبية', cta: 'ابدأ التجربة المجانية',
      plans: [
        { key: 'basic', name: 'أساسي', price: 149, desc: 'للملاك الأفراد',
          features: ['حتى 5 عقارات', 'مزامنة Booking.com', 'بحث عنوان SPL', 'تقارير مالية', 'دعم بريد إلكتروني (48 ساعة)'] },
        { key: 'pro', name: 'احترافي', price: 349, desc: 'للمحافظ المتنامية', popular: true,
          features: ['حتى 25 عقاراً', 'جميع قنوات OTA الثلاثة (Booking.com, Airbnb, Gathern)', 'روابط دفع ميسر', 'تحليلات متقدمة + RevPAR', 'سير عمل التنظيف', 'دعم ذو أولوية (4 ساعات)'] },
        { key: 'enterprise', name: 'مؤسسي', price: 799, desc: 'للمحافظ الكبيرة والوكالات',
          features: ['عقارات غير محدودة', 'جميع مميزات الخطة الاحترافية', 'مدير حساب مخصص', 'تكاملات مخصصة', 'ضمان SLA 99.9%', 'خيار العلامة البيضاء'] },
      ],
    },
    faq: {
      badge: 'الأسئلة الشائعة', heading: 'لديك أسئلة؟', sub: 'كل ما تحتاج معرفته عن REMS.',
      items: [
        { q: 'كيف يمنع REMS الحجوزات المزدوجة؟', a: 'يستخدم REMS محرك منع التداخل بالقفل الحصري الذي يعالج تأكيدات الحجز عبر جميع القنوات في أقل من 500 مللي ثانية. بمجرد تأكيد الحجز على أي منصة، تُحجب التواريخ على القنوات الأخرى فوراً — دون أي تدخل يدوي.' },
        { q: 'هل يتم التحقق الرسمي من عنوان عقاري؟', a: 'نعم. يتكامل REMS مع واجهة برمجة تطبيقات العنوان الوطني لمؤسسة البريد السعودي (SPL). كل عقار يحصل على إحداثيات GPS دقيقة وعنوان قصير موثق مثل RYYY1234 معترف به من الجهات الحكومية ومزودي الخدمات اللوجستية.' },
        { q: 'ما طرق الدفع المدعومة؟', a: 'عبر ميسر، يدعم REMS: مدى وفيزا وماستركارد وApple Pay وSTC Pay — تغطي جميع تفضيلات الدفع السعودية. يتلقى الضيوف رابط دفع آمناً وتصل الأموال مباشرة إلى حسابك البنكي السعودي.' },
        { q: 'هل يمكنني إدارة عقارات لملاك مختلفين؟', a: 'بالتأكيد. تدعم خطة المؤسسات عقارات غير محدودة مع عزل كامل للبيانات متعدد المستأجرين. بيانات كل مالك مفصولة تماماً ولا يمكن الوصول إليها إلا من حسابه الخاص.' },
        { q: 'هل يتوفر تطبيق جوال؟', a: 'REMS تطبيق ويب تقدمي (PWA) يعمل بشكل رائع على أي جهاز — دون تنزيل من متجر التطبيقات. فريق التنظيف يحصل على سير عمل محسّن للجوال مباشرة في متصفحه.' },
        { q: 'ما الدعم الفني المتاح؟', a: 'أساسي: دعم بريد إلكتروني (استجابة 48 ساعة). احترافي: أولوية في قائمة الانتظار (استجابة 4 ساعات). مؤسسي: مدير حساب مخصص وتهيئة مخصصة.' },
      ],
    },
    contact: {
      badge: 'تواصل معنا',
      heading: 'ابقَ على تواصل',
      sub: 'لديك سؤال حول REMS؟ فريقنا يرد خلال 24 ساعة.',
      name: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      phone: 'رقم الجوال',
      subject: 'الموضوع',
      message: 'الرسالة',
      send: 'إرسال الرسالة',
      sending: 'جارٍ الإرسال...',
      successTitle: 'تم الإرسال!',
      successSub: 'شكراً لك! سنرد خلال 24 ساعة.',
      subjects: ['استفسار عام', 'الدعم الفني', 'المبيعات', 'الشراكات'],
      phonePlaceholder: '+966 5X XXX XXXX',
      namePlaceholder: 'اسمك الكامل',
      emailPlaceholder: 'you@company.com',
      messagePlaceholder: 'أخبرنا كيف يمكننا مساعدتك...',
    },
    footer: {
      tagline: 'مستقبل إدارة العقارات السعودية.',
      ctaBanner: 'هل أنت مستعد لتحويل أعمالك العقارية؟', ctaBtn: 'ابدأ التجربة المجانية',
      links: [
        { label: 'من نحن', href: '#about' },
        { label: 'تواصل معنا', href: '#contact' },
        { label: 'شروط الخدمة', href: TERMS_URL },
        { label: 'سياسة الخصوصية', href: '#' },
      ],
      copy: '© 2026 REMS نظام إدارة العقارات. جميع الحقوق محفوظة.',
    },
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// PARTNER LIST — brand logos
// ═══════════════════════════════════════════════════════════════════════════
const PARTNER_LIST = [
  {
    name: 'Booking.com',
    logoUrl: 'https://logo.clearbit.com/booking.com',
    fallbackBg: '#003580', fallbackFg: '#ffffff', fallbackText: 'B.',
  },
  {
    name: 'Airbnb',
    logoUrl: 'https://logo.clearbit.com/airbnb.com',
    fallbackBg: '#FF385C', fallbackFg: '#ffffff', fallbackText: 'A',
  },
  {
    name: 'Gathern',
    logoUrl: 'https://logo.clearbit.com/gathern.co',
    fallbackBg: '#00A651', fallbackFg: '#ffffff', fallbackText: 'G',
  },
  {
    name: 'Moyasar',
    logoUrl: 'https://logo.clearbit.com/moyasar.com',
    fallbackBg: '#1B1F3B', fallbackFg: '#FFD700', fallbackText: 'م',
  },
  {
    name: 'Agoda',
    logoUrl: 'https://logo.clearbit.com/agoda.com',
    fallbackBg: '#E2183A', fallbackFg: '#ffffff', fallbackText: 'A',
  },
  {
    name: 'Expedia',
    logoUrl: 'https://logo.clearbit.com/expedia.com',
    fallbackBg: '#FDB927', fallbackFg: '#003580', fallbackText: 'E',
  },
  {
    name: 'SPL',
    logoUrl: 'https://logo.clearbit.com/splonline.com.sa',
    fallbackBg: '#006B3F', fallbackFg: '#ffffff', fallbackText: 'SPL',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE ICON
// ═══════════════════════════════════════════════════════════════════════════
function FeatureIcon({ icon }: { icon: string }) {
  const s = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (icon === 'location') return <svg {...s}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
  if (icon === 'sync')     return <svg {...s}><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>;
  if (icon === 'payment')  return <svg {...s}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
  if (icon === 'broom')    return <svg {...s}><path d="M3 3l18 18M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/></svg>;
  if (icon === 'shield')   return <svg {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
  if (icon === 'chart')    return <svg {...s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PARTNER CHIP — real brand logo with graceful fallback
// ═══════════════════════════════════════════════════════════════════════════
function PartnerChip({ name, logoUrl, fallbackBg, fallbackFg, fallbackText }: typeof PARTNER_LIST[0]) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <div
      className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-md select-none border"
      style={{
        background: imgFailed ? fallbackBg : 'white',
        borderColor: imgFailed ? 'transparent' : '#e2e8f0',
        direction: 'ltr',
      }}
    >
      {!imgFailed ? (
        <img
          src={logoUrl}
          alt={name}
          width={28}
          height={28}
          className="object-contain rounded"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span
          className="font-black text-base leading-none w-7 text-center"
          style={{ fontFamily: 'Arial Black, sans-serif', color: fallbackFg }}
        >
          {fallbackText}
        </span>
      )}
      <span
        className="text-sm font-bold"
        style={{ color: imgFailed ? fallbackFg : '#1e293b' }}
      >
        {name}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECK ICON
// ═══════════════════════════════════════════════════════════════════════════
function CheckIcon({ blue }: { blue?: boolean }) {
  return (
    <span className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${blue ? 'bg-blue-400/25 text-blue-200' : 'bg-emerald-100 text-emerald-600'}`}>
      ✓
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT FORM — saves to localStorage for Super-Admin review
// ═══════════════════════════════════════════════════════════════════════════
const CONTACT_STORAGE_KEY = 'rems-contact-submissions';

interface ContactFormState {
  name: string; email: string; phone: string; subject: string; message: string;
}

function ContactSection({ t, isAr }: { t: typeof T['en'] | typeof T['ar']; isAr: boolean }) {
  const [form, setForm] = useState<ContactFormState>({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const c = t.contact;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setSending(true);
    setTimeout(() => {
      try {
        const existing = JSON.parse(localStorage.getItem(CONTACT_STORAGE_KEY) ?? '[]');
        existing.unshift({ ...form, submittedAt: new Date().toISOString(), id: `c-${Date.now()}` });
        localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(existing.slice(0, 200)));
      } catch { /* ignore */ }
      setSending(false);
      setSent(true);
    }, 1200);
  };

  const INPUT_CLS = 'contact-input w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all';
  const LABEL_CLS = 'block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2';

  if (sent) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-2xl font-black text-white mb-3">{c.successTitle}</h3>
        <p className="text-slate-400">{c.successSub}</p>
        <button onClick={() => { setSent(false); setForm({ name: '', email: '', phone: '', subject: '', message: '' }); }}
          className="mt-8 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors">
          {isAr ? 'إرسال رسالة أخرى' : 'Send Another Message'}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <div>
          <label className={LABEL_CLS}>{c.name} <span className="text-red-400">*</span></label>
          <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder={c.namePlaceholder} className={INPUT_CLS} />
        </div>
        <div>
          <label className={LABEL_CLS}>{c.email} <span className="text-red-400">*</span></label>
          <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder={c.emailPlaceholder} className={INPUT_CLS} />
        </div>
        <div>
          <label className={LABEL_CLS}>{c.phone}</label>
          <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder={c.phonePlaceholder} className={INPUT_CLS} style={{ direction: 'ltr' }} />
        </div>
        <div>
          <label className={LABEL_CLS}>{c.subject}</label>
          <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            className={INPUT_CLS + ' cursor-pointer'} style={{ colorScheme: 'dark' }}>
            <option value="">{isAr ? '-- اختر الموضوع --' : '-- Select Subject --'}</option>
            {c.subjects.map((s, i) => <option key={i} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="mb-6">
        <label className={LABEL_CLS}>{c.message} <span className="text-red-400">*</span></label>
        <textarea required rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          placeholder={c.messagePlaceholder} className={INPUT_CLS + ' resize-none'} />
      </div>
      <button type="submit" disabled={sending}
        className="w-full py-4 rounded-xl text-white font-bold text-base transition-all hover:opacity-90 disabled:opacity-60 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
        {sending ? (
          <>
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            {c.sending}
          </>
        ) : c.send}
      </button>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT MODAL
// ═══════════════════════════════════════════════════════════════════════════
function ContactModal({ t, isAr, onClose }: { t: typeof T['en'] | typeof T['ar']; isAr: boolean; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-sm" />
      <div
        className="relative bg-slate-800 border border-slate-700/60 rounded-3xl p-8 sm:p-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'fadeInUp 0.25s ease-out both' }}
      >
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-400 text-xs font-black uppercase tracking-[0.15em] mb-3 border border-indigo-500/20">
              {t.contact.badge}
            </span>
            <h2 className="font-black text-white text-2xl leading-tight">{t.contact.heading}</h2>
            <p className="text-slate-400 text-sm mt-1">{t.contact.sub}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition-all font-bold text-base"
            aria-label="Close"
          >✕</button>
        </div>
        <ContactSection t={t} isAr={isAr} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LANDING PAGE — MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const [lang, setLang] = useState<'en' | 'ar'>('ar');
  const [dark, setDark] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const t = T[lang];
  const isAr = lang === 'ar';

  useEffect(() => {
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang, isAr]);

  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    return () => document.documentElement.classList.remove('dark');
  }, [dark]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const colorMap: Record<string, { icon: string; ring: string; bg: string }> = {
    blue:    { icon: 'text-blue-600',    ring: 'ring-blue-100',    bg: 'bg-blue-100'    },
    violet:  { icon: 'text-violet-600',  ring: 'ring-violet-100',  bg: 'bg-violet-100'  },
    emerald: { icon: 'text-emerald-600', ring: 'ring-emerald-100', bg: 'bg-emerald-100' },
    amber:   { icon: 'text-amber-600',   ring: 'ring-amber-100',   bg: 'bg-amber-100'   },
    red:     { icon: 'text-red-600',     ring: 'ring-red-100',     bg: 'bg-red-100'     },
    indigo:  { icon: 'text-indigo-600',  ring: 'ring-indigo-100',  bg: 'bg-indigo-100'  },
  };

  return (
    <div style={{ fontFamily: isAr ? "'Cairo', 'Segoe UI', sans-serif" : "'Inter', 'Segoe UI', sans-serif" }}>

      {/* Contact Modal */}
      {showContactModal && (
        <ContactModal t={t} isAr={isAr} onClose={() => setShowContactModal(false)} />
      )}

      {/* ── Keyframe Animations ─────────────────────────────────────────── */}
      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes heroPulse {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50%       { opacity: 0.55; transform: scale(1.15); }
        }
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-14px) rotate(3deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes gradientFlow {
          0%, 100% { background-position: 0% 50%; }
          50%       { background-position: 100% 50%; }
        }

        .ticker-wrap  { overflow: hidden; mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); }
        .ticker-inner { display: flex; animation: ticker 32s linear infinite; width: max-content; }
        .ticker-inner:hover { animation-play-state: paused; }

        .hero-orb     { animation: heroPulse 5s ease-in-out infinite; }
        .hero-orb-2   { animation: heroPulse 5s ease-in-out 2.5s infinite; }
        .float-card   { animation: heroFloat 7s ease-in-out infinite; }

        .fade-in-0    { animation: fadeInUp 0.7s ease-out 0.0s both; }
        .fade-in-1    { animation: fadeInUp 0.7s ease-out 0.15s both; }
        .fade-in-2    { animation: fadeInUp 0.7s ease-out 0.30s both; }
        .fade-in-3    { animation: fadeInUp 0.7s ease-out 0.45s both; }
        .fade-in-4    { animation: fadeInUp 0.7s ease-out 0.60s both; }

        .shimmer-btn  {
          background: linear-gradient(90deg, #2563EB 0%, #6366F1 40%, #7C3AED 60%, #2563EB 100%);
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }
        .hero-grid {
          background-image:
            linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px);
          background-size: 56px 56px;
        }
        .grad-text {
          background: linear-gradient(135deg, #60A5FA 0%, #A78BFA 50%, #34D399 100%);
          background-size: 200% 200%;
          animation: gradientFlow 4s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .feature-card {
          transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        .feature-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 24px 48px -12px rgba(0,0,0,0.15);
        }
        /* Story card hover */
        .story-card {
          transition: transform 0.4s cubic-bezier(0.4,0,0.2,1), box-shadow 0.4s;
        }
        .story-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.15); }

        /* Contact form field focus glow */
        .contact-input:focus { box-shadow: 0 0 0 3px rgba(99,102,241,0.25); }

        .price-popular {
          background: linear-gradient(145deg, #1D4ED8 0%, #3730A3 55%, #1E3A8A 100%);
          box-shadow: 0 32px 64px -16px rgba(37,99,235,0.45);
        }
        .faq-body {
          overflow: hidden;
          transition: max-height 0.35s ease, opacity 0.35s ease, padding 0.35s ease;
        }
        .cta-bg {
          background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 40%, #4338CA 100%);
        }
        .nav-scrolled {
          background: rgba(15,23,42,0.92);
          box-shadow: 0 1px 32px rgba(0,0,0,0.3);
        }
        html.dark .feature-card { background: #1e293b; border-color: #334155; }
        html.dark .faq-item      { background: #1e293b; border-color: #334155; }
        html.dark .faq-btn       { background: #1e293b; }
        html.dark .faq-btn:hover { background: #273344; }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════════
          NAVIGATION
      ═══════════════════════════════════════════════════════════════════ */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'nav-scrolled' : 'bg-slate-900/60 backdrop-blur-xl'} border-b border-white/5`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">

          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
              <span className="text-white font-black text-sm tracking-tight">R</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-white font-black text-lg leading-none tracking-tight">{t.nav.logo}</div>
              <div className="text-slate-400 text-[10px] tracking-wide">{t.nav.tagline}</div>
            </div>
          </a>

          {/* Nav links — desktop */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#about" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">{t.nav.about}</a>
            <button onClick={() => setShowContactModal(true)} className="text-slate-400 hover:text-white text-sm font-medium transition-colors">{t.nav.contact}</button>
            <a href={TERMS_URL} className="text-slate-400 hover:text-white text-sm font-medium transition-colors">{t.nav.terms}</a>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Dark mode */}
            <button
              onClick={() => setDark(d => !d)}
              className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-base flex items-center justify-center transition-all hover:scale-105"
              title={dark ? 'Light mode' : 'Dark mode'}
            >
              {dark ? '☀️' : '🌙'}
            </button>

            {/* Language */}
            <button
              onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')}
              className="h-9 px-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-sm font-semibold flex items-center gap-1.5 transition-all"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span>{lang === 'en' ? 'العربية' : 'English'}</span>
            </button>

            {/* Demo → contact popup */}
            <button
              onClick={() => setShowContactModal(true)}
              className="h-9 px-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white text-sm font-medium transition-all hidden sm:flex items-center gap-1.5"
            >
              {t.nav.demo}
            </button>

            {/* Login */}
            <a
              href={PROD_URL}
              className="h-9 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/12 text-slate-300 hover:text-white text-sm font-medium transition-all hidden sm:flex items-center"
            >
              {t.nav.login}
            </a>

            {/* Get Started */}
            <a
              href={STAGING_URL}
              className="shimmer-btn h-9 px-5 rounded-xl text-white text-sm font-bold flex items-center shadow-lg shadow-blue-500/25 hover:shadow-blue-500/45 transition-shadow hover:scale-105 active:scale-95"
            >
              {t.nav.start}
            </a>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900 hero-grid pt-16">

        {/* Decorative orbs */}
        <div className="hero-orb   pointer-events-none absolute top-1/4 left-[10%]  w-[500px] h-[500px] bg-blue-600/15    rounded-full blur-3xl" />
        <div className="hero-orb-2 pointer-events-none absolute bottom-1/4 right-[8%]  w-[400px] h-[400px] bg-indigo-500/15  rounded-full blur-3xl" />
        <div className="hero-orb   pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-violet-500/10 rounded-full blur-3xl" style={{ animationDelay: '1.5s' }} />

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-24 sm:py-32">

          {/* Badge */}
          <div className="fade-in-0 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
            🇸🇦 &nbsp;{t.hero.badge}
          </div>

          {/* Headline */}
          <h1 className="fade-in-1 font-black text-white leading-tight mb-6" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
            <span className="block">{t.hero.h1a}</span>
            <span className="grad-text block pb-1">{t.hero.h1b}</span>
            <span className="block text-slate-300 font-semibold mt-2" style={{ fontSize: 'clamp(1.25rem, 3vw, 2rem)' }}>
              {t.hero.h1c}
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="fade-in-2 text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed" style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)' }}>
            {t.hero.sub}
          </p>

          {/* CTAs */}
          <div className="fade-in-3 flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <a
              href={STAGING_URL}
              className="shimmer-btn text-white font-bold px-10 py-4 rounded-2xl shadow-2xl shadow-blue-500/35 hover:shadow-blue-500/55 hover:scale-105 active:scale-95 transition-all"
              style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)' }}
            >
              {t.hero.cta}
            </a>
            <button
              onClick={() => setShowContactModal(true)}
              className="text-slate-300 hover:text-white border border-white/20 hover:border-indigo-400/50 bg-white/5 hover:bg-indigo-500/10 font-bold px-8 py-4 rounded-2xl transition-all hover:scale-105 active:scale-95"
              style={{ fontSize: 'clamp(0.9rem, 2vw, 1.1rem)' }}
            >
              {t.hero.ctaDemo} →
            </button>
          </div>
          <p className="text-slate-500 text-sm -mt-14 mb-14">{t.hero.ctaNote}</p>

          {/* Stats */}
          <div className="fade-in-4 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {t.hero.stats.map((s, i) => (
              <div key={i} className="text-center">
                <div className="font-black text-white mb-1" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', direction: 'ltr' }}>{s.n}</div>
                <div className="text-slate-400 text-sm">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom gradient fade to next section */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          PARTNERS TICKER
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-slate-900 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 mb-10">
          <p className="text-center text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">
            {t.partners.heading}
          </p>
        </div>
        <div className="ticker-wrap">
          <div className="ticker-inner" style={{ direction: 'ltr' }}>
            {[...PARTNER_LIST, ...PARTNER_LIST, ...PARTNER_LIST].map((p, i) => (
              <div key={i} className="flex-shrink-0 mx-5">
                <PartnerChip {...p} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FEATURES
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section header */}
          <div className="text-center mb-16 sm:mb-20">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-black uppercase tracking-[0.15em] mb-5">
              {t.features.badge}
            </span>
            <h2 className="font-black text-slate-900 mb-5 leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              {t.features.heading}
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
              {t.features.sub}
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.features.cards.map((card, i) => {
              const c = colorMap[card.color];
              return (
                <div
                  key={i}
                  className="feature-card p-7 rounded-2xl bg-white border border-slate-100 shadow-sm cursor-default"
                >
                  <div className={`w-12 h-12 rounded-xl ${c.bg} ${c.icon} flex items-center justify-center mb-5 ring-4 ${c.ring}`}>
                    <FeatureIcon icon={card.icon} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2.5">{card.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{card.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          ABOUT US — 3-Act Brand Story
      ═══════════════════════════════════════════════════════════════════ */}
      <section id="about" className="py-24 sm:py-32 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-500/15 text-blue-400 text-xs font-black uppercase tracking-[0.15em] mb-5 border border-blue-500/20">
              {t.about.badge}
            </span>
            <h2 className="font-black text-white mb-4 leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              {t.about.heading}
            </h2>
          </div>

          {/* Timeline: 3 story cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-8 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-red-500 via-blue-500 to-emerald-500 opacity-30 pointer-events-none" style={{ top: '2rem' }} />

            {/* Act 1 — The Problem */}
            <div className="story-card relative bg-slate-800/60 border border-red-500/20 rounded-3xl p-8 hover:border-red-500/40 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 font-black text-sm">1</div>
                <span className="text-red-400 text-xs font-bold uppercase tracking-wider">{t.about.act1Label}</span>
              </div>
              <div className="text-3xl mb-4">😰</div>
              <h3 className="text-white font-black text-lg mb-4 leading-snug">{t.about.act1Title}</h3>
              <ul className="space-y-3">
                {t.about.act1Points.map((p, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-slate-400 text-sm">
                    <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-[10px] font-bold">✗</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* Act 2 — The Solution */}
            <div className="story-card relative bg-slate-800/60 border border-blue-500/20 rounded-3xl p-8 hover:border-blue-500/40 backdrop-blur-sm md:mt-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-sm">2</div>
                <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">{t.about.act2Label}</span>
              </div>
              <div className="text-3xl mb-4">🚀</div>
              <h3 className="text-white font-black text-lg mb-4 leading-snug">{t.about.act2Title}</h3>
              <ul className="space-y-3">
                {t.about.act2Points.map((p, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-slate-400 text-sm">
                    <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* Act 3 — The Vision */}
            <div className="story-card relative rounded-3xl p-8 md:mt-16" style={{ background: 'linear-gradient(145deg,#064e3b,#065f46)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-sm">3</div>
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">{t.about.act3Label}</span>
              </div>
              <div className="text-3xl mb-4">🌟</div>
              <h3 className="text-white font-black text-lg mb-4 leading-snug">{t.about.act3Title}</h3>
              <ul className="space-y-3">
                {t.about.act3Points.map((p, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-emerald-200/70 text-sm">
                    <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full bg-emerald-500/30 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✦</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          PRICING
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section header */}
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-[0.15em] mb-5">
              {t.pricing.badge}
            </span>
            <h2 className="font-black text-slate-900 mb-4 leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              {t.pricing.heading}
            </h2>
            <p className="text-slate-500 text-lg">{t.pricing.sub}</p>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {t.pricing.plans.map((plan) => {
              const isPop = 'popular' in plan && plan.popular;
              return (
                <div
                  key={plan.key}
                  className={`rounded-3xl overflow-hidden ${isPop ? 'price-popular md:scale-105 md:-my-4 z-10' : 'border border-slate-100 shadow-sm bg-white'}`}
                >
                  {/* Popular badge */}
                  {isPop && (
                    <div className="text-center py-2.5 text-blue-200 text-xs font-bold tracking-[0.15em]" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      {t.pricing.popular}
                    </div>
                  )}

                  <div className="p-8">
                    {/* Plan name */}
                    <div className={`text-sm font-semibold mb-1 ${isPop ? 'text-blue-200' : 'text-slate-400'}`}>{plan.desc}</div>
                    <div className={`text-2xl font-black mb-5 ${isPop ? 'text-white' : 'text-slate-900'}`}>{plan.name}</div>

                    {/* Price */}
                    <div className="flex items-end gap-1.5 mb-7" style={{ direction: 'ltr' }}>
                      <span className={`font-black leading-none ${isPop ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)' }}>
                        {plan.price}
                      </span>
                      <span className={`pb-1 text-sm ${isPop ? 'text-blue-200' : 'text-slate-400'}`}>
                        {t.pricing.sar}{t.pricing.mo}
                      </span>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((f, j) => (
                        <li key={j} className={`flex items-start gap-2.5 text-sm ${isPop ? 'text-blue-100' : 'text-slate-600'}`}>
                          <CheckIcon blue={isPop} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <a
                      href={STAGING_URL}
                      className={`block text-center font-bold py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-95 ${
                        isPop
                          ? 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg shadow-blue-900/20'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {t.pricing.cta}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">

          {/* Section header */}
          <div className="text-center mb-14">
            <span className="inline-block px-3 py-1 rounded-full bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-[0.15em] mb-5">
              {t.faq.badge}
            </span>
            <h2 className="font-black text-slate-900 mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              {t.faq.heading}
            </h2>
            <p className="text-slate-500 text-lg">{t.faq.sub}</p>
          </div>

          {/* Accordion */}
          <div className="space-y-3">
            {t.faq.items.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="faq-item rounded-2xl border border-slate-100 overflow-hidden shadow-sm bg-white"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="faq-btn w-full flex items-center justify-between gap-4 px-6 py-5 text-start hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-semibold text-slate-900 text-sm sm:text-base leading-snug">
                      {item.q}
                    </span>
                    <span
                      className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                        isOpen
                          ? 'border-blue-500 text-blue-500 rotate-45'
                          : 'border-slate-200 text-slate-400'
                      }`}
                    >
                      +
                    </span>
                  </button>

                  <div
                    className="faq-body"
                    style={{
                      maxHeight: isOpen ? '600px' : '0px',
                      opacity:   isOpen ? 1 : 0,
                    }}
                  >
                    <p className="px-6 pb-6 text-slate-500 text-sm leading-relaxed border-t border-slate-50 pt-4">
                      {item.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          CONTACT US
      ═══════════════════════════════════════════════════════════════════ */}
      <section id="contact" className="py-24 sm:py-32 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-400 text-xs font-black uppercase tracking-[0.15em] mb-5 border border-indigo-500/20">
              {t.contact.badge}
            </span>
            <h2 className="font-black text-white mb-4 leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              {t.contact.heading}
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">{t.contact.sub}</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-3xl p-8 sm:p-12 max-w-3xl mx-auto backdrop-blur-sm">
            <ContactSection t={t} isAr={isAr} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER CTA BANNER
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="cta-bg relative overflow-hidden py-24 sm:py-32">
        {/* Decorative grid */}
        <div className="absolute inset-0 hero-grid opacity-20 pointer-events-none" />
        <div className="hero-orb pointer-events-none absolute -top-24 right-1/4 w-80 h-80 bg-white/8 rounded-full blur-3xl" />
        <div className="hero-orb-2 pointer-events-none absolute -bottom-16 left-1/3 w-64 h-64 bg-indigo-300/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-black text-white mb-8 leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            {t.footer.ctaBanner}
          </h2>
          <a
            href={STAGING_URL}
            className="inline-block bg-white text-blue-800 font-bold px-12 py-4 rounded-2xl hover:bg-blue-50 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-blue-900/30 text-lg"
          >
            {t.footer.ctaBtn}
          </a>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════════ */}
      <footer className="bg-slate-950 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Logo + links row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                <span className="text-white font-black text-sm">R</span>
              </div>
              <div>
                <div className="text-white font-black text-lg leading-none">{t.nav.logo}</div>
                <div className="text-slate-500 text-xs mt-0.5">{t.footer.tagline}</div>
              </div>
            </div>

            {/* Links */}
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {t.footer.links.map((link, i) =>
                link.href === '#contact' ? (
                  <button
                    key={i}
                    onClick={() => setShowContactModal(true)}
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </button>
                ) : (
                  <a
                    key={i}
                    href={link.href}
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </a>
                )
              )}
            </nav>
          </div>

          {/* Divider */}
          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-xs text-center sm:text-start">{t.footer.copy}</p>
            {/* "Back to top" */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-slate-500 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
            >
              ↑ &nbsp;{isAr ? 'العودة للأعلى' : 'Back to top'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

