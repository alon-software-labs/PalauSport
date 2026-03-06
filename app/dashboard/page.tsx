'use client';

import { useAppContext } from '@/lib/context';
import { StatsCard } from '@/components/stats-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function DashboardPage() {
  const { events, reservations, isLoading, error } = useAppContext();

  const totalPassengers = reservations.reduce((sum, r) => sum + r.totalGuests, 0);
  const totalCapacity = 22;
  const capacityPercentage = totalPassengers > 0 ? Math.round((totalPassengers / totalCapacity) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-red-600">Error loading data: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome to the Cruise Reservation CRM</p>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Events"
          value={events.length}
          description="Active cruise events"
          icon="⛵"
        />
        <StatsCard
          title="Total Reservations"
          value={reservations.length}
          description="Confirmed bookings"
          icon="📋"
        />
        <StatsCard
          title="Total Passengers"
          value={totalPassengers}
          description={`${totalPassengers} / ${totalCapacity} capacity`}
          icon="👥"
        />
        <StatsCard
          title="Capacity Used"
          value={`${capacityPercentage}%`}
          description="Current boat occupancy"
          icon="📊"
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Manage Reservations</CardTitle>
            <CardDescription>
              View, create, and manage cruise reservations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/reservations">
              <Button className="w-full">Go to Reservations</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>
              View and download generated invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/invoices">
              <Button className="w-full">View Invoices</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reservations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reservations</CardTitle>
          <CardDescription>Latest bookings</CardDescription>
        </CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <p className="text-gray-500">No reservations yet.</p>
          ) : (
            <div className="space-y-2">
              {reservations.slice(-5).reverse().map((res) => (
                <div key={res.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{res.customerName}</p>
                    <p className="text-sm text-gray-600">{res.totalGuests} guest{res.totalGuests !== 1 ? 's' : ''}</p>
                  </div>
                  <p className="font-semibold">${res.totalPrice.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
