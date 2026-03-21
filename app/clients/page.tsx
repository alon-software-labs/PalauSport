'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/lib/context';
import { Client, Reservation } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Trophy, TrendingUp, Users, DollarSign, ChevronDown, ChevronRight, CalendarDays } from 'lucide-react';

const MEDAL_COLORS = ['text-yellow-500', 'text-slate-400', 'text-amber-600', 'text-slate-500', 'text-slate-500'];
const MEDAL_LABELS = ['🥇', '🥈', '🥉', '4th', '5th'];

function ReservationRow({ reservation }: { reservation: Reservation }) {
  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    CONFIRMED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-sm">
      <CalendarDays className="size-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{reservation.cabinType} — {reservation.totalGuests} guest{reservation.totalGuests !== 1 ? 's' : ''}</p>
        <p className="text-xs text-muted-foreground">{new Date(reservation.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[reservation.status] ?? 'bg-muted text-muted-foreground'}`}>
        {reservation.status}
      </span>
      <span className="font-mono text-sm font-semibold tabular-nums">${reservation.totalPrice.toFixed(2)}</span>
    </div>
  );
}

function ClientRow({ client, rank }: { client: Client; rank: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            {expanded
              ? <ChevronDown className="size-4 text-muted-foreground" />
              : <ChevronRight className="size-4 text-muted-foreground" />}
            <span className="text-muted-foreground font-mono text-xs w-6 text-center">{rank}</span>
          </div>
        </TableCell>
        <TableCell>
          <div>
            <p className="font-medium leading-tight">{client.name}</p>
            <p className="text-xs text-muted-foreground">{client.email}</p>
          </div>
        </TableCell>
        <TableCell className="text-center tabular-nums font-medium">
          {client.totalBookings}
        </TableCell>
        <TableCell className="text-right font-mono font-semibold tabular-nums">
          ${client.totalSpent.toFixed(2)}
        </TableCell>
        <TableCell>
          <Badge variant={client.totalBookings >= 3 ? 'default' : client.totalBookings >= 1 ? 'secondary' : 'outline'}>
            {client.totalBookings >= 3 ? 'VIP' : client.totalBookings >= 1 ? 'Active' : 'No Bookings'}
          </Badge>
        </TableCell>
      </TableRow>
      {expanded && client.reservations.length > 0 && (
        <TableRow>
          <TableCell colSpan={5} className="p-0 bg-muted/10">
            <div className="px-6 py-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Reservation History ({client.reservations.length})
              </p>
              {client.reservations.map((r) => (
                <ReservationRow key={r.id} reservation={r} />
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}
      {expanded && client.reservations.length === 0 && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/10">
            <p className="text-center text-sm text-muted-foreground py-4">No reservations yet.</p>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function ClientsPage() {
  const { clients, getTopClients, isLoading } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');

  const topClients = useMemo(() => getTopClients(5), [getTopClients]);

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  const totalRevenue = useMemo(() => clients.reduce((sum, c) => sum + c.totalSpent, 0), [clients]);
  const totalBookings = useMemo(() => clients.reduce((sum, c) => sum + c.totalBookings, 0), [clients]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <p className="text-muted-foreground mt-0.5">All registered client accounts and their booking history</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold mt-1">{clients.length}</p>
              </div>
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="size-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold mt-1">{totalBookings}</p>
              </div>
              <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="size-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold mt-1">${totalRevenue.toFixed(2)}</p>
              </div>
              <div className="size-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <DollarSign className="size-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Mini Dashboard */}
      {topClients.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-yellow-500" />
              <CardTitle className="text-base">Top 5 Most Active Clients</CardTitle>
            </div>
            <CardDescription>Ranked by number of bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topClients.map((client, idx) => {
                const maxBookings = topClients[0]?.totalBookings || 1;
                const barWidth = Math.max(4, Math.round((client.totalBookings / maxBookings) * 100));
                return (
                  <div key={client.userId} className="flex items-center gap-3">
                    <span className={`text-lg w-8 text-center shrink-0 ${MEDAL_COLORS[idx]}`}>
                      {MEDAL_LABELS[idx]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="min-w-0">
                          <span className="text-sm font-medium truncate block">{client.name}</span>
                          <span className="text-xs text-muted-foreground truncate block">{client.email}</span>
                        </div>
                        <div className="text-right ml-3 shrink-0">
                          <span className="text-sm font-bold tabular-nums">{client.totalBookings}</span>
                          <span className="text-xs text-muted-foreground ml-1">booking{client.totalBookings !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0 w-24">
                      <span className="text-xs font-mono text-muted-foreground">${client.totalSpent.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search + Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Clients</CardTitle>
          <CardDescription>
            {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Loading clients…</div>
          ) : filteredClients.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              {searchQuery ? 'No clients match your search.' : 'No clients registered yet.'}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14" />
                    <TableHead>Client</TableHead>
                    <TableHead className="text-center">Bookings</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client, idx) => (
                    <ClientRow key={client.userId} client={client} rank={idx + 1} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
