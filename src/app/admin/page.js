'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// المسار الأساسي /admin يحوّل لأول قسم: نظرة عامة
export default function AdminPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/overview'); }, [router]);
  return null;
}
