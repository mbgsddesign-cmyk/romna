'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CalendarPage() {
  const router = useRouter();

  useEffect(() => {
    // Calendar is not a standalone page - redirect to Home
    router.replace('/');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: '#09140f' }}>
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" style={{ color: '#f9f506' }} />
        <p className="mt-4 text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}
