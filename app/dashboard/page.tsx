'use client';

import { useAppContext } from '@/lib/context';
import { StatsCard } from '@/components/stats-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CalendarDays, FileText, Users, Gauge } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { events, reservations, isLoading, error } = useAppContext();

  const totalPassengers = reservations.reduce((sum, r) => sum + r.totalGuests, 0);
  const totalCapacity = 22;
  const capacityPercentage = totalPassengers > 0 ? Math.round((totalPassengers / totalCapacity) * 100) : 0;
  const recentReservations = reservations.slice(-5).reverse();

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div>
          <div className="h-9 w-48 bg-muted rounded-md mb-2" />
          <div className="h-5 w-64 bg-muted/70 rounded-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-48 bg-muted/30 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-destructive">Error loading data: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-0.5">Overview of reservations and capacity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Events"
          value={events.length}
          description="Active cruise events"
          icon={<CalendarDays className="size-5" />}
        />
        <StatsCard
          title="Total Reservations"
          value={reservations.length}
          description="Confirmed bookings"
          icon={<FileText className="size-5" />}
        />
        <StatsCard
          title="Total Passengers"
          value={totalPassengers}
          description={`${totalPassengers} / ${totalCapacity} capacity`}
          icon={<Users className="size-5" />}
          variant="primary"
        />
        <StatsCard
          title="Capacity Used"
          value={`${capacityPercentage}%`}
          description="Current boat occupancy"
          icon={<Gauge className="size-5" />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="group transition-all hover:shadow-md hover:border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Manage Reservations</CardTitle>
            <CardDescription>View, create, and manage cruise reservations</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/reservations">
              <Button className="w-full">Go to Reservations</Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="group transition-all hover:shadow-md hover:border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Invoice History</CardTitle>
            <CardDescription>View and download generated invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/invoices">
              <Button className="w-full" variant="outline">View Invoices</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Reservations</CardTitle>
          <CardDescription>Latest bookings</CardDescription>
        </CardHeader>
        <CardContent>
          {recentReservations.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">—</EmptyMedia>
                <EmptyTitle>No reservations yet</EmptyTitle>
                <EmptyDescription>Reservations will appear here once created.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead className="text-right font-mono">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentReservations.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell className="font-medium">{res.customerName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {res.totalGuests} guest{res.totalGuests !== 1 ? 's' : ''}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium tabular-nums">
                      ${res.totalPrice.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
