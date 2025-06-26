
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'user' | 'gate_agent';

export interface User {
  id: string;
  name: string;
  login: string;
  password?: string; // Stored in DB, but optional in frontend models
  role: UserRole;
  canViewDashboardStats?: boolean;
}

export type NewUser = Omit<User, 'id'>;

export interface Driver {
  id: string;
  name:string;
  cpf: string;
  cnh?: string;
  phone?: string;
  isBlocked?: boolean;
}

export type NewDriver = Omit<Driver, 'id'>;

export interface Assistant extends Driver {}

export interface TransportCompany {
  id:string;
  name: string;
}

export type NewTransportCompany = Omit<TransportCompany, 'id'>;

export interface InternalDestination {
  id: string;
  name: string;
}

export type NewInternalDestination = Omit<InternalDestination, 'id'>;


export type EntryStatus = 'aguardando_patio' | 'entrada_liberada' | 'saiu';

export interface VehicleEntry {
  id: string; 
  barcode: string;
  driverName: string; 
  assistant1Name?: string;
  assistant2Name?: string;
  transportCompanyName: string;
  plate1: string;
  plate2?: string;
  plate3?: string;
  internalDestinationName: string;
  movementType: string; 
  observation?: string;
  arrivalTimestamp: Timestamp | string; 
  liberationTimestamp?: Timestamp | string;
  exitTimestamp?: Timestamp | string; 
  status: EntryStatus;
  registeredBy: string; 
  liberatedBy?: string;
  notified?: boolean;
}


export interface VehicleEntryFormData {
  driverName: string; 
  assistant1Name?: string;
  assistant2Name?: string;
  transportCompanyName: string;
  plate1: string;
  plate2?: string;
  plate3?: string;
  internalDestinationName: string;
  movementType: string;
  observation?: string;
}

export interface AppNotification {
  id: string;
  vehicleEntryId: string;
  plate1: string;
  driverName: string;
  driverPhone?: string;
  createdAt: Timestamp;
  createdBy: string; 
}
