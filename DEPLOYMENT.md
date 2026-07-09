# دليل النشر — بيئة ما قبل الإنتاج (Pre-Production)

المشروع مكوّنان منفصلان: الخلفية (.NET 8) والواجهة (Next.js). يُنشران معًا.

---

## ١. قائمة التحقّق قبل النشر (مهمة جدًا)

- [ ] **connection string** لبيئة ما قبل الإنتاج (لا خادم التطوير المحلي)
- [ ] **عنوان Apigee** الصحيح للبيئة (تأكّد أنه ليس عنوانًا ناقصًا)
- [ ] **الأسرار** في متغيّرات بيئة الخادم أو user-secrets — لا في appsettings المرفوع
- [ ] **ملفات Swagger/Redoc المحلية** موجودة في `public/vendor/` (ضرورية للبيئة المغلقة)
- [ ] **BACKEND_URL** للواجهة يشير لعنوان الخلفية الفعلي
- [ ] مجلد **Migrations** موجود ومُحدّث

---

## ٢. الخلفية (.NET 8)

### البناء
```bash
dotnet publish src/ApigeePortal.Api -c Release -o ./publish
```

### الإعداد (appsettings.PreProduction.json أو متغيّرات بيئة)
- `ConnectionStrings:PortalDb` ← خادم قاعدة بيانات البيئة
- `Apigee:Environments` ← عناوين Apigee الصحيحة للبيئة
- الأسرار (كلمات المرور، WebhookSecret) ← متغيّرات بيئة، لا الملف

### قاعدة البيانات
```bash
dotnet ef database update --project src/ApigeePortal.Infrastructure --startup-project src/ApigeePortal.Api
```

### التشغيل
- **IIS**: انشر مجلد publish كموقع، مع ASP.NET Core Hosting Bundle مثبّتًا.
- **Kestrel**: `dotnet ApigeePortal.Api.dll` خلف reverse proxy (nginx/IIS) للـ HTTPS.

---

## ٣. الواجهة (Next.js)

تحتاج Node.js على الخادم.

### الإعداد
اضبط متغيّر البيئة قبل البناء:
```bash
BACKEND_URL=http://عنوان-الخلفية-الفعلي:المنفذ
```

### البناء والتشغيل
```bash
npm ci
npm run build
npm run start
```
(يعمل على المنفذ 3000 افتراضيًّا — اضبطه عبر `PORT` أو reverse proxy.)

---

## ٤. بعد النشر — التحقّق

- [ ] الواجهة تفتح، والكتالوج يعرض الخدمات الحقيقية (لا عيّنات)
- [ ] تسجيل الدخول يعمل
- [ ] التوثيق الكامل (Swagger/Redoc) يعمل **دون إنترنت** (يثبت الاستضافة المحلية)
- [ ] لوحة المسؤول: النشر والتسعير
- [ ] لوحة المستخدم: إنشاء تطبيق
- [ ] قطع الإنترنت الخارجي مؤقتًا واختبار العارضين (للبيئة المغلقة)

---

## ٥. تحذيرات خاصة بالبيئة الحكومية المغلقة

- لا اتصال خارجي: تأكّد أن **كل** الموارد (Swagger/Redoc) محلية.
- الأسرار الحقيقية لا تُرفع لـ Git إطلاقًا.
- الدفع: لا يُفعّل دون مراجعة أمنية مستقلة.
- المصادقة: نظام Identity الحالي للتطوير — نفاذ (Nafath) للإنتاج الفعلي.
