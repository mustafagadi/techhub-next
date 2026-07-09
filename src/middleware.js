import { NextResponse } from 'next/server';

// حماية أوّلية على مستوى الخادم لصفحات /admin و/partner: تمنع شحن الصفحة لغير
// المسجّلين قبل أن يتحقّق RequireAuth من جهة العميل. تعتمد على كوكي portal_role
// (يُضبط من setAuth في src/lib/api.js) — لا تُستخدم كبديل عن التحقّق من رمز
// الدخول في كل طلب API، فقط لمنع تسريب هيكل الصفحة لغير المسجّلين.
// التحقّق من تطابق الدور (admin مقابل partner) يبقى في RequireAuth لعرض رسالة "لا تملك صلاحية".
export function middleware(request) {
  const role = request.cookies.get('portal_role')?.value;
  if (!role) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/partner/:path*'],
};
