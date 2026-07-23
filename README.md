# بوابة المطوّرين — الواجهة الأمامية (Next.js)

واجهة أمامية لبوابة المطوّرين، مبنية بـ **Next.js 14 (App Router)** و**JavaScript** و**CSS Modules**،
بالعربية واتجاه RTL. تتصل بالخلفية (ApigeePortal.Api) لعرض الكتالوج والتوثيق وإدارة البوابة.

## التشغيل
```bash
npm install
cp .env.local.example .env.local   # ثم عدّل القيم
npm run dev                         # http://localhost:3000
```

## متغيرات البيئة (.env.local)
- `NEXT_PUBLIC_API_BASE` — عنوان الـ API (الافتراضي `/api`، ويُوجَّه عبر next.config.js إلى الخلفية)
- `NEXT_PUBLIC_GA_ID` — معرّف Google Analytics (فارغ = معطّل)

## البنية
```
src/
  app/
    layout.js              # الجذر: RTL + الخط + التحليلات
    page.js                # الرئيسية
    services/page.js       # الكتالوج (بحث + تصفية)
    services/[name]/page.js# تفاصيل الخدمة (عمليات + توثيق + اشتراك)
    admin/page.js          # لوحة المسؤول
  components/              # Header, Footer, ServiceCard, Analytics
  lib/api.js               # طبقة الاتصال بالـ API
  styles/globals.css       # المتغيرات والأنماط العامة
```

## ربط الخلفية
`next.config.js` يوجّه `/api/*` إلى `http://localhost:5080/api/*` أثناء التطوير.
عدّل الوجهة حسب خادمك. كل الاستدعاءات تمرّ من `src/lib/api.js`، وترسل ترويسة
`X-Apigee-Environment` لاختيار البيئة (prod/test).

## النشر (CI/CD وثلاث بيئات)

خط أنابيب `.gitlab-ci.yml` في جذر المستودع: تثبيت + lint + اختبار (`npm test`) على
كل دفعة، ثم بناء صورة Docker ودفعها إلى Container Registry الخاص بالمشروع على
الفرع الرئيسي والوسوم فقط، ثم مهمتا نشر يدويتان (`deploy-staging`/
`deploy-production`) عبر SSH — تتطلبان متغيّرات CI/CD لم تُضبط بعد؛ التفاصيل في
`deploy/ENVIRONMENTS.md`.

مجلد `deploy/` يحوي ملفات docker-compose جاهزة لبيئتي Staging وProduction (كل
بيئة تشير إلى نسخة الخلفية الخاصة بها عبر `BACKEND_URL`/`API_BASE_SERVER`):

```bash
cp deploy/.env.staging.example deploy/.env.staging   # املأ القيم الحقيقية
docker compose -f deploy/docker-compose.staging.yml --env-file deploy/.env.staging up -d --build
```

الخلفية (`CleanApigeePortal`) مستودع منفصل بنشر مستقل عن هذه الملفات.

## ملاحظات للإكمال
- **الصور والشعارات**: استبدل الشعار النصّي (حرف "ب") والعناصر العامة بأصولكم الرسمية،
  واستخدم مكوّن `next/image` كما في الموقع المرجعي.
- **المصادقة (نفاذ)**: أضف رمز الدخول في `lib/api.js` (مكان معلّق محدّد)، واحمِ
  مسار `/admin` بحيث لا يصله غير المسؤولين (تحقّق من الدور قبل العرض).
- **وضع فاتح/داكن**: الموقع المرجعي يدعم تبديل الوضع (`lightMode`) — يمكن إضافته لاحقًا.
- **العيّنات**: الصفحات تعرض عيّنات احتياطية إن تعذّر الاتصال بالـ API، وتُستبدل تلقائيًا
  بالبيانات الحقيقية عند نجاح الاتصال.
