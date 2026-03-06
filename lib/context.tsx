'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  CruiseEvent,
  Reservation,
  Invoice,
  User,
  CabinType,
  Passenger,
} from './types';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

function mapSupabaseUser(sbUser: SupabaseUser | null): User | null {
  if (!sbUser) return null;
  return {
    id: sbUser.id,
    email: sbUser.email ?? '',
    name: sbUser.user_metadata?.name ?? sbUser.email?.split('@')[0] ?? 'User',
  };
}

interface AppContextType {
  currentUser: User | null;
  events: CruiseEvent[];
  reservations: Reservation[];
  invoices: Invoice[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  addReservation: (reservation: Reservation) => void;
  updateReservation: (reservation: Reservation) => void;
  deleteReservation: (id: string) => void;
  generateInvoice: (reservationId: string) => Invoice | null;
  getInvoicesByReservation: (reservationId: string) => Invoice[];
  populateDemoData: () => void;
  getEvent: (eventId: string) => CruiseEvent | undefined;
  getReservationsByEvent: (eventId: string) => Reservation[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mock data generator
function generateDemoData() {
  const events: CruiseEvent[] = [
    {
      id: '1',
      name: 'Caribbean Dream',
      date: '2024-06-15',
      destination: 'Caribbean Islands',
      capacity: 26,
      currentBookings: 0,
    },
    {
      id: '2',
      name: 'Mediterranean Escape',
      date: '2024-07-20',
      destination: 'Mediterranean Sea',
      capacity: 26,
      currentBookings: 0,
    },
    {
      id: '3',
      name: 'Alaska Adventure',
      date: '2024-08-10',
      destination: 'Alaska',
      capacity: 26,
      currentBookings: 0,
    },
  ];

  const firstNames = ['John', 'Sarah', 'Michael', 'Emma', 'David', 'Lisa', 'James', 'Maria'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const allergies = [
    'None',
    'Peanuts',
    'Shellfish',
    'Dairy',
    'Gluten',
    'Nuts',
    'Fish',
  ];

  const reservations: Reservation[] = [];

  // Generate random reservations up to 26 pax
  let currentPax = 0;
  const maxPax = 26;
  let i = 0;

  while (currentPax < maxPax - 2 && i < 13) { // 13 rooms max
    const guestCount = 2; // Each room has 2 pax as per request
    const passengers: Passenger[] = [];

    for (let j = 0; j < guestCount; j++) {
      passengers.push({
        id: `${i}-${j}`,
        name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
        age: Math.floor(Math.random() * 60) + 18,
        allergies: allergies[Math.floor(Math.random() * allergies.length)],
      });
    }

    const cabinType = i < 9 ? 'BUNK' : 'QUEEN_SUITE';
    const cabinPrices: Record<CabinType, number> = {
      BUNK: 800,
      QUEEN_SUITE: 1500,
    };

    reservations.push({
      id: `res-${i}`,
      eventId: `${Math.floor(Math.random() * 3) + 1}`,
      cabinId: `cabin-${i + 1}`,
      cabinType,
      customerName: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
      customerEmail: `customer${i}@example.com`,
      customerPhone: `555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      passengers,
      status: 'CONFIRMED',
      totalGuests: guestCount,
      totalPrice: cabinPrices[cabinType],
      notes: 'Demo reservation',
      createdAt: new Date().toISOString(),
      invoiceGenerated: false,
    });

    currentPax += guestCount;
    i++;
  }

  return { events, reservations };
}

const DEFAULT_EVENTS: CruiseEvent[] = [
  { id: '1', name: 'Caribbean Dream', date: '2024-06-15', destination: 'Caribbean Islands', capacity: 26, currentBookings: 0 },
  { id: '2', name: 'Mediterranean Escape', date: '2024-07-20', destination: 'Mediterranean Sea', capacity: 26, currentBookings: 0 },
  { id: '3', name: 'Alaska Adventure', date: '2024-08-10', destination: 'Alaska', capacity: 26, currentBookings: 0 },
];

function loadCruiseDataFromStorage(): {
  events: CruiseEvent[];
  reservations: Reservation[];
  invoices: Invoice[];
} {
  if (typeof window === 'undefined') {
    return { events: DEFAULT_EVENTS, reservations: [], invoices: [] };
  }
  const savedData = localStorage.getItem('cruiseData');
  if (!savedData) {
    return { events: DEFAULT_EVENTS, reservations: [], invoices: [] };
  }
  try {
    const parsed = JSON.parse(savedData);
    return {
      events: parsed.events ?? DEFAULT_EVENTS,
      reservations: parsed.reservations ?? [],
      invoices: parsed.invoices ?? [],
    };
  } catch {
    return { events: DEFAULT_EVENTS, reservations: [], invoices: [] };
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [events, setEvents] = useState<CruiseEvent[]>(() => loadCruiseDataFromStorage().events);
  const [reservations, setReservations] = useState<Reservation[]>(() => loadCruiseDataFromStorage().reservations);
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadCruiseDataFromStorage().invoices);

  // Supabase auth: get initial session and subscribe to changes
  useEffect(() => {
    const supabase = createClient();

    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(mapSupabaseUser(session?.user ?? null));
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(mapSupabaseUser(session?.user ?? null));
    });

    return () => subscription.unsubscribe();
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      'cruiseData',
      JSON.stringify({ events, reservations, invoices })
    );
  }, [events, reservations, invoices]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    setCurrentUser(mapSupabaseUser(data.user));
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
    }
    return { success: true };
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const addReservation = (reservation: Reservation) => {
    const totalGuests = reservations.reduce((sum, r) => sum + r.totalGuests, 0) + reservation.totalGuests;
    if (totalGuests <= 26) {
      setReservations([...reservations, reservation]);
    }
  };

  const updateReservation = (reservation: Reservation) => {
    setReservations(reservations.map(r => (r.id === reservation.id ? reservation : r)));
  };

  const deleteReservation = (id: string) => {
    setReservations(reservations.filter(r => r.id !== id));
  };

  const generateInvoice = (reservationId: string): Invoice | null => {
    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) return null;

    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      reservationId,
      invoiceNumber: `INV-${String(invoices.length + 1).padStart(5, '0')}`,
      customerName: reservation.customerName,
      customerEmail: reservation.customerEmail,
      totalGuests: reservation.totalGuests,
      cabinType: reservation.cabinType,
      totalPrice: reservation.totalPrice,
      generatedAt: new Date().toISOString(),
      allergies: reservation.passengers.map(p => p.allergies || 'None').join(', '),
    };

    setInvoices([...invoices, invoice]);
    updateReservation({ ...reservation, invoiceGenerated: true });

    return invoice;
  };

  const getInvoicesByReservation = (reservationId: string): Invoice[] => {
    return invoices.filter(i => i.reservationId === reservationId);
  };

  const populateDemoData = () => {
    const { events: demoEvents, reservations: demoReservations } = generateDemoData();

    // Update current bookings for each event
    const updatedEvents = demoEvents.map(event => {
      const eventReservations = demoReservations.filter(r => r.eventId === event.id);
      const totalBookings = eventReservations.reduce((sum, r) => sum + r.totalGuests, 0);
      return {
        ...event,
        currentBookings: Math.min(totalBookings, event.capacity),
      };
    });

    setEvents(updatedEvents);
    setReservations(demoReservations);
    setInvoices([]);
  };

  const getEvent = (eventId: string) => {
    return events.find(e => e.id === eventId);
  };

  const getReservationsByEvent = (eventId: string) => {
    return reservations.filter(r => r.eventId === eventId);
  };

  const value: AppContextType = {
    currentUser,
    events,
    reservations,
    invoices,
    login,
    signUp,
    logout,
    addReservation,
    updateReservation,
    deleteReservation,
    generateInvoice,
    getInvoicesByReservation,
    populateDemoData,
    getEvent,
    getReservationsByEvent,
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
