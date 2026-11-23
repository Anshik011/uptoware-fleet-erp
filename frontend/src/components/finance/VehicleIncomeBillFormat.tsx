'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Fuel,
  Calendar,
  Truck,
  Building2,
  CheckCircle2,
  IndianRupee,
} from 'lucide-react';

interface VehicleIncomeBillFormatProps {
  vehicleNo?: string;
  periodFrom?: string;
  periodTo?: string;
}

export function VehicleIncomeBillFormat({
  vehicleNo = 'OD19D1199',
  periodFrom = '01.01.2026',
  periodTo = '15.01.2026',
}: VehicleIncomeBillFormatProps) {
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleNo);

  const leadsData = [
    { lead: 'Sm to RLY', subLead: 'Lead (6-7 to 4-5)', trips: 55, ton: 15.88, qty: 873.40, rate: 113.12, amount: 98799.01 },
    { lead: 'Sm to RLY', subLead: 'Lead (6-7 to 3-4)', trips: 2, ton: 16.46, qty: 33.00, rate: 111.76, amount: 3688.08 },
    { lead: 'Sm to RLY', subLead: 'Lead (7-8 to 4-5)', trips: 2, ton: 16.37, qty: 33.00, rate: 125.14, amount: 4129.62 },
    { lead: 'Sm to Stock', subLead: 'Lead (6-7 to 4-5)', trips: 3, ton: 14.94, qty: 44.82, rate: 113.12, amount: 5070.04 },
    { lead: 'Sm to Stock', subLead: 'Lead (5-6 to 4-5)', trips: 1, ton: 14.94, qty: 14.94, rate: 99.63, amount: 1488.47 },
    { lead: 'Sm to Silo', subLead: 'Lead (3-4 to 3-4)', trips: 23, ton: 16.25, qty: 374.00, rate: 76.07, amount: 28450.18 },
    { lead: 'Sm to Silo', subLead: 'Lead (4-5 to 4-5)', trips: 66, ton: 15.90, qty: 1049.00, rate: 89.00, amount: 93361.00 },
    { lead: 'Sm to TRH', subLead: 'Lead (5-6 to 4-5)', trips: 1, ton: 16.23, qty: 16.00, rate: 99.63, amount: 1594.08 },
    { lead: 'Sm to TRH', subLead: 'Lead (4-5 to 4-5)', trips: 35, ton: 16.08, qty: 563.00, rate: 89.00, amount: 50107.00 },
    { lead: 'Sm to TRH', subLead: 'Lead (4-5 to 3-4)', trips: 13, ton: 15.49, qty: 201.00, rate: 85.56, amount: 17197.56 },
    { lead: 'Sm to SGB', subLead: 'Lead (5-6 to 4-5)', trips: 1, ton: 15.00, qty: 15.00, rate: 99.63, amount: 1494.45 },
    { lead: 'Stock to CHP Silo', subLead: '1-2 K.m', trips: 4, ton: 17.09, qty: 68.00, rate: 32.23, amount: 2191.64 },
    { lead: 'Stock to TRH', subLead: '1-2 K.m', trips: 1, ton: 17.09, qty: 17.00, rate: 32.23, amount: 547.91 },
    { lead: 'Face to Stock', subLead: 'Lead (5-6 to 3-4)', trips: 2, ton: 16.64, qty: 33.00, rate: 99.24, amount: 3274.92 },
    { lead: 'Face to Stock', subLead: 'Lead (6-7 to 4-5)', trips: 20, ton: 15.64, qty: 313.00, rate: 113.12, amount: 35406.56 },
    { lead: 'Sm to O.B', subLead: '2-3 K.m', trips: 0, ton: 15.22, qty: 0.00, rate: 60.75, amount: 0.00 },
  ];

  const totalTrips = leadsData.reduce((acc, row) => acc + row.trips, 0);
  const totalQty = leadsData.reduce((acc, row) => acc + row.qty, 0);
  const grossFreightAmount = 346832.06;

  const hsdEntries = [
    { date: '01.01.2026', qty: 215, rate: 94.98, amount: 20420.70 },
    { date: '02.01.2026', qty: 102, rate: 94.98, amount: 9687.96 },
    { date: '03.01.2026', qty: 165, rate: 94.98, amount: 15671.70 },
    { date: '04.01.2026', qty: 180, rate: 94.98, amount: 17096.40 },
    { date: '05.01.2026', qty: 0, rate: 94.98, amount: 0.00 },
    { date: '06.01.2026', qty: 210, rate: 94.98, amount: 19945.80 },
    { date: '07.01.2026', qty: 147, rate: 94.98, amount: 13962.06 },
    { date: '08.01.2026', qty: 200, rate: 94.98, amount: 18996.00 },
    { date: '09.01.2026', qty: 0, rate: 94.98, amount: 0.00 },
    { date: '10.01.2026', qty: 171, rate: 94.98, amount: 16241.58 },
    { date: '11.01.2026', qty: 165, rate: 94.98, amount: 15671.70 },
    { date: '12.01.2026', qty: 115, rate: 94.98, amount: 10922.70 },
    { date: '13.01.2026', qty: 110, rate: 94.98, amount: 10447.80 },
    { date: '14.01.2026', qty: 180, rate: 94.98, amount: 17096.40 },
    { date: '15.01.2026', qty: 160, rate: 94.98, amount: 15196.80 },
  ];

  const totalHsdLtr = hsdEntries.reduce((acc, row) => acc + row.qty, 0);
  const totalHsdAmount = 201357.60;

  // Deductions calculation
  const societyDeduction = 45088.00;
  const taxableValue = grossFreightAmount - societyDeduction; // 3,01,744.06
  const gst18 = Math.round(taxableValue * 0.18); // 54,314
  const invoiceValue = taxableValue + gst18; // 3,56,058
  const tds1 = Math.round(taxableValue * 0.01); // 3,017
  const staffSalaryAdvance = 50000.00;
  const totalDeduction = tds1 + totalHsdAmount + staffSalaryAdvance; // 2,54,374.60
  const paymentReceived = 101683.39;
  const balance = 0.00;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    let csv = `BILL NO: BILL/2026/011, DATE: 30.01.2026\n`;
    csv += `BILL FROM: M/S JAGANNATH TRADING AND TRANSPORTING, GSTIN: 21AKVPP2788B3ZV\n`;
    csv += `BILL TO: Om Maa Coal Transport Firm, GSTIN: 21AAEFO2835K1ZE\n`;
    csv += `VEHICLE NO: ${selectedVehicle}, DESCRIPTION: Transportation of coal at Lingaraj OCP, SAC: 998622\n`;
    csv += `PERIOD: ${periodFrom} TO ${periodTo}\n\n`;
    csv += `LEAD,ROUTE / SUB-LEAD,TRIPS,TON,QTY (TONS),RATE,AMOUNT (INR)\n`;
    leadsData.forEach((r) => {
      csv += `"${r.lead}","${r.subLead}",${r.trips},${r.ton},${r.qty},${r.rate},${r.amount}\n`;
    });
    csv += `TOTAL,,${totalTrips},,${totalQty.toFixed(2)},,${grossFreightAmount.toFixed(2)}\n\n`;
    csv += `HSD FUEL CONSUMPTION LOG\nDATE,QTY LTR,RATE,AMOUNT\n`;
    hsdEntries.forEach((h) => {
      csv += `${h.date},${h.qty},${h.rate},${h.amount}\n`;
    });
    csv += `TOTAL HSD,${totalHsdLtr},,${totalHsdAmount.toFixed(2)}\n\n`;
    csv += `FINANCIAL DEDUCTIONS SUMMARY\n`;
    csv += `Gross Freight Total,,${grossFreightAmount}\n`;
    csv += `Less Society Deduction,,${societyDeduction}\n`;
    csv += `Taxable Value,,${taxableValue}\n`;
    csv += `Add GST 18%,,${gst18}\n`;
    csv += `Invoice Value,,${invoiceValue}\n`;
    csv += `TDS 1%,,${tds1}\n`;
    csv += `Diesel Consumption,,${totalHsdAmount}\n`;
    csv += `Staff Salary Advance,,${staffSalaryAdvance}\n`;
    csv += `Total Deduction,,${totalDeduction}\n`;
    csv += `Less Payment,,${paymentReceived}\n`;
    csv += `Balance,,${balance}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Vehicle_Income_Bill_${selectedVehicle}_${periodFrom}_${periodTo}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4">
      {/* Top Action Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Vehicle Income / Freight Transportation Bill</h2>
            <p className="text-xs text-slate-500">Official client coal haulage statement with HSD fuel and society deductions</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Bill</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Official Bill Card */}
      <div className="bg-white border-2 border-slate-900 rounded-xl p-6 sm:p-8 shadow-sm space-y-6 text-slate-900">
        {/* Bill Top Bar */}
        <div className="text-center border-b-2 border-slate-900 pb-3">
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-widest">BILL</h1>
        </div>

        {/* Parties & Reference Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-300 pb-4 text-xs">
          {/* Bill From */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="font-bold">Bill No: <span className="font-mono">BILL/2026/011</span></span>
            </div>
            <div className="font-bold text-slate-700 uppercase mt-2">Bill From:</div>
            <div className="text-sm font-black text-slate-900">M/S JAGANNATH TRADING AND TRANSPORTING</div>
            <div className="text-slate-600">At- BHAJANIPUR, PS - Talcher</div>
            <div className="text-slate-600">Odisha, PIN- 759103, Dist- Angul</div>
            <div className="font-semibold text-slate-900 mt-1">GSTIN: <span className="font-mono font-bold">21AKVPP2788B3ZV</span></div>
            <div className="font-bold text-blue-900 mt-1">V. No- <span className="font-mono text-sm">{selectedVehicle}</span></div>
          </div>

          {/* Bill To */}
          <div className="space-y-1 sm:text-right">
            <div>
              <span className="font-bold">Date: <span className="font-mono font-normal">30.01.2026</span></span>
            </div>
            <div className="font-bold text-slate-700 uppercase mt-2">Bill To:</div>
            <div className="text-sm font-black text-slate-900">Om Maa Coal Transport Firm</div>
            <div className="text-slate-600">At/Po- Kandhal, PS- Talcher</div>
            <div className="text-slate-600">Dist- Angul, Odisha</div>
            <div className="font-semibold text-slate-900 mt-1">GSTIN: <span className="font-mono font-bold">21AAEFO2835K1ZE</span></div>
          </div>
        </div>

        {/* Operational Context Strip */}
        <div className="flex flex-wrap items-center justify-between text-xs py-2 px-3 bg-slate-100 rounded-lg border border-slate-200">
          <div>
            <span className="font-bold text-slate-700">Description of Work:</span>{' '}
            <span className="font-semibold text-slate-900">Transportation of coal at Lingaraj OCP.</span>
          </div>
          <div className="flex items-center space-x-4">
            <div><span className="font-bold text-slate-700">SAC:</span> <span className="font-mono font-bold">998622</span></div>
            <div><span className="font-bold text-slate-700">Period:</span> <span className="font-mono font-bold">{periodFrom} to {periodTo}</span></div>
          </div>
        </div>

        {/* Section 1: Coal Haulage Table */}
        <div className="border border-slate-300 rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-200 text-slate-900 font-bold uppercase border-b border-slate-300">
              <tr>
                <th className="py-2 px-3">LEAD</th>
                <th className="py-2 px-3">ROUTE / SUB-LEAD</th>
                <th className="py-2 px-3 text-right">TRIPS</th>
                <th className="py-2 px-3 text-right">TON</th>
                <th className="py-2 px-3 text-right">QTY (TONS)</th>
                <th className="py-2 px-3 text-right">RATE (₹)</th>
                <th className="py-2 px-3 text-right">AMOUNTS (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {leadsData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="py-1.5 px-3 font-semibold text-slate-900">{row.lead}</td>
                  <td className="py-1.5 px-3 text-slate-700">{row.subLead}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-medium">{row.trips}</td>
                  <td className="py-1.5 px-3 text-right font-mono">{row.ton.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-semibold">{row.qty.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right font-mono">{row.rate.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                    {row.amount > 0 ? row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-900 font-bold">
              <tr>
                <td colSpan={2} className="py-2.5 px-3 uppercase text-slate-900">Total</td>
                <td className="py-2.5 px-3 text-right font-mono font-black">{totalTrips}</td>
                <td className="py-2.5 px-3"></td>
                <td className="py-2.5 px-3 text-right font-mono font-black">{totalQty.toFixed(2)}</td>
                <td className="py-2.5 px-3"></td>
                <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-blue-900">
                  ₹{grossFreightAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Section 2: Split Log — Left: HSD Fuel, Right: Financial Deductions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Left Column: HSD Fuel Consumption */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <div className="bg-slate-200 px-3 py-2 border-b border-slate-300 flex items-center justify-between font-bold text-xs uppercase">
              <span className="flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-amber-700" />
                HSD Diesel Consumption Log
              </span>
              <span>Rate: ₹94.98 / Ltr</span>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-1.5 px-3">Date</th>
                  <th className="py-1.5 px-3 text-right">Quantity (LTR)</th>
                  <th className="py-1.5 px-3 text-right">Rate (₹)</th>
                  <th className="py-1.5 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {hsdEntries.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-1 px-3 text-slate-700">{h.date}</td>
                    <td className="py-1 px-3 text-right font-medium">{h.qty > 0 ? h.qty : '-'}</td>
                    <td className="py-1 px-3 text-right text-slate-500">{h.rate.toFixed(2)}</td>
                    <td className="py-1 px-3 text-right font-semibold text-slate-900">
                      {h.amount > 0 ? h.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t border-slate-300 font-bold">
                <tr>
                  <td className="py-2 px-3 uppercase text-slate-900">Total HSD</td>
                  <td className="py-2 px-3 text-right font-mono font-black">{totalHsdLtr} LTR</td>
                  <td className="py-2 px-3"></td>
                  <td className="py-2 px-3 text-right font-mono font-black text-rose-800">
                    ₹{totalHsdAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Right Column: Statement of Deductions and Net Payment */}
          <div className="border border-slate-300 rounded-lg overflow-hidden flex flex-col justify-between">
            <div className="bg-slate-200 px-3 py-2 border-b border-slate-300 font-bold text-xs uppercase flex items-center justify-between">
              <span>Financial Deductions & Net Payable</span>
              <span className="font-mono text-emerald-800">SAC: 998622</span>
            </div>

            <div className="p-4 space-y-2 text-xs divide-y divide-slate-100">
              <div className="flex justify-between py-1 font-bold text-slate-900">
                <span>Total Gross Freight Amount:</span>
                <span className="font-mono">₹{grossFreightAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between py-1 text-slate-700">
                <span>Less: Society Deduction</span>
                <span className="font-mono text-rose-700">- ₹{societyDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between py-1 font-bold text-slate-900 bg-slate-50 px-2 rounded">
                <span>Taxable Value:</span>
                <span className="font-mono">₹{taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between py-1 text-slate-700">
                <span>Add: GST (18%)</span>
                <span className="font-mono text-emerald-700">+ ₹{gst18.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between py-1 font-black text-slate-900 text-sm border-t border-slate-300">
                <span>Invoice Value:</span>
                <span className="font-mono text-blue-900">₹{invoiceValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Deductions:</div>
                <div className="space-y-1 pl-2">
                  <div className="flex justify-between text-slate-700">
                    <span>• TDS (1% u/s 194C):</span>
                    <span className="font-mono text-rose-700">- ₹{tds1.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>• Diesel (HSD Deduction):</span>
                    <span className="font-mono text-rose-700">- ₹{totalHsdAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>• Staff Salary Advance:</span>
                    <span className="font-mono text-rose-700">- ₹{staffSalaryAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between py-1.5 font-bold text-rose-800 bg-rose-50 px-2 rounded border border-rose-200">
                <span>Total Deductions:</span>
                <span className="font-mono">- ₹{totalDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between py-1.5 font-bold text-slate-900">
                <span>Less: Payment Made:</span>
                <span className="font-mono">₹{paymentReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between py-2 font-black text-sm bg-emerald-50 px-2 rounded border border-emerald-300 text-emerald-900">
                <span>Net Balance Payable:</span>
                <span className="font-mono text-base">₹{balance.toFixed(2)}</span>
              </div>
            </div>

            {/* Verification Notice */}
            <div className="bg-slate-50 p-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Audited & verified against site dispatch challans</span>
              <span className="font-bold text-slate-700">Authorized Signatory</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
