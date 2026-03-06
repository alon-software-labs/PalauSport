'use client';

import { Reservation } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Unlock } from 'lucide-react';

interface CabinGridProps {
  eventId: string;
  reservations: Reservation[];
  onCabinClick?: (cabinId: string) => void;
}

export function CabinGrid({ eventId, reservations, onCabinClick }: CabinGridProps) {
  const eventReservations = reservations.filter(r => r.eventId === eventId);
  const bookedCabinIds = new Set(eventReservations.map(r => r.cabinId));

  const cabins = Array.from({ length: 13 }, (_, i) => {
    const id = `cabin-${i + 1}`;
    const isBunk = i < 9;
    return {
      id,
      number: isBunk ? `B${i + 1}` : `Q${i - 8}`,
      type: isBunk ? 'BUNK' : 'QUEEN_SUITE',
      status: bookedCabinIds.has(id) ? 'booked' : 'available',
    };
  });

  const availableCount = cabins.filter(c => c.status === 'available').length;
  const bookedCount = cabins.filter(c => c.status === 'booked').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cabin Overview</CardTitle>
        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" />
            Available ({availableCount})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-muted-foreground/60" />
            Booked ({bookedCount})
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
          {cabins.map((cabin) => {
            const reservation = eventReservations.find(r => r.cabinId === cabin.id);
            const isBooked = cabin.status === 'booked';

            return (
              <div
                key={cabin.id}
                onClick={() => onCabinClick?.(cabin.id)}
                className={`
                  p-2.5 rounded-lg text-center cursor-pointer transition-all
                  border font-mono text-xs
                  ${isBooked
                    ? 'bg-muted border-muted-foreground/20 text-muted-foreground'
                    : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
                  }
                  hover:scale-[1.02] active:scale-[0.98]
                `}
                title={reservation ? `${reservation.customerName} — ${reservation.totalGuests} guests` : `Available ${cabin.type}`}
              >
                <div className="flex justify-center mb-1">
                  {isBooked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                </div>
                <div className="font-semibold tabular-nums">{cabin.number}</div>
                <div className="text-[10px] opacity-80 uppercase mt-0.5">
                  {cabin.type === 'BUNK' ? 'Bunk' : 'Queen'}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
