'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import {
  CruiseEvent,
  Reservation,
  Invoice,
  User,
  Client,
  CabinType,
  Passenger,
  ReservationStatus,
} from './types';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export type AppRole = 'client' | 'employee';

function mapSupabaseUser(sbUser: SupabaseUser | null): User | null {
  if (!sbUser) return null;
  return {
    id: sbUser.id,
    email: sbUser.email ?? '',
    name: sbUser.user_metadata?.name ?? sbUser.email?.split('@')[0] ?? 'User',
  };
}

function getUserRoleFromToken(accessToken?: string): AppRole | null {
  if (!accessToken) return null;
  try {
    const decoded = jwtDecode<{ user_role?: string }>(accessToken);
    if (decoded?.user_role === 'employee' || decoded?.user_role === 'client') {
      return decoded.user_role;
    }
  } catch {
    // ignore decode errors
  }
  return null;
}

// DB row types
interface DbCruiseEvent {
  id: number;
  name: string;
  date: string;
  destination: string;
  capacity: number;
  current_bookings: number;
  created_at: string;
}

interface DbReservation {
  id: number;
  event_id: number;
  cabin_id: string;
  cabin_type: CabinType;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  passengers: Passenger[] | null;
  status: ReservationStatus;
  total_guests: number;
  total_price: number;
  notes: string | null;
  invoice_generated: boolean;
  created_at: string;
}

interface DbInvoice {
  id: number;
  reservation_id: number;
  invoice_number: string | null;
  customer_name: string;
  customer_email: string;
  total_guests: number;
  cabin_type: CabinType;
  total_price: number;
  generated_at: string;
  allergies: string | null;
}

function mapEvent(row: DbCruiseEvent): CruiseEvent {
  return {
    id: String(row.id),
    name: row.name,
    date: row.date,
    destination: row.destination,
    capacity: row.capacity,
    currentBookings: row.current_bookings,
  };
}

function mapReservation(row: DbReservation): Reservation {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    cabinId: row.cabin_id,
    cabinType: row.cabin_type,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    passengers: row.passengers ?? [],
    status: row.status,
    totalGuests: row.total_guests,
    totalPrice: Number(row.total_price),
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    invoiceGenerated: row.invoice_generated,
  };
}

function mapInvoice(row: DbInvoice): Invoice {
  return {
    id: String(row.id),
    reservationId: String(row.reservation_id),
    invoiceNumber: row.invoice_number ?? `INV-${String(row.id).padStart(5, '0')}`,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    totalGuests: row.total_guests,
    cabinType: row.cabin_type,
    totalPrice: Number(row.total_price),
    generatedAt: row.generated_at,
    allergies: row.allergies ?? undefined,
  };
}

