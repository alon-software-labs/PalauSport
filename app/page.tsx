'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/lib/context';
import { Spinner } from '@/components/ui/spinner';

export default function Home() {
  const router = useRouter();
  const { currentUser, authReady } = useAppContext();

  useEffect(() => {
    if (!authReady) return;
    if (currentUser) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [authReady, currentUser, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Spinner className="size-8 text-primary" />
      <p className="text-sm text-muted-foreground">Redirecting...</p>
    </div>
  );
}
