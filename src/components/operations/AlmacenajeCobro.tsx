import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

interface EntryFormData {
  date: string;
  kilos: number;
  chargeStartDays: number;
  monthlyRate: number;  // ← CAMBIADO: PRECIO MENSUAL
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
  monthlyRate: number;  // ← MENSUAL
  dailyRate: number;    // ← CALCULADO: monthlyRate / 30
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
    // ← DATOS DE PRUEBA
    {
      id: '1',
      name: 'Pruebas',
      entries: [
        { 
          id: 'e1', 
          date: '2025-10-10', 
          kilos: 6500, 
          chargeStartDays: 7, 
          monthlyRate: 1.30,
          dailyRate: 1.30 / 30  // 0.043333333
        },
        { 
          id: 'e2', 
          date: '2025-10-17', 
          kilos: 2000, 
          chargeStartDays: 7, 
          monthlyRate: 1.30,
          dailyRate: 1.30 / 30
        }
      ],
      exits: [
        { id: 'x1', date: '2025-10-30', kilos: 1000 }
      ]
    }
  ]);
  
  const [selectedClientId, setSelectedClientId] = useState<string>('1');
  const [balanceDate, setBalanceDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [balance, setBalance] = useState<number | null>(null);

  const entryForm = useForm<EntryFormData>();
  const exitForm = useForm<ExitFormData>();

  // ← AGREGAR CLIENTE
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

  // ← AGREGAR ENTRADA (AUTO-CALCULA dailyRate)
  const addEntry = (data: EntryFormData) => {
    const newEntry: Entry = { 
      ...data, 
      id: crypto.randomUUID(),
      dailyRate: data.monthlyRate / 30  // ← AUTO-DIVIDE
    };
    setClients(prev => prev.map(client => {
      if (client.id === selectedClientId) {
        return { ...client, entries: [...client.entries, newEntry] };
      }
      return client;
    }));
    entryForm.reset();
    toast.success(`Entrada agregada: $${data.monthlyRate}/mes = $${(data.monthlyRate/30).toFixed(6)}/día`);
  };

  // ← AGREGAR SALIDA
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

  // ← CALCULAR BALANCE (USANDO dailyRate)
  const calculateBalance = () => {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    const toDate = dayjs(balanceDate);
    let totalBalance = 0;
    let currentKilosByBatch: { [batchId: string]: number } = {};

    // Inicializar kilos por batch
    client.entries.forEach(entry => {
      currentKilosByBatch[entry.id] = entry.kilos;
    });

    // Obtener todas las fechas únicas
    const allDates = [
      ...client.entries.map(e => dayjs(e.date)),
      ...client.exits.map(e => dayjs(e.date)),
      toDate
    ].sort((a, b) => a.unix() - b.unix());

    // Calcular día por día
    for (let i = 0; i < allDates.length - 1; i++) {
      const currentDate = allDates[i];
      const nextDate = allDates[i + 1];
      const daysDiff = nextDate.diff(currentDate, 'day');

      // Calcular costo por cada batch que ya está cobrando
      client.entries.forEach(entry => {
        const startChargeDate = dayjs(entry.date).add(entry.chargeStartDays, 'day');
        if (currentKilosByBatch[entry.id] > 0 && currentDate.isSameOrAfter(startChargeDate)) {
          const chargeDays = currentDate.diff(startChargeDate, 'day') + 1;
          totalBalance += currentKilosByBatch[entry.id] * entry.dailyRate * chargeDays;
        }
      });

      // Aplicar salidas del día (FIFO)
      const exitsToday = client.exits.filter(e => dayjs(e.date).isSame(currentDate));
      let totalExitKilos = exitsToday.reduce((sum, e) => sum + e.kilos, 0);
      
      if (totalExitKilos > 0) {
        // FIFO: Consumir batches más antiguos primero
        Object.keys(currentKilosByBatch)
          .sort((a, b) => {
            const entryA = client.entries.find(e => e.id === a)!;
            const entryB = client.entries.find(e => e.id === b)!;
            return dayjs(entryA.date).diff(dayjs(entryB.date));
          })
          .forEach(batchId => {
            if (totalExitKilos <= 0) return;
            const available = currentKilosByBatch[batchId];
            if (available > 0) {
              const consume = Math.min(available, totalExitKilos);
              currentKilosByBatch[batchId] -= consume;
              totalExitKilos -= consume;
            }
          });
      }
    }

    setBalance(totalBalance);
    toast.success(`Balance calculado: $${totalBalance.toFixed(2)}`);
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">📦 Registro de Cobro Almacenaje</h1>

      {/* SELECT CLIENTE */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <div className="flex gap-4 items-end">
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona un cliente</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <button
            onClick={addClient}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            ➕ Nuevo Cliente
          </button>
        </div>
      </div>

      {selectedClient && (
        <>
          {/* FORM ENTRADAS - CAMBIADO A MENSUAL */}
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-green-800">📥 Entradas</h2>
            <form
              onSubmit={entryForm.handleSubmit(addEntry)}
              className="grid grid-cols-5 gap-4"
            >
              <input
                {...entryForm.register('date', { required: true })}
                type="date"
                className="p-3 border rounded-lg"
              />
              <input
                {...entryForm.register('kilos', { required: true, min: 0 })}
                type="number"
                placeholder="Kilos"
                className="p-3 border rounded-lg"
              />
              <input
                {...entryForm.register('chargeStartDays', { required: true, min: 0 })}
                type="number"
                placeholder="Días para cobrar"
                className="p-3 border rounded-lg"
              />
              <input
                {...entryForm.register('monthlyRate', { required: true, min: 0 })}
                type="number"
                step="0.01"
                placeholder="$1.30"
                className="p-3 border rounded-lg"
              />
              <button
                type="submit"
                className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                ➕ Agregar
              </button>
            </form>

            {/* LISTA ENTRADAS - MUESTRA MENSUAL + DIARIO */}
            <div className="mt-4 max-h-40 overflow-auto">
              {selectedClient.entries.map(entry => (
                <div key={entry.id} className="flex justify-between p-3 bg-white rounded mb-2 shadow-sm">
                  <span className="font-medium">
                    {dayjs(entry.date).format('DD/MM')} - {entry.kilos.toLocaleString()}kg
                  </span>
                  <div className="text-right">
                    <div><strong>${entry.monthlyRate}/mes</strong></div>
                    <div className="text-sm text-gray-600">
                      (${entry.dailyRate.toFixed(6)}/día) - desde día {entry.chargeStartDays}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FORM SALIDAS */}
          <div className="mb-6 p-4 bg-red-50 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-red-800">📤 Salidas</h2>
            <form
              onSubmit={exitForm.handleSubmit(addExit)}
              className="grid grid-cols-3 gap-4"
            >
              <input
                {...exitForm.register('date', { required: true })}
                type="date"
                className="p-3 border rounded-lg"
              />
              <input
                {...exitForm.register('kilos', { required: true, min: 0 })}
                type="number"
                placeholder="Kilos"
                className="p-3 border rounded-lg"
              />
              <button
                type="submit"
                className="p-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                ➖ Salida
              </button>
            </form>

            {/* LISTA SALIDAS */}
            <div className="mt-4 max-h-40 overflow-auto">
              {selectedClient.exits.map(exit => (
                <div key={exit.id} className="flex justify-between p-2 bg-white rounded mb-2">
                  <span>{dayjs(exit.date).format('DD/MM')} - {exit.kilos.toLocaleString()}kg</span>
                </div>
              ))}
            </div>
          </div>

          {/* CALCULAR SALDO */}
          <div className="p-4 bg-purple-50 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-purple-800">💰 Calcular Saldo</h2>
            <div className="grid grid-cols-3 gap-4 items-end">
              <input
                type="date"
                value={balanceDate}
                onChange={(e) => setBalanceDate(e.target.value)}
                max={dayjs().format('YYYY-MM-DD')}
                className="p-3 border rounded-lg col-span-1"
              />
              <button
                onClick={calculateBalance}
                className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 col-span-1"
              >
                🧮 Calcular
              </button>
              <div className="col-span-1 text-right">
                {balance !== null && (
                  <div className="bg-white p-4 rounded-lg shadow-lg border-l-4 border-purple-500">
                    <h3 className="font-bold text-2xl text-purple-800">${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    <p className="text-sm text-gray-600">Saldo al {dayjs(balanceDate).format('DD/MM/YYYY')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AlmacenajeCobro;