'use client';

import { useState, useEffect, useRef } from 'react';
import {
  submitLead, validateLeadForm,
  type LeadSource, type ValidationErrors,
} from '@/lib/leads-service';

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
      business: 'Business / Company Name',
      subject: 'Subject',
      message: 'Message',
      send: 'Send Message',
      sending: 'Sending...',
      successTitle: 'Message Sent! 🎉',
      successSub: "Thank you! Our sales team will reach out within 24 hours.",
      subjects: ['General Inquiry', 'Technical Support', 'Sales', 'Partnership'],
      phonePlaceholder: '+966 5X XXX XXXX',
      namePlaceholder: 'Your full name',
      emailPlaceholder: 'you@company.com',
      businessPlaceholder: 'Your company name (optional)',
      messagePlaceholder: 'Tell us how we can help you...',
      errRequired: 'This field is required',
      errEmail: 'Please enter a valid email address',
      errPhone: 'Please enter a valid phone number',
    },
    demo: {
      badge: 'TRY DEMO',
      heading: 'Request a Live Demo',
      sub: 'See REMS in action — our team will set up a personalised walkthrough.',
      name: 'Full Name',
      email: 'Email Address',
      phone: 'Phone Number',
      business: 'Business / Company Name',
      message: 'Tell us about your portfolio',
      send: 'Request Demo →',
      sending: 'Sending...',
      successTitle: 'Demo Request Received! 🚀',
      successSub: "Thank you! Our sales team will reach out within 24 hours to schedule your personalised demo.",
      phonePlaceholder: '+966 5X XXX XXXX',
      namePlaceholder: 'Your full name',
      emailPlaceholder: 'you@company.com',
      businessPlaceholder: 'Property management company (optional)',
      messagePlaceholder: 'How many properties do you manage? What challenges are you facing?',
      errRequired: 'This field is required',
      errEmail: 'Please enter a valid email address',
      errPhone: 'Please enter a valid phone number',
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
      login: 'تسجيل الدخول', start: 'ابدأ الآن',
      about: 'من نحن', contact: 'تواصل معنا', terms: 'الشروط',
      demo: 'شاهد العرض',
    },
    hero: {
      badge: 'منصة المُلّاك السعوديين لإدارة محافظهم العقارية',
      h1a: 'اِربح من عقارك.',
      h1b: 'بثقة.',
      h1c: 'بأرقام لا تكذب.',
      sub: 'منصة واحدة تجمع حجوزاتك وقنوات التأجير ومدفوعاتك وفرق التشغيل في مكان واحد — مصمّمة لمالك العقار السعودي الذي يقدّر وقته وعائده.',
      cta: '← ابدأ تجربتك المجانية',
      ctaDemo: 'شاهد عرضاً مباشراً',
      ctaNote: '١٤ يوماً تجربة مجانية · دون الحاجة إلى بطاقة ائتمانية',
      stats: [
        { n: '+10,000', l: 'وحدة سكنية تحت الإدارة' },
        { n: '٣ منصات', l: 'ربط مباشر مع كبرى القنوات' },
        { n: '<500ms', l: 'زمن استجابة تأكيد الحجز' },
        { n: '99.9%', l: 'جاهزية المنصة على مدار العام' },
      ],
    },
    partners: { heading: 'ربط مباشر مع المنصات التي يعتمد عليها السوق السعودي' },
    features: {
      badge: 'لماذا ريمز',
      heading: 'ما تحتاجه فعلاً لإدارة عقاراتك. دون زوائد.',
      sub: 'منصة صُمّمت من قلب السوق السعودي — من توثيق العنوان الوطني إلى المزامنة الفورية مع قنوات التأجير المعتمدة.',
      cards: [
        { icon: 'location', color: 'blue',    title: 'عنوان وطني موثّق',           body: 'كل وحدة سكنية يتم التحقق منها مباشرة من العنوان الوطني التابع للبريد السعودي (SPL). إحداثيات GPS بدقة رسمية ورمز عنوان قصير معتمد (مثل RYYY1234) تعتمده الجهات الحكومية وشركات التوصيل.' },
        { icon: 'sync',     color: 'violet',  title: 'إدارة موحّدة لقنوات التأجير', body: 'ربط ثنائي الاتجاه وفوري مع بوكينج وإيرنبي وقذرن. تقويم واحد لجميع منصاتك، وتأكيد قاطع بصفر حجوزات متعارضة — بفضل محرك القفل الحصري الذي طوّرناه خصيصاً.' },
        { icon: 'payment',  color: 'emerald', title: 'تحصيل ذكي عبر ميسر',         body: 'مدى وفيزا وآبل باي وإس تي سي باي — جميع طرق الدفع المعتمدة في المملكة. فواتير ضريبية تُصدر آلياً متوافقة مع هيئة الزكاة والضريبة، ولوحة دخل مباشرة لكل وحدة.' },
        { icon: 'broom',    color: 'amber',   title: 'تشغيل وصيانة منظّم',         body: 'مهام التنظيف تُنشَأ تلقائياً بمجرد مغادرة الضيف. أسنِدها لفريقك الداخلي أو لمزودي خدمة خارجيين، وتابع التقدّم لحظة بلحظة على هاتفك.' },
        { icon: 'shield',   color: 'red',     title: 'حماية قاطعة من التعارض',     body: 'محرك القفل الحصري يضمن استحالة تأكيد حجزين متعارضين على نفس الوحدة، عبر جميع القنوات، في أقل من نصف ثانية. هذه أعلى درجة حماية متاحة اليوم في السوق السعودي.' },
        { icon: 'chart',    color: 'indigo',  title: 'تحليلات لقرارات أذكى',       body: 'تابع متوسط السعر اليومي (ADR) وعائد الغرفة المتاحة (RevPAR) ونسبة الإشغال وصافي الدخل — مفصّلة لكل قناة وكل وحدة، مع رسوم بيانية شهرية وموسمية.' },
      ],
    },
    about: {
      badge: 'قصتنا',
      heading: 'صُنعت لأصحاب العقارات في المملكة',
      act1Label: 'التحدّي',
      act1Title: 'إدارة عشر وحدات سكنية لا يجب أن تتحوّل إلى أزمة يومية.',
      act1Points: [
        'حجوزات متعارضة على القنوات تُفقدك سمعتك وتقييماتك',
        'مواقع غير موثّقة تُربك ضيوفك وتُؤخّر وصولهم',
        'مكالمات منتصف الليل، وجداول إكسل لا تنتهي، ودخل يضيع بين القنوات',
      ],
      act2Label: 'الإجابة',
      act2Title: 'هنا جاء دور ريمز — منصة بناها مَن يفهم السوق السعودي وتفاصيله',
      act2Points: [
        'تكامل رسمي مع العنوان الوطني SPL: مواقع دقيقة وموثّقة حكومياً',
        'مزامنة آنية مع بوكينج وإيرنبي وقذرن في أقل من نصف ثانية',
        'تشغيل تلقائي لفرق التنظيف فور مغادرة الضيف، دون تدخّل منك',
      ],
      act3Label: 'الرؤية',
      act3Title: 'هدفنا: أن يُدير كل مالك عقار سعودي محفظته بكفاءة المؤسسات الكبرى',
      act3Points: [
        'منصة واحدة تنمو معك من وحدة سكنية إلى خمسمئة وحدة',
        'متوائمة مع مستهدفات رؤية ٢٠٣٠: ثنائية اللغة، ممتثلة، ومتكاملة',
        'سعودية أولاً: مدى، إس تي سي باي، العنوان الوطني، وضريبة القيمة المضافة',
      ],
    },
    pricing: {
      badge: 'الباقات',
      heading: 'باقات واضحة. دون أرقام مخفية.',
      sub: 'ابدأ بتجربة مجانية، ثم اختر ما يناسب حجم محفظتك. تستطيع الإلغاء متى شئت.',
      sar: 'ريال', mo: '/شهر', popular: '✦ الأكثر اختياراً', cta: 'ابدأ بالخطة',
      plans: [
        { key: 'basic', name: 'الأساسية', price: 149, desc: 'للمُلّاك الأفراد',
          features: ['حتى ٥ وحدات سكنية', 'ربط مباشر مع بوكينج', 'توثيق العنوان الوطني', 'تقارير دخل ومصروفات', 'دعم بالبريد خلال ٤٨ ساعة'] },
        { key: 'pro', name: 'الاحترافية', price: 349, desc: 'للمحافظ المتنامية', popular: true,
          features: ['حتى ٢٥ وحدة سكنية', 'ربط مع القنوات الثلاث (بوكينج، إيرنبي، قذرن)', 'تحصيل مدفوعات عبر ميسر', 'تحليلات متقدمة وعائد الغرفة (RevPAR)', 'نظام تشغيل وصيانة كامل', 'دعم ذو أولوية خلال ٤ ساعات'] },
        { key: 'enterprise', name: 'المؤسسية', price: 799, desc: 'للشركات والوكالات العقارية',
          features: ['وحدات غير محدودة', 'جميع مزايا الباقة الاحترافية', 'مدير حساب مخصّص لك', 'تكاملات حسب احتياجك', 'اتفاقية مستوى خدمة ٩٩.٩٪', 'إمكانية العلامة التجارية الخاصة'] },
      ],
    },
    faq: {
      badge: 'الأسئلة الشائعة', heading: 'سؤال يدور في ذهنك؟', sub: 'إجابات مباشرة لما يهمّ مالك العقار قبل اتخاذ القرار.',
      items: [
        { q: 'كيف تمنع المنصة حدوث حجوزات متعارضة؟', a: 'اعتمدنا محرك قفل حصري يعالج تأكيدات الحجز عبر جميع القنوات في أقل من نصف ثانية. بمجرد تأكيد الحجز على أي منصة، تُقفل تلك التواريخ آنياً على بقية القنوات — دون أي تدخّل يدوي منك أو من فريقك.' },
        { q: 'هل عنوان وحداتي السكنية موثّق رسمياً؟', a: 'نعم. ريمز مرتبط مباشرة بواجهة العنوان الوطني التابعة للبريد السعودي (SPL). كل وحدة تحصل على إحداثيات GPS دقيقة ورمز عنوان قصير معتمد (مثل RYYY1234) تعترف به الجهات الحكومية وشركات الشحن والتوصيل.' },
        { q: 'ما طرق الدفع التي يدعمها النظام؟', a: 'عبر بوابة ميسر السعودية، يدعم ريمز: مدى، فيزا، ماستركارد، آبل باي، وإس تي سي باي — أي ما يغطي تفضيلات الدفع في السوق السعودي بالكامل. يصل ضيفك رابط دفع آمن، وتُودَع الأموال مباشرة في حسابك البنكي المحلي.' },
        { q: 'هل أستطيع إدارة وحدات تعود لعدة مُلّاك؟', a: 'بالتأكيد. الباقة المؤسسية تتيح إدارة عدد غير محدود من الوحدات مع عزل تام لبيانات كل مالك. لا تختلط بياناتهم، ولا يطّلع أحد على حساب الآخر، مع صلاحيات واضحة لكل مستخدم.' },
        { q: 'هل لديكم تطبيق للجوال؟', a: 'ريمز تطبيق ويب متقدّم (PWA) يعمل بسلاسة على أي جهاز — دون الحاجة لتحميله من متجر التطبيقات. فرق التشغيل والتنظيف يصلهم نظام مهام مُحسَّن للجوّال مباشرة عبر المتصفح.' },
        { q: 'ما مستويات الدعم المتاحة؟', a: 'الأساسية: دعم عبر البريد خلال ٤٨ ساعة. الاحترافية: أولوية في الرد خلال ٤ ساعات. المؤسسية: مدير حساب مخصّص يتابع معك مباشرة، مع تهيئة كاملة حسب طبيعة أعمالك.' },
      ],
    },
    contact: {
      badge: 'تواصل معنا',
      heading: 'يسعدنا تواصلك معنا',
      sub: 'لديك استفسار عن ريمز؟ فريقنا يردّ خلال ٢٤ ساعة عمل.',
      name: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      phone: 'رقم الجوال',
      business: 'اسم المنشأة',
      subject: 'موضوع التواصل',
      message: 'تفاصيل الرسالة',
      send: 'إرسال',
      sending: 'جارٍ الإرسال...',
      successTitle: 'شكراً لتواصلك',
      successSub: 'تم استلام رسالتك. سيتواصل معك أحد مختصّينا خلال ٢٤ ساعة عمل.',
      subjects: ['استفسار عام', 'دعم فنّي', 'مبيعات وأسعار', 'فرص شراكة'],
      phonePlaceholder: '+966 5X XXX XXXX',
      namePlaceholder: 'مثال: عبدالله بن محمد',
      emailPlaceholder: 'name@company.com',
      businessPlaceholder: 'اسم منشأتك (اختياري)',
      messagePlaceholder: 'اكتب لنا تفاصيل استفسارك أو طلبك...',
      errRequired: 'هذا الحقل مطلوب',
      errEmail: 'يرجى إدخال بريد إلكتروني صحيح',
      errPhone: 'يرجى إدخال رقم جوال صحيح',
    },
    demo: {
      badge: 'اطلب عرضاً',
      heading: 'احجز عرضاً مباشراً مع فريقنا',
      sub: 'دعنا نريك ريمز وهو يعمل على محفظة شبيهة بمحفظتك — جولة مخصّصة لاحتياجك.',
      name: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      phone: 'رقم الجوال',
      business: 'اسم المنشأة',
      message: 'حدّثنا عن محفظتك العقارية',
      send: '← اطلب العرض',
      sending: 'جارٍ الإرسال...',
      successTitle: 'تم استلام طلبك',
      successSub: 'شكراً لاهتمامك. سيتواصل معك مختصّ المبيعات خلال ٢٤ ساعة عمل لتحديد موعد العرض المناسب لك.',
      phonePlaceholder: '+966 5X XXX XXXX',
      namePlaceholder: 'مثال: عبدالله بن محمد',
      emailPlaceholder: 'name@company.com',
      businessPlaceholder: 'اسم شركة إدارة العقارات (اختياري)',
      messagePlaceholder: 'كم وحدة سكنية تدير؟ وما أبرز التحديات التي تواجهها اليوم؟',
      errRequired: 'هذا الحقل مطلوب',
      errEmail: 'يرجى إدخال بريد إلكتروني صحيح',
      errPhone: 'يرجى إدخال رقم جوال صحيح',
    },
    footer: {
      tagline: 'منصة المُلّاك السعوديين لإدارة عقاراتهم باحترافية.',
      ctaBanner: 'جاهز ترفع كفاءة محفظتك العقارية؟', ctaBtn: 'ابدأ تجربتك المجانية',
      links: [
        { label: 'من نحن', href: '#about' },
        { label: 'تواصل معنا', href: '#contact' },
        { label: 'الشروط والأحكام', href: TERMS_URL },
        { label: 'سياسة الخصوصية', href: '#' },
      ],
      copy: '© 2026 ريمز — نظام إدارة العقارات. جميع الحقوق محفوظة.',
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
// TESTIMONIALS
// ═══════════════════════════════════════════════════════════════════════════
const TESTIMONIALS = [
  {
    en: {
      quote: "REMS brought our double-booking rate to absolute zero. The OTA sync is genuinely under 500ms — I timed it myself.",
      name: "Ahmad Al-Rashidi", role: "Portfolio Owner · 15 units · Riyadh",
      initials: "AR", bg: '#1d4ed8',
    },
    ar: {
      quote: "قضى REMS على الحجوزات المزدوجة تماماً. مزامنة OTA أسرع من 500 مللي ثانية — قِستها بنفسي.",
      name: "أحمد الراشدي", role: "مالك محفظة · 15 وحدة · الرياض",
      initials: "أح", bg: '#1d4ed8',
    },
  },
  {
    en: {
      quote: "SPL address verification solved every guest location complaint we ever had. Worth the subscription for that alone.",
      name: "Noura Al-Qahtani", role: "Real Estate Agent · Jeddah",
      initials: "NQ", bg: '#059669',
    },
    ar: {
      quote: "التحقق من العنوان الوطني SPL حلّ كل شكاوى مواقع الضيوف لدينا. يستحق الاشتراك لهذا وحده.",
      name: "نورة القحطاني", role: "وكيلة عقارية · جدة",
      initials: "نق", bg: '#059669',
    },
  },
  {
    en: {
      quote: "Managing 32 properties across Mecca is now a one-person job. The auto-cleaning trigger saves 4 hours on every checkout day.",
      name: "Khaled Al-Ghamdi", role: "Property Manager · 32 units · Mecca",
      initials: "KG", bg: '#7c3aed',
    },
    ar: {
      quote: "إدارة 32 وحدة في مكة صارت عمل شخص واحد الآن. تشغيل التنظيف التلقائي يوفّر 4 ساعات في كل يوم مغادرة.",
      name: "خالد الغامدي", role: "مدير عقارات · 32 وحدة · مكة المكرمة",
      initials: "خغ", bg: '#7c3aed',
    },
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
// DASHBOARD MOCKUP — code-rendered product preview for hero
// ═══════════════════════════════════════════════════════════════════════════
function DashboardMockup() {
  const bars = [38, 55, 42, 68, 52, 78, 85, 63, 75, 58, 91, 71];
  return (
    <div className="relative select-none" style={{ direction: 'ltr' }}>
      {/* Main window */}
      <div style={{
        background: 'linear-gradient(160deg,#0d1526 0%,#111827 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 48px 96px -24px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.04)',
      }}>
        {/* Chrome bar */}
        <div style={{ background:'rgba(255,255,255,0.025)', borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'10px 14px', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ display:'flex', gap:5 }}>
            {['#ef4444','#f59e0b','#22c55e'].map((c,i)=>(
              <div key={i} style={{ width:9, height:9, borderRadius:'50%', background:c, opacity:0.7 }}/>
            ))}
          </div>
          <div style={{ flex:1, display:'flex', justifyContent:'center' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:6, padding:'2px 10px' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e' }}/>
              <span style={{ color:'#475569', fontSize:10, fontFamily:'monospace' }}>rems.app/dashboard</span>
            </div>
          </div>
        </div>
        {/* Dashboard content */}
        <div style={{ padding:16 }}>
          {/* KPI row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
            {[
              { l:'Revenue', v:'48,200', u:'SAR', d:'+12.4%' },
              { l:'Bookings', v:'124',   u:'',    d:'+8 / week' },
              { l:'Occupancy',v:'87%',  u:'',    d:'+3% MoM' },
            ].map((k,i)=>(
              <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'10px 11px' }}>
                <div style={{ color:'#475569', fontSize:9, fontWeight:700, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.1em' }}>{k.l}</div>
                <div style={{ color:'#f1f5f9', fontSize:14, fontWeight:800, lineHeight:1, marginBottom:5 }}>
                  {k.u && <span style={{ fontSize:9, color:'#64748b', marginRight:2 }}>{k.u}</span>}
                  {k.v}
                </div>
                <div style={{ color:'#4ade80', fontSize:9, fontWeight:600 }}>&#8593; {k.d}</div>
              </div>
            ))}
          </div>
          {/* Chart */}
          <div style={{ background:'rgba(255,255,255,0.015)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12, padding:'12px 12px 8px', marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ color:'#94a3b8', fontSize:11, fontWeight:600 }}>Revenue Trend</span>
              <span style={{ background:'rgba(59,130,246,0.12)', color:'#60a5fa', fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:4 }}>2026</span>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:56 }}>
              {bars.map((h,i)=>(
                <div key={i} style={{ flex:1, height:`${h}%`, background: i===10 ? 'linear-gradient(to top,#3b82f6,#818cf8)' : 'rgba(99,102,241,0.2)', borderRadius:'3px 3px 0 0' }}/>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
              {['J','F','M','A','M','J','J','A','S','O','N','D'].map((m,i)=>(
                <span key={i} style={{ color:'#334155', fontSize:8 }}>{m}</span>
              ))}
            </div>
          </div>
          {/* Channel status */}
          <div style={{ display:'flex', gap:7 }}>
            {[
              { color:'#22c55e', label:'Booking.com' },
              { color:'#f87171', label:'Airbnb' },
              { color:'#34d399', label:'Gathern' },
            ].map((ch,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:6, padding:'4px 9px', flex:1 }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:ch.color, boxShadow:`0 0 6px ${ch.color}` }}/>
                <span style={{ color:'#64748b', fontSize:8.5, fontWeight:600, whiteSpace:'nowrap' }}>{ch.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Floating — overlap blocked */}
      <div style={{
        position:'absolute', bottom:-22, right:-14,
        background:'linear-gradient(135deg,#065f46,#047857)',
        borderRadius:12, padding:'10px 14px',
        boxShadow:'0 16px 40px -8px rgba(5,150,105,0.5)',
        border:'1px solid rgba(255,255,255,0.12)',
        animation:'floatY 6s ease-in-out infinite',
        minWidth:168, zIndex:10,
      }}>
        <div style={{ color:'rgba(255,255,255,0.55)', fontSize:9.5, marginBottom:3 }}>&#128274; Double-booking blocked</div>
        <div style={{ color:'white', fontWeight:800, fontSize:12 }}>Saved SAR 2,400</div>
        <div style={{ color:'rgba(255,255,255,0.45)', fontSize:9, marginTop:2 }}>423ms · Booking.com</div>
      </div>
      {/* Floating — sync */}
      <div style={{
        position:'absolute', top:36, left:-18,
        background:'rgba(10,16,30,0.96)',
        backdropFilter:'blur(12px)',
        borderRadius:10, padding:'9px 12px',
        border:'1px solid rgba(99,102,241,0.3)',
        boxShadow:'0 8px 28px rgba(0,0,0,0.5)',
        animation:'floatY 7s ease-in-out 1.2s infinite',
        minWidth:132, zIndex:10,
      }}>
        <div style={{ color:'#818cf8', fontSize:10, fontWeight:700, marginBottom:4 }}>&#9889; Live Sync</div>
        <div style={{ display:'flex', gap:4, marginBottom:4 }}>
          {['#003580','#ff385c','#00a651'].map((c,i)=>(
            <div key={i} style={{ width:14, height:14, borderRadius:3, background:c }}/>
          ))}
        </div>
        <div style={{ color:'#475569', fontSize:9 }}>3 channels updated</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PARTNER CHIP — real brand logo with graceful fallback
// ═══════════════════════════════════════════════════════════════════════════
function PartnerChip({ name, logoUrl, fallbackBg, fallbackFg, fallbackText }: typeof PARTNER_LIST[0]) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <div
      className="partner-logo-card flex items-center gap-2.5 px-4 py-3 rounded-xl select-none"
      style={{
        background: imgFailed ? fallbackBg : 'rgba(255,255,255,0.05)',
        border: imgFailed ? '1px solid transparent' : '1px solid rgba(255,255,255,0.1)',
        direction: 'ltr',
      }}
    >
      {!imgFailed ? (
        <img
          src={logoUrl}
          alt={name}
          width={24}
          height={24}
          className="object-contain rounded-sm"
          onError={() => setImgFailed(true)}
          style={{ filter:'brightness(0) invert(1) opacity(0.8)' }}
        />
      ) : (
        <span
          className="font-black text-sm leading-none w-6 text-center"
          style={{ fontFamily:'Arial Black,sans-serif', color:fallbackFg }}
        >
          {fallbackText}
        </span>
      )}
      <span
        className="text-sm font-semibold"
        style={{ color: imgFailed ? fallbackFg : 'rgba(255,255,255,0.65)' }}
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
// ═══════════════════════════════════════════════════════════════════════════
// SHARED LEAD FORM — used by both ContactSection and DemoRequestModal
// ═══════════════════════════════════════════════════════════════════════════
interface FormContent {
  badge: string; heading: string; sub: string;
  name: string; email: string; phone: string; business: string; message: string;
  send: string; sending: string; successTitle: string; successSub: string;
  namePlaceholder: string; emailPlaceholder: string; phonePlaceholder: string;
  businessPlaceholder: string; messagePlaceholder: string;
  errRequired: string; errEmail: string; errPhone: string;
}

interface LeadFormState {
  name: string; email: string; phone: string; business: string; message: string;
}

const EMPTY_FORM: LeadFormState = { name: '', email: '', phone: '', business: '', message: '' };

function LeadCaptureForm({
  c, isAr, source, accentClass = 'focus:border-indigo-500',
}: {
  c: FormContent;
  isAr: boolean;
  source: LeadSource;
  accentClass?: string;
}) {
  const [form, setForm] = useState<LeadFormState>(EMPTY_FORM);
  const [touched, setTouched] = useState<Partial<Record<keyof LeadFormState, boolean>>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // Per-channel results from submitLead are kept in state for potential
  // diagnostics but never rendered — users only see a clean thank-you.
  const [, setChannels] = useState<{ email: boolean; sheets: boolean; supabase: boolean } | null>(null);

  const errors: ValidationErrors = validateLeadForm(form);
  const hasErrors = Object.keys(errors).length > 0;

  const fieldErr = (field: keyof ValidationErrors) =>
    touched[field] && errors[field] ? errors[field] : undefined;

  const inputCls = (field: keyof ValidationErrors) =>
    `contact-input w-full bg-slate-800 border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-all ${accentClass} ${
      fieldErr(field) ? 'border-red-500 ring-1 ring-red-500/40' : 'border-slate-700'
    }`;

  const LABEL_CLS = 'block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: !!form.phone || undefined });
    if (hasErrors) return;
    setSending(true);
    try {
      const result = await submitLead(form, source);
      setChannels(result.channels);
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  const reset = () => { setSent(false); setForm(EMPTY_FORM); setTouched({}); setChannels(null); };

  if (sent) {
    // User-facing thank-you screen.
    // The per-channel { email, sheets, supabase } status from submitLead is
    // captured in `channels` state (for diagnostics) but NEVER rendered to
    // end users — only a clean, professional confirmation is shown.
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ animation: 'fadeInUp 0.4s ease-out both' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-2xl font-black text-white mb-3">
          {isAr ? 'شكرًا لتواصلك' : 'Thank you'}
        </h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          {isAr ? 'سنعاود الاتصال بك قريبًا.' : "We'll get back to you shortly."}
        </p>
        <button onClick={reset}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors">
          {isAr ? 'إرسال رسالة أخرى' : 'Send Another Message'}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-2xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        {/* Name */}
        <div>
          <label className={LABEL_CLS}>{c.name} <span className="text-red-400">*</span></label>
          <input type="text" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onBlur={() => setTouched(t => ({ ...t, name: true }))}
            placeholder={c.namePlaceholder} className={inputCls('name')} />
          {fieldErr('name') && <p className="mt-1 text-xs text-red-400">{c.errRequired}</p>}
        </div>
        {/* Email */}
        <div>
          <label className={LABEL_CLS}>{c.email} <span className="text-red-400">*</span></label>
          <input type="email" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            onBlur={() => setTouched(t => ({ ...t, email: true }))}
            placeholder={c.emailPlaceholder} className={inputCls('email')} style={{ direction: 'ltr' }} />
          {fieldErr('email') === 'required' && <p className="mt-1 text-xs text-red-400">{c.errRequired}</p>}
          {fieldErr('email') === 'invalid'  && <p className="mt-1 text-xs text-red-400">{c.errEmail}</p>}
        </div>
        {/* Phone */}
        <div>
          <label className={LABEL_CLS}>{c.phone}</label>
          <input type="tel" value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            onBlur={() => setTouched(t => ({ ...t, phone: true }))}
            placeholder={c.phonePlaceholder} className={inputCls('phone')} style={{ direction: 'ltr' }} />
          {fieldErr('phone') && <p className="mt-1 text-xs text-red-400">{c.errPhone}</p>}
        </div>
        {/* Business */}
        <div>
          <label className={LABEL_CLS}>{c.business}</label>
          <input type="text" value={form.business}
            onChange={e => setForm(f => ({ ...f, business: e.target.value }))}
            placeholder={c.businessPlaceholder} className="contact-input w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all" />
        </div>
      </div>
      {/* Message */}
      <div className="mb-6">
        <label className={LABEL_CLS}>{c.message}</label>
        <textarea rows={4} value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          placeholder={c.messagePlaceholder}
          className="contact-input w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all resize-none" />
      </div>
      <button type="submit" disabled={sending}
        className="w-full py-4 rounded-xl text-white font-bold text-base transition-all hover:opacity-90 disabled:opacity-60 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
        {sending ? (
          <>
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            {c.sending}
          </>
        ) : c.send}
      </button>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT SECTION (in-page, dark-bg)
// ═══════════════════════════════════════════════════════════════════════════
function ContactSection({ t, isAr }: { t: typeof T['en'] | typeof T['ar']; isAr: boolean }) {
  return <LeadCaptureForm c={t.contact} isAr={isAr} source="contact" />;
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED MODAL SHELL
// ═══════════════════════════════════════════════════════════════════════════
function LeadModal({
  badge, heading, sub, badgeCls, onClose, children,
}: {
  badge: string; heading: string; sub: string;
  badgeCls?: string; onClose: () => void; children: React.ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" />
      <div
        className="relative bg-slate-800 border border-slate-700/60 rounded-3xl p-8 sm:p-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'fadeInUp 0.25s ease-out both' }}
      >
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-[0.15em] mb-3 border ${badgeCls ?? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20'}`}>
              {badge}
            </span>
            <h2 className="font-black text-white text-2xl leading-tight">{heading}</h2>
            <p className="text-slate-400 text-sm mt-1">{sub}</p>
          </div>
          <button onClick={onClose}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition-all font-bold text-base"
            aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT MODAL
// ═══════════════════════════════════════════════════════════════════════════
function ContactModal({ t, isAr, onClose }: { t: typeof T['en'] | typeof T['ar']; isAr: boolean; onClose: () => void }) {
  const c = t.contact;
  return (
    <LeadModal badge={c.badge} heading={c.heading} sub={c.sub} onClose={onClose}>
      <LeadCaptureForm c={c} isAr={isAr} source="contact" />
    </LeadModal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DEMO REQUEST MODAL
// ═══════════════════════════════════════════════════════════════════════════
function DemoRequestModal({ t, isAr, onClose }: { t: typeof T['en'] | typeof T['ar']; isAr: boolean; onClose: () => void }) {
  const c = t.demo;
  return (
    <LeadModal
      badge={c.badge} heading={c.heading} sub={c.sub}
      badgeCls="bg-blue-500/15 text-blue-400 border-blue-500/20"
      onClose={onClose}
    >
      <LeadCaptureForm c={c} isAr={isAr} source="demo" accentClass="focus:border-blue-500" />
    </LeadModal>
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
  const [showDemoModal,    setShowDemoModal]    = useState(false);

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
    <div className="landing-scroll" style={{ fontFamily: isAr ? "'Cairo', 'Segoe UI', sans-serif" : "'Inter', 'Segoe UI', sans-serif" }}>

      {/* Modals */}
      {showContactModal && (
        <ContactModal t={t} isAr={isAr} onClose={() => setShowContactModal(false)} />
      )}
      {showDemoModal && (
        <DemoRequestModal t={t} isAr={isAr} onClose={() => setShowDemoModal(false)} />
      )}

      {/* ── Premium Design System ───────────────────────────────────────── */}
      <style>{`
        /* ── Keyframes ── */
        @keyframes floatY {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-12px); }
        }
        @keyframes fadeInUp {
          from { opacity:0; transform:translateY(24px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes gradientShift {
          0%,100% { background-position:0% 50%; }
          50%      { background-position:100% 50%; }
        }
        @keyframes pulse-glow {
          0%,100% { box-shadow:0 0 0 0 rgba(59,130,246,0.4); }
          50%      { box-shadow:0 0 0 8px rgba(59,130,246,0); }
        }
        @keyframes slideRight {
          from { opacity:0; transform:translateX(-16px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes ticker {
          0%   { transform:translateX(0); }
          100% { transform:translateX(-50%); }
        }

        /* ── Entrance animations ── */
        .fade-in-0 { animation:fadeInUp 0.65s cubic-bezier(0.16,1,0.3,1) 0.0s both; }
        .fade-in-1 { animation:fadeInUp 0.65s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .fade-in-2 { animation:fadeInUp 0.65s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
        .fade-in-3 { animation:fadeInUp 0.65s cubic-bezier(0.16,1,0.3,1) 0.3s both; }
        .fade-in-4 { animation:fadeInUp 0.65s cubic-bezier(0.16,1,0.3,1) 0.5s both; }
        .slide-right { animation:slideRight 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both; }

        /* ── Background patterns ── */
        .hero-grid {
          background-image:
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59,130,246,0.12), transparent),
            linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px);
          background-size: auto, 48px 48px, 48px 48px;
        }

        /* ── Primary CTA button — clean, no shimmer ── */
        .primary-btn {
          background: linear-gradient(135deg,#2563eb,#4f46e5);
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 4px 24px -4px rgba(37,99,235,0.5), inset 0 1px 0 rgba(255,255,255,0.15);
        }
        .primary-btn:hover {
          background: linear-gradient(135deg,#1d4ed8,#4338ca);
          box-shadow: 0 8px 32px -4px rgba(37,99,235,0.65), inset 0 1px 0 rgba(255,255,255,0.15);
          transform: translateY(-1px);
        }
        .primary-btn:active { transform:translateY(0); }

        /* ── Ghost button ── */
        .ghost-btn {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.12);
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .ghost-btn:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.2);
          transform: translateY(-1px);
        }

        /* ── Gradient text ── */
        .grad-text {
          background: linear-gradient(135deg,#93c5fd 0%,#a5b4fc 50%,#6ee7b7 100%);
          background-size:200% 200%;
          animation:gradientShift 5s ease infinite;
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          background-clip:text;
        }
        .gold-text {
          background: linear-gradient(135deg,#fbbf24 0%,#f59e0b 50%,#d97706 100%);
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          background-clip:text;
        }

        /* ── Feature cards ── */
        .feature-card {
          transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s cubic-bezier(0.16,1,0.3,1), border-color 0.25s;
          position: relative;
          overflow: hidden;
        }
        .feature-card::before {
          content:'';
          position:absolute;
          inset:0;
          background:linear-gradient(135deg,rgba(255,255,255,0.03),transparent);
          pointer-events:none;
        }
        .feature-card:hover {
          transform:translateY(-6px);
          box-shadow:0 20px 48px -12px rgba(0,0,0,0.18);
          border-color:rgba(148,163,184,0.25) !important;
        }

        /* ── Testimonial card ── */
        .testi-card {
          transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s;
        }
        .testi-card:hover { transform:translateY(-4px); box-shadow:0 16px 40px -8px rgba(0,0,0,0.18); }

        /* ── Story card ── */
        .story-card { transition:transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s; }
        .story-card:hover { transform:translateY(-5px); box-shadow:0 16px 36px rgba(0,0,0,0.18); }

        /* ── Pricing popular ── */
        .price-popular {
          background:linear-gradient(145deg,#1d4ed8 0%,#3730a3 60%,#1e3a8a 100%);
          box-shadow:0 32px 64px -16px rgba(37,99,235,0.5);
        }

        /* ── Partner logo card ── */
        .partner-logo-card {
          transition:transform 0.2s, box-shadow 0.2s;
        }
        .partner-logo-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,0.12); }

        /* ── Misc ── */
        .faq-body { overflow:hidden; transition:max-height 0.35s ease,opacity 0.35s ease; }
        .contact-input:focus { box-shadow:0 0 0 3px rgba(99,102,241,0.25); }
        .cta-bg { background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 45%,#4338ca 100%); }
        .nav-scrolled { background:rgba(10,15,28,0.95); backdrop-filter:blur(20px); box-shadow:0 1px 0 rgba(255,255,255,0.05); }
        html.dark .feature-card { background:#1e293b; border-color:#334155; }
        html.dark .faq-item { background:#1e293b; border-color:#334155; }
        html.dark .faq-btn { background:#1e293b; }
        html.dark .faq-btn:hover { background:#273344; }

        /* ── Ticker (kept for potential use) ── */
        .ticker-wrap { overflow:hidden; mask-image:linear-gradient(to right,transparent,black 10%,black 90%,transparent); }
        .ticker-inner { display:flex; animation:ticker 36s linear infinite; width:max-content; }
        .ticker-inner:hover { animation-play-state:paused; }
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

            {/* Demo → demo request modal */}
            <button
              onClick={() => setShowDemoModal(true)}
              className="h-9 px-4 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 hover:text-white text-sm font-medium transition-all hidden sm:flex items-center gap-1.5"
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
              className="primary-btn h-9 px-5 rounded-xl text-white text-sm font-bold flex items-center"
            >
              {t.nav.start}
            </a>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO — Split layout with dashboard preview
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-slate-950 hero-grid pt-16">

        {/* Subtle radial spotlight */}
        <div className="pointer-events-none absolute inset-0" style={{ background:'radial-gradient(ellipse 60% 50% at 60% 40%,rgba(37,99,235,0.07),transparent 70%)' }} />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-12">

            {/* ── LEFT: Text column ── */}
            <div className={`flex-1 ${isAr ? 'lg:order-2 text-end' : 'lg:order-1 text-start'} text-center lg:text-start`}
              style={{ textAlign: isAr ? 'right' : 'left' }}>

              {/* Eyebrow badge */}
              <div className="fade-in-0 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full mb-8"
                style={{ background:'rgba(37,99,235,0.08)', border:'1px solid rgba(37,99,235,0.2)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
                <span className="text-blue-400 text-xs font-semibold tracking-wide">🇸🇦 &nbsp;{t.hero.badge}</span>
              </div>

              {/* Headline */}
              <h1 className="fade-in-1 font-black text-white leading-[1.08] mb-6 tracking-tight"
                style={{ fontSize:'clamp(2.6rem,5.5vw,4.5rem)' }}>
                {t.hero.h1a}
                <span className="block grad-text">{t.hero.h1b}</span>
                <span className="block text-slate-400 font-semibold mt-2" style={{ fontSize:'clamp(1.1rem,2.5vw,1.6rem)', letterSpacing:'0.02em' }}>
                  {t.hero.h1c}
                </span>
              </h1>

              {/* Sub */}
              <p className="fade-in-2 text-slate-400 max-w-xl mb-10 leading-relaxed"
                style={{ fontSize:'clamp(1rem,1.8vw,1.15rem)' }}>
                {t.hero.sub}
              </p>

              {/* CTAs */}
              <div className="fade-in-3 flex flex-col sm:flex-row items-center lg:items-start gap-3 mb-10"
                style={{ justifyContent: isAr ? 'flex-end' : 'flex-start' }}>
                <a href={STAGING_URL}
                  className="primary-btn text-white font-bold px-8 py-3.5 rounded-xl text-base"
                  style={{ display:'inline-block' }}>
                  {t.hero.cta}
                </a>
                <button onClick={() => setShowDemoModal(true)}
                  className="ghost-btn text-slate-300 hover:text-white font-semibold px-7 py-3.5 rounded-xl text-base"
                  style={{ cursor:'pointer' }}>
                  {t.hero.ctaDemo}
                </button>
              </div>
              <p className="fade-in-3 text-slate-600 text-xs mb-12 tracking-wide">{t.hero.ctaNote}</p>

              {/* Stats row */}
              <div className="fade-in-4 grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8"
                style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                {t.hero.stats.map((s, i) => (
                  <div key={i} className={isAr ? 'text-end' : ''}>
                    <div className="font-black text-white leading-none mb-1.5"
                      style={{ fontSize:'clamp(1.4rem,2.5vw,1.9rem)', direction:'ltr', display:'inline-block' }}>
                      {s.n}
                    </div>
                    <div className="text-slate-500 text-xs font-medium">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT: Dashboard mockup ── */}
            <div className={`flex-1 w-full max-w-lg mx-auto lg:mx-0 slide-right ${isAr ? 'lg:order-1' : 'lg:order-2'}`}
              style={{ paddingBottom:32, paddingTop:8 }}>
              <DashboardMockup />
            </div>

          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
      </section>

            {/* ═══════════════════════════════════════════════════════════════════
          PARTNERS — Static premium logo grid
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-slate-950" style={{ borderTop:'1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <p className="text-center text-slate-600 text-xs font-bold uppercase tracking-[0.22em] mb-10">
            {t.partners.heading}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3" style={{ direction:'ltr' }}>
            {PARTNER_LIST.map((p, i) => (
              <PartnerChip key={i} {...p} />
            ))}
          </div>
        </div>
      </section>

            {/* ═══════════════════════════════════════════════════════════════════
          STATS SHOWCASE — standalone impact strip
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-900" style={{ borderTop:'1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1">
            {[
              { n:'10,000+', label: isAr ? 'عقار تحت الإدارة' : 'Properties Managed', accent:'#3b82f6' },
              { n:'<500ms',  label: isAr ? 'سرعة مزامنة الحجوزات' : 'Booking Sync Speed', accent:'#a78bfa' },
              { n:'99.9%',   label: isAr ? 'وقت تشغيل المنصة' : 'Platform Uptime', accent:'#34d399' },
              { n:'0',       label: isAr ? 'حجوزات مزدوجة منذ الإطلاق' : 'Double-Bookings Since Launch', accent:'#fbbf24' },
            ].map((s, i) => (
              <div key={i} className="text-center py-10 px-4 relative"
                style={{ borderRight: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div className="font-black text-white leading-none mb-3"
                  style={{ fontSize:'clamp(2rem,4vw,3rem)', direction:'ltr', color: s.accent }}>
                  {s.n}
                </div>
                <div className="text-slate-500 text-sm font-medium leading-snug max-w-[120px] mx-auto">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

            {/* ═══════════════════════════════════════════════════════════════════
          FEATURES
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section header */}
          <div className="text-center mb-16 sm:mb-20">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.15em] mb-5"
              style={{ background:'rgba(37,99,235,0.07)', color:'#2563eb', border:'1px solid rgba(37,99,235,0.15)' }}>
              {t.features.badge}
            </span>
            <h2 className="font-black text-slate-900 mb-5 leading-[1.1] tracking-tight"
              style={{ fontSize:'clamp(2rem,4vw,3rem)' }}>
              {t.features.heading}
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
              {t.features.sub}
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {t.features.cards.map((card, i) => {
              const c = colorMap[card.color];
              const accentColors: Record<string, string> = {
                blue:'#2563eb', violet:'#7c3aed', emerald:'#059669',
                amber:'#d97706', red:'#dc2626', indigo:'#4f46e5',
              };
              const accent = accentColors[card.color] || '#2563eb';
              return (
                <div key={i} className="feature-card p-7 rounded-2xl cursor-default"
                  style={{
                    background:'#fafafa',
                    border:'1px solid rgba(0,0,0,0.06)',
                    borderTop:`3px solid ${accent}`,
                  }}>
                  {/* Icon + number */}
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-11 h-11 rounded-xl ${c.bg} ${c.icon} flex items-center justify-center`}>
                      <FeatureIcon icon={card.icon} />
                    </div>
                    <span className="text-3xl font-black leading-none"
                      style={{ color:'rgba(0,0,0,0.06)', fontVariantNumeric:'tabular-nums' }}>
                      {String(i+1).padStart(2,'0')}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug">{card.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{card.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          TESTIMONIALS — Social proof
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 bg-slate-950" style={{ borderTop:'1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.15em] mb-5"
              style={{ background:'rgba(255,255,255,0.04)', color:'#94a3b8', border:'1px solid rgba(255,255,255,0.08)' }}>
              {isAr ? 'آراء العملاء' : 'What Clients Say'}
            </span>
            <h2 className="font-black text-white leading-[1.1] tracking-tight"
              style={{ fontSize:'clamp(1.8rem,3.5vw,2.6rem)' }}>
              {isAr ? 'يثق بنا ملاك العقارات في كل مكان' : 'Trusted by Property Owners Across Saudi Arabia'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testi, i) => {
              const d = isAr ? testi.ar : testi.en;
              return (
                <div key={i} className="testi-card rounded-2xl p-7"
                  style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-5" style={{ direction:'ltr' }}>
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    ))}
                  </div>
                  {/* Quote */}
                  <p className="text-slate-300 text-sm leading-relaxed mb-6">&ldquo;{d.quote}&rdquo;</p>
                  {/* Author */}
                  <div className="flex items-center gap-3" style={{ direction:'ltr' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                      style={{ background: d.bg }}>
                      {d.initials}
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">{d.name}</div>
                      <div className="text-slate-500 text-xs">{d.role}</div>
                    </div>
                  </div>
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
                      className={`block text-center font-bold py-3 rounded-xl transition-all hover:opacity-90 active:scale-95 ${
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
      <section className="relative overflow-hidden py-24 sm:py-28"
        style={{ background:'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage:'radial-gradient(ellipse 70% 60% at 50% 50%,rgba(79,70,229,0.15),transparent)' }}/>
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-bold uppercase tracking-wider"
            style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#a5b4fc' }}>
            {isAr ? 'ابدأ مجاناً اليوم' : 'Start free today'}
          </div>
          <h2 className="font-black text-white mb-4 leading-[1.1] tracking-tight"
            style={{ fontSize:'clamp(2rem,4vw,3rem)' }}>
            {t.footer.ctaBanner}
          </h2>
          <p className="text-slate-400 mb-10 text-lg">
            {isAr ? 'تجربة مجانية 14 يوماً · بدون بطاقة ائتمانية · إلغاء في أي وقت' : '14-day free trial · No credit card · Cancel anytime'}
          </p>
          <a href={STAGING_URL}
            className="primary-btn inline-flex items-center gap-2 text-white font-bold px-10 py-4 rounded-xl text-lg"
            style={{ textDecoration:'none' }}>
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