interface AppContextType {
  currentUser: User | null;
  userRole: AppRole | null;
  authReady: boolean;
  events: CruiseEvent[];
  reservations: Reservation[];
  invoices: Invoice[];
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  addReservation: (reservation: Omit<Reservation, 'id'> & { id?: string }) => Promise<{ success: boolean; error?: string }>;
  updateReservation: (reservation: Reservation) => Promise<{ success: boolean; error?: string }>;
  deleteReservation: (id: string) => Promise<{ success: boolean; error?: string }>;
  generateInvoice: (reservationId: string) => Promise<Invoice | null>;
  getInvoicesByReservation: (reservationId: string) => Invoice[];
  getEvent: (eventId: string) => CruiseEvent | undefined;
  getReservationsByEvent: (eventId: string) => Reservation[];
  getTopClients: (n: number) => Client[];
  refetch: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [events, setEvents] = useState<CruiseEvent[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    setError(null);

    const [eventsRes, reservationsRes, invoicesRes, userRolesRes] = await Promise.all([
      supabase.from('cruise_events').select('*').order('date', { ascending: true }),
      supabase.from('reservations').select('*').order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').order('generated_at', { ascending: false }),
      supabase.from('user_roles').select('user_id, role').eq('role', 'client'),
    ]);

    if (eventsRes.error) {
      setError(eventsRes.error.message);
      return;
    }
    if (reservationsRes.error) {
      setError(reservationsRes.error.message);
      return;
    }
    if (invoicesRes.error) {
      setError(invoicesRes.error.message);
      return;
    }

    const reservationRows = (reservationsRes.data as DbReservation[]) ?? [];
    const mappedReservations = reservationRows.map(mapReservation);
    const mappedEvents = (eventsRes.data as DbCruiseEvent[]).map((row) => {
      const event = mapEvent(row);
      event.currentBookings = mappedReservations
        .filter((r) => r.eventId === event.id && r.status === 'CONFIRMED')
        .reduce((sum, r) => sum + r.totalGuests, 0);
      return event;
    });
    setEvents(mappedEvents);
    setReservations(mappedReservations);
    setInvoices((invoicesRes.data as DbInvoice[]).map(mapInvoice));

    // Build client list from user_roles + cross-reference reservation data
    const clientRoles = (userRolesRes.data ?? []) as Array<{ user_id: string; role: string }>;

    // For each client user_id, find a matching reservation to get their name/email
    // We use a map keyed by user_id; if no reservations match we still include them
    const mappedClients: Client[] = clientRoles.map((cr) => {
      // Try to match via user_id stored in reservation metadata (not available)
      // Fallback: use the first reservation whose email was registered by this user
      // Since we can't directly map user_id -> email without admin, we create a
      // placeholder that will be enriched if a reservation exists.
      // For now we list all client role entries as stubs and fill in from reservations.
      return {
        userId: cr.user_id,
        email: cr.user_id,   // placeholder — will be overwritten if we find matching reservation
        name: 'Client',
        reservations: [],
        totalSpent: 0,
        totalBookings: 0,
      };
    });

    // Additionally, create client entries from unique reservation emails
    // (this ensures every booker is represented even if their user_role entry exists)
    const uniqueEmailClients = new Map<string, Client>();
    mappedReservations.forEach((r) => {
      const key = r.customerEmail.toLowerCase();
      if (!uniqueEmailClients.has(key)) {
        uniqueEmailClients.set(key, {
          userId: key,  // use email as key when no user_id is available
          email: r.customerEmail,
          name: r.customerName,
          reservations: [],
          totalSpent: 0,
          totalBookings: 0,
        });
      }
      const client = uniqueEmailClients.get(key)!;
      client.reservations.push(r);
      client.totalSpent += r.totalPrice;
      client.totalBookings += 1;
    });

    // Merge: enrich userId-based clients with email/name if possible, else use reservation-derived clients
    const finalClients: Client[] = [];
    const usedEmails = new Set<string>();

    // For user_role clients, try to find their email from reservations
    // (In a full solution this would use an admin API or a profiles table)
    // For now, if we can match by any heuristic, great; otherwise include stub.
    // Since we cannot map user_id -> email client-side, we rely on reservation-derived clients
    // and supplement with any user_role client stubs not already covered.
    uniqueEmailClients.forEach((client) => {
      finalClients.push(client);
      usedEmails.add(client.email.toLowerCase());
    });

    // Add unmatched client role stubs (users with no reservations yet)
    mappedClients.forEach((stub) => {
      // We cannot match without email; include as unknown-email client
      // only if there is no existing client with same userId
      const alreadyExists = finalClients.some((c) => c.userId === stub.userId);
      if (!alreadyExists) {
        finalClients.push(stub);
      }
    });

    setClients(finalClients);
  }, []);

  // Supabase auth: subscribe to changes (mirrors palausport-reservation-ui AuthContext)
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(mapSupabaseUser(session?.user ?? null));
      setUserRole(getUserRoleFromToken(session?.access_token) ?? null);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(mapSupabaseUser(session?.user ?? null));
      setUserRole(getUserRoleFromToken(session?.access_token) ?? null);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch cruise data when authenticated
  useEffect(() => {
    if (!currentUser) {
      queueMicrotask(() => {
        setEvents([]);
        setReservations([]);
        setInvoices([]);
        setIsLoading(false);
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => setIsLoading(true));

    (async () => {
      await fetchData();
      if (!cancelled) setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, [currentUser, fetchData]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    setCurrentUser(mapSupabaseUser(data.user));
    setUserRole(getUserRoleFromToken(data.session?.access_token) ?? null);
    return { success: true };
  };

  const signUp = async (email: string, password: string, name?: string): Promise<{ success: boolean; error?: string }> => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) {
      return { success: false, error: error.message };
    }
    if (data.user) {
      setCurrentUser(mapSupabaseUser(data.user));
      setUserRole(getUserRoleFromToken(data.session?.access_token) ?? null);
    }
    return { success: true };
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUserRole(null);
  };

  const addReservation = async (reservation: Omit<Reservation, 'id'> & { id?: string }): Promise<{ success: boolean; error?: string }> => {
    const supabase = createClient();
    const eventId = parseInt(reservation.eventId, 10);
    if (isNaN(eventId)) {
      return { success: false, error: 'Invalid event ID' };
    }

    const { error } = await supabase.from('reservations').insert({
      event_id: eventId,
      cabin_id: reservation.cabinId,
      cabin_type: reservation.cabinType,
      customer_name: reservation.customerName,
      customer_email: reservation.customerEmail,
      customer_phone: reservation.customerPhone,
      passengers: reservation.passengers,
      status: reservation.status,
      total_guests: reservation.totalGuests,
      total_price: reservation.totalPrice,
      notes: reservation.notes ?? null,
      invoice_generated: false,
    });

    if (error) return { success: false, error: error.message };
    await fetchData();
    return { success: true };
  };

  const updateReservation = async (reservation: Reservation): Promise<{ success: boolean; error?: string }> => {
    const supabase = createClient();
    const id = parseInt(reservation.id, 10);
    if (isNaN(id)) return { success: false, error: 'Invalid reservation ID' };

    const eventId = parseInt(reservation.eventId, 10);
    if (isNaN(eventId)) return { success: false, error: 'Invalid event ID' };

    const { error } = await supabase
      .from('reservations')
      .update({
        event_id: eventId,
        cabin_id: reservation.cabinId,
        cabin_type: reservation.cabinType,
        customer_name: reservation.customerName,
        customer_email: reservation.customerEmail,
        customer_phone: reservation.customerPhone,
        passengers: reservation.passengers,
        status: reservation.status,
        total_guests: reservation.totalGuests,
        total_price: reservation.totalPrice,
        notes: reservation.notes ?? null,
        invoice_generated: reservation.invoiceGenerated ?? false,
      })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    await fetchData();
    return { success: true };
  };

  const deleteReservation = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const supabase = createClient();
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return { success: false, error: 'Invalid reservation ID' };

    const { error } = await supabase.from('reservations').delete().eq('id', numId);
    if (error) return { success: false, error: error.message };
    await fetchData();
    return { success: true };
  };

  const generateInvoice = async (reservationId: string): Promise<Invoice | null> => {
    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) return null;

    const supabase = createClient();
    const resId = parseInt(reservationId, 10);
    if (isNaN(resId)) return null;

    const { data: invoiceRow, error } = await supabase
      .from('invoices')
      .insert({
        reservation_id: resId,
        customer_name: reservation.customerName,
        customer_email: reservation.customerEmail,
        total_guests: reservation.totalGuests,
        cabin_type: reservation.cabinType,
        total_price: reservation.totalPrice,
        allergies: reservation.passengers?.map(p => p.allergies || 'None').join(', ') ?? null,
      })
      .select()
      .single();

    if (error) return null;

    await supabase
      .from('reservations')
      .update({ invoice_generated: true })
      .eq('id', resId);

    await fetchData();

    return mapInvoice(invoiceRow as DbInvoice);
  };

  const getInvoicesByReservation = (reservationId: string): Invoice[] => {
    return invoices.filter(i => i.reservationId === reservationId);
  };

  const getEvent = (eventId: string) => events.find(e => e.id === eventId);
  const getReservationsByEvent = (eventId: string) => reservations.filter(r => r.eventId === eventId);
  const getTopClients = (n: number): Client[] =>
    [...clients]
      .sort((a, b) => b.totalBookings - a.totalBookings || b.totalSpent - a.totalSpent)
      .slice(0, n);

  const value: AppContextType = {
    currentUser,
    userRole,
    authReady,
    events,
    reservations,
    invoices,
    clients,
    isLoading,
    error,
    login,
    signUp,
    logout,
    addReservation,
    updateReservation,
    deleteReservation,
    generateInvoice,
    getInvoicesByReservation,
    getEvent,
    getReservationsByEvent,
    getTopClients,
    refetch: fetchData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
