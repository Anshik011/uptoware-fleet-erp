'use client';

import React, { useMemo } from 'react';
import { Download, Printer, Users, FileSpreadsheet } from 'lucide-react';
import { EmployeeProfile, EmployeeAttendanceSummary } from '@/types/fleet';

interface StaffSalaryRecord {
  slNo: number;
  name: string;
  designation: string;
  totalPresent: number;
  monthlySalary: number;
  perDay: number;
  grossSalary: number;
  advanceAmount: number;
  netSalaryAmount: number;
  accountNumber: string;
  ifscCode: string;
}

interface OtherStaffSalaryFormatProps {
  monthName?: string;
  year?: number;
  employees?: EmployeeProfile[];
  attendanceSummary?: EmployeeAttendanceSummary[];
}

export function OtherStaffSalaryFormat({
  monthName = 'November',
  year = 2026,
  employees = [],
  attendanceSummary = [],
}: OtherStaffSalaryFormatProps) {
  // Generate real data dynamically from enrolled staff roster & attendance
  const staffData: StaffSalaryRecord[] = useMemo(() => {
    // Filter non-driver employees (Supervisors, Incharge, Admin, Maintenance, etc.)
    const nonDrivers = employees.filter((e) => {
      const desig = (e.designation || '').toUpperCase();
      return !desig.includes('DRIVER');
    });

    const targetList = nonDrivers.length > 0 ? nonDrivers : employees;

    return targetList.map((emp, idx) => {
      const att = attendanceSummary.find(
        (a) => a.employee === emp.id || a.employeeName?.toLowerCase() === emp.employeeName?.toLowerCase()
      );

      const totalPresent = att ? (att.presentDays ?? 0) : 0;
      const dailyRate = emp.dailySalary || (att ? att.dailySalaryRate : 0) || 366.67;
      const monthlySalary = Number((dailyRate * 30).toFixed(2));
      const perDay = Number(dailyRate.toFixed(2));
      const grossSalary = Number((totalPresent * perDay).toFixed(2));
      const advanceAmount = 0.0;
      const netSalaryAmount = Number((grossSalary - advanceAmount).toFixed(2));

      const bankAcc = (emp as any).bankAccount || (emp as any).accountNumber || (emp as any).bankDetails?.accountNo || '—';
      const ifsc = emp.ifscCode || (emp as any).bankDetails?.ifsc || '—';

      return {
        slNo: idx + 1,
        name: emp.employeeName || emp.firstName || emp.id,
        designation: (emp.designation || 'Staff').toUpperCase(),
        totalPresent,
        monthlySalary,
        perDay,
        grossSalary,
        advanceAmount,
        netSalaryAmount,
        accountNumber: bankAcc,
        ifscCode: ifsc,
      };
    });
  }, [employees, attendanceSummary]);

  const totalPresentSum = staffData.reduce((acc, r) => acc + r.totalPresent, 0);
  const grossSalarySum = staffData.reduce((acc, r) => acc + r.grossSalary, 0);
  const advanceAmountSum = staffData.reduce((acc, r) => acc + r.advanceAmount, 0);
  const netSalaryAmountSum = staffData.reduce((acc, r) => acc + r.netSalaryAmount, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    let csv = `OTHER STAFF SALARY STATEMENT - ${monthName.toUpperCase()} ${year}\n`;
    csv += `SL NO,NAME,DESIGNATION,TOTAL PRESENT,MONTHLY SALARY,PER DAY,GROSS SALARY,ADVANCE AMOUNT,NET SALARY AMOUNT,ACCOUNT NUMBER,IFSC CODE\n`;
    staffData.forEach((r) => {
      csv += `${r.slNo},"${r.name}","${r.designation}",${r.totalPresent},${r.monthlySalary},${r.perDay},${r.grossSalary},${r.advanceAmount},${r.netSalaryAmount},'${r.accountNumber}','${r.ifscCode}'\n`;
    });
    csv += `TOTAL,,,${totalPresentSum},,,${grossSalarySum},${advanceAmountSum},${netSalaryAmountSum},,\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Other_Staff_Salary_Statement_${monthName}_${year}.csv`;
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
            <h2 className="text-sm font-bold text-slate-900">Other Staff Salary Format</h2>
            <p className="text-xs text-slate-500">
              Site supervisors, administrative incharge, and workshop maintenance staff monthly salary disbursements
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
                <th className="py-2 px-3 border-r border-slate-300">MONTHLY SALARY</th>
                <th className="py-2 px-3 border-r border-slate-300">PER DAY</th>
                <th className="py-2 px-3 border-r border-slate-300">GROSS SALARY</th>
                <th className="py-2 px-3 border-r border-slate-300">ADVANCE AMOUNT</th>
                <th className="py-2 px-3 border-r border-slate-300 bg-blue-50 text-blue-900">NET SALARY AMOUNT</th>
                <th className="py-2 px-4 border-r border-slate-300 text-left min-w-[140px]">ACCOUNT NUMBER</th>
                <th className="py-2 px-3 text-left">IFSC CODE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {staffData.length > 0 ? (
                staffData.map((row) => (
                  <tr key={row.slNo} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 text-center border-r border-slate-200">{row.slNo}</td>
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-900 border-r border-slate-200">{row.name}</td>
                    <td className="py-2.5 px-3 text-center font-sans text-slate-700 border-r border-slate-200">{row.designation}</td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-200 font-bold">{row.totalPresent}</td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-200">{row.monthlySalary.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-200">{row.perDay.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900 border-r border-slate-200">{row.grossSalary.toFixed(2)}</td>
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
                  <td colSpan={11} className="py-8 text-center text-slate-500 font-sans">
                    No staff records found for this period.
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
                <td colSpan={2} className="py-3 px-3 border-r border-slate-300"></td>
                <td className="py-3 px-3 text-right border-r border-slate-300 text-slate-900 font-black">
                  {grossSalarySum.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-right border-r border-slate-300 text-rose-700">
                  {advanceAmountSum.toFixed(2)}
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
