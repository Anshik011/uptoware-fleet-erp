'use client';

import React, { useMemo } from 'react';
import { Download, Printer, Users, IndianRupee, FileSpreadsheet } from 'lucide-react';
import { EmployeeProfile, EmployeeAttendanceSummary } from '@/types/fleet';

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
  employees?: EmployeeProfile[];
  attendanceSummary?: EmployeeAttendanceSummary[];
}

export function DriverCmpfSalaryFormat({
  monthName = 'November',
  year = 2026,
  employees = [],
  attendanceSummary = [],
}: DriverCmpfSalaryFormatProps) {
  // Generate real data dynamically from enrolled drivers roster & attendance
  const driverData: DriverSalaryRecord[] = useMemo(() => {
    // Filter drivers
    const drivers = employees.filter((e) => {
      const desig = (e.designation || '').toUpperCase();
      return desig.includes('DRIVER');
    });

    const targetList = drivers.length > 0 ? drivers : employees;

    return targetList.map((emp, idx) => {
      const att = attendanceSummary.find(
        (a) => a.employee === emp.id || a.employeeName?.toLowerCase() === emp.employeeName?.toLowerCase()
      );

      const totalPresent = att ? (att.presentDays ?? 0) : 0;
      const perDay = emp.dailySalary || (att ? att.dailySalaryRate : 0) || 950.0;
      const grossSalary = Number((totalPresent * perDay).toFixed(2));

      // CMPF Statutory Formulas
      const cmpfRate = 1387.0;
      const cmpfAtt = Math.min(10, Math.floor(totalPresent / 3)) || (totalPresent > 0 ? 1 : 0);
      const cmpfGrossAmt = Number((cmpfAtt * cmpfRate).toFixed(2));
      const cmpf15Pct = Number((cmpfGrossAmt * 0.15).toFixed(2));
      const cmpfPension = totalPresent > 0 ? 2524.0 : 0.0;
      const cmpfTotalAmt = Number((cmpf15Pct + cmpfPension).toFixed(2));
      const ownerShareCmpf = cmpfTotalAmt;
      const totalCmpf = Number((cmpfTotalAmt + ownerShareCmpf).toFixed(2));
      const advanceAmount = 0.0;
      const netSalaryAmount = Number(Math.max(0, grossSalary - cmpfTotalAmt - advanceAmount).toFixed(2));

      const bankAcc = (emp as any).bankAccount || (emp as any).accountNumber || (emp as any).bankDetails?.accountNo || '—';
      const ifsc = emp.ifscCode || (emp as any).bankDetails?.ifsc || '—';

      return {
        slNo: idx + 1,
        name: emp.employeeName || emp.firstName || emp.id,
        designation: (emp.designation || 'Driver').toUpperCase(),
        totalPresent,
        perDay,
        grossSalary,
        cmpfAtt,
        cmpfRate,
        cmpfGrossAmt,
        cmpf15Pct,
        cmpfPension,
        cmpfTotalAmt,
        ownerShareCmpf,
        totalCmpf,
        advanceAmount,
        netSalaryAmount,
        accountNumber: bankAcc,
        ifscCode: ifsc,
      };
    });
  }, [employees, attendanceSummary]);

  // Totals row calculation
  const totalPresentSum = driverData.reduce((acc, r) => acc + r.totalPresent, 0);
  const grossSalarySum = driverData.reduce((acc, r) => acc + r.grossSalary, 0);
  const cmpfAttSum = driverData.reduce((acc, r) => acc + r.cmpfAtt, 0);
  const cmpfGrossAmtSum = driverData.reduce((acc, r) => acc + r.cmpfGrossAmt, 0);
  const cmpf15PctSum = driverData.reduce((acc, r) => acc + r.cmpf15Pct, 0);
  const cmpfPensionSum = driverData.reduce((acc, r) => acc + r.cmpfPension, 0);
  const cmpfTotalAmtSum = driverData.reduce((acc, r) => acc + r.cmpfTotalAmt, 0);
  const ownerShareCmpfSum = driverData.reduce((acc, r) => acc + r.ownerShareCmpf, 0);
  const totalCmpfSum = driverData.reduce((acc, r) => acc + r.totalCmpf, 0);
  const advanceAmountSum = driverData.reduce((acc, r) => acc + r.advanceAmount, 0);
  const netSalaryAmountSum = driverData.reduce((acc, r) => acc + r.netSalaryAmount, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    let csv = `DRIVER OR P/L OPT SALARY STATEMENT - ${monthName.toUpperCase()} ${year}\n`;
    csv += `SL NO,NAME,DESIGNATION,TOTAL PRESENT,PER DAY,GROSS SALARY (E*F),CMPF ATT,CMPF RATE,CMPF GROSS AMT (H*I),CMPF 15%,CMPF PENSION,CMPF TOTAL (K+L),OWNER SHARE CMPF,TOTAL CMPF (M+N),ADVANCE AMOUNT,NET SALARY (G-M-P),ACCOUNT NUMBER,IFSC CODE\n`;
    driverData.forEach((r) => {
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
            <Users className="w-5 h-5" />
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
                <th className="py-2 px-3 border-r border-slate-300 w-12">SL NO</th>
                <th className="py-2 px-4 border-r border-slate-300 text-left min-w-[180px]">NAME</th>
                <th className="py-2 px-3 border-r border-slate-300">DESIGNATION</th>
                <th className="py-2 px-3 border-r border-slate-300">TOTAL PRESENT</th>
                <th className="py-2 px-3 border-r border-slate-300">PER DAY</th>
                <th className="py-2 px-3 border-r border-slate-300">GROSS SALARY</th>
                <th className="py-2 px-3 border-r border-slate-300">CMPF ATT</th>
                <th className="py-2 px-3 border-r border-slate-300">CMPF RATE</th>
                <th className="py-2 px-3 border-r border-slate-300">CMPF GROSS AMT</th>
                <th className="py-2 px-3 border-r border-slate-300">CMPF 12% + ADM. CHARGE 3% =15%</th>
                <th className="py-2 px-3 border-r border-slate-300">CMPF PENSION</th>
                <th className="py-2 px-3 border-r border-slate-300">CMPF TOTAL AMT</th>
                <th className="py-2 px-3 border-r border-slate-300">OWNER SHARE CMPF</th>
                <th className="py-2 px-3 border-r border-slate-300">TOTAL CMPF</th>
                <th className="py-2 px-3 border-r border-slate-300">ADVANCE AMOUNT</th>
                <th className="py-2 px-3 border-r border-slate-300 bg-blue-50 text-blue-900">NET SALARY AMOUNT</th>
                <th className="py-2 px-4 border-r border-slate-300 text-left min-w-[140px]">ACCOUNT NUMBER</th>
                <th className="py-2 px-3 text-left">IFSC CODE</th>
              </tr>
              {/* Formula Key Header Sub-row */}
              <tr className="bg-slate-50 text-slate-500 text-[9px] border-b border-slate-300 text-center font-mono">
                <td className="py-1 px-3 border-r border-slate-300">A</td>
                <td className="py-1 px-4 border-r border-slate-300 text-left">C</td>
                <td className="py-1 px-3 border-r border-slate-300">D</td>
                <td className="py-1 px-3 border-r border-slate-300">E</td>
                <td className="py-1 px-3 border-r border-slate-300">F</td>
                <td className="py-1 px-3 border-r border-slate-300">G=E*F</td>
                <td className="py-1 px-3 border-r border-slate-300">H</td>
                <td className="py-1 px-3 border-r border-slate-300">I</td>
                <td className="py-1 px-3 border-r border-slate-300">J=H*I</td>
                <td className="py-1 px-3 border-r border-slate-300">K=J 15%</td>
                <td className="py-1 px-3 border-r border-slate-300">L</td>
                <td className="py-1 px-3 border-r border-slate-300">M=K+L</td>
                <td className="py-1 px-3 border-r border-slate-300">N=M</td>
                <td className="py-1 px-3 border-r border-slate-300">O=M+N</td>
                <td className="py-1 px-3 border-r border-slate-300">P</td>
                <td className="py-1 px-3 border-r border-slate-300 bg-blue-50/50">Q=G-M-P</td>
                <td className="py-1 px-4 border-r border-slate-300">R</td>
                <td className="py-1 px-3">S</td>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {driverData.length > 0 ? (
                driverData.map((row) => (
                  <tr key={row.slNo} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 text-center border-r border-slate-200">{row.slNo}</td>
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-900 border-r border-slate-200">{row.name}</td>
                    <td className="py-2.5 px-3 text-center font-sans text-slate-700 border-r border-slate-200">{row.designation}</td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-200 font-bold">{row.totalPresent}</td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-200">{row.perDay.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900 border-r border-slate-200">{row.grossSalary.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-200">{row.cmpfAtt}</td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-200">{row.cmpfRate.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-200">{row.cmpfGrossAmt.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-200">{row.cmpf15Pct.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-200">{row.cmpfPension.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-200 font-semibold">{row.cmpfTotalAmt.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-200 font-semibold">{row.ownerShareCmpf.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-200 font-bold text-slate-800">{row.totalCmpf.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-rose-700 border-r border-slate-200">
                      {row.advanceAmount > 0 ? row.advanceAmount.toFixed(2) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-blue-900 bg-blue-50/70 border-r border-slate-200">
                      {row.netSalaryAmount.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-left border-r border-slate-200 font-sans font-medium">{row.accountNumber}</td>
                    <td className="py-2.5 px-3 text-left font-sans">{row.ifscCode}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={18} className="py-8 text-center text-slate-500 font-sans">
                    No driver records found for this period.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-900 font-mono text-[11px] font-bold">
              <tr>
                <td colSpan={3} className="py-3 px-3 uppercase text-center font-sans font-black border-r border-slate-300">
                  TOTAL
                </td>
                <td className="py-3 px-3 text-right border-r border-slate-300 font-black">{totalPresentSum}</td>
                <td className="py-3 px-3 border-r border-slate-300"></td>
                <td className="py-3 px-3 text-right border-r border-slate-300 text-slate-900 font-black">
                  {grossSalarySum.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-right border-r border-slate-300">{cmpfAttSum.toFixed(2)}</td>
                <td className="py-3 px-3 border-r border-slate-300"></td>
                <td className="py-3 px-3 text-right border-r border-slate-300">{cmpfGrossAmtSum.toFixed(2)}</td>
                <td className="py-3 px-3 text-right border-r border-slate-300">{cmpf15PctSum.toFixed(2)}</td>
                <td className="py-3 px-3 text-right border-r border-slate-300">{cmpfPensionSum.toFixed(2)}</td>
                <td className="py-3 px-3 text-right border-r border-slate-300">{cmpfTotalAmtSum.toFixed(2)}</td>
                <td className="py-3 px-3 text-right border-r border-slate-300">{ownerShareCmpfSum.toFixed(2)}</td>
                <td className="py-3 px-3 text-right border-r border-slate-300 font-black">{totalCmpfSum.toFixed(2)}</td>
                <td className="py-3 px-3 text-right border-r border-slate-300 text-rose-700">
                  {advanceAmountSum > 0 ? advanceAmountSum.toFixed(2) : '-'}
                </td>
                <td className="py-3 px-3 text-right border-r border-slate-300 text-blue-900 bg-blue-100 font-black text-xs">
                  {netSalaryAmountSum.toFixed(2)}
                </td>
                <td colSpan={2} className="py-3 px-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
