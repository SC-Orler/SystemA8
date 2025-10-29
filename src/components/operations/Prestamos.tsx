import React, { useState, useEffect } from 'react';
import { X, Save, HandCoins, Printer, DollarSign } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';

interface LoanFormData {
  lender_client_id: string;
  borrower_client_id: string;
  quantity: number;
}

interface Loan {
  prestamoid: string;
  lender_client_id: string;
  borrower_client_id: string;
  quantity: number;
  date: string;
  status: 'pending' | 'repaid';
  repaid_quantity: number;
}

interface Client {
  clienteid: string;
  cliente: string;
  loans_as_lender: Loan[];
  loans_as_borrower: Loan[];
}

const API_URL = 'http://localhost:3000/api';

const PrestamosCajas: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showLoanForm, setShowLoanForm] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [repayInput, setRepayInput] = useState<Record<string, number>>({});

  const loanForm = useForm<LoanFormData>();

  useEffect(() => {
    fetchClients().then((clientsData) => {
      setClients(clientsData);
      if (clientsData.length > 0) {
        setSelectedClientId(clientsData[0].clienteid);
      }
    });
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API_URL}/clientes`);
      return response.data.map((c: any) => ({
        clienteid: c.clienteid.toString(),
        cliente: c.cliente,
        loans_as_lender: [],
        loans_as_borrower: [],
      }));
    } catch (err) {
      toast.error('Error al obtener clientes');
      return [];
    }
  };

  const fetchLoans = async (clientId: string) => {
    try {
      const response = await axios.get(`${API_URL}/prestamos`);
      const loans = response.data.filter(
        (l: any) => 
          l.lender_client_id.toString() === clientId || 
          l.borrower_client_id.toString() === clientId
      );
      return loans.map((l: any) => ({
        prestamoid: l.prestamoid.toString(),
        lender_client_id: l.lender_client_id.toString(),
        borrower_client_id: l.borrower_client_id.toString(),
        quantity: parseInt(l.quantity) || 0,
        date: l.date,
        status: l.status,
        repaid_quantity: parseInt(l.repaid_quantity) || 0,
      }));
    } catch (err) {
      toast.error('Error al obtener préstamos');
      return [];
    }
  };

  useEffect(() => {
    if (selectedClientId) {
      fetchLoans(selectedClientId).then((loans) => {
        setClients((prev) =>
          prev.map((client) =>
            client.clienteid === selectedClientId
              ? {
                  ...client,
                  loans_as_lender: loans.filter((l) => l.lender_client_id === selectedClientId),
                  loans_as_borrower: loans.filter((l) => l.borrower_client_id === selectedClientId),
                }
              : client
          )
        );
      });
    }
  }, [selectedClientId]);

  const addLoan = async (data: LoanFormData) => {
    const lender = clients.find((c) => c.clienteid === data.lender_client_id);
    const available = calculateAvailableCartones(lender);
    if (data.quantity > available) {
      toast.error('No hay suficientes cartones');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/prestamos`, data);
      const newLoan: Loan = {
        prestamoid: response.data.prestamoid.toString(),
        lender_client_id: response.data.lender_client_id.toString(),
        borrower_client_id: response.data.borrower_client_id.toString(),
        quantity: parseInt(response.data.quantity) || 0,
        date: response.data.date,
        status: response.data.status,
        repaid_quantity: parseInt(response.data.repaid_quantity) || 0,
      };

      setClients((prev) =>
        prev.map((client) => {
          if (client.clienteid === data.lender_client_id) {
            return { ...client, loans_as_lender: [...client.loans_as_lender, newLoan] };
          } else if (client.clienteid === data.borrower_client_id) {
            return { ...client, loans_as_borrower: [...client.loans_as_borrower, newLoan] };
          }
          return client;
        })
      );

      loanForm.reset();
      setShowLoanForm(false);
      toast.success('Préstamo agregado');
    } catch (err: any) {
      toast.error('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const repayLoan = async (prestamoId: string, amount: number) => {
    if (amount <= 0) return;
    try {
      const response = await axios.put(`${API_URL}/prestamos/${prestamoId}/repay`, { repaid_quantity: amount });
      const updated: Loan = {
        prestamoid: response.data.prestamoid.toString(),
        lender_client_id: response.data.lender_client_id.toString(),
        borrower_client_id: response.data.borrower_client_id.toString(),
        quantity: parseInt(response.data.quantity) || 0,
        date: response.data.date,
        status: response.data.status,
        repaid_quantity: parseInt(response.data.repaid_quantity) || 0,
      };

      setClients((prev) =>
        prev.map((c) => ({
          ...c,
          loans_as_lender: c.loans_as_lender.map((l) => (l.prestamoid === prestamoId ? updated : l)),
          loans_as_borrower: c.loans_as_borrower.map((l) => (l.prestamoid === prestamoId ? updated : l)),
        }))
      );
      setRepayInput((prev) => ({ ...prev, [prestamoId]: 0 }));
      toast.success(`Repagados ${amount} cartones`);
    } catch (err: any) {
      toast.error('Error al repagar');
    }
  };

  const calculateAvailableCartones = (client: Client | undefined) => {
    if (!client) return 0;
    const lent = client.loans_as_lender.filter(l => l.status === 'pending').reduce((s, l) => s + (l.quantity - l.repaid_quantity), 0);
    const borrowed = client.loans_as_borrower.filter(l => l.status === 'pending').reduce((s, l) => s + (l.quantity - l.repaid_quantity), 0);
    return borrowed - lent;
  };

  const generatePDF = () => {
    const client = clients.find(c => c.clienteid === selectedClientId);
    if (!client) return;

    const doc = new jsPDF();
    let y = 20;
    const margin = 10;

    doc.setFontSize(16);
    doc.text('REPORTE DE PRÉSTAMOS DE CARTONES', 105, y, { align: 'center' });
    y += 10;
    doc.setFontSize(10);
    doc.text(`Cliente: ${client.cliente} | ${dayjs().format('DD/MM/YYYY')}`, 105, y, { align: 'center' });
    y += 15;

    const available = calculateAvailableCartones(client);
    doc.text(`Cartones Disponibles: ${available.toLocaleString()}`, margin, y);
    y += 15;

    if (client.loans_as_lender.length > 0) {
      doc.setFontSize(12);
      doc.text('CARTONES PRESTADOS A OTROS CLIENTES', margin, y);
      y += 8;
      autoTable(doc, {
        startY: y,
        head: [['ID', 'Prestatario', 'Cantidad', 'Fecha', 'Estado', 'Repagado']],
        body: client.loans_as_lender.map((loan) => {
          const borrower = clients.find((c) => c.clienteid === loan.borrower_client_id);
          return [
            loan.prestamoid,
            borrower?.cliente || 'Desconocido',
            loan.quantity.toLocaleString(),
            dayjs(loan.date).format('DD/MM/YYYY'),
            loan.status === 'pending' ? 'Pendiente' : 'Repagado',
            loan.repaid_quantity.toLocaleString(),
          ];
        }),
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [200, 200, 200] },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 15;
    }

    if (client.loans_as_borrower.length > 0) {
      doc.setFontSize(12);
      doc.text('CARTONES PRESTADOS POR OTROS CLIENTES', margin, y);
      y += 8;
      autoTable(doc, {
        startY: y,
        head: [['ID', 'Prestamista', 'Cantidad', 'Fecha', 'Estado', 'Repagado']],
        body: client.loans_as_borrower.map((loan) => {
          const lender = clients.find((c) => c.clienteid === loan.lender_client_id);
          return [
            loan.prestamoid,
            lender?.cliente || 'Desconocido',
            loan.quantity.toLocaleString(),
            dayjs(loan.date).format('DD/MM/YYYY'),
            loan.status === 'pending' ? 'Pendiente' : 'Repagado',
            loan.repaid_quantity.toLocaleString(),
          ];
        }),
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [200, 200, 200] },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 15;
    }

    const totalLent = client.loans_as_lender.filter(l => l.status === 'pending').reduce((s, l) => s + (l.quantity - l.repaid_quantity), 0);
    const totalBorrowed = client.loans_as_borrower.filter(l => l.status === 'pending').reduce((s, l) => s + (l.quantity - l.repaid_quantity), 0);

    autoTable(doc, {
      startY: y,
      head: [['Disponibles', 'Prestados', 'Recibidos']],
      body: [[available.toLocaleString(), totalLent.toLocaleString(), totalBorrowed.toLocaleString()]],
      theme: 'grid',
      styles: { fontSize: 10, halign: 'center' },
      headStyles: { fillColor: [200, 200, 200] },
      margin: { left: margin, right: margin },
    });

    doc.save(`Reporte_${client.cliente}_${dayjs().format('DD-MM-YYYY')}.pdf`);
  };

  const selectedClient = clients.find(c => c.clienteid === selectedClientId);
  const availableCartones = calculateAvailableCartones(selectedClient);

  // === FORMULARIO PRÉSTAMO ===
  if (showLoanForm) {
    return (
      <div className="flex-1 bg-white">
        <div className="border-b border-gray-200 bg-yellow-50 p-3 flex justify-between items-center">
          <h2 className="text-lg font-medium">Nuevo Préstamo</h2>
          <button onClick={() => setShowLoanForm(false)}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={loanForm.handleSubmit(addLoan)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Prestamista:</label>
              <select {...loanForm.register('lender_client_id', { required: true })} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-yellow-500">
                <option value="">Seleccionar</option>
                {clients.map(c => (
                  <option key={c.clienteid} value={c.clienteid}>
                    {c.cliente} ({calculateAvailableCartones(c)} disp.)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prestatario:</label>
              <select {...loanForm.register('borrower_client_id', { required: true })} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-yellow-500">
                <option value="">Seleccionar</option>
                {clients.map(c => <option key={c.clienteid} value={c.clienteid}>{c.cliente}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Cantidad:</label>
              <input {...loanForm.register('quantity', { required: true, min: 1 })} type="number" className="w-full px-3 py-2 border rounded-md" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="submit" className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 flex items-center gap-2">
              <Save className="w-4 h-4" /> Agregar
            </button>
            <button type="button" onClick={() => setShowLoanForm(false)} className="px-4 py-2 bg-gray-500 text-white rounded-md">Cancelar</button>
          </div>
        </form>
      </div>
    );
  }

  // === MODAL IMPRIMIR ===
  if (showPrintModal) {
    return (
      <div className="flex-1 bg-white">
        <div className="border-b bg-gray-50 p-3 flex justify-between">
          <h2 className="text-lg font-medium">Reporte - {selectedClient?.cliente}</h2>
          <button onClick={() => setShowPrintModal(false)}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-6 overflow-auto" style={{ maxHeight: '80vh' }}>
          <div className="text-center border-b pb-4">
            <h3 className="text-2xl font-bold">REPORTE DE PRÉSTAMOS DE CARTONES</h3>
            <p className="text-sm text-gray-600">Cliente: <strong>{selectedClient?.cliente}</strong> | {dayjs().format('DD/MM/YYYY')}</p>
            <p className="text-sm text-gray-600">Cartones Disponibles: <strong>{availableCartones.toLocaleString()}</strong></p>
          </div>

          {selectedClient?.loans_as_lender.length ? (
            <div className="mb-6">
              <div className="bg-yellow-50 p-3 rounded-t-lg border border-yellow-200">
                <h4 className="font-bold text-yellow-900">CARTONES PRESTADOS A OTROS CLIENTES</h4>
              </div>
              <table className="w-full border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    {['ID', 'PRESTATARIO', 'CANTIDAD', 'FECHA', 'ESTADO', 'REPAGADO'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedClient.loans_as_lender.map(loan => {
                    const borrower = clients.find(c => c.clienteid === loan.borrower_client_id);
                    return (
                      <tr key={loan.prestamoid} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm">{loan.prestamoid}</td>
                        <td className="px-3 py-2 text-sm">{borrower?.cliente || 'Desconocido'}</td>
                        <td className="px-3 py-2 text-sm text-right">{loan.quantity.toLocaleString()}</td>
                        <td className="px-3 py-2 text-sm">{dayjs(loan.date).format('DD/MM/YYYY')}</td>
                        <td className="px-3 py-2 text-sm">{loan.status === 'pending' ? 'Pendiente' : 'Repagado'}</td>
                        <td className="px-3 py-2 text-sm text-right">{loan.repaid_quantity.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {selectedClient?.loans_as_borrower.length ? (
            <div className="mb-6">
              <div className="bg-yellow-50 p-3 rounded-t-lg border border-yellow-200">
                <h4 className="font-bold text-yellow-900">CARTONES PRESTADOS POR OTROS CLIENTES</h4>
              </div>
              <table className="w-full border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    {['ID', 'PRESTAMISTA', 'CANTIDAD', 'FECHA', 'ESTADO', 'REPAGADO', 'REPAGAR'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedClient.loans_as_borrower.map(loan => {
                    const lender = clients.find(c => c.clienteid === loan.lender_client_id);
                    const pending = loan.quantity - loan.repaid_quantity;
                    return (
                      <tr key={loan.prestamoid} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm">{loan.prestamoid}</td>
                        <td className="px-3 py-2 text-sm">{lender?.cliente || 'Desconocido'}</td>
                        <td className="px-3 py-2 text-sm text-right">{loan.quantity.toLocaleString()}</td>
                        <td className="px-3 py-2 text-sm">{dayjs(loan.date).format('DD/MM/YYYY')}</td>
                        <td className="px-3 py-2 text-sm">{loan.status === 'pending' ? 'Pendiente' : 'Repagado'}</td>
                        <td className="px-3 py-2 text-sm text-right">{loan.repaid_quantity.toLocaleString()}</td>
                        <td className="px-3 py-2 text-sm">
                          {loan.status === 'pending' && pending > 0 && (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                max={pending}
                                value={repayInput[loan.prestamoid] || ''}
                                onChange={(e) => setRepayInput({ ...repayInput, [loan.prestamoid]: parseInt(e.target.value) || 0 })}
                                className="w-16 px-1 py-0.5 text-xs border rounded"
                              />
                              <button
                                onClick={() => repayLoan(loan.prestamoid, repayInput[loan.prestamoid] || 1)}
                                className="text-green-600 hover:text-green-800"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="mt-8 bg-gray-50 p-4 rounded-lg border">
            <h3 className="text-lg font-bold mb-3">RESUMEN</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-white p-3 rounded border text-center">
                <p className="text-gray-600">Disponibles</p>
                <p className="text-2xl font-bold text-green-700">{availableCartones.toLocaleString()}</p>
              </div>
              <div className="bg-white p-3 rounded border text-center">
                <p className="text-gray-600">Prestados</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {selectedClient?.loans_as_lender.filter(l => l.status === 'pending').reduce((s, l) => s + (l.quantity - l.repaid_quantity), 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white p-3 rounded border text-center">
                <p className="text-gray-600">Recibidos</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {selectedClient?.loans_as_borrower.filter(l => l.status === 'pending').reduce((s, l) => s + (l.quantity - l.repaid_quantity), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button onClick={generatePDF} className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={() => setShowPrintModal(false)} className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === VISTA PRINCIPAL ===
  return (
    <div className="flex-1 bg-white">
      <div className="border-b border-gray-200 bg-yellow-50">
        <div className="flex items-center justify-between p-3">
          <h2 className="text-lg font-medium text-gray-900">Registro de Préstamos de Cartones</h2>
          <button className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 px-3 pb-3">
          <select
            value={selectedClientId || ''}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
          >
            <option value="">Seleccione un cliente</option>
            {clients.map((client) => (
              <option key={client.clienteid} value={client.clienteid}>
                {client.cliente}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowLoanForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md transition-colors text-sm"
          >
            <HandCoins className="w-4 h-4" />
            Préstamo
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
          <div className="bg-yellow-50 p-4 rounded-md border">
            <div className="text-right">
              <p className="text-sm font-medium text-yellow-700">
                Cartones Disponibles: {availableCartones.toLocaleString()}
              </p>
            </div>
          </div>

          {selectedClient.loans_as_lender.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <div className="bg-yellow-50 border-b">
                <h3 className="p-3 text-sm font-medium text-yellow-800">CARTONES PRESTADOS</h3>
              </div>
              <div className="overflow-auto" style={{ maxHeight: '300px' }}>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['ID', 'PRESTATARIO', 'CANTIDAD', 'FECHA', 'ESTADO', 'REPAGADO'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedClient.loans_as_lender.map((loan, i) => {
                      const borrower = clients.find(c => c.clienteid === loan.borrower_client_id);
                      return (
                        <tr key={loan.prestamoid} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2 text-sm">{loan.prestamoid}</td>
                          <td className="px-4 py-2 text-sm">{borrower?.cliente || 'Desconocido'}</td>
                          <td className="px-4 py-2 text-sm">{loan.quantity.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm">{dayjs(loan.date).format('DD/MM/YYYY')}</td>
                          <td className="px-4 py-2 text-sm">{loan.status === 'pending' ? 'Pendiente' : 'Repagado'}</td>
                          <td className="px-4 py-2 text-sm">{loan.repaid_quantity.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedClient.loans_as_borrower.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <div className="bg-yellow-50 border-b">
                <h3 className="p-3 text-sm font-medium text-yellow-800">CARTONES RECIBIDOS EN PRÉSTAMO</h3>
              </div>
              <div className="overflow-auto" style={{ maxHeight: '300px' }}>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['ID', 'PRESTAMISTA', 'CANTIDAD', 'FECHA', 'ESTADO', 'REPAGADO', 'REPAGAR'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedClient.loans_as_borrower.map((loan, i) => {
                      const lender = clients.find(c => c.clienteid === loan.lender_client_id);
                      const pending = loan.quantity - loan.repaid_quantity;
                      return (
                        <tr key={loan.prestamoid} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2 text-sm">{loan.prestamoid}</td>
                          <td className="px-4 py-2 text-sm">{lender?.cliente || 'Desconocido'}</td>
                          <td className="px-4 py-2 text-sm">{loan.quantity.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm">{dayjs(loan.date).format('DD/MM/YYYY')}</td>
                          <td className="px-4 py-2 text-sm">{loan.status === 'pending' ? 'Pendiente' : 'Repagado'}</td>
                          <td className="px-4 py-2 text-sm">{loan.repaid_quantity.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm">
                            {loan.status === 'pending' && pending > 0 && (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  max={pending}
                                  value={repayInput[loan.prestamoid] || ''}
                                  onChange={(e) => setRepayInput({ ...repayInput, [loan.prestamoid]: parseInt(e.target.value) || 0 })}
                                  className="w-16 px-1 py-0.5 text-xs border rounded"
                                />
                                <button
                                  onClick={() => repayLoan(loan.prestamoid, repayInput[loan.prestamoid] || 1)}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PrestamosCajas;