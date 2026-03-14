'use client';

import { useState, useEffect } from 'react';

const LANDING_URL = '/REMS/landing/';

const T = {
  en: {
    dir: 'ltr' as const,
    nav: { logo: 'REMS', tagline: 'Property Management', back: '← Back to Home' },
    title: 'Terms of Service',
    updated: 'Last updated: March 14, 2026',
    sections: [
      {
        heading: '1. Acceptance of Terms',
        body: 'By accessing or using the REMS Real Estate Management System ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service. These terms apply to all users, including property owners, managers, and administrators.',
      },
      {
        heading: '2. Description of Service',
        body: 'REMS is a cloud-based property management platform designed for Saudi property owners. The Service includes booking management, OTA channel synchronisation (Booking.com, Airbnb, Gathern), cleaning workflow automation, financial reporting, and SPL National Address integration. Features may vary by subscription plan.',
      },
      {
        heading: '3. User Accounts and Registration',
        body: 'You must provide accurate, current, and complete information during registration. You are responsible for safeguarding your account credentials and for all activities that occur under your account. REMS reserves the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity.',
      },
      {
        heading: '4. Subscription Plans and Payment',
        body: 'REMS offers three subscription tiers: Basic (SAR 149/month), Pro (SAR 349/month), and Enterprise (SAR 799/month). All plans include a 14-day free trial. Subscriptions are billed monthly. Payments are processed in Saudi Riyals (SAR). VAT (15%) is applied in accordance with Saudi tax regulations. Refunds are not issued for partial billing periods.',
      },
      {
        heading: '5. Promo Codes',
        body: 'Promotional codes may be applied at checkout to reduce the subscription price. Each code is subject to its own validity period, maximum usage limit, and discount percentage. Codes cannot be combined, transferred, or applied retroactively. REMS reserves the right to deactivate codes that are misused.',
      },
      {
        heading: '6. Data and Privacy',
        body: 'REMS stores property data, booking records, guest information, and financial reports on your behalf. Demo and staging environments use session-scoped or isolated storage to prevent data leakage between users. You retain ownership of your data. REMS will not sell or share your data with third parties except as required by Saudi law or to operate the Service (e.g., syncing with OTA partners).',
      },
      {
        heading: '7. OTA Channel Integrations',
        body: 'REMS integrates with third-party OTA platforms (Booking.com, Airbnb, Gathern). You are responsible for maintaining valid credentials and compliance with each platform\'s own terms. REMS is not liable for data discrepancies, booking conflicts, or policy violations that originate from third-party OTA platforms.',
      },
      {
        heading: '8. SPL National Address',
        body: 'REMS supports integration with the Saudi Post (SPL) National Address API for GPS-verified property locations. You are responsible for obtaining a valid SPL API key. REMS stores your API key locally in your browser and does not transmit it to REMS servers.',
      },
      {
        heading: '9. Acceptable Use',
        body: 'You agree not to: (a) use the Service for any unlawful purpose; (b) attempt to reverse-engineer, decompile, or extract source code; (c) use the Service to store or transmit malicious code; (d) circumvent any authentication or access control mechanisms; (e) resell or sublicense the Service without written consent from REMS.',
      },
      {
        heading: '10. Service Availability',
        body: 'REMS targets 99.5% monthly uptime but does not guarantee uninterrupted availability. Scheduled maintenance windows will be communicated in advance where possible. REMS is not liable for losses arising from downtime, data sync delays, or third-party API failures.',
      },
      {
        heading: '11. Limitation of Liability',
        body: 'To the maximum extent permitted by Saudi law, REMS\'s total liability to you for any claim arising out of or relating to these terms or the Service shall not exceed the amount you paid for the Service in the three months preceding the claim. REMS is not liable for indirect, incidental, or consequential damages.',
      },
      {
        heading: '12. Modifications to Terms',
        body: 'REMS may update these Terms of Service at any time. Material changes will be communicated via email or in-app notification at least 14 days before they take effect. Continued use of the Service after the effective date constitutes acceptance of the updated terms.',
      },
      {
        heading: '13. Governing Law',
        body: 'These terms are governed by the laws of the Kingdom of Saudi Arabia. Any disputes shall be subject to the exclusive jurisdiction of the competent courts in Riyadh, Saudi Arabia.',
      },
      {
        heading: '14. Contact',
        body: 'For questions about these Terms of Service, contact us via the Contact form on the REMS landing page or email legal@rems.sa.',
      },
    ],
  },
  ar: {
    dir: 'rtl' as const,
    nav: { logo: 'REMS', tagline: 'إدارة العقارات', back: 'العودة إلى الرئيسية ←' },
    title: 'شروط الخدمة',
    updated: 'آخر تحديث: ١٤ مارس ٢٠٢٦',
    sections: [
      {
        heading: '١. قبول الشروط',
        body: 'باستخدامك لنظام REMS لإدارة العقارات ("الخدمة")، فإنك توافق على الالتزام بهذه الشروط. إذا كنت لا توافق عليها، يُرجى التوقف عن استخدام الخدمة. تسري هذه الشروط على جميع المستخدمين بما فيهم ملاك العقارات والمديرون والمشرفون.',
      },
      {
        heading: '٢. وصف الخدمة',
        body: 'REMS منصة إدارة عقارات سحابية مصممة لأصحاب العقارات السعوديين. تشمل الخدمة: إدارة الحجوزات، ومزامنة قنوات OTA (Booking.com وAirbnb وGathern)، وأتمتة سير عمل التنظيف، والتقارير المالية، وتكامل العنوان الوطني SPL. قد تتفاوت الميزات بحسب خطة الاشتراك.',
      },
      {
        heading: '٣. الحسابات والتسجيل',
        body: 'يجب تقديم معلومات دقيقة وكاملة عند التسجيل. أنت مسؤول عن حماية بيانات حسابك وعن جميع الأنشطة التي تجري من خلاله. يحق لـ REMS تعليق الحسابات التي تنتهك هذه الشروط أو تمارس أي نشاط احتيالي.',
      },
      {
        heading: '٤. خطط الاشتراك والدفع',
        body: 'يقدم REMS ثلاث خطط: الأساسية (١٤٩ ريال/شهر)، الاحترافية (٣٤٩ ريال/شهر)، والمؤسسية (٧٩٩ ريال/شهر). تشمل جميع الخطط تجربة مجانية لمدة ١٤ يوماً. تُفوتر الاشتراكات شهرياً بالريال السعودي، وتُطبَّق ضريبة القيمة المضافة (١٥٪) وفقاً للأنظمة الضريبية السعودية. لا تُستردّ الرسوم عن أجزاء الفترة المنقضية.',
      },
      {
        heading: '٥. رموز الترويج',
        body: 'يمكن تطبيق رموز الترويج عند الدفع للحصول على خصم على سعر الاشتراك. يخضع كل رمز لفترة صلاحية وحد استخدام ونسبة خصم خاصة به. لا يمكن دمج الرموز أو نقلها أو تطبيقها بأثر رجعي. يحق لـ REMS إلغاء الرموز في حالة إساءة الاستخدام.',
      },
      {
        heading: '٦. البيانات والخصوصية',
        body: 'يخزّن REMS بيانات عقاراتك وسجلات الحجوزات ومعلومات الضيوف والتقارير المالية نيابةً عنك. تستخدم بيئات العرض التجريبي والاختبار تخزيناً معزولاً لمنع تسريب البيانات بين المستخدمين. تحتفظ بملكية بياناتك ولن يقوم REMS ببيعها أو مشاركتها إلا بما تقتضيه أنظمة المملكة أو لتشغيل الخدمة.',
      },
      {
        heading: '٧. تكاملات قنوات OTA',
        body: 'يتكامل REMS مع منصات OTA الخارجية (Booking.com وAirbnb وGathern). أنت مسؤول عن الحفاظ على صحة بياناتك والامتثال لشروط كل منصة. لا يتحمل REMS المسؤولية عن تعارضات البيانات أو الحجوزات المتداخلة الناجمة عن هذه المنصات.',
      },
      {
        heading: '٨. العنوان الوطني SPL',
        body: 'يدعم REMS التكامل مع واجهة برمجة العنوان الوطني السعودي (SPL) للتحقق من مواقع العقارات بنظام GPS. أنت مسؤول عن الحصول على مفتاح API صالح. يُخزَّن مفتاح API محلياً في متصفحك ولا يُرسَل إلى خوادم REMS.',
      },
      {
        heading: '٩. الاستخدام المقبول',
        body: 'توافق على عدم: (أ) استخدام الخدمة لأي غرض غير مشروع؛ (ب) محاولة فك شفرة الكود المصدري؛ (ج) استخدام الخدمة لتخزين أو نقل برمجيات خبيثة؛ (د) التحايل على آليات المصادقة؛ (هـ) إعادة بيع الخدمة أو منح تراخيص فرعية دون موافقة خطية من REMS.',
      },
      {
        heading: '١٠. توافر الخدمة',
        body: 'يستهدف REMS وقت تشغيل شهري بنسبة 99.5% دون ضمان عدم الانقطاع. ستُعلَن نوافذ الصيانة المجدولة مسبقاً قدر الإمكان. لا يتحمل REMS المسؤولية عن الخسائر الناجمة عن توقف الخدمة أو تأخر المزامنة أو إخفاقات واجهات برمجة الطرف الثالث.',
      },
      {
        heading: '١١. تحديد المسؤولية',
        body: 'في أقصى الحدود التي يسمح بها النظام السعودي، لا تتجاوز مسؤولية REMS الإجمالية تجاهك المبالغ التي دفعتها مقابل الخدمة خلال الثلاثة أشهر السابقة للمطالبة. لا يتحمل REMS أي مسؤولية عن الأضرار غير المباشرة أو التبعية.',
      },
      {
        heading: '١٢. تعديل الشروط',
        body: 'يجوز لـ REMS تحديث هذه الشروط في أي وقت. ستُبلَّغ بالتغييرات الجوهرية عبر البريد الإلكتروني أو إشعار داخل التطبيق قبل ١٤ يوماً على الأقل من سريانها. يُعدّ استمرار استخدام الخدمة بعد تاريخ السريان قبولاً للشروط المحدثة.',
      },
      {
        heading: '١٣. القانون الحاكم',
        body: 'تخضع هذه الشروط لأنظمة المملكة العربية السعودية. تختص المحاكم المختصة في الرياض بالفصل في أي نزاعات.',
      },
      {
        heading: '١٤. التواصل',
        body: 'لأي استفسارات حول هذه الشروط، تواصل معنا عبر نموذج التواصل في صفحة REMS الرئيسية أو عبر البريد الإلكتروني: legal@rems.sa',
      },
    ],
  },
} as const;

export default function TermsPage() {
  const [lang, setLang] = useState<'en' | 'ar'>('ar');
  const t = T[lang];
  const isAr = lang === 'ar';

  useEffect(() => {
    document.documentElement.dir  = t.dir;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.dir  = 'ltr';
      document.documentElement.lang = 'en';
    };
  }, [lang, t.dir]);

  return (
    <div
      className="min-h-screen bg-slate-50"
      style={{ fontFamily: isAr ? "'Cairo','Segoe UI',sans-serif" : "'Inter','Segoe UI',sans-serif" }}
    >
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <a
            href={LANDING_URL}
            className="flex items-center gap-2 text-slate-300 hover:text-white text-sm font-medium transition-colors"
          >
            {t.nav.back}
          </a>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-black text-xs">R</span>
            </div>
            <span className="text-white font-black text-sm">{t.nav.logo}</span>
          </div>

          <button
            onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')}
            className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <span>{lang === 'en' ? '🇸🇦' : '🇬🇧'}</span>
            <span>{lang === 'en' ? 'AR' : 'EN'}</span>
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">

        {/* Header */}
        <div className="mb-12 pb-8 border-b border-slate-200">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Legal
          </div>
          <h1 className="font-black text-slate-900 leading-tight mb-3" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            {t.title}
          </h1>
          <p className="text-slate-400 text-sm">{t.updated}</p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {t.sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-lg font-bold text-slate-900 mb-3">{section.heading}</h2>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">{section.body}</p>
            </section>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-16 pt-8 border-t border-slate-200 text-center">
          <p className="text-slate-400 text-xs">
            {isAr
              ? '© ٢٠٢٦ REMS نظام إدارة العقارات. جميع الحقوق محفوظة.'
              : '© 2026 REMS Real Estate Management System. All rights reserved.'}
          </p>
        </div>
      </main>
    </div>
  );
}
