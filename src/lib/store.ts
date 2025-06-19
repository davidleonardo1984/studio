
import type { Driver, TransportCompany, InternalDestination } from '@/lib/types';

// Mock data stores (centralized)
export let personsStore: Driver[] = [];
export let transportCompaniesStore: TransportCompany[] = [];
export let internalDestinationsStore: InternalDestination[] = [];

// Initialize with some mock data for development if stores are empty
if (process.env.NODE_ENV === 'development') {
    if (personsStore.length === 0) {
        personsStore.push({ id: 'd1', name: 'CARLOS PEREIRA (MOTORISTA)', cpf: '11122233344', cnh: '123456789', phone: '11999998888' });
        personsStore.push({ id: 'a1', name: 'JOANA SILVA (AJUDANTE)', cpf: '44455566677', cnh: '987654321', phone: '11988887777' });
        personsStore.push({ id: 'd2', name: 'MARCOS ALMEIDA (MOTORISTA)', cpf: '88877766655', cnh: '112233445', phone: '21977776666'});
    }
    if (transportCompaniesStore.length === 0) {
        transportCompaniesStore.push({ id: 'tc1', name: 'LOGISTICA VELOZ LTDA' });
        transportCompaniesStore.push({ id: 'tc2', name: 'TRANSPORTES RÁPIDOS S.A.' });
        transportCompaniesStore.push({ id: 'tc3', name: 'TRANSALPHA' });
        transportCompaniesStore.push({ id: 'tc4', name: 'BETALOG' });
        transportCompaniesStore.push({ id: 'tc5', name: 'CARGAEXPRESS' });
        transportCompaniesStore.push({ id: 'tc6', name: 'GAMATRANS' });
    }
    if (internalDestinationsStore.length === 0) {
        internalDestinationsStore.push({ id: 'id1', name: 'GALPÃO CENTRAL' });
        internalDestinationsStore.push({ id: 'id2', name: 'ALMOXARIFADO PRINCIPAL' });
        internalDestinationsStore.push({ id: 'id3', name: 'ALMOXARIFADO A' });
        internalDestinationsStore.push({ id: 'id4', name: 'PRODUÇÃO BLOCO B' });
        internalDestinationsStore.push({ id: 'id5', name: 'EXPEDIÇÃO SETOR C' });
        internalDestinationsStore.push({ id: 'id6', name: 'PÁTIO ESPERA' });
        internalDestinationsStore.push({ id: 'id7', name: 'VERIFICAÇÃO' });
    }
}
