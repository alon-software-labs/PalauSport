'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/lib/context';

export default function AccessDeniedPage() {
  const router = useRouter();
  const { logout } = useAppContext();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-border/80">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-xl font-semibold tracking-tight text-destructive">
            Access denied
          </CardTitle>
          <CardDescription>
            This app is for employees only. Your account has a client role. Please use the reservation app to book cruises.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
