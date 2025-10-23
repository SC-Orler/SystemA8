import React, { useState } from 'react';
import { Plus, X, Save, Trash2, Printer, Edit, Edit2 } from 'lucide-react';
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
  const [showEntryForm, setShowEntryForm] = useState<boolean>(false);
  const [showExitForm, setShowExitForm] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editingExit, setEditingExit] = useState<Exit | null>(null);

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
      id: editingEntry?.id || crypto.randomUUID(),
      dailyRate: data.monthlyRate / 30
    };
    
    setClients(prev => prev.map(client => {
      if (client.id === selectedClientId) {
        if (editingEntry) {
          // EDITAR
          return { 
            ...client, 
            entries: client.entries.map(e => 
              e.id === editingEntry.id ? newEntry : e
            ) 
          };
        } else {
          // NUEVO
          return { ...client, entries: [...client.entries, newEntry] };
        }
      }
      return client;
    }));
    
    entryForm.reset({ chargeStartDays: 7, monthlyRate: 1.30 });
    setShowEntryForm(false);
    setEditingEntry(null);
    toast.success(editingEntry ? 'Entrada actualizada' : 'Entrada agregada');
  };

  const addExit = (data: ExitFormData) => {
    const newExit: Exit = { 
      ...data, 
      id: editingExit?.id || crypto.randomUUID()
    };
    
    setClients(prev => prev.map(client => {
      if (client.id === selectedClientId) {
        if (editingExit) {
          // EDITAR
          return { 
            ...client, 
            exits: client.exits.map(e => 
              e.id === editingExit.id ? newExit : e
            ) 
          };
        } else {
          // NUEVO
          return { ...client, exits: [...client.exits, newExit] };
        }
      }
      return client;
    }));
    
    exitForm.reset();
    setShowExitForm(false);
    setEditingExit(null);
    toast.success(editingExit ? 'Salida actualizada' : 'Salida agregada');
  };

  const deleteEntry = (entryId: string) => {
    if (confirm('¿Eliminar esta entrada?')) {
      setClients(prev => prev.map(client => ({
        ...client,
        entries: client.id === selectedClientId 
          ? client.entries.filter(e => e.id !== entryId)
          : client.entries
      })));
      toast.success('Entrada eliminada');
    }
  };

  const deleteExit = (exitId: string) => {
    if (confirm('¿Eliminar esta salida?')) {
      setClients(prev => prev.map(client => ({
        ...client,
        exits: client.id === selectedClientId 
          ? client.exits.filter(e => e.id !== exitId)
          : client.exits
      })));
      toast.success('Salida eliminada');
    }
  };

  const editEntry = (entry: Entry) => {
    setEditingEntry(entry);
    entryForm.reset({
      date: entry.date,
      kilos: entry.kilos,
      chargeStartDays: entry.chargeStartDays,
      monthlyRate: entry.monthlyRate
    });
    setShowEntryForm(true);
  };

  const editExit = (exit: Exit) => {
    setEditingExit(exit);
    exitForm.reset({
      date: exit.date,
      kilos: exit.kilos
    });
    setShowExitForm(true);
  };

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
      client.entries
        .filter(e => dayjs(e.date).isSame(day, 'day'))
        .forEach(entry => {
          batchKilos[entry.id] = entry.kilos;
        });

      client.entries.forEach(entry => {
        if (batchKilos[entry.id] > 0) {
          const chargeStart = dayjs(entry.date).add(entry.chargeStartDays, 'day');
          if (day.isSame(chargeStart, 'day') || day.isAfter(chargeStart)) {
            totalBalance += batchKilos[entry.id] * entry.dailyRate;
          }
        }
      });

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

  // FORM ENTRADA
  if (showEntryForm) {
    return (
      <div className="flex-1 bg-white">
        <div className="border-b border-gray-200 bg-blue-50">
          <div className="flex items-center justify-between p-3">
            <h2 className="text-lg font-medium text-gray-900">
              {editingEntry ? 'Editar Entrada' : 'Nueva Entrada'}
            </h2>
            <button onClick={() => {setShowEntryForm(false); setEditingEntry(null);}} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={entryForm.handleSubmit(addEntry)} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha:</label>
              <input {...entryForm.register('date', { required: true })} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kilos:</label>
              <input {...entryForm.register('kilos', { required: true, min: 0 })} type="number" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Días para cobrar:</label>
              <input {...entryForm.register('chargeStartDays')} type="number" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-green-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarifa Mensual ($):</label>
              <input {...entryForm.register('monthlyRate')} type="number" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-green-100" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2">
              <Save className="w-4 h-4" />
              {editingEntry ? 'Actualizar' : 'Agregar'}
            </button>
            <button type="button" onClick={() => {setShowEntryForm(false); setEditingEntry(null);}} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  // FORM SALIDA
  if (showExitForm) {
    return (
      <div className="flex-1 bg-white">
        <div className="border-b border-gray-200 bg-red-50">
          <div className="flex items-center justify-between p-3">
            <h2 className="text-lg font-medium text-gray-900">
              {editingExit ? 'Editar Salida' : 'Nueva Salida'}
            </h2>
            <button onClick={() => {setShowExitForm(false); setEditingExit(null);}} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={exitForm.handleSubmit(addExit)} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha:</label>
              <input {...exitForm.register('date', { required: true })} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kilos:</label>
              <input {...exitForm.register('kilos', { required: true, min: 0 })} type="number" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="submit" className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center gap-2">
              <Save className="w-4 h-4" />
              {editingExit ? 'Actualizar' : 'Agregar'}
            </button>
            <button type="button" onClick={() => {setShowExitForm(false); setEditingExit(null);}} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white">
      <div className="border-b border-gray-200 bg-blue-50">
        <div className="flex items-center justify-between p-3">
          <h2 className="text-lg font-medium text-gray-900">📦 Registro de Cobro Almacenaje</h2>
          <button className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 pb-3">
          <select 
            value={selectedClientId} 
            onChange={(e) => setSelectedClientId(e.target.value)} 
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <button 
            onClick={addClient}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Cliente
          </button>
          <button 
            onClick={() => {setShowEntryForm(true); setEditingEntry(null);}}
            className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Entrada
          </button>
          <button 
            onClick={() => {setShowExitForm(true); setEditingExit(null);}}
            className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Salida
          </button>
          <button 
            onClick={calculateBalance}
            className="flex items-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors text-sm"
          >
            🧮 Calcular
          </button>
          <button 
            onClick={() => console.log('Imprimir')}
            className="flex items-center gap-2 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors text-sm"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>

      {selectedClient && (
        <div className="p-6 space-y-6">
          {/* BALANCE */}
          <div className="bg-purple-50 p-4 rounded-md border">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">Fecha:</label>
              <input 
                type="date" 
                value={balanceDate} 
                onChange={(e) => setBalanceDate(e.target.value)} 
                className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500" 
              />
              <button 
                onClick={calculateBalance}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
              >
                Calcular Saldo
              </button>
              {balance !== null && (
                <div className="text-right">
                  <h3 className="font-bold text-lg text-purple-800">${balance.toFixed(2)}</h3>
                  <p className="text-xs text-purple-600">al {dayjs(balanceDate).format('DD/MM/YYYY')}</p>
                </div>
              )}
            </div>
          </div>

          {/* TABLA ENTRADAS */}
          <div className="border rounded-md overflow-hidden">
            <div className="bg-green-50 border-b">
              <h3 className="p-3 text-sm font-medium text-green-800">📥 ENTRADAS</h3>
            </div>
            <div className="overflow-auto" style={{ maxHeight: '300px' }}>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FECHA</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KILOS</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DÍAS</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TARIFA</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedClient.entries.map((entry, index) => (
                    <tr key={entry.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-4 py-2 text-sm text-gray-900">{dayjs(entry.date).format('DD/MM')}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{entry.kilos.toLocaleString()}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{entry.chargeStartDays}</td>
                      <td className="px-4 py-2 text-sm text-green-600 font-medium">${entry.monthlyRate}</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1">
                          <button 
                            onClick={() => editEntry(entry)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteEntry(entry.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLA SALIDAS */}
          <div className="border rounded-md overflow-hidden">
            <div className="bg-red-50 border-b">
              <h3 className="p-3 text-sm font-medium text-red-800">📤 SALIDAS</h3>
            </div>
            <div className="overflow-auto" style={{ maxHeight: '300px' }}>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FECHA</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KILOS</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedClient.exits.map((exit, index) => (
                    <tr key={exit.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-4 py-2 text-sm text-gray-900">{dayjs(exit.date).format('DD/MM')}</td>
                      <td className="px-4 py-2 text-sm text-red-600 font-medium">{exit.kilos.toLocaleString()}</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1">
                          <button 
                            onClick={() => editExit(exit)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteExit(exit.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlmacenajeCobro;