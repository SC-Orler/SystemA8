import React, { useState, useEffect } from 'react';
import { Plus, X, Save, Trash2, Printer, Edit2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';

interface EntryFormData {
  fecha: string;
  kilos: number;
  dias_cobro: number;
  tarifa_mensual: number;
}

interface ExitFormData {
  fecha: string;
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

interface BatchDetail {
  entryId: string;
  entryDate: string;
  initialKilos: number;
  currentKilos: number;
  daysCharged: number;
  dailyRate: number;
  subtotal: number;
}

interface DailySummary {
  date: string;
  totalKilos: number;
  totalCharge: number;
  totalExits: number;
  batches: BatchDetail[];
}

const API_URL = 'http://localhost:3000/api';

const AlmacenajeCobro: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [balanceDate, setBalanceDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [balance, setBalance] = useState<number | null>(null);
  const [showEntryForm, setShowEntryForm] = useState<boolean>(false);
  const [showExitForm, setShowExitForm] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editingExit, setEditingExit] = useState<Exit | null>(null);

  const entryForm = useForm<EntryFormData>({
    defaultValues: { dias_cobro: 7, tarifa_mensual: 1.30 }
  });
  const exitForm = useForm<ExitFormData>();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API_URL}/clientes`);
      const mappedClients = response.data.map((c: any) => ({
        id: c.clienteid.toString(),
        name: c.cliente,
        entries: [],
        exits: [],
      }));
      setClients(mappedClients);
      if (mappedClients.length > 0) {
        setSelectedClientId(mappedClients[0].id);
      }
    } catch (err) {
      toast.error('Error al obtener clientes');
    }
  };

  const fetchEntries = async (clientId: string) => {
    try {
      const response = await axios.get(`${API_URL}/entradasAlmacenaje/${clientId}/entradas`);
      return response.data
        .map((e: any) => ({
          id: e.entradaid.toString(),
          date: e.fecha,
          kilos: parseFloat(e.kilos) || 0,
          chargeStartDays: parseInt(e.dias_cobro) || 7,
          monthlyRate: parseFloat(e.tarifa_mensual) || 1.30,
          dailyRate: parseFloat(e.tarifa_diaria) || 0,
        }))
        .filter((e: Entry) => !isNaN(e.dailyRate));
    } catch (err) {
      toast.error('Error al obtener entradas');
      return [];
    }
  };

  const fetchExits = async (clientId: string) => {
    try {
      const response = await axios.get(`${API_URL}/entradasAlmacenaje/${clientId}/salidas`);
      return response.data.map((e: any) => ({
        id: e.salidaid.toString(),
        date: e.fecha,
        kilos: parseFloat(e.kilos) || 0,
      }));
    } catch (err) {
      toast.error('Error al obtener salidas');
      return [];
    }
  };

  useEffect(() => {
    if (selectedClientId) {
      Promise.all([
        fetchEntries(selectedClientId),
        fetchExits(selectedClientId),
      ]).then(([entries, exits]) => {
        setClients((prev) =>
          prev.map((client) =>
            client.id === selectedClientId
              ? { ...client, entries, exits }
              : client
          )
        );
      });
    }
  }, [selectedClientId]);

  const addClient = async () => {
    const cliente = prompt('Nombre del cliente:');
    if (cliente) {
      try {
        const response = await axios.post(`${API_URL}/clientes`, {
          cliente,
          rfc: '',
          domicilio: '',
          telefono: '',
          status: 'A',
        });
        const newClient: Client = {
          id: response.data.clienteid.toString(),
          name: response.data.cliente,
          entries: [],
          exits: [],
        };
        setClients((prev) => [...prev, newClient]);
        toast.success('Cliente agregado');
      } catch (err) {
        toast.error('Error al agregar cliente');
      }
    }
  };

  const addEntry = async (data: EntryFormData) => {
    if (!selectedClientId) return;

    try {
      let response;
      if (editingEntry) {
        response = await axios.put(`${API_URL}/entradasAlmacenaje/${editingEntry.id}`, {
          fecha: data.fecha,
          kilos: data.kilos,
          dias_cobro: data.dias_cobro,
          tarifa_mensual: data.tarifa_mensual,
        });
      } else {
        response = await axios.post(`${API_URL}/entradasAlmacenaje/${selectedClientId}/entradas`, {
          fecha: data.fecha,
          kilos: data.kilos,
          dias_cobro: data.dias_cobro,
          tarifa_mensual: data.tarifa_mensual,
        });
      }

      const newEntry: Entry = {
        id: response.data.entradaid.toString(),
        date: response.data.fecha,
        kilos: parseFloat(response.data.kilos) || 0,
        chargeStartDays: parseInt(response.data.dias_cobro) || 7,
        monthlyRate: parseFloat(response.data.tarifa_mensual) || 1.30,
        dailyRate: parseFloat(response.data.tarifa_diaria) || 0,
      };

      setClients((prev) =>
        prev.map((client) =>
          client.id === selectedClientId
            ? {
                ...client,
                entries: editingEntry
                  ? client.entries.map((e) =>
                      e.id === editingEntry.id ? newEntry : e
                    )
                  : [...client.entries, newEntry],
              }
            : client
        )
      );

      entryForm.reset({ dias_cobro: 7, tarifa_mensual: 1.30 });
      setShowEntryForm(false);
      setEditingEntry(null);
      toast.success(editingEntry ? 'Entrada actualizada' : 'Entrada agregada');
    } catch (err) {
      toast.error('Error al agregar/actualizar entrada');
    }
  };

  const addExit = async (data: ExitFormData) => {
    if (!selectedClientId) return;

    try {
      let response;
      if (editingExit) {
        response = await axios.put(`${API_URL}/salidasAlmacenaje/${editingExit.id}`, {
          fecha: data.fecha,
          kilos: data.kilos,
        });
      } else {
        response = await axios.post(`${API_URL}/salidasAlmacenaje/${selectedClientId}/salidas`, {
          fecha: data.fecha,
          kilos: data.kilos,
        });
      }

      const newExit: Exit = {
        id: response.data.salidaid.toString(),
        date: response.data.fecha,
        kilos: parseFloat(response.data.kilos) || 0,
      };

      setClients((prev) =>
        prev.map((client) =>
          client.id === selectedClientId
            ? {
                ...client,
                exits: editingExit
                  ? client.exits.map((e) =>
                      e.id === editingExit.id ? newExit : e
                    )
                  : [...client.exits, newExit],
              }
            : client
        )
      );

      exitForm.reset();
      setShowExitForm(false);
      setEditingExit(null);
      toast.success(editingExit ? 'Salida actualizada' : 'Salida agregada');
    } catch (err) {
      toast.error('Error al agregar/actualizar salida');
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (confirm('¿Eliminar esta entrada?') && selectedClientId) {
      try {
        await axios.delete(`${API_URL}/entradasAlmacenaje/${entryId}`);
        setClients((prev) =>
          prev.map((client) => ({
            ...client,
            entries:
              client.id === selectedClientId
                ? client.entries.filter((e) => e.id !== entryId)
                : client.entries,
          }))
        );
        toast.success('Entrada eliminada');
      } catch (err) {
        toast.error('Error al eliminar entrada');
      }
    }
  };

  const deleteExit = async (exitId: string) => {
    if (confirm('¿Eliminar esta salida?') && selectedClientId) {
      try {
        await axios.delete(`${API_URL}/salidasAlmacenaje/${exitId}`);
        setClients((prev) =>
          prev.map((client) => ({
            ...client,
            exits:
              client.id === selectedClientId
                ? client.exits.filter((e) => e.id !== exitId)
                : client.exits,
          }))
        );
        toast.success('Salida eliminada');
      } catch (err) {
        toast.error('Error al eliminar salida');
      }
    }
  };

  const editEntry = (entry: Entry) => {
    setEditingEntry(entry);
    entryForm.reset({
      fecha: entry.date,
      kilos: entry.kilos,
      dias_cobro: entry.chargeStartDays,
      tarifa_mensual: entry.monthlyRate,
    });
    setShowEntryForm(true);
  };

  const editExit = (exit: Exit) => {
    setEditingExit(exit);
    exitForm.reset({
      fecha: exit.date,
      kilos: exit.kilos,
    });
    setShowExitForm(true);
  };

  const calculateBalance = () => {
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client || client.entries.length === 0) {
      toast.error('No hay entradas');
      return;
    }

    const toDate = dayjs(balanceDate);
    let totalBalance = 0;
    const batchKilos = {
      ...client.entries.reduce((acc, e) => ({ ...acc, [e.id]: e.kilos }), {}),
    };

    const dates = client.entries.map((e) => dayjs(e.date));
    const startDate = dates.sort((a, b) => a.unix() - b.unix())[0];

    for (let day = startDate; !day.isAfter(toDate); day = day.add(1, 'day')) {
      client.entries
        .filter((e) => dayjs(e.date).isSame(day, 'day'))
        .forEach((entry) => {
          batchKilos[entry.id] = entry.kilos;
        });

      client.entries.forEach((entry) => {
        if (batchKilos[entry.id] > 0 && !isNaN(entry.dailyRate)) {
          const chargeStart = dayjs(entry.date).add(entry.chargeStartDays, 'day');
          if (day.isSame(chargeStart, 'day') || day.isAfter(chargeStart)) {
            totalBalance += batchKilos[entry.id] * entry.dailyRate;
          }
        }
      });

      const exitsToday = client.exits.filter((e) =>
        dayjs(e.date).isSame(day, 'day')
      );
      let remainingExit = exitsToday.reduce((sum, e) => sum + e.kilos, 0);

      if (remainingExit > 0) {
        Object.keys(batchKilos)
          .filter((id) => batchKilos[id] > 0)
          .sort((a, b) => {
            const entryA = client.entries.find((e) => e.id === a)!;
            const entryB = client.entries.find((e) => e.id === b)!;
            return dayjs(entryA.date).diff(dayjs(entryB.date));
          })
          .forEach((batchId) => {
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

  const generatePrintData = () => {
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client || client.entries.length === 0) return [];

    const toDate = dayjs(balanceDate);
    const dailySummaries: DailySummary[] = [];
    let batchKilosCopy = {
      ...client.entries.reduce((acc, e) => ({ ...acc, [e.id]: e.kilos }), {}),
    };

    const dates = client.entries.map((e) => dayjs(e.date));
    const startDate = dates.sort((a, b) => a.unix() - b.unix())[0];

    for (let day = startDate; !day.isAfter(toDate); day = day.add(1, 'day')) {
      const batchKilos = { ...batchKilosCopy };
      let dayBalance = 0;
      const batches: BatchDetail[] = [];

      client.entries
        .filter((e) => dayjs(e.date).isSame(day, 'day'))
        .forEach((entry) => {
          batchKilos[entry.id] = entry.kilos;
        });

      client.entries.forEach((entry) => {
        if (batchKilos[entry.id] > 0 && !isNaN(entry.dailyRate)) {
          const chargeStart = dayjs(entry.date).add(entry.chargeStartDays, 'day');
          if (day.isSame(chargeStart, 'day') || day.isAfter(chargeStart)) {
            const chargeDays = day.diff(chargeStart, 'day') + 1;
            const subtotal = batchKilos[entry.id] * entry.dailyRate;
            dayBalance += subtotal;

            batches.push({
              entryId: entry.id,
              entryDate: dayjs(entry.date).format('DD/MM/YYYY'),
              initialKilos: entry.kilos,
              currentKilos: batchKilos[entry.id],
              daysCharged: chargeDays,
              dailyRate: entry.dailyRate,
              subtotal,
            });
          }
        }
      });

      const exitsToday = client.exits.filter((e) =>
        dayjs(e.date).isSame(day, 'day')
      );
      let remainingExit = exitsToday.reduce((sum, e) => sum + e.kilos, 0);

      if (remainingExit > 0) {
        Object.keys(batchKilos)
          .filter((id) => batchKilos[id] > 0)
          .sort((a, b) => {
            const entryA = client.entries.find((e) => e.id === a)!;
            const entryB = client.entries.find((e) => e.id === b)!;
            return dayjs(entryA.date).diff(dayjs(entryB.date));
          })
          .forEach((batchId) => {
            if (remainingExit <= 0) return;
            const available = batchKilos[batchId];
            if (available > 0) {
              const consume = Math.min(available, remainingExit);
              batchKilos[batchId] -= consume;
              remainingExit -= consume;
            }
          });
      }

      if (dayBalance > 0) {
        dailySummaries.push({
          date: day.format('DD/MM/YYYY'),
          totalKilos: Object.values(batchKilos).reduce(
            (sum, k) => sum + Math.max(k, 0),
            0
          ),
          totalCharge: parseFloat(dayBalance.toFixed(2)),
          totalExits: exitsToday.reduce((sum, e) => sum + e.kilos, 0),
          batches,
        });
      }

      batchKilosCopy = { ...batchKilos };
    }

    return dailySummaries;
  };

  const generatePDF = () => {
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) {
      toast.error('No hay cliente seleccionado');
      return;
    }

    const doc = new jsPDF();
    autoTable(doc, {});

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    let y = 5;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(
      'REPORTE DE COBRO ALMACENAJE',
      pageWidth / 2,
      y,
      { align: 'center' }
    );
    y += 5;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Cliente: ${client.name} | Hasta: ${dayjs(balanceDate).format('DD/MM/YYYY')}`,
      pageWidth / 2,
      y,
      { align: 'center' }
    );
    y += 5;

    const printData = generatePrintData();
    if (printData.length === 0) {
      toast.error('No hay datos para generar el reporte');
      return;
    }

    printData.forEach((daySummary, dayIndex) => {
      if (y > 250) {
        doc.addPage();
        y = 5;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `DÍA: ${daySummary.date} | KILOS: ${daySummary.totalKilos.toLocaleString()} | COBRO: $${daySummary.totalCharge.toFixed(2)} | SALIDAS: ${daySummary.totalExits.toLocaleString()}`,
        margin,
        y
      );
      y += 5;

      if (daySummary.batches.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [
            [
              'FECHA ENTRADA',
              'KILOS INICIAL',
              'KILOS ACTUAL',
              'DÍAS COBRADOS',
              'RATE/DÍA',
              'SUBTOTAL',
            ],
          ],
          body: daySummary.batches.map((batch) => [
            batch.entryDate,
            batch.initialKilos.toLocaleString(),
            batch.currentKilos.toLocaleString(),
            batch.daysCharged.toString(),
            `$${batch.dailyRate.toFixed(6)}`,
            `$${batch.subtotal.toFixed(2)}`,
          ]),
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: {
            fillColor: [200, 200, 200],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
          },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 30, halign: 'right' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 30, halign: 'right' },
            5: { cellWidth: 30, halign: 'right' },
          },
          margin: { left: margin, right: margin },
        });

        y = (doc as any).lastAutoTable.finalY + 5;
      } else {
        y += 5;
      }
    });

    if (y > 250) {
      doc.addPage();
      y = 10;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN GERENCIAL', margin, y);
    y += 5;

    const totalKilos = printData.reduce((sum, d) => sum + d.totalKilos, 0);
    const totalCharge = printData.reduce((sum, d) => sum + d.totalCharge, 0);
    const totalExits = printData.reduce((sum, d) => sum + d.totalExits, 0);

    autoTable(doc, {
      startY: y,
      head: [['Total Kilos-Día', 'Cobro Total', 'Salidas Totales']],
      body: [
        [
          totalKilos.toLocaleString(),
          `$${totalCharge.toFixed(2)}`,
          `${totalExits.toLocaleString()} kg`,
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 60, halign: 'center' },
        1: { cellWidth: 60, halign: 'center' },
        2: { cellWidth: 60, halign: 'center' },
      },
      margin: { left: margin, right: margin },
    });

    doc.save(
      `Reporte_Almacenaje_${client.name}_${dayjs(balanceDate).format('DD-MM-YYYY')}.pdf`
    );
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const printData = generatePrintData();

  if (showPrintModal) {
    return (
      <div className="flex-1 bg-white">
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between p-3">
            <h2 className="text-lg font-medium text-gray-900">
              🖨️ Reporte Detallado Almacenaje - {selectedClient?.name}
            </h2>
            <button
              onClick={() => setShowPrintModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center border-b pb-4">
            <h3 className="text-2xl font-bold text-gray-900">
              REPORTE GERENCIAL DE COBRO ALMACENAJE
            </h3>
            <p className="text-sm text-gray-600">
              Cliente: <strong>{selectedClient?.name}</strong> | Hasta:{' '}
              <strong>{dayjs(balanceDate).format('DD/MM/YYYY')}</strong>
            </p>
          </div>

          <div className="overflow-auto" style={{ maxHeight: '65vh' }}>
            {printData.map((daySummary, dayIndex) => (
              <div key={dayIndex} className="mb-6">
                <div className="bg-blue-50 p-3 rounded-t-lg border border-blue-200">
                  <h4 className="font-bold text-blue-900">
                    DÍA: {daySummary.date} | KILOS:{' '}
                    {daySummary.totalKilos.toLocaleString()} | COBRO: $
                    {daySummary.totalCharge.toFixed(2)} | SALIDAS:{' '}
                    {daySummary.totalExits.toLocaleString()}
                  </h4>
                </div>
                {daySummary.batches.length > 0 && (
                  <table className="w-full border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300">
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase">
                          FECHA ENTRADA
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase">
                          KILOS INICIAL
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase">
                          KILOS ACTUAL
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase">
                          DÍAS COBRADOS
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase">
                          RATE/DÍA
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase">
                          SUBTOTAL
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {daySummary.batches.map((batch, batchIndex) => (
                        <tr
                          key={`${daySummary.date}-${batch.entryId}`}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-3 py-2 text-sm text-gray-900 font-medium">
                            {batch.entryDate}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-gray-600">
                            {batch.initialKilos.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-green-600 font-medium">
                            {batch.currentKilos.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-blue-600">
                            {batch.daysCharged}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-gray-600">
                            ${batch.dailyRate.toFixed(6)}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-blue-700 font-bold">
                            ${batch.subtotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}

            <div className="mt-8 bg-gray-50 p-4 rounded-lg border border-gray-300">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                RESUMEN GERENCIAL
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-white p-3 rounded border">
                  <p className="text-gray-600">Total Kilos-Día</p>
                  <p className="text-2xl font-bold text-green-700">
                    {printData
                      .reduce((sum, d) => sum + d.totalKilos, 0)
                      .toLocaleString()}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="text-gray-600">Cobro Total</p>
                  <p className="text-2xl font-bold text-blue-700">
                    $
                    {printData
                      .reduce((sum, d) => sum + d.totalCharge, 0)
                      .toFixed(2)}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="text-gray-600">Salidas Totales</p>
                  <p className="text-2xl font-bold text-red-700">
                    {printData
                      .reduce((sum, d) => sum + d.totalExits, 0)
                      .toLocaleString()}{' '}
                    kg
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              onClick={generatePDF}
              className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimir Reporte
            </button>
            <button
              onClick={() => setShowPrintModal(false)}
              className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showEntryForm) {
    return (
      <div className="flex-1 bg-white">
        <div className="border-b border-gray-200 bg-blue-50">
          <div className="flex items-center justify-between p-3">
            <h2 className="text-lg font-medium text-gray-900">
              {editingEntry ? 'Editar Entrada' : 'Nueva Entrada'}
            </h2>
            <button
              onClick={() => {
                setShowEntryForm(false);
                setEditingEntry(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form
          onSubmit={entryForm.handleSubmit(addEntry)}
          className="p-6 space-y-6"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha:
              </label>
              <input
                {...entryForm.register('fecha', { required: true })}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kilos:
              </label>
              <input
                {...entryForm.register('kilos', { required: true, min: 0 })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Días para cobrar:
              </label>
              <input
                {...entryForm.register('dias_cobro')}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-green-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarifa Mensual ($):
              </label>
              <input
                {...entryForm.register('tarifa_mensual')}
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-green-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="submit"
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingEntry ? 'Actualizar' : 'Agregar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowEntryForm(false);
                setEditingEntry(null);
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (showExitForm) {
    return (
      <div className="flex-1 bg-white">
        <div className="border-b border-gray-200 bg-red-50">
          <div className="flex items-center justify-between p-3">
            <h2 className="text-lg font-medium text-gray-900">
              {editingExit ? 'Editar Salida' : 'Nueva Salida'}
            </h2>
            <button
              onClick={() => {
                setShowExitForm(false);
                setEditingExit(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form
          onSubmit={exitForm.handleSubmit(addExit)}
          className="p-6 space-y-6"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha:
              </label>
              <input
                {...exitForm.register('fecha', { required: true })}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kilos:
              </label>
              <input
                {...exitForm.register('kilos', { required: true, min: 0 })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="submit"
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingExit ? 'Actualizar' : 'Agregar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowExitForm(false);
                setEditingExit(null);
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
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
          <h2 className="text-lg font-medium text-gray-900">
            📦 Registro de Cobro Almacenaje
          </h2>
          <button className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 pb-3">
          <select
            value={selectedClientId || ''}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccione un cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
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
            onClick={() => {
              setShowEntryForm(true);
              setEditingEntry(null);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Entrada
          </button>
          <button
            onClick={() => {
              setShowExitForm(true);
              setEditingExit(null);
            }}
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
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors text-sm"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>

      {selectedClient && (
        <div className="p-6 space-y-6">
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
                  <h3 className="font-bold text-lg text-purple-800">
                    ${balance.toFixed(2)}
                  </h3>
                  <p className="text-xs text-purple-600">
                    al {dayjs(balanceDate).format('DD/MM/YYYY')}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="bg-green-50 border-b">
              <h3 className="p-3 text-sm font-medium text-green-800">📥 ENTRADAS</h3>
            </div>
            <div className="overflow-auto" style={{ maxHeight: '300px' }}>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      FECHA
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      KILOS
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DÍAS
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      TARIFA
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      ACCIONES
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedClient.entries.map((entry, index) => (
                    <tr
                      key={entry.id}
                      className={`hover:bg-gray-50 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {dayjs(entry.date).format('DD/MM')}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {entry.kilos.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {entry.chargeStartDays}
                      </td>
                      <td className="px-4 py-2 text-sm text-green-600 font-medium">
                        ${entry.monthlyRate}
                      </td>
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

          <div className="border rounded-md overflow-hidden">
            <div className="bg-red-50 border-b">
              <h3 className="p-3 text-sm font-medium text-red-800">📤 SALIDAS</h3>
            </div>
            <div className="overflow-auto" style={{ maxHeight: '300px' }}>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      FECHA
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      KILOS
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      ACCIONES
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedClient.exits.map((exit, index) => (
                    <tr
                      key={exit.id}
                      className={`hover:bg-gray-50 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {dayjs(exit.date).format('DD/MM')}
                      </td>
                      <td className="px-4 py-2 text-sm text-red-600 font-medium">
                        {exit.kilos.toLocaleString()}
                      </td>
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