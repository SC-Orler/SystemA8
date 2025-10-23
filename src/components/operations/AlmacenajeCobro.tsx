import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

interface EntryFormData {
  date: string;
  kilos: number;
  chargeStartDays: number;
  monthlyRate: number;
}

interface ExitFormData {
  date: string;
  kilos: number;
}

interface Entry {
  id: string;
  date: string;
  kilos: number;
  chargeStartDays: number;
  monthlyRate: number;
  dailyRate: number;
}

interface Exit {
  id: string;
  date: string;
  kilos: number;
}

interface Client {
  id: string;
  name: string;
  entries: Entry[];
  exits: Exit[];
}

const AlmacenajeCobro: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([
    {
      id: '1',
      name: 'Pruebas',
      entries: [
        { id: 'e1', date: '2025-10-10', kilos: 6500, chargeStartDays: 7, monthlyRate: 1.30, dailyRate: 1.30 / 30 },
        { id: 'e2', date: '2025-10-17', kilos: 2000, chargeStartDays: 7, monthlyRate: 1.30, dailyRate: 1.30 / 30 }
      ],
      exits: [
        { id: 'x1', date: '2025-10-30', kilos: 1000 }
      ]
    }
  ]);
  
  const [selectedClientId, setSelectedClientId] = useState<string>('1');
  const [balanceDate, setBalanceDate] = useState<string>('2025-10-31');
  const [balance, setBalance] = useState<number | null>(null);

  const entryForm = useForm<EntryFormData>({
    defaultValues: { chargeStartDays: 7, monthlyRate: 1.30 }
  });
  const exitForm = useForm<ExitFormData>();

  const addClient = () => {
    const name = prompt('Nombre del cliente:');
    if (name) {
      const newClient: Client = {
        id: crypto.randomUUID(),
        name,
        entries: [],
        exits: [],
      };
      setClients(prev => [...prev, newClient]);
      toast.success('Cliente agregado');
    }
  };

  const addEntry = (data: EntryFormData) => {
    const newEntry: Entry = { 
      ...data, 
      id: crypto.randomUUID(),
      dailyRate: data.monthlyRate / 30
    };
    setClients(prev => prev.map(client => {
      if (client.id === selectedClientId) {
        return { ...client, entries: [...client.entries, newEntry] };
      }
      return client;
    }));
    entryForm.reset({ chargeStartDays: 7, monthlyRate: 1.30 });
    toast.success(`Entrada agregada: $${data.monthlyRate}/mes`);
  };

  const addExit = (data: ExitFormData) => {
    const newExit: Exit = { ...data, id: crypto.randomUUID() };
    setClients(prev => prev.map(client => {
      if (client.id === selectedClientId) {
        return { ...client, exits: [...client.exits, newExit] };
      }
      return client;
    }));
    exitForm.reset();
    toast.success('Salida agregada');
  };

  // ✅ DAYJS SIMPLIFICADO - SIN ERRORES
  const calculateBalance = () => {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client || client.entries.length === 0) {
      toast.error('No hay entradas');
      return;
    }

    const toDate = dayjs(balanceDate);
    let totalBalance = 0;
    const batchKilos = { ...client.entries.reduce((acc, e) => ({ ...acc, [e.id]: e.kilos }), {}) };

    const dates = client.entries.map(e => dayjs(e.date));
    const startDate = dates.sort((a, b) => a.unix() - b.unix())[0];
    
    for (let day = startDate; !day.isAfter(toDate); day = day.add(1, 'day')) {
      
      // ENTRADAS
      client.entries
        .filter(e => dayjs(e.date).isSame(day, 'day'))
        .forEach(entry => {
          batchKilos[entry.id] = entry.kilos;
        });

      // COBRO - ✅ CORREGIDO
      client.entries.forEach(entry => {
        if (batchKilos[entry.id] > 0) {
          const chargeStart = dayjs(entry.date).add(entry.chargeStartDays, 'day');
          if (day.isSame(chargeStart, 'day') || day.isAfter(chargeStart)) {
            totalBalance += batchKilos[entry.id] * entry.dailyRate;
          }
        }
      });

      // SALIDAS FIFO
      const exitsToday = client.exits.filter(e => dayjs(e.date).isSame(day, 'day'));
      let remainingExit = exitsToday.reduce((sum, e) => sum + e.kilos, 0);
      
      if (remainingExit > 0) {
        Object.keys(batchKilos)
          .filter(id => batchKilos[id] > 0)
          .sort((a, b) => {
            const entryA = client.entries.find(e => e.id === a)!;
            const entryB = client.entries.find(e => e.id === b)!;
            return dayjs(entryA.date).diff(dayjs(entryB.date));
          })
          .forEach(batchId => {
            if (remainingExit <= 0) return;
            const available = batchKilos[batchId];
            if (available > 0) {
              const consume = Math.min(available, remainingExit);
              batchKilos[batchId] -= consume;
              remainingExit -= consume;
            }
          });
      }
    }

    setBalance(totalBalance);
    toast.success(`✅ $${totalBalance.toFixed(2)}`);
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">📦 Registro de Cobro Almacenaje</h1>

      <div className="p-4 bg-white rounded-lg shadow">
        <div className="flex gap-4 items-end">
          <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="flex-1 p-3 border rounded-lg">
            <option value="">Selecciona un cliente</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          <button onClick={addClient} className="px-6 py-3 bg-blue-500 text-white rounded-lg">➕ Nuevo Cliente</button>
        </div>
      </div>

      {selectedClient && (
        <div className="space-y-6">
          {/* ENTRADAS CON SCROLL */}
          <div className="p-4 bg-green-50 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-green-800">📥 Entradas</h2>
            <form onSubmit={entryForm.handleSubmit(addEntry)} className="grid grid-cols-5 gap-4 mb-4">
              <input {...entryForm.register('date', { required: true })} type="date" className="p-3 border rounded-lg" />
              <input {...entryForm.register('kilos', { required: true, min: 0 })} type="number" placeholder="Kilos" className="p-3 border rounded-lg" />
              <input defaultValue={7} {...entryForm.register('chargeStartDays')} type="number" className="p-3 border rounded-lg bg-green-50" />
              <input defaultValue={1.30} {...entryForm.register('monthlyRate')} type="number" step="0.01" className="p-3 border rounded-lg bg-green-100 text-green-800 font-bold" />
              <button type="submit" className="p-3 bg-green-600 text-white rounded-lg">➕ Agregar</button>
            </form>
            <div className="max-h-48 overflow-y-auto border rounded-lg bg-white">
              {selectedClient.entries.map(entry => (
                <div key={entry.id} className="flex justify-between p-3 border-b last:border-b-0">
                  <span>{dayjs(entry.date).format('DD/MM')} - {entry.kilos.toLocaleString()}kg</span>
                  <span>${entry.monthlyRate}/mes (día {entry.chargeStartDays})</span>
                </div>
              ))}
            </div>
          </div>

          {/* SALIDAS CON SCROLL */}
          <div className="p-4 bg-red-50 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-red-800">📤 Salidas</h2>
            <form onSubmit={exitForm.handleSubmit(addExit)} className="grid grid-cols-3 gap-4 mb-4">
              <input {...exitForm.register('date', { required: true })} type="date" className="p-3 border rounded-lg" />
              <input {...exitForm.register('kilos', { required: true, min: 0 })} type="number" placeholder="Kilos" className="p-3 border rounded-lg" />
              <button type="submit" className="p-3 bg-red-600 text-white rounded-lg">➖ Salida</button>
            </form>
            <div className="max-h-48 overflow-y-auto border rounded-lg bg-white">
              {selectedClient.exits.map(exit => (
                <div key={exit.id} className="flex justify-between p-3 border-b last:border-b-0">
                  <span>{dayjs(exit.date).format('DD/MM')} - {exit.kilos.toLocaleString()}kg</span>
                </div>
              ))}
            </div>
          </div>

          {/* FIXED CALCULAR */}
          <div className="sticky bottom-0 bg-white p-4 border-t shadow-lg z-10">
            <div className="grid grid-cols-3 gap-4 items-center max-w-md mx-auto">
              <input type="date" value={balanceDate} onChange={(e) => setBalanceDate(e.target.value)} className="p-3 border rounded-lg" />
              <button onClick={calculateBalance} className="p-3 bg-purple-600 text-white rounded-lg font-bold">🧮 CALCULAR</button>
              <div>
                {balance !== null && (
                  <div className="bg-purple-50 p-3 rounded-lg text-right">
                    <h3 className="font-bold text-lg text-purple-800">${balance.toFixed(2)}</h3>
                    <p className="text-xs text-purple-600">al {dayjs(balanceDate).format('DD/MM/YYYY')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlmacenajeCobro;