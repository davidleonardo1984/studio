
import type { VehicleEntry } from '@/lib/types';

// Store entries in memory for this demo
// This should be replaced with API calls to Firebase in a real app
export let entriesStore: VehicleEntry[] = [];
export let waitingYardStore: VehicleEntry[] = [];

// Populate with some mock data for development if stores are empty
if (process.env.NODE_ENV === 'development') {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const lastYear = new Date(today);
    lastYear.setFullYear(today.getFullYear() - 1);


    if (waitingYardStore.length === 0) {
        waitingYardStore.push( { id: '20230115140000', driverName: 'DANIELA SILVA', transportCompanyName: 'BETALOG', plate1: 'JKL-4444', internalDestinationName: 'PÁTIO ESPERA', movementType: 'CARGA PENDENTE', entryTimestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), status: 'aguardando_patio', registeredBy: 'user2', observation: 'AGUARDANDO NF' });
        waitingYardStore.push( { id: '20230115150000', driverName: 'EDUARDO LIMA', transportCompanyName: 'GAMATRANS', plate1: 'MNO-5555', internalDestinationName: 'VERIFICAÇÃO', movementType: 'INSPEÇÃO', entryTimestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), status: 'aguardando_patio', registeredBy: 'user1' });
    }
     if (entriesStore.length === 0) {
        entriesStore.push({ id: '20230115100000', driverName: 'ANA CLARA', transportCompanyName: 'LOGMAX', plate1: 'ABC-1111', internalDestinationName: 'DOCAS 1-3', movementType: 'DESCARGA', entryTimestamp: yesterday.toISOString(), exitTimestamp: new Date(yesterday.getTime() + 2 * 3600 * 1000).toISOString(), status: 'saiu', registeredBy: 'admin', observation: 'MATERIAL "FRÁGIL", MANUSEAR COM CUIDADO.' });
        entriesStore.push({ id: '20230115113000', driverName: 'BRUNO COSTA', transportCompanyName: 'TRANSFAST', plate1: 'DEF-2222', internalDestinationName: 'ARMAZÉM SUL', movementType: 'CARGA', entryTimestamp: new Date().toISOString(), status: 'entrada_liberada', registeredBy: 'user1' });
        entriesStore.push({ id: '20220110090000', driverName: 'CARLOS DIAS', transportCompanyName: 'LOGMAX', plate1: 'GHI-3333', internalDestinationName: 'BLOCO C', movementType: 'DEVOLUÇÃO', entryTimestamp: lastYear.toISOString(), exitTimestamp: new Date(lastYear.getTime() + 4 * 3600 * 1000).toISOString(), status: 'saiu', registeredBy: 'admin' });
        
        // Sample entry for RegistroSaidaPage
        const sampleBarcode = new Date(new Date().setDate(new Date().getDate() -1)).toISOString().slice(0,10).replace(/-/g,'') + "100000"; // YYYYMMDD + HHMMSS from yesterday
        entriesStore.push({
            id: sampleBarcode,
            driverName: 'MOTORISTA TESTE SAIDA',
            transportCompanyName: 'TRANSLOG SAIDA',
            plate1: 'SAI-1234',
            internalDestinationName: 'PATIO SAIDA',
            movementType: 'CARGA',
            entryTimestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // 1 day ago
            status: 'entrada_liberada',
            registeredBy: 'admin',
        });
    }
}
