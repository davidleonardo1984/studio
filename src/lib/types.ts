
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  login: string;
  password?: string; // Only for creation/update forms
  role: UserRole;
}

export interface Driver {
  id: string;
  name: string;
  cpf: string;
  cnh?: string;
  phone?: string;
}

export interface Assistant extends Driver {}

export interface TransportCompany {
  id:string;
  name: string;
}

export interface InternalDestination {
  id: string;
  name: string;
}

export type EntryStatus = 'aguardando_patio' | 'entrada_liberada' | 'saiu';

export interface VehicleEntry {
  id: string; // Barcode: YYYYMMDDHHMMSS, generated on entry
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
  arrivalTimestamp: string; // Renamed from entryTimestamp
  liberationTimestamp?: string; // New field for liberation time
  exitTimestamp?: string; // ISO string or formatted
  status: EntryStatus;
  registeredBy: string; // User login
  liberatedBy?: string;
}

// For forms that might reference IDs from registered entities
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
