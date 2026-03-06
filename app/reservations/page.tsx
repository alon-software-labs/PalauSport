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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Download, Search } from 'lucide-react';
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
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reservations</h1>
        <p className="text-muted-foreground mt-0.5">Manage all cruise reservations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Event</CardTitle>
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

      {selectedEventId && (
        <CabinGrid
          eventId={selectedEventId}
          reservations={reservations}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search by name, email, or phone</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search reservations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sort by</Label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date (Newest)</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="price">Price (Highest)</SelectItem>
                  <SelectItem value="guests">Guests (Most)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reservations</CardTitle>
          <CardDescription>
            {eventReservations.length} reservation{eventReservations.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventReservations.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">—</EmptyMedia>
                <EmptyTitle>No reservations for this event</EmptyTitle>
                <EmptyDescription>Try selecting another event or adjust your search.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Cabin</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventReservations.map((reservation) => (
                    <TableRow
                      key={reservation.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedReservation(reservation)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{reservation.customerName}</p>
                          <p className="text-xs text-muted-foreground">{reservation.customerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {reservation.totalGuests}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{reservation.cabinType}</TableCell>
                      <TableCell className="text-right font-mono font-medium tabular-nums">
                        ${reservation.totalPrice.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={reservation.invoiceGenerated ? 'default' : 'secondary'}>
                          {reservation.invoiceGenerated ? 'Invoice' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {reservation.invoiceGenerated && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleDownloadInvoice(e, reservation)}
                            disabled={isDownloading}
                          >
                            <Download className="size-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ReservationModal
        reservation={selectedReservation}
        onClose={() => setSelectedReservation(null)}
        onGenerateInvoice={handleInvoiceGenerated}
      />

      {invoiceGenerated && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300">
          Invoice generated successfully
        </div>
      )}
    </div>
  );
}
