
import type { User, UserRole, Driver, InternalDestination, VehicleEntry, VehicleEntryFormData, EntryStatus } from './types';

// In-memory store for users
let users: User[] = [
  { id: 'admin001', name: 'Administrador', login: 'admin', role: 'admin' as UserRole, password: 'admin' },
  { id: 'user001', name: 'Usuário Padrão', login: 'user', role: 'user' as UserRole, password: 'user' },
];

export const usersStore = {
  getUsers: () => [...users],
  findUserById: (id: string) => users.find(u => u.id === id),
  findUserByLogin: (login: string) => users.find(u => u.login.toLowerCase() === login.toLowerCase()),
  addUser: (newUser: Omit<User, 'id'>) => {
    const userExists = users.some(u => u.login.toLowerCase() === newUser.login.toLowerCase());
    if (userExists) return null;
    const user: User = { ...newUser, id: `user${Date.now()}` };
    users.push(user);
    return user;
  },
  updateUser: (updatedUser: User) => {
    const loginExists = users.some(u => u.id !== updatedUser.id && u.login.toLowerCase() === updatedUser.login.toLowerCase());
    if(loginExists) return null;

    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updatedUser };
      return users[index];
    }
    return null;
  },
  deleteUser: (userId: string) => {
    const initialLength = users.length;
    users = users.filter(u => u.id !== userId);
    return users.length < initialLength;
  },
  // Insecure, for demo only
  checkCredentials: (login: string, pass: string): User | null => {
    const user = users.find(u => u.login.toLowerCase() === login.toLowerCase() && u.password === pass);
    if (user) {
      const { password, ...userToReturn } = user;
      return userToReturn;
    }
    return null;
  }
};

// In-memory store for persons (drivers/assistants)
let persons: Driver[] = [
    { id: 'd1', name: 'João da Silva', cpf: '11122233344', cnh: '123456789', phone: '11999998888' },
    { id: 'd2', name: 'Maria Oliveira', cpf: '22233344455', cnh: '987654321', phone: '21888887777' },
    { id: 'd3', name: 'Carlos Pereira', cpf: '33344455566', phone: '31777776666' },
];

export const personsStore = {
  getPersons: () => [...persons],
  addPerson: (newPerson: Omit<Driver, 'id'>) => {
    const person: Driver = { ...newPerson, id: `p${Date.now()}` };
    persons.push(person);
    return person;
  },
  updatePerson: (updatedPerson: Driver) => {
    const index = persons.findIndex(p => p.id === updatedPerson.id);
    if (index !== -1) {
      persons[index] = { ...persons[index], ...updatedPerson };
      return persons[index];
    }
    return null;
  },
  deletePerson: (personId: string) => {
    const initialLength = persons.length;
    persons = persons.filter(p => p.id !== personId);
    return persons.length < initialLength;
  },
};


// In-memory store for internal destinations
let internalDestinations: InternalDestination[] = [
    { id: 'dest1', name: 'ALMOXARIFADO A' },
    { id: 'dest2', name: 'PRODUÇÃO B' },
    { id: 'dest3', name: 'EXPEDIÇÃO C' },
];

export const destinationsStore = {
  getDestinations: () => [...internalDestinations],
  addDestination: (newDestination: Omit<InternalDestination, 'id'>) => {
    const dest: InternalDestination = { ...newDestination, id: `dest${Date.now()}` };
    internalDestinations.push(dest);
    return dest;
  },
  updateDestination: (updatedDestination: InternalDestination) => {
    const index = internalDestinations.findIndex(d => d.id === updatedDestination.id);
    if (index !== -1) {
      internalDestinations[index] = { ...internalDestinations[index], ...updatedDestination };
      return internalDestinations[index];
    }
    return null;
  },
  deleteDestination: (destinationId: string) => {
    const initialLength = internalDestinations.length;
    internalDestinations = internalDestinations.filter(d => d.id !== destinationId);
    return internalDestinations.length < initialLength;
  }
};


// In-memory store for vehicle entries
let vehicleEntries: VehicleEntry[] = [
    // Example entries
];

const generateBarcode = () => {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

export const entriesStore = {
    getEntries: () => [...vehicleEntries],
    getEntriesByStatus: (status: EntryStatus | EntryStatus[]) => {
        const statuses = Array.isArray(status) ? status : [status];
        return vehicleEntries.filter(e => statuses.includes(e.status));
    },
    findEntryById: (id: string) => vehicleEntries.find(e => e.id === id),
    addEntry: (data: VehicleEntryFormData, status: EntryStatus, userLogin: string, liberatedBy?: string) => {
        const currentTime = new Date().toISOString();
        const newEntry: VehicleEntry = {
            id: generateBarcode(),
            ...data,
            arrivalTimestamp: currentTime,
            status,
            registeredBy: userLogin,
            ...(status === 'entrada_liberada' && {
                liberationTimestamp: currentTime,
                liberatedBy,
            }),
        };
        vehicleEntries.unshift(newEntry);
        return newEntry;
    },
    updateEntryStatus: (id: string, newStatus: EntryStatus, additionalData?: Partial<VehicleEntry>) => {
        const index = vehicleEntries.findIndex(e => e.id === id);
        if (index !== -1) {
            vehicleEntries[index] = { ...vehicleEntries[index], status: newStatus, ...additionalData };
            return vehicleEntries[index];
        }
        return null;
    }
};
