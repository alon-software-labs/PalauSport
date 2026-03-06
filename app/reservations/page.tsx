'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/lib/context';
import { Reservation } from '@/lib/types';
import { CabinGrid } from '@/components/cabin-grid';
import { ReservationModal } from '@/components/reservation-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { downloadInvoicePDF } from '@/lib/pdf-generator';

type SortOption = 'name' | 'date' | 'price' | 'guests';

export default function ReservationsPage() {
  const { events, reservations, getInvoicesByReservation } = useAppContext();
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || '');

  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const eventReservations = useMemo(() => {
    let filtered = reservations.filter(r => r.eventId === selectedEventId);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.customerName.toLowerCase().includes(query) ||
          r.customerEmail.toLowerCase().includes(query) ||
          r.customerPhone.includes(query)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.customerName.localeCompare(b.customerName);
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'price':
          return b.totalPrice - a.totalPrice;
        case 'guests':
          return b.totalGuests - a.totalGuests;
        default:
          return 0;
      }
    });

    return sorted;
  }, [reservations, selectedEventId, searchQuery, sortBy]);

  const handleInvoiceGenerated = () => {
    setInvoiceGenerated(true);
    setTimeout(() => setInvoiceGenerated(false), 2000);
  };

  const handleDownloadInvoice = (e: React.MouseEvent, reservation: Reservation) => {
    e.stopPropagation();
    setIsDownloading(true);
    try {
      const invoices = getInvoicesByReservation(reservation.id);
      if (invoices.length > 0) {
        downloadInvoicePDF(invoices[0], reservation);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Reservations</h1>
        <p className="text-gray-600">Manage all cruise reservations</p>
      </div>

      {/* Event Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Event</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {events.map(event => (
              <Button
                key={event.id}
                onClick={() => setSelectedEventId(event.id)}
                variant={selectedEventId === event.id ? 'default' : 'outline'}
              >
                {event.name} ({event.currentBookings}/{event.capacity})
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cabin Grid */}
      {selectedEventId && (
        <CabinGrid
          eventId={selectedEventId}
          reservations={reservations}
        />
      )}

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search">Search by name, email, or phone</Label>
              <Input
                id="search"
                placeholder="Search reservations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sort">Sort by</Label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="date">Date (Newest)</option>
                <option value="name">Name (A-Z)</option>
                <option value="price">Price (Highest)</option>
                <option value="guests">Guests (Most)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reservations List */}
      <Card>
        <CardHeader>
          <CardTitle>Reservations</CardTitle>
          <CardDescription>
            {eventReservations.length} reservation{eventReservations.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventReservations.length === 0 ? (
            <p className="text-gray-500">No reservations for this event</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {eventReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  onClick={() => setSelectedReservation(reservation)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-all active:scale-[0.98] hover:scale-[1.01] hover:shadow-md hover:border-blue-200 flex items-center justify-between group"
                >
                  <div>
                    <p className="font-semibold">{reservation.customerName}</p>
                    <p className="text-sm text-gray-600">{reservation.customerEmail}</p>
                    <p className="text-sm text-gray-600">
                      {reservation.totalGuests} guest{reservation.totalGuests !== 1 ? 's' : ''} • {reservation.cabinType}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="font-semibold">${reservation.totalPrice.toFixed(2)}</p>
                      <span className={`text-xs px-2 py-1 rounded inline-block ${reservation.invoiceGenerated
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {reservation.invoiceGenerated ? '✓ Invoice Generated' : 'Pending'}
                      </span>
                    </div>
                    {reservation.invoiceGenerated && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleDownloadInvoice(e, reservation)}
                        disabled={isDownloading}
                      >
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reservation Modal */}
      <ReservationModal
        reservation={selectedReservation}
        onClose={() => setSelectedReservation(null)}
        onGenerateInvoice={handleInvoiceGenerated}
      />

      {/* Invoice Generated Toast */}
      {invoiceGenerated && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg">
          Invoice generated successfully!
        </div>
      )}
    </div>
  );
}
