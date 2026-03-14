'use client';

import { useState, useEffect } from 'react';

const LANDING_URL = 'https://abdualhumud.github.io/REMS/landing/';

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT — Bilingual EN / AR  (Saudi SaaS / PropTech Compliant)
// ═══════════════════════════════════════════════════════════════════════════
const T = {
  en: {
    dir: 'ltr' as const,
    nav: { logo: 'REMS', tagline: 'Property Management System', back: '← Back to Home' },
    title: 'Terms of Service',
    updated: 'Last Updated: March 14, 2026  ·  Effective: March 14, 2026',
    intro: 'Please read these Terms of Service carefully before accessing or using the REMS Real Estate Management System. By using the Service, you confirm that you have read, understood, and agree to be bound by these Terms, as well as all applicable laws of the Kingdom of Saudi Arabia.',
    toc: 'Table of Contents',
    sections: [
      {
        id: 's1',
        heading: '1. Acceptance of Terms',
        body: `By accessing, registering for, or using the REMS Real Estate Management System ("Service," "Platform," or "REMS"), operated under the laws of the Kingdom of Saudi Arabia, you ("User," "you," or "Customer") agree to be fully bound by these Terms of Service ("Terms").

These Terms constitute a legally binding agreement between you and REMS. If you are using the Service on behalf of a company or other legal entity, you represent and warrant that you have the authority to bind that entity to these Terms, in which case "you" refers to such entity.

If you do not agree to any provision of these Terms, you must immediately cease use of the Service. REMS reserves the right to refuse service to anyone for any reason at any time.`,
      },
      {
        id: 's2',
        heading: '2. Description of Service',
        body: `REMS is a cloud-based, multi-tenant Software-as-a-Service (SaaS) property management platform designed and optimised for the Saudi Arabian real estate market. The Service includes, but is not limited to:

• Centralised booking and reservation management
• Real-time two-way synchronisation with OTA channels (Booking.com, Airbnb, Gathern)
• Automated cleaning and housekeeping workflow management
• Financial reporting, RevPAR analytics, and invoice generation
• Saudi Post (SPL) National Address API integration for GPS-verified property locations
• Moyasar payment gateway integration (MADA, Visa, Mastercard, Apple Pay, STC Pay)
• Multi-tenant staging and trial environments
• Bilingual (Arabic/English) interface with full RTL support

Available features vary by subscription plan. REMS reserves the right to add, modify, or discontinue any feature at any time, with reasonable notice provided for material changes.`,
      },
      {
        id: 's3',
        heading: '3. User Accounts and Registration',
        body: `To access the full functionality of REMS, you must create an account and complete the onboarding process. You agree to:

(a) Provide accurate, current, complete, and truthful information during registration and throughout your use of the Service, including a valid Saudi Commercial Registration (CR) number and VAT registration number where applicable.

(b) Maintain and promptly update your account information to keep it accurate and current.

(c) Keep your account credentials strictly confidential. You are solely responsible for all activities that occur under your account, whether or not authorised by you.

(d) Notify REMS immediately at legal@rems.sa of any unauthorised access to or use of your account.

(e) Not create accounts using automated means or under false pretences.

REMS reserves the right to suspend, terminate, or restrict access to any account that: violates these Terms; provides false information; engages in fraudulent or abusive activity; or poses a risk to the security or integrity of the platform or other users.`,
      },
      {
        id: 's4',
        heading: '4. Subscription Plans and Payment Terms',
        body: `REMS offers three subscription tiers, billed monthly in Saudi Riyals (SAR):

• Basic Plan — SAR 149 per month: Up to 5 properties, Booking.com sync, SPL address lookup, financial reports, email support (48h SLA)
• Pro Plan — SAR 349 per month: Up to 25 properties, all 3 OTA channels, Moyasar payment links, advanced analytics, housekeeping workflows, priority support (4h SLA)
• Enterprise Plan — SAR 799 per month: Unlimited properties, all Pro features, dedicated account manager, custom integrations, 99.9% uptime SLA, white-label option

All plans include a 14-day free trial with no credit card required at sign-up. After the trial period, you will be charged the applicable monthly subscription fee unless you cancel before the trial ends.

VAT NOTICE: In accordance with the Kingdom of Saudi Arabia's Value Added Tax (VAT) Law and its Implementing Regulations issued pursuant to Royal Decree No. (M/113) dated 02/11/1438H, VAT at the prevailing rate of 15% shall be applied to all subscription fees and charged separately on each invoice.

Subscriptions auto-renew monthly unless cancelled. Payments are processed in SAR. No refunds are issued for partial billing periods. REMS reserves the right to modify pricing with 30 days' written notice.`,
      },
      {
        id: 's5',
        heading: '5. Promo Codes and Promotional Offers',
        body: `REMS may issue promotional codes ("Promo Codes") that provide discounts on subscription fees. The following conditions apply:

• Each Promo Code has its own validity period, maximum usage limit, and discount percentage, as communicated at the time of issuance.
• Promo Codes are non-transferable, non-refundable, and cannot be exchanged for cash.
• Only one Promo Code may be applied per account at the time of subscription checkout.
• Promo Codes cannot be applied retroactively to past billing periods.
• REMS reserves the right to deactivate, revoke, or modify any Promo Code at any time if it detects misuse, fraud, or systematic exploitation.
• Redemption of a Promo Code constitutes acceptance of these Terms and any additional conditions attached to the specific code.`,
      },
      {
        id: 's6',
        heading: '6. Data Privacy and Protection',
        body: `REMS is committed to protecting your personal data and property information in compliance with the Kingdom of Saudi Arabia's Personal Data Protection Law (PDPL), issued by Royal Decree No. (M/19) dated 09/02/1443H, and its Implementing Regulations.

DATA WE COLLECT: Property data, booking records, guest information (names, contact details, National ID numbers as required by Saudi hospitality regulations), financial transactions, and platform usage data.

DATA USE: Solely to operate and improve the Service, fulfil regulatory obligations, and provide contracted features. We do not sell your data to third parties.

DATA STORAGE: All data is stored in compliance with Saudi data localisation requirements. Demo and staging environments use isolated storage (sessionStorage or user-scoped localStorage) to prevent cross-user data leakage.

DATA RETENTION: Active account data is retained for the duration of your subscription plus 7 years for financial records, in compliance with Saudi Zakat, Tax and Customs Authority (ZATCA) requirements. You may request data deletion at legal@rems.sa; requests are fulfilled within 30 days subject to regulatory retention obligations.

DATA TRANSFER: Data may be shared only: (a) with OTA partners as necessary for channel sync; (b) with payment processors (Moyasar) for transaction processing; (c) with government authorities as required by Saudi law.

YOUR RIGHTS: Under the PDPL, you have the right to access, correct, and request deletion of your personal data. Submit requests to legal@rems.sa.`,
      },
      {
        id: 's7',
        heading: '7. OTA Channel Integrations (Booking.com, Airbnb, Gathern)',
        body: `REMS integrates with third-party Online Travel Agency (OTA) platforms to provide channel management functionality. By enabling any OTA integration, you acknowledge and agree that:

(a) You are responsible for maintaining valid API credentials, OAuth tokens, and a standing account in good status with each OTA platform.

(b) Each OTA platform is governed by its own terms of service, policies, and regulations. You are solely responsible for your compliance with those terms.

(c) REMS acts solely as a technology intermediary and is not a party to any agreement between you and the OTA platforms.

(d) REMS is not liable for: data discrepancies caused by OTA API downtime or changes; booking conflicts arising from OTA-side delays or errors; policy violations assessed by OTA platforms against your account; or financial penalties imposed by OTA platforms.

(e) The REMS exclusive-lock overlap prevention engine operates in under 500 milliseconds and provides industry-leading double-booking protection. However, REMS cannot guarantee prevention of conflicts arising from OTA-side processing delays beyond REMS's control.

(f) Airbnb integration uses OAuth 2.0 authorisation with HMAC-SHA256 webhook verification. Booking.com integration uses OTA 2003B XML with token-based authentication. Gathern integration uses REST/JSON with polling. You must maintain valid credentials for each active integration.`,
      },
      {
        id: 's8',
        heading: '8. SPL National Address Integration',
        body: `REMS supports integration with the Saudi Post (SPL) National Address API (api.address.gov.sa) to provide GPS-verified property location data and certified short addresses (e.g., RYYY1234).

(a) You are solely responsible for obtaining a valid SPL API subscription and key from the Saudi Post developer portal at api.address.gov.sa.

(b) Your SPL API key is stored exclusively in your browser's localStorage under the key 'rems-spl-key'. It is never transmitted to REMS servers. REMS has no access to your SPL credentials.

(c) REMS is not responsible for the accuracy, availability, or completeness of data returned by the SPL API, as this data is sourced directly from Saudi Post's National Address registry.

(d) If SPL is unavailable (e.g., due to CORS restrictions in a browser environment), REMS will fall back to OpenStreetMap Nominatim geocoding. This fallback is not officially verified by Saudi Post and will not carry the SPL verification badge.

(e) You must ensure that address data submitted to REMS accurately reflects the physical location of your property. Submitting false or misleading address data may violate Saudi regulations and constitute a breach of these Terms.`,
      },
      {
        id: 's9',
        heading: '9. Payment Processing (Moyasar)',
        body: `REMS integrates with Moyasar (a Saudi-licensed payment gateway regulated by the Saudi Central Bank, SAMA) to process payments from guests and tenants on your behalf.

(a) REMS is not a payment processor, bank, or financial institution. All payment processing is conducted by Moyasar under its own licensing and regulatory framework.

(b) By enabling Moyasar integration, you agree to Moyasar's terms of service, merchant agreement, and applicable SAMA regulations.

(c) Supported payment methods through Moyasar: MADA debit cards, Visa, Mastercard, Apple Pay, and STC Pay.

(d) REMS is not responsible for: payment failures, chargebacks, or disputes initiated by guests; delays in fund settlement to your Saudi bank account; fraud or unauthorised transactions occurring at the payment gateway level.

(e) You are responsible for maintaining accurate bank account details in the Moyasar dashboard and for complying with all ZATCA invoicing and VAT reporting requirements for payments received through the platform.`,
      },
      {
        id: 's10',
        heading: '10. Acceptable Use Policy',
        body: `By using the REMS platform, you agree not to:

(a) Use the Service for any purpose that is unlawful under the laws of the Kingdom of Saudi Arabia, including but not limited to violations of the Anti-Cyber Crime Law (Royal Decree No. M/17 of 1428H), the E-Commerce Law, or any applicable real estate regulations.

(b) Attempt to reverse-engineer, decompile, disassemble, or extract the source code of the REMS platform or any of its components.

(c) Use the Service to store, transmit, or distribute any malicious code, viruses, or harmful content.

(d) Circumvent, disable, or interfere with any authentication, access control, or security mechanism of the platform.

(e) Harvest or collect user data from the platform without explicit written consent from REMS.

(f) Resell, sublicense, or otherwise commercialise access to the REMS platform without a written partnership agreement with REMS.

(g) Use the platform to list properties you do not own or have explicit legal authority to manage.

(h) Submit fraudulent bookings, manipulate pricing data, or engage in activities that undermine the integrity of the OTA channel ecosystem.

Violation of this policy may result in immediate account suspension or termination without refund, and may be reported to the relevant Saudi authorities.`,
      },
      {
        id: 's11',
        heading: '11. Intellectual Property',
        body: `All intellectual property rights in the REMS platform, including but not limited to software code, user interface design, algorithms (including the exclusive-lock overlap prevention engine and reservation transaction engine), databases, trademarks, and documentation, are owned exclusively by REMS or its licensors.

Nothing in these Terms grants you any intellectual property rights in or to the REMS platform beyond the limited licence to use the Service as described herein.

Your data (property listings, booking records, financial data) remains your property. You grant REMS a limited, non-exclusive, royalty-free licence to use your data solely to operate the Service.`,
      },
      {
        id: 's12',
        heading: '12. Service Availability and SLA',
        body: `REMS targets the following monthly uptime levels:

• Basic Plan: 99.5% monthly uptime
• Pro Plan: 99.7% monthly uptime
• Enterprise Plan: 99.9% monthly uptime (contractual SLA)

Scheduled maintenance windows will be communicated via in-app notification and email at least 48 hours in advance where possible. Emergency maintenance may be performed without advance notice.

REMS is not liable for service interruptions caused by: third-party OTA API downtime; force majeure events; scheduled maintenance; your internet connectivity or device; or denial-of-service attacks outside REMS's reasonable control.

Booking sync latency is targeted at under 500 milliseconds end-to-end under normal operating conditions.`,
      },
      {
        id: 's13',
        heading: '13. Limitation of Liability',
        body: `TO THE MAXIMUM EXTENT PERMITTED BY THE LAWS OF THE KINGDOM OF SAUDI ARABIA:

(a) REMS's total aggregate liability to you for any and all claims arising out of or relating to these Terms or the Service shall not exceed the total subscription fees paid by you to REMS in the three (3) calendar months immediately preceding the event giving rise to the claim.

(b) IN NO EVENT SHALL REMS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION LOSS OF PROFITS, LOSS OF REVENUE, LOSS OF BUSINESS OPPORTUNITY, LOSS OF DATA, OR GOODWILL.

(c) The limitations in this clause apply regardless of whether such damages were foreseeable and whether REMS had been advised of the possibility of such damages.

(d) Nothing in these Terms excludes or limits liability that cannot be excluded or limited under applicable Saudi law.`,
      },
      {
        id: 's14',
        heading: '14. Indemnification',
        body: `You agree to defend, indemnify, and hold harmless REMS and its officers, directors, employees, and agents from and against any and all claims, damages, obligations, losses, liabilities, costs, and expenses (including legal fees) arising from:

(a) Your use of and access to the Service;
(b) Your violation of any provision of these Terms;
(c) Your violation of any third-party right, including any intellectual property right or privacy right;
(d) Any claim that your property data, guest data, or other content caused damage to a third party;
(e) Your non-compliance with any applicable Saudi law or regulation, including ZATCA, PDPL, or SAMA requirements.`,
      },
      {
        id: 's15',
        heading: '15. Modifications to Terms',
        body: `REMS may update or modify these Terms of Service at any time. We will provide notice of material changes by:

• Sending an email notification to the address associated with your account at least 14 days before the changes take effect.
• Displaying a prominent in-app notification.
• Updating the "Last Updated" date at the top of this document.

Your continued use of the Service after the effective date of the updated Terms constitutes your acceptance of the changes. If you do not agree to the updated Terms, you must cancel your subscription and cease use of the Service before the effective date.`,
      },
      {
        id: 's16',
        heading: '16. Termination',
        body: `Either party may terminate the subscription at any time.

TERMINATION BY YOU: Cancel through your account settings at any time. Your subscription remains active until the end of the current billing period. No refunds are issued for unused days in the current billing period.

TERMINATION BY REMS: REMS may suspend or terminate your account immediately, without notice, for material breach of these Terms, non-payment, fraudulent activity, or actions that pose a security risk to the platform or other users. In cases of non-material breach, REMS will provide 14 days' notice and opportunity to cure.

EFFECT OF TERMINATION: Upon termination, your access to the Service ceases immediately. Your data is retained for 30 days post-termination, during which you may request a data export at legal@rems.sa. After 30 days, data is deleted subject to mandatory retention requirements under Saudi law.`,
      },
      {
        id: 's17',
        heading: '17. Governing Law and Dispute Resolution',
        body: `These Terms of Service are governed by and shall be construed in accordance with the laws of the Kingdom of Saudi Arabia, without regard to conflict of law principles.

DISPUTE RESOLUTION: In the event of any dispute arising out of or relating to these Terms or the Service, the parties shall first attempt to resolve the dispute amicably through good-faith negotiation within 30 days.

If negotiation fails, disputes shall be submitted to the competent courts in Riyadh, Kingdom of Saudi Arabia, which shall have exclusive jurisdiction. For disputes involving digital services and e-commerce, the E-Commerce Dispute Resolution mechanisms of the Ministry of Commerce may also apply.

LANGUAGE: In the event of any conflict between the Arabic and English versions of these Terms, the Arabic version shall prevail.`,
      },
      {
        id: 's18',
        heading: '18. Contact and Legal Notices',
        body: `For questions, legal notices, data requests, or compliance inquiries regarding these Terms of Service:

Email: legal@rems.sa
Support: support@rems.sa
Website: https://abdualhumud.github.io/REMS/landing/

Legal notices must be sent to legal@rems.sa and will be acknowledged within 5 business days.

For data privacy requests under the Saudi PDPL, contact: privacy@rems.sa

REMS is committed to responding to all regulatory and legal correspondence in a timely and professional manner in accordance with Saudi law.`,
      },
    ],
  },
  ar: {
    dir: 'rtl' as const,
    nav: { logo: 'REMS', tagline: 'نظام إدارة العقارات', back: 'العودة إلى الرئيسية ←' },
    title: 'شروط الخدمة',
    updated: 'آخر تحديث: ١٤ مارس ٢٠٢٦  ·  تاريخ السريان: ١٤ مارس ٢٠٢٦',
    intro: 'يُرجى قراءة شروط الخدمة هذه بعناية قبل الوصول إلى نظام REMS لإدارة العقارات أو استخدامه. باستخدامك للخدمة، فإنك تُقرّ بأنك قرأت هذه الشروط وفهمتها ووافقت على الالتزام بها وبجميع القوانين المعمول بها في المملكة العربية السعودية.',
    toc: 'جدول المحتويات',
    sections: [
      {
        id: 's1',
        heading: '١. قبول الشروط',
        body: `بوصولك إلى نظام REMS لإدارة العقارات ("الخدمة" أو "المنصة") أو التسجيل فيه أو استخدامه، المُشغَّل وفق قوانين المملكة العربية السعودية، فإنك ("المستخدم" أو "أنت" أو "العميل") توافق على الارتباط الكامل بشروط الخدمة هذه ("الشروط").

تُشكّل هذه الشروط اتفاقية ملزمة قانونياً بينك وبين REMS. إذا كنت تستخدم الخدمة نيابةً عن شركة أو كيان قانوني آخر، فإنك تُقرّ وتضمن أنك تمتلك الصلاحية لإلزام ذلك الكيان بهذه الشروط.

إذا كنت لا توافق على أي بند من هذه الشروط، يجب عليك التوقف فوراً عن استخدام الخدمة. يحتفظ REMS بالحق في رفض تقديم الخدمة لأي شخص لأي سبب في أي وقت.`,
      },
      {
        id: 's2',
        heading: '٢. وصف الخدمة',
        body: `REMS منصة سحابية متعددة المستأجرين للبرمجيات كخدمة (SaaS) مُصمَّمة ومُحسَّنة لسوق العقارات في المملكة العربية السعودية. تشمل الخدمة، دون حصر:

• إدارة الحجوزات مركزياً
• المزامنة الآنية ثنائية الاتجاه مع قنوات OTA (Booking.com وAirbnb وGathern)
• إدارة سير عمل التنظيف والصيانة آلياً
• التقارير المالية وتحليلات RevPAR وإنشاء الفواتير
• تكامل API العنوان الوطني لمؤسسة البريد السعودي (SPL) للمواقع الموثقة بنظام GPS
• تكامل بوابة الدفع ميسر (مدى وفيزا وماستركارد وApple Pay وSTC Pay)
• بيئات تجريبية ومتعددة المستأجرين
• واجهة ثنائية اللغة (عربي/إنجليزي) مع دعم كامل لاتجاه النص RTL

تتفاوت الميزات المتاحة بحسب خطة الاشتراك. يحتفظ REMS بالحق في إضافة أو تعديل أو إيقاف أي ميزة في أي وقت مع إشعار مسبق معقول للتغييرات الجوهرية.`,
      },
      {
        id: 's3',
        heading: '٣. الحسابات والتسجيل',
        body: `للوصول إلى الوظائف الكاملة لـ REMS، يجب إنشاء حساب وإتمام عملية الإعداد. توافق على:

(أ) تقديم معلومات دقيقة وحديثة وكاملة وصادقة أثناء التسجيل وطوال فترة استخدامك للخدمة، بما في ذلك رقم السجل التجاري الصالح ورقم تسجيل ضريبة القيمة المضافة عند الاقتضاء.

(ب) المحافظة على تحديث معلومات حسابك وتحديثها فوراً للحفاظ على دقتها.

(ج) الحفاظ على سرية بيانات اعتماد حسابك. أنت وحدك المسؤول عن جميع الأنشطة التي تجري من خلال حسابك.

(د) إخطار REMS فوراً على legal@rems.sa بأي وصول غير مصرح به إلى حسابك.

(هـ) عدم إنشاء حسابات بوسائل آلية أو بمعلومات مزورة.

يحتفظ REMS بالحق في تعليق أو إنهاء أو تقييد الوصول إلى أي حساب ينتهك هذه الشروط أو يقدم معلومات كاذبة أو يمارس نشاطاً احتيالياً.`,
      },
      {
        id: 's4',
        heading: '٤. خطط الاشتراك وشروط الدفع',
        body: `يقدم REMS ثلاث خطط اشتراك، تُفوتَر شهرياً بالريال السعودي:

• الخطة الأساسية — ١٤٩ ريال/شهر: حتى ٥ عقارات، مزامنة Booking.com، بحث عنوان SPL، تقارير مالية، دعم بريد إلكتروني (٤٨ ساعة)
• الخطة الاحترافية — ٣٤٩ ريال/شهر: حتى ٢٥ عقاراً، جميع قنوات OTA الثلاثة، روابط دفع ميسر، تحليلات متقدمة، سير عمل التنظيف، دعم ذو أولوية (٤ ساعات)
• الخطة المؤسسية — ٧٩٩ ريال/شهر: عقارات غير محدودة، جميع مميزات الخطة الاحترافية، مدير حساب مخصص، تكاملات مخصصة، ضمان SLA بنسبة ٩٩.٩٪، خيار العلامة البيضاء

تشمل جميع الخطط تجربة مجانية لمدة ١٤ يوماً دون الحاجة إلى بطاقة ائتمانية عند التسجيل. بعد انتهاء فترة التجربة، تُفوتَر رسوم الاشتراك الشهرية ما لم تلغِ الاشتراك قبل انتهاء التجربة.

إشعار ضريبة القيمة المضافة: وفقاً لنظام ضريبة القيمة المضافة في المملكة العربية السعودية ولوائحه التنفيذية الصادرة بموجب المرسوم الملكي رقم (م/١١٣) بتاريخ ٠٢/١١/١٤٣٨هـ، تُطبَّق ضريبة القيمة المضافة بالنسبة السارية (١٥٪) على جميع رسوم الاشتراك وتُحتسب بشكل منفصل في كل فاتورة.

تتجدد الاشتراكات تلقائياً شهرياً ما لم تُلغَ. لا تُستردّ الرسوم عن أجزاء الفترة المنقضية. يحتفظ REMS بالحق في تعديل الأسعار مع إشعار مسبق بـ ٣٠ يوماً.`,
      },
      {
        id: 's5',
        heading: '٥. رموز الترويج والعروض الترويجية',
        body: `قد يُصدر REMS رموزاً ترويجية توفر خصومات على رسوم الاشتراك. تسري الشروط التالية:

• يملك كل رمز ترويجي فترة صلاحية وحد أقصى للاستخدام ونسبة خصم خاصة به.
• رموز الترويج غير قابلة للتحويل أو الاسترداد النقدي.
• لا يمكن تطبيق أكثر من رمز واحد لكل حساب عند الدفع.
• لا يمكن تطبيق الرموز الترويجية بأثر رجعي على دورات الفوترة السابقة.
• يحتفظ REMS بالحق في إلغاء أي رمز ترويجي أو تعديله في حالة اكتشاف إساءة الاستخدام أو الاحتيال.
• يُعدّ استرداد رمز ترويجي قبولاً لهذه الشروط وأي شروط إضافية مرتبطة بالرمز.`,
      },
      {
        id: 's6',
        heading: '٦. خصوصية البيانات وحمايتها',
        body: `يلتزم REMS بحماية بياناتك الشخصية ومعلومات عقاراتك وفقاً لنظام حماية البيانات الشخصية في المملكة العربية السعودية، الصادر بالمرسوم الملكي رقم (م/١٩) بتاريخ ٠٩/٠٢/١٤٤٣هـ، ولوائحه التنفيذية.

البيانات التي نجمعها: بيانات العقارات، سجلات الحجوزات، معلومات الضيوف (الأسماء ومعلومات الاتصال وأرقام الهوية الوطنية حسب اشتراطات الضيافة السعودية)، المعاملات المالية، وبيانات استخدام المنصة.

استخدام البيانات: حصراً لتشغيل الخدمة وتحسينها والوفاء بالالتزامات التنظيمية وتقديم الميزات المتعاقد عليها. لا نبيع بياناتك لأطراف ثالثة.

تخزين البيانات: تُخزَّن جميع البيانات بما يتوافق مع متطلبات توطين البيانات السعودية.

الاحتفاظ بالبيانات: تُحتفظ بيانات الحسابات النشطة طوال مدة الاشتراك مضافاً إليها ٧ سنوات للسجلات المالية، وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك (زاتكا).

حقوقك: بموجب نظام PDPL، يحق لك الوصول إلى بياناتك الشخصية وتصحيحها وطلب حذفها. أرسل طلباتك إلى legal@rems.sa.`,
      },
      {
        id: 's7',
        heading: '٧. تكاملات قنوات OTA',
        body: `يتكامل REMS مع منصات OTA الخارجية لتوفير وظائف إدارة القنوات. بتفعيلك أي تكامل مع OTA، تُقرّ وتوافق على:

(أ) أنت مسؤول عن الحفاظ على صحة بيانات اعتماد API ورموز OAuth وحساب نشط لدى كل منصة OTA.

(ب) تخضع كل منصة OTA لشروط الخدمة والسياسات الخاصة بها. أنت وحدك المسؤول عن الامتثال لتلك الشروط.

(ج) يعمل REMS بوصفه وسيطاً تقنياً فحسب وليس طرفاً في أي اتفاقية بينك وبين منصات OTA.

(د) لا يتحمل REMS المسؤولية عن: تناقضات البيانات الناجمة عن توقف API لمنصة OTA أو تغييراتها؛ تعارضات الحجوزات الناشئة عن تأخيرات OTA؛ انتهاكات السياسات التي تفرضها منصات OTA على حسابك.

(هـ) يعمل محرك منع التداخل بالقفل الحصري الخاص بـ REMS في أقل من ٥٠٠ مللي ثانية، إلا أن REMS لا يستطيع ضمان منع التعارضات الناجمة عن تأخيرات المعالجة من جانب OTA خارج سيطرة REMS.`,
      },
      {
        id: 's8',
        heading: '٨. تكامل العنوان الوطني SPL',
        body: `يدعم REMS التكامل مع API العنوان الوطني لمؤسسة البريد السعودي (SPL) لتوفير بيانات موقع العقار الموثقة بنظام GPS والعناوين القصيرة المعتمدة.

(أ) أنت وحدك المسؤول عن الحصول على اشتراك صالح ومفتاح API من بوابة المطورين لدى مؤسسة البريد السعودي على api.address.gov.sa.

(ب) يُخزَّن مفتاح SPL API الخاص بك حصراً في localStorage بمتصفحك ولا يُرسَل إلى خوادم REMS في أي وقت.

(ج) لا يتحمل REMS المسؤولية عن دقة أو توافر أو اكتمال البيانات التي تعيدها API الخاصة بـ SPL.

(د) في حالة عدم توافر SPL، يرجع REMS إلى خدمة Nominatim من OpenStreetMap، وهي ليست موثقة رسمياً من مؤسسة البريد السعودي.

(هـ) يجب عليك التأكد من أن بيانات العنوان المُدخلة في REMS تعكس بدقة الموقع الفعلي لعقارك.`,
      },
      {
        id: 's9',
        heading: '٩. معالجة المدفوعات (ميسر)',
        body: `يتكامل REMS مع ميسر (بوابة دفع سعودية مرخصة خاضعة لإشراف البنك المركزي السعودي - ساما) لمعالجة المدفوعات من الضيوف والمستأجرين نيابةً عنك.

(أ) REMS ليس معالج مدفوعات ولا بنكاً ولا مؤسسة مالية. تتم جميع عمليات معالجة المدفوعات من قِبَل ميسر وفق إطاره التنظيمي الخاص.

(ب) بتفعيلك تكامل ميسر، توافق على شروط خدمة ميسر واتفاقية التجار واللوائح المعمول بها لدى ساما.

(ج) طرق الدفع المدعومة: بطاقات مدى، وفيزا، وماستركارد، وApple Pay، وSTC Pay.

(د) لا يتحمل REMS المسؤولية عن: إخفاقات الدفع أو رد المبالغ المدفوعة أو النزاعات؛ التأخر في تسوية الأموال إلى حسابك البنكي السعودي؛ المعاملات الاحتيالية على مستوى بوابة الدفع.

(هـ) أنت مسؤول عن الامتثال لمتطلبات فوترة زاتكا وتقارير ضريبة القيمة المضافة.`,
      },
      {
        id: 's10',
        heading: '١٠. سياسة الاستخدام المقبول',
        body: `باستخدامك منصة REMS، توافق على عدم:

(أ) استخدام الخدمة لأي غرض غير مشروع وفق قوانين المملكة العربية السعودية، بما في ذلك مخالفات نظام مكافحة الجرائم المعلوماتية ونظام التجارة الإلكترونية.

(ب) محاولة إجراء هندسة عكسية أو فك شفرة أو تفكيك أو استخراج الكود المصدري لمنصة REMS.

(ج) استخدام الخدمة لتخزين أو نقل أو توزيع أي كود خبيث أو فيروسات أو محتوى ضار.

(د) التحايل على أو تعطيل أو التدخل في أي آليات المصادقة أو التحكم في الوصول أو الأمان للمنصة.

(هـ) إعادة بيع الخدمة أو منح تراخيص فرعية دون اتفاقية شراكة خطية مع REMS.

(و) إدراج عقارات لا تملكها أو ليس لديك صلاحية قانونية صريحة لإدارتها.

انتهاك هذه السياسة قد يُفضي إلى تعليق الحساب أو إنهائه فوراً دون استرداد، وقد يُبلَّغ عنه للجهات السعودية المختصة.`,
      },
      {
        id: 's11',
        heading: '١١. الملكية الفكرية',
        body: `جميع حقوق الملكية الفكرية في منصة REMS، بما فيها كود البرمجيات وتصميم واجهة المستخدم والخوارزميات (بما فيها محرك منع التداخل بالقفل الحصري ومحرك معاملات الحجز) وقواعد البيانات والعلامات التجارية والوثائق، مملوكة حصراً لـ REMS أو مانحي تراخيصه.

لا يمنحك أي شيء في هذه الشروط أي حقوق ملكية فكرية في منصة REMS أو عليها.

بياناتك (قوائم العقارات وسجلات الحجوزات والبيانات المالية) تبقى ملكاً لك. تمنح REMS ترخيصاً محدوداً وغير حصري وخالياً من الإتاوات لاستخدام بياناتك حصراً لتشغيل الخدمة.`,
      },
      {
        id: 's12',
        heading: '١٢. توافر الخدمة واتفاقية مستوى الخدمة',
        body: `يستهدف REMS مستويات التشغيل الشهرية التالية:

• الخطة الأساسية: نسبة تشغيل شهرية ٩٩.٥٪
• الخطة الاحترافية: نسبة تشغيل شهرية ٩٩.٧٪
• الخطة المؤسسية: نسبة تشغيل شهرية ٩٩.٩٪ (اتفاقية مستوى خدمة تعاقدية)

ستُعلَن نوافذ الصيانة المجدولة عبر الإشعارات داخل التطبيق والبريد الإلكتروني قبل ٤٨ ساعة على الأقل حيثما أمكن.

لا يتحمل REMS المسؤولية عن انقطاعات الخدمة الناجمة عن: توقف API لمنصات OTA؛ أحداث القوة القاهرة؛ الصيانة المجدولة؛ اتصالك بالإنترنت أو جهازك.`,
      },
      {
        id: 's13',
        heading: '١٣. تحديد المسؤولية',
        body: `في أقصى الحدود التي تسمح بها قوانين المملكة العربية السعودية:

(أ) لا تتجاوز المسؤولية الإجمالية لـ REMS تجاهك عن أي مطالبات تنشأ عن هذه الشروط أو الخدمة مجموع رسوم الاشتراك التي دفعتها لـ REMS في الأشهر الثلاثة التقويمية السابقة للحدث المنشئ للمطالبة.

(ب) لا يتحمل REMS بأي حال من الأحوال المسؤولية عن أي أضرار غير مباشرة أو عرضية أو خاصة أو تبعية أو عقابية أو تحذيرية، بما في ذلك خسارة الأرباح أو الإيرادات أو الفرص التجارية أو البيانات أو السمعة التجارية.

(ج) تسري القيود الواردة في هذه الفقرة بصرف النظر عما إذا كانت هذه الأضرار متوقعة.`,
      },
      {
        id: 's14',
        heading: '١٤. التعويض',
        body: `توافق على الدفاع عن REMS وموظفيه ومديريه ووكلائه وتعويضهم وإبراء ذمتهم من وضد أي مطالبات أو أضرار أو التزامات أو خسائر أو مسؤوليات أو تكاليف ونفقات (بما فيها أتعاب قانونية) تنشأ عن:

(أ) استخدامك للخدمة؛
(ب) انتهاكك لأي حكم من هذه الشروط؛
(ج) انتهاكك لأي حق لطرف ثالث؛
(د) أي مطالبة بأن بيانات عقاراتك أو ضيوفك تسببت في ضرر لطرف ثالث؛
(هـ) عدم امتثالك لأي قانون أو لائحة سعودية سارية.`,
      },
      {
        id: 's15',
        heading: '١٥. تعديل الشروط',
        body: `يجوز لـ REMS تحديث أو تعديل شروط الخدمة هذه في أي وقت. سنُبلّغك بالتغييرات الجوهرية عبر:

• إرسال إشعار بريد إلكتروني إلى العنوان المرتبط بحسابك قبل ١٤ يوماً على الأقل من دخول التغييرات حيز التنفيذ.
• عرض إشعار بارز داخل التطبيق.
• تحديث تاريخ "آخر تحديث" في أعلى هذه الوثيقة.

يُعدّ استمرار استخدامك للخدمة بعد تاريخ سريان الشروط المحدثة قبولاً منك لتلك التغييرات.`,
      },
      {
        id: 's16',
        heading: '١٦. الإنهاء',
        body: `يحق لأي من الطرفين إنهاء الاشتراك في أي وقت.

إنهاء من جانبك: ألغِ اشتراكك من إعدادات حسابك في أي وقت. يبقى اشتراكك نشطاً حتى نهاية دورة الفوترة الحالية. لا تُستردّ الرسوم عن الأيام غير المستخدمة في دورة الفوترة الحالية.

إنهاء من جانب REMS: يجوز لـ REMS تعليق حسابك أو إنهاؤه فوراً في حالة الإخلال الجوهري بهذه الشروط أو عدم السداد أو النشاط الاحتيالي.

أثر الإنهاء: عند الإنهاء، يتوقف وصولك إلى الخدمة فوراً. تُحتفظ بياناتك لمدة ٣٠ يوماً بعد الإنهاء يمكنك خلالها طلب تصدير البيانات على legal@rems.sa.`,
      },
      {
        id: 's17',
        heading: '١٧. القانون الحاكم وتسوية النزاعات',
        body: `تخضع شروط الخدمة هذه وتُفسَّر وفقاً لأنظمة المملكة العربية السعودية.

تسوية النزاعات: في حالة أي نزاع ينشأ عن هذه الشروط أو يتعلق بها، يسعى الطرفان أولاً إلى تسويته ودياً خلال ٣٠ يوماً. إذا فشلت المفاوضات، تُحال النزاعات إلى المحاكم المختصة في الرياض، المملكة العربية السعودية.

اللغة: في حالة أي تعارض بين النسختين العربية والإنجليزية من هذه الشروط، تسود النسخة العربية.`,
      },
      {
        id: 's18',
        heading: '١٨. التواصل والإشعارات القانونية',
        body: `للاستفسارات والإشعارات القانونية وطلبات البيانات والاستفسارات المتعلقة بالامتثال بشأن شروط الخدمة:

البريد الإلكتروني: legal@rems.sa
الدعم: support@rems.sa
الموقع الإلكتروني: https://abdualhumud.github.io/REMS/landing/

يجب إرسال الإشعارات القانونية إلى legal@rems.sa وستتم الإجابة عليها خلال ٥ أيام عمل.

لطلبات خصوصية البيانات بموجب نظام PDPL السعودي: privacy@rems.sa

يلتزم REMS بالرد على جميع المراسلات التنظيمية والقانونية في الوقت المناسب وبشكل مهني وفقاً للقانون السعودي.`,
      },
    ],
  },
} as const;

export default function TermsPage() {
  const [lang, setLang] = useState<'en' | 'ar'>('ar');
  const [activeSection, setActiveSection] = useState<string | null>(null);
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

  // Load premium fonts
  useEffect(() => {
    if (!document.getElementById('terms-fonts')) {
      const link = document.createElement('link');
      link.id   = 'terms-fonts';
      link.rel  = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=IBM+Plex+Sans+Arabic:wght@300;400;600;700&family=Inter:wght@300;400;500;600;700&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  const fontFamily = isAr
    ? "'IBM Plex Sans Arabic', 'Cairo', sans-serif"
    : "'Inter', 'Segoe UI', sans-serif";

  const headingFont = "'Playfair Display', Georgia, serif";

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily,
        background: 'linear-gradient(160deg, #080C14 0%, #0D1525 50%, #080C14 100%)',
        color: '#E2D9C8',
      }}
    >
      <style>{`
        :root { color-scheme: dark; }
        .gold-text { color: #C9A96E; }
        .gold-border { border-color: rgba(201,169,110,0.2); }
        .glass-card {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(201,169,110,0.12);
        }
        .section-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(201,169,110,0.08);
          transition: border-color 0.3s ease, background 0.3s ease;
        }
        .section-card:hover, .section-card.active {
          background: rgba(201,169,110,0.04);
          border-color: rgba(201,169,110,0.2);
        }
        .toc-link {
          transition: color 0.2s, padding-inline-start 0.2s;
        }
        .toc-link:hover { color: #C9A96E; padding-inline-start: 0.5rem; }
        .toc-link.active { color: #C9A96E; }
        .legal-badge {
          background: linear-gradient(135deg, rgba(201,169,110,0.15), rgba(201,169,110,0.05));
          border: 1px solid rgba(201,169,110,0.3);
          color: #C9A96E;
        }
        .nav-glass {
          background: rgba(8,12,20,0.9);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(201,169,110,0.1);
        }
        .lang-btn {
          background: rgba(201,169,110,0.08);
          border: 1px solid rgba(201,169,110,0.2);
          color: #C9A96E;
          transition: all 0.2s;
        }
        .lang-btn:hover {
          background: rgba(201,169,110,0.15);
          border-color: rgba(201,169,110,0.4);
        }
        pre, .legal-body { white-space: pre-line; }
        .divider-gold {
          background: linear-gradient(90deg, transparent, rgba(201,169,110,0.4), transparent);
          height: 1px;
        }
      `}</style>

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 nav-glass">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Back */}
          <a
            href={LANDING_URL}
            className="flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: '#94A3B8' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#C9A96E')}
            onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
          >
            {t.nav.back}
          </a>

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #C9A96E 0%, #8B6914 100%)' }}
            >
              <span className="font-black text-sm" style={{ color: '#080C14' }}>R</span>
            </div>
            <div>
              <div className="font-black text-sm leading-none" style={{ fontFamily: headingFont, color: '#F5F0E8' }}>
                {t.nav.logo}
              </div>
              <div className="text-[9px] tracking-widest uppercase mt-0.5" style={{ color: '#C9A96E', opacity: 0.7 }}>
                {t.nav.tagline}
              </div>
            </div>
          </div>

          {/* Language toggle */}
          <button
            onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')}
            className="lang-btn h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            <span>{lang === 'en' ? '🇸🇦' : '🇬🇧'}</span>
            <span>{lang === 'en' ? 'AR' : 'EN'}</span>
          </button>
        </div>
      </nav>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-14">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.15em] mb-6 legal-badge"
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#C9A96E' }} />
            {isAr ? 'وثيقة قانونية' : 'Legal Document'}
          </div>

          <h1
            className="font-black leading-tight mb-4"
            style={{
              fontFamily: headingFont,
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              color: '#F5F0E8',
            }}
          >
            {t.title}
          </h1>

          <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>{t.updated}</p>

          {/* Intro */}
          <div className="glass-card rounded-2xl p-6">
            <p className="text-sm leading-relaxed" style={{ color: '#C9C3B5' }}>{t.intro}</p>
          </div>

          <div className="divider-gold mt-10" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* ── Table of Contents (sticky sidebar) ─────────────────── */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <div className="glass-card rounded-2xl p-4">
                <h3
                  className="text-xs font-bold uppercase tracking-[0.15em] mb-4"
                  style={{ color: '#C9A96E' }}
                >
                  {t.toc}
                </h3>
                <nav className="space-y-0.5">
                  {t.sections.map((sec) => (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      onClick={() => setActiveSection(sec.id)}
                      className={`toc-link block text-xs py-1.5 leading-snug ${activeSection === sec.id ? 'active' : ''}`}
                      style={{ color: activeSection === sec.id ? '#C9A96E' : '#64748B' }}
                    >
                      {sec.heading}
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          </aside>

          {/* ── Sections ────────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            {t.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className={`section-card rounded-2xl p-6 sm:p-8 ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <h2
                  className="font-bold mb-4 leading-snug"
                  style={{
                    fontFamily: headingFont,
                    fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                    color: '#F5F0E8',
                  }}
                >
                  {section.heading}
                </h2>
                <div className="divider-gold mb-4" />
                <p
                  className="legal-body text-sm leading-loose"
                  style={{ color: '#9CA3AF' }}
                >
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        </div>

        {/* ── Footer Note ──────────────────────────────────────────── */}
        <div className="mt-16 pt-8 text-center">
          <div className="divider-gold mb-8" />
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs mb-4 legal-badge"
          >
            <span>⚖️</span>
            <span>
              {isAr
                ? 'تخضع هذه الشروط لقوانين المملكة العربية السعودية'
                : 'These Terms are governed by the laws of the Kingdom of Saudi Arabia'}
            </span>
          </div>
          <p className="text-xs" style={{ color: '#4B5563' }}>
            {isAr
              ? '© ٢٠٢٦ REMS نظام إدارة العقارات. جميع الحقوق محفوظة.'
              : '© 2026 REMS Real Estate Management System. All rights reserved.'}
          </p>
        </div>
      </main>
    </div>
  );
}
