'use client';

import React from 'react';
import { Download, Printer, Users, IndianRupee, FileSpreadsheet } from 'lucide-react';

interface DriverSalaryRecord {
  slNo: number;
  name: string;
  designation: string;
  totalPresent: number;
  perDay: number;
  grossSalary: number;
  cmpfAtt: number;
  cmpfRate: number;
  cmpfGrossAmt: number;
  cmpf15Pct: number;
  cmpfPension: number;
  cmpfTotalAmt: number;
  ownerShareCmpf: number;
  totalCmpf: number;
  advanceAmount: number;
  netSalaryAmount: number;
  accountNumber: string;
  ifscCode: string;
}

interface DriverCmpfSalaryFormatProps {
  monthName?: string;
  year?: number;
}

export function DriverCmpfSalaryFormat({
  monthName = 'November',
  year = 2026,
}: DriverCmpfSalaryFormatProps) {
  // Official client data matching image media_1795432900946_6762343e.jpg
  const sampleData: DriverSalaryRecord[] = [
    {
      slNo: 1,
      name: 'JITENDRA KU SAHOO',
      designation: 'DRIVER',
      totalPresent: 29,
      perDay: 950.00,
      grossSalary: 27550.00,
      cmpfAtt: 10,
      cmpfRate: 1387.00,
      cmpfGrossAmt: 13870.00,
      cmpf15Pct: 2081.00,
      cmpfPension: 2524.00,
      cmpfTotalAmt: 4605.00,
      ownerShareCmpf: 4605.00,
      totalCmpf: 9210.00,
      advanceAmount: 1500.00,
      netSalaryAmount: 21445.00,
      accountNumber: '34643802637',
      ifscCode: 'SBIN0013608',
    },
    {
      slNo: 2,
      name: 'AJAY NAIK',
      designation: 'DRIVER',
      totalPresent: 28,
      perDay: 950.00,
      grossSalary: 26600.00,
      cmpfAtt: 9,
      cmpfRate: 1387.00,
      cmpfGrossAmt: 12483.00,
      cmpf15Pct: 1873.00,
      cmpfPension: 2524.00,
      cmpfTotalAmt: 4397.00,
      ownerShareCmpf: 4397.00,
      totalCmpf: 8794.00,
      advanceAmount: 6500.00,
      netSalaryAmount: 15703.00,
      accountNumber: '07860110199350',
      ifscCode: 'UCBA0000786',
    },
    {
      slNo: 3,
      name: 'BASANTA ROUL',
      designation: 'DRIVER',
      totalPresent: 31,
      perDay: 950.00,
      grossSalary: 29450.00,
      cmpfAtt: 10,
      cmpfRate: 1387.00,
      cmpfGrossAmt: 13870.00,
      cmpf15Pct: 2081.00,
      cmpfPension: 2524.00,
      cmpfTotalAmt: 4605.00,
      ownerShareCmpf: 4605.00,
      totalCmpf: 9210.00,
      advanceAmount: 0.00,
      netSalaryAmount: 24845.00,
      accountNumber: '35039659493',
      ifscCode: 'SBIN0017955',
    },
    {
      slNo: 4,
      name: 'SIPU KU PATTNAIK',
      designation: 'DRIVER',
      totalPresent: 28,
      perDay: 950.00,
      grossSalary: 26600.00,
      cmpfAtt: 9,
      cmpfRate: 1387.00,
      cmpfGrossAmt: 12483.00,
      cmpf15Pct: 1873.00,
      cmpfPension: 2524.00,
      cmpfTotalAmt: 4397.00,
      ownerShareCmpf: 4397.00,
      totalCmpf: 8794.00,
      advanceAmount: 0.00,
      netSalaryAmount: 22203.00,
      accountNumber: '09100110100493',
      ifscCode: 'UCBA0000910',
    },
    {
      slNo: 5,
      name: 'RAHAS SAHOO',
      designation: 'DRIVER',
      totalPresent: 28,
      perDay: 950.00,
      grossSalary: 26600.00,
      cmpfAtt: 9,
      cmpfRate: 1387.00,
      cmpfGrossAmt: 12483.00,
      cmpf15Pct: 1873.00,
      cmpfPension: 2524.00,
      cmpfTotalAmt: 4397.00,
      ownerShareCmpf: 4397.00,
      totalCmpf: 8794.00,
      advanceAmount: 500.00,
      netSalaryAmount: 21703.00,
      accountNumber: '09100110007082',
      ifscCode: 'UCBA0000910',
    },
    {
      slNo: 6,
      name: 'BIGHNESWAR SAHOO',
      designation: 'DRIVER',
      totalPresent: 30,
      perDay: 950.00,
      grossSalary: 28500.00,
      cmpfAtt: 10,
      cmpfRate: 1387.00,
      cmpfGrossAmt: 13870.00,
      cmpf15Pct: 2081.00,
      cmpfPension: 2524.00,
      cmpfTotalAmt: 4605.00,
      ownerShareCmpf: 4605.00,
      totalCmpf: 9210.00,
      advanceAmount: 0.00,
      netSalaryAmount: 23895.00,
      accountNumber: '39033032720',
      ifscCode: 'SBIN0017955',
    },
  ];

  // Totals row calculation
  const totalPresentSum = sampleData.reduce((acc, r) => acc + r.totalPresent, 0);
  const grossSalarySum = sampleData.reduce((acc, r) => acc + r.grossSalary, 0);
  const cmpfAttSum = sampleData.reduce((acc, r) => acc + r.cmpfAtt, 0);
  const cmpfGrossAmtSum = sampleData.reduce((acc, r) => acc + r.cmpfGrossAmt, 0);
  const cmpf15PctSum = sampleData.reduce((acc, r) => acc + r.cmpf15Pct, 0);
  const cmpfPensionSum = sampleData.reduce((acc, r) => acc + r.cmpfPension, 0);
  const cmpfTotalAmtSum = sampleData.reduce((acc, r) => acc + r.cmpfTotalAmt, 0);
  const ownerShareCmpfSum = sampleData.reduce((acc, r) => acc + r.ownerShareCmpf, 0);
  const totalCmpfSum = sampleData.reduce((acc, r) => acc + r.totalCmpf, 0);
  const advanceAmountSum = sampleData.reduce((acc, r) => acc + r.advanceAmount, 0);
  const netSalaryAmountSum = sampleData.reduce((acc, r) => acc + r.netSalaryAmount, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    let csv = `DRIVER OR P/L OPT SALARY STATEMENT - ${monthName.toUpperCase()} ${year}\n`;
    csv += `SL NO,NAME,DESIGNATION,TOTAL PRESENT,PER DAY,GROSS SALARY (E*F),CMPF ATT,CMPF RATE,CMPF GROSS AMT (H*I),CMPF 15%,CMPF PENSION,CMPF TOTAL (K+L),OWNER SHARE CMPF,TOTAL CMPF (M+N),ADVANCE AMOUNT,NET SALARY (G-M-P),ACCOUNT NUMBER,IFSC CODE\n`;
    sampleData.forEach((r) => {
      csv += `${r.slNo},"${r.name}","${r.designation}",${r.totalPresent},${r.perDay},${r.grossSalary},${r.cmpfAtt},${r.cmpfRate},${r.cmpfGrossAmt},${r.cmpf15Pct},${r.cmpfPension},${r.cmpfTotalAmt},${r.ownerShareCmpf},${r.totalCmpf},${r.advanceAmount},${r.netSalaryAmount},'${r.accountNumber}','${r.ifscCode}'\n`;
    });
    csv += `TOTAL,,,${totalPresentSum},,${grossSalarySum},${cmpfAttSum},,${cmpfGrossAmtSum},${cmpf15PctSum},${cmpfPensionSum},${cmpfTotalAmtSum},${ownerShareCmpfSum},${totalCmpfSum},${advanceAmountSum},${netSalaryAmountSum},,\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Driver_CMPF_Salary_Statement_${monthName}_${year}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4">
      {/* Control Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Driver or P/L Opt Salary Format (CMPF Compliant)</h2>
            <p className="text-xs text-slate-500">
              Statutory Coal Mines Provident Fund (CMPF) calculations for heavy vehicle drivers and payload operators
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Sheet</span>
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

      {/* Official Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold uppercase border-b border-slate-300 text-[10px] tracking-wider text-center">
                <th className="py-2 px-2 border-r border-slate-300 w-10">SL NO</th>
                <th className="py-2 px-3 border-r border-slate-300 text-left min-w-[160px]">NAME</th>
                <th className="py-2 px-2 border-r border-slate-300">DESIGNATION</th>
                <th className="py-2 px-2 border-r border-slate-300">TOTAL PRESENT</th>
                <th className="py-2 px-2 border-r border-slate-300">PER DAY</th>
                <th className="py-2 px-2 border-r border-slate-300">GROSS SALARY</th>
                <th className="py-2 px-2 border-r border-slate-300">CMPF ATT</th>
                <th className="py-2 px-2 border-r border-slate-300">CMPF RATE</th>
                <th className="py-2 px-2 border-r border-slate-300">CMPF GROSS AMT</th>
                <th className="py-2 px-2 border-r border-slate-300">CMPF 12%+ ADM. CHARGE 3% =15%</th>
                <th className="py-2 px-2 border-r border-slate-300">CMPF PENSION</th>
                <th className="py-2 px-2 border-r border-slate-300">CMPF TOTAL AMT</th>
                <th className="py-2 px-2 border-r border-slate-300">OWNER SHARE CMPF</th>
                <th className="py-2 px-2 border-r border-slate-300">TOTAL CMPF</th>
                <th className="py-2 px-2 border-r border-slate-300">ADVANCE AMOUNT</th>
                <th className="py-2 px-2 border-r border-slate-300 bg-blue-50 text-blue-900">NET SALARY AMOUNT</th>
                <th className="py-2 px-3 border-r border-slate-300 text-left">ACCOUNT NUMBER</th>
                <th className="py-2 px-2 text-left">IFSC CODE</th>
              </tr>
              <tr className="bg-slate-200 text-slate-600 font-mono text-[9px] border-b border-slate-300 text-center">
                <th className="py-0.5 px-2 border-r border-slate-300">A</th>
                <th className="py-0.5 px-3 border-r border-slate-300 text-left">C</th>
                <th className="py-0.5 px-2 border-r border-slate-300">D</th>
                <th className="py-0.5 px-2 border-r border-slate-300">E</th>
                <th className="py-0.5 px-2 border-r border-slate-300">F</th>
                <th className="py-0.5 px-2 border-r border-slate-300">G=E×F</th>
                <th className="py-0.5 px-2 border-r border-slate-300">H</th>
                <th className="py-0.5 px-2 border-r border-slate-300">I</th>
                <th className="py-0.5 px-2 border-r border-slate-300">J=H×I</th>
                <th className="py-0.5 px-2 border-r border-slate-300">K=J 15%</th>
                <th className="py-0.5 px-2 border-r border-slate-300">L</th>
                <th className="py-0.5 px-2 border-r border-slate-300">M=K+L</th>
                <th className="py-0.5 px-2 border-r border-slate-300">N=M</th>
                <th className="py-0.5 px-2 border-r border-slate-300">O=M+N</th>
                <th className="py-0.5 px-2 border-r border-slate-300">P</th>
                <th className="py-0.5 px-2 border-r border-slate-300 bg-blue-100 font-bold">Q=G-M-P</th>
                <th className="py-0.5 px-3 border-r border-slate-300 text-left"></th>
                <th className="py-0.5 px-2 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {sampleData.map((row) => (
                <tr key={row.slNo} className="hover:bg-slate-50/70">
                  <td className="py-2 px-2 text-center border-r border-slate-200">{row.slNo}</td>
                  <td className="py-2 px-3 font-sans font-bold text-slate-900 border-r border-slate-200">{row.name}</td>
                  <td className="py-2 px-2 text-center font-sans text-slate-700 border-r border-slate-200">{row.designation}</td>
                  <td className="py-2 px-2 text-right border-r border-slate-200">{row.totalPresent}</td>
                  <td className="py-2 px-2 text-right border-r border-slate-200">{row.perDay.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right font-semibold text-slate-900 border-r border-slate-200">{row.grossSalary.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right border-r border-slate-200">{row.cmpfAtt}</td>
                  <td className="py-2 px-2 text-right border-r border-slate-200">{row.cmpfRate.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right border-r border-slate-200">{row.cmpfGrossAmt.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right border-r border-slate-200">{row.cmpf15Pct.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right border-r border-slate-200">{row.cmpfPension.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right font-semibold text-amber-900 border-r border-slate-200">{row.cmpfTotalAmt.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right border-r border-slate-200">{row.ownerShareCmpf.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right font-semibold border-r border-slate-200">{row.totalCmpf.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right text-rose-700 border-r border-slate-200">{row.advanceAmount > 0 ? row.advanceAmount.toFixed(2) : '-'}</td>
                  <td className="py-2 px-2 text-right font-bold text-blue-900 bg-blue-50/70 border-r border-slate-200">{row.netSalaryAmount.toFixed(2)}</td>
                  <td className="py-2 px-3 text-left border-r border-slate-200 font-sans">{row.accountNumber}</td>
                  <td className="py-2 px-2 text-left font-sans">{row.ifscCode}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-900 font-mono text-[11px] font-bold">
              <tr>
                <td colSpan={3} className="py-2.5 px-3 uppercase text-center font-sans font-black border-r border-slate-300">
                  TOTAL
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300">{totalPresentSum}</td>
                <td className="py-2.5 px-2 border-r border-slate-300"></td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300 text-slate-900">{grossSalarySum.toFixed(2)}</td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300">{cmpfAttSum.toFixed(2)}</td>
                <td className="py-2.5 px-2 border-r border-slate-300"></td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300">{cmpfGrossAmtSum.toFixed(2)}</td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300">{cmpf15PctSum.toFixed(2)}</td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300">{cmpfPensionSum.toFixed(2)}</td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300 text-amber-900">{cmpfTotalAmtSum.toFixed(2)}</td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300">{ownerShareCmpfSum.toFixed(2)}</td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300">{totalCmpfSum.toFixed(2)}</td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300 text-rose-700">{advanceAmountSum.toFixed(2)}</td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300 text-blue-900 bg-blue-100 font-black text-xs">
                  {netSalaryAmountSum.toFixed(2)}
                </td>
                <td colSpan={2} className="py-2.5 px-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
