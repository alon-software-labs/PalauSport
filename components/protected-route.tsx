'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/lib/context';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { currentUser, authReady } = useAppContext();

  useEffect(() => {
    if (authReady && !currentUser) {
      router.push('/login');
    }
  }, [authReady, currentUser, router]);

  if (!authReady || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
