'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/lib/context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Guards CRM routes: only employees may access. Clients see access denied (mirrors
 * palausport-reservation-ui's ClientRouteGuard pattern).
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { currentUser, userRole, authReady, logout } = useAppContext();

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

  // CRM is for employees only; clients and users without role see access denied
  if (userRole !== 'employee') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-xl border-border/80">
          <CardHeader className="text-center space-y-1">
            <CardTitle className="text-xl font-semibold tracking-tight text-destructive">
              Access denied
            </CardTitle>
            <CardDescription>
              This app is for employees only. Your account has a client role. Please use the
              reservation app to book cruises.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              variant="outline"
              onClick={async () => {
                await logout();
                router.push('/login');
              }}
            >
              Log out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
