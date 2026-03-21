export type CabinType = 'BUNK' | 'QUEEN_SUITE';
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type CabinStatus = 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE';

export interface Passenger {
  id: string;
  fullName: string;
  // age: number;
  // gender: string;
  // phone?: string;
  cabinType: CabinType;
  allergies?: string;
}

export interface Reservation {
  id: string;
  eventId: string;
  cabinId: string;
  cabinType: CabinType;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  passengers: Passenger[];
  status: ReservationStatus;
  totalGuests: number;
  totalPrice: number;
  notes?: string;
  createdAt: string;
  invoiceGenerated?: boolean;
}

export interface Cabin {
  id: string;
  cabinNumber: string;
  type: CabinType;
  status: CabinStatus;
  maxCapacity: number;
  currentOccupancy: number;
}

export interface CruiseEvent {
  id: string;
  name: string;
  date: string;
  destination: string;
  capacity: number;
  currentBookings: number;
}

export interface Invoice {
  id: string;
  reservationId: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  totalGuests: number;
  cabinType: CabinType;
  totalPrice: number;
  generatedAt: string;
  allergies?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Client {
  userId: string;
  email: string;
  name: string;
  reservations: Reservation[];
  totalSpent: number;
  totalBookings: number;
}
