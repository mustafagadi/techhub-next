'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// The base /admin route redirects to the first section: overview
export default function AdminPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/overview'); }, [router]);
  return null;
}
