'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useMine } from '@/context/MineContext';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmployeeProfile, EmployeeAttendance, EmployeeAttendanceSummary } from '@/types/fleet';
import { formatVehicleDisplay, formatMineSiteDisplay } from '@/lib/displayFormatters';
import {
  Users,
  UserCheck,
  Building,
  Briefcase,
  Phone,
  Mail,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  Truck,
  IndianRupee,
  MapPin,
  CreditCard,
  FileSpreadsheet,
  Check,
  AlertTriangle,
} from 'lucide-react';

type ActiveTab = 'directory' | 'roster' | 'summary';

function EmployeesContent() {
  const { hasRole } = useAuth();
  const { currentMine, mineOptions } = useMine();
  const searchParams = useSearchParams();
  const canManage = hasRole(['Fleet Manager', 'Administrator']);

  const tabParam = searchParams.get('tab') as ActiveTab | null;
  const statusParam = searchParams.get('status');
  const actionParam = searchParams.get('action');

  // Tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>(tabParam || 'directory');

  // Employee Directory state
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Directory Filters
  const [statusFilter, setStatusFilter] = useState<string>(statusParam || 'ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [mineFilter, setMineFilter] = useState<string>(currentMine);

  useEffect(() => {
    if (tabParam) setActiveTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    if (statusParam) setStatusFilter(statusParam);
  }, [statusParam]);

  useEffect(() => {
    if (actionParam === 'new') setIsModalOpen(true);
  }, [actionParam]);

  // Sync mineFilter when global currentMine changes
  useEffect(() => {
    setMineFilter(currentMine);
  }, [currentMine]);

  // Add Employee Modal
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cellNumber, setCellNumber] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [department, setDepartment] = useState('Operations');
  const [designation, setDesignation] = useState('Driver');
  const [selectedMine, setSelectedMine] = useState('JBR Eastern — Talcher Site');
  const [assignedVehicle, setAssignedVehicle] = useState('');
  const [dailySalary, setDailySalary] = useState('850');
  const [ifscCode, setIfscCode] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankName, setBankName] = useState('SBI');
  const [dateOfJoining, setDateOfJoining] = useState(todayStr);
  const [relievingDate, setRelievingDate] = useState('');
  const [aadhaarNo, setAadhaarNo] = useState('');
  const [panNo, setPanNo] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab 2: Attendance Roster state
  const [rosterDate, setRosterDate] = useState<string>(todayStr);
  const [rosterShift, setRosterShift] = useState<'Day' | 'Night' | 'General'>('Day');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, EmployeeAttendance>>({});
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [savingAttendanceId, setSavingAttendanceId] = useState<string | null>(null);
  const [attendanceSuccessMsg, setAttendanceSuccessMsg] = useState<string | null>(null);

  // Tab 3: Summary state
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [summaryMonth, setSummaryMonth] = useState<number>(currentMonth);
  const [summaryYear, setSummaryYear] = useState<number>(currentYear);
  const [attendanceSummary, setAttendanceSummary] = useState<EmployeeAttendanceSummary[]>([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // Load Employees
  const loadEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/employees?limit=200');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load employee records.');
      }
      setEmployees(json.data || []);
    } catch (err: any) {
      console.error('Error loading employees:', err);
      setError(err.message || 'Error fetching employees.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load Attendance for selected roster date
  const loadAttendanceForDate = useCallback(async (date: string, mine: string) => {
    try {
      setIsAttendanceLoading(true);
      const params = new URLSearchParams({ date });
      if (mine && mine !== 'ALL') {
        params.append('mine_site', mine);
      }
      const res = await fetch(`/api/attendance?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        const map: Record<string, EmployeeAttendance> = {};
        for (const item of json.data || []) {
          map[item.employee] = item;
        }
        setAttendanceRecords(map);
      }
    } catch (err: any) {
      console.error('Error fetching attendance for date:', err);
    } finally {
      setIsAttendanceLoading(false);
    }
  }, []);

  // Load Attendance Summary
  const loadAttendanceSummary = useCallback(async (month: number, year: number, mine: string) => {
    try {
      setIsSummaryLoading(true);
      const params = new URLSearchParams({
        month: String(month),
        year: String(year),
      });
      if (mine && mine !== 'ALL') {
        params.append('mine_site', mine);
      }
      const res = await fetch(`/api/attendance/summary?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setAttendanceSummary(json.data || []);
      }
    } catch (err: any) {
      console.error('Error loading attendance summary:', err);
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    if (activeTab === 'roster') {
      loadAttendanceForDate(rosterDate, mineFilter);
    } else if (activeTab === 'summary') {
      loadAttendanceSummary(summaryMonth, summaryYear, mineFilter);
    }
  }, [activeTab, rosterDate, mineFilter, summaryMonth, summaryYear, loadAttendanceForDate, loadAttendanceSummary]);

  // Handle Mark Attendance for a single employee
  const handleMarkAttendance = async (
    emp: EmployeeProfile,
    status: 'Present' | 'Half Day' | 'Absent' | 'On Leave'
  ) => {
    try {
      setSavingAttendanceId(emp.id);
      setAttendanceSuccessMsg(null);
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee: emp.id,
          attendanceDate: rosterDate,
          attendanceStatus: status,
          shift: rosterShift,
          vehicle: emp.assignedVehicle || undefined,
          mineSite: emp.customMineSite || emp.mineSite || selectedMine,
          dailySalaryRate: emp.dailySalary || 0,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update attendance.');
      }

      setAttendanceRecords((prev) => ({
        ...prev,
        [emp.id]: json.data,
      }));
      setAttendanceSuccessMsg(`Recorded ${status} for ${emp.employeeName}`);
      setTimeout(() => setAttendanceSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Error saving attendance: ${err.message}`);
    } finally {
      setSavingAttendanceId(null);
    }
  };

  // Quick Batch: Mark All Present
  const handleMarkAllPresent = async () => {
    if (!confirm(`Mark all visible personnel as PRESENT for ${rosterDate}?`)) return;
    try {
      setIsAttendanceLoading(true);
      for (const emp of filteredEmployees) {
        await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee: emp.id,
            attendanceDate: rosterDate,
            attendanceStatus: 'Present',
            shift: rosterShift,
            vehicle: emp.assignedVehicle || undefined,
            mineSite: emp.customMineSite || emp.mineSite || selectedMine,
            dailySalaryRate: emp.dailySalary || 0,
          }),
        });
      }
      await loadAttendanceForDate(rosterDate, mineFilter);
      setAttendanceSuccessMsg(`Batch attendance marked: All personnel PRESENT for ${rosterDate}.`);
      setTimeout(() => setAttendanceSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Batch mark error: ${err.message}`);
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!firstName.trim()) {
      setModalError('First name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          cellNumber: cellNumber.trim() || undefined,
          companyEmail: companyEmail.trim() || undefined,
          department: department.trim() || undefined,
          designation: designation.trim() || undefined,
          status: 'Active',
          mineSite: selectedMine || undefined,
          assignedVehicle: assignedVehicle.trim() || undefined,
          dailySalary: dailySalary ? Number(dailySalary) : 0,
          ifscCode: ifscCode.trim() || undefined,
          bankAccountNo: bankAccountNo.trim() || undefined,
          bankName: bankName.trim() || undefined,
          dateOfJoining: dateOfJoining.trim() || undefined,
          relievingDate: relievingDate.trim() || undefined,
          aadhaarNo: aadhaarNo.trim() || undefined,
          panNo: panNo.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create employee profile.');
      }

      setIsModalOpen(false);
      setFirstName('');
      setLastName('');
      setCellNumber('');
      setCompanyEmail('');
      setAssignedVehicle('');
      setIfscCode('');
      setBankAccountNo('');
      setRelievingDate('');
      setAadhaarNo('');
      setPanNo('');
      await loadEmployees();
    } catch (err: any) {
      setModalError(err.message || 'Error creating employee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics
  const totalEmployees = employees.length;
  const activeCount = employees.filter((e) => e.status === 'Active').length;
  const driverDesignations = employees.filter((e) => (e.designation || '').toLowerCase().includes('driver')).length;
  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean))) as string[];

  // Filtered List
  const filteredEmployees = employees.filter((emp) => {
    if (statusFilter !== 'ALL' && emp.status !== statusFilter) return false;
    if (departmentFilter !== 'ALL' && emp.department !== departmentFilter) return false;
    if (mineFilter !== 'ALL') {
      const empMine = emp.customMineSite || emp.mineSite;
      if (empMine && empMine !== mineFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = emp.employeeName.toLowerCase().includes(q);
      const matchId = emp.id.toLowerCase().includes(q);
      const matchEmail = (emp.companyEmail || '').toLowerCase().includes(q);
      const matchPhone = (emp.cellNumber || '').toLowerCase().includes(q);
      const matchVehicle = (emp.assignedVehicle || '').toLowerCase().includes(q);
      if (!matchName && !matchId && !matchEmail && !matchPhone && !matchVehicle) return false;
    }
    return true;
  });

  // Tab 3 Summary aggregates
  const summaryTotalPayout = attendanceSummary.reduce((acc, curr) => acc + curr.totalCalculatedSalary, 0);
  const summaryTotalDays = attendanceSummary.reduce((acc, curr) => acc + curr.totalLoggedDays, 0);
  const summaryPresentDays = attendanceSummary.reduce((acc, curr) => acc + curr.presentDays, 0);

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="HRMS & Personnel Management"
          subtitle="Integrated ERPNext employee master, daily mine site attendance roster, and automated wage & salary calculation."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                onClick={() => {
                  loadEmployees();
                  if (activeTab === 'roster') loadAttendanceForDate(rosterDate, mineFilter);
                  if (activeTab === 'summary') loadAttendanceSummary(summaryMonth, summaryYear, mineFilter);
                }}
                disabled={isLoading || isAttendanceLoading || isSummaryLoading}
              >
                Refresh
              </Button>
              {canManage && activeTab === 'directory' && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={() => {
                    setModalError(null);
                    setIsModalOpen(true);
                  }}
                >
                  Add Employee
                </Button>
              )}
            </div>
          }
        />

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-slate-200 mb-6 bg-white px-2 rounded-t-xl">
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-5 py-3.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'directory'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Personnel Directory</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
              {employees.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-2 px-5 py-3.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'roster'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Daily Attendance Roster</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-5 py-3.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'summary'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Attendance & Salary Summary</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: PERSONNEL DIRECTORY */}
        {/* ======================================================== */}
        {activeTab === 'directory' && (
          <>
            {/* Metrics Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  <span>Total Personnel</span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{totalEmployees}</div>
                <p className="text-[11px] text-slate-400 mt-1">ERPNext employee roster</p>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  <span>Active Personnel</span>
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{activeCount}</div>
                <p className="text-[11px] text-slate-400 mt-1">Confirmed active status</p>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  <span>Fleet Drivers</span>
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{driverDesignations}</div>
                <p className="text-[11px] text-slate-400 mt-1">Designated driving personnel</p>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  <span>Departments</span>
                  <Building className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{departments.length || 1}</div>
                <p className="text-[11px] text-slate-400 mt-1">Organizational divisions</p>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by employee, phone, vehicle, or email..."
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                {mineOptions.length > 0 && (
                  <select
                    value={mineFilter}
                    onChange={(e) => setMineFilter(e.target.value)}
                    className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                  >
                    <option value="ALL">All Mine Sites</option>
                    {mineOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                )}

                {departments.length > 0 && (
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                  >
                    <option value="ALL">All Departments</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Left">Left</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Showing {filteredEmployees.length} of {employees.length} personnel
              </div>
            </div>

            {/* Client Requirements Alignment Notice */}
            <div className="mb-4 p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-700 shrink-0" />
                <span>
                  <strong>Employee Master Specification:</strong> 1:1 synchronization with ERPNext Drivers active. Master Excel bulk-import template format is currently <strong>Awaiting Client Input</strong>.
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                Specification Alignment
              </span>
            </div>

            {/* Employee Table */}
            {isLoading ? (
              <div className="p-12 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
                <p className="text-xs text-slate-500">Retrieving ERPNext personnel records...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {error}
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-12 rounded-xl border border-dashed border-slate-300 bg-white shadow-sm text-center">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-700">No personnel records found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'Try adjusting your search criteria.'
                    : 'Click "+ Add Employee" to enroll new team members into the ERPNext personnel registry.'}
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-4">Mine & Vehicle</th>
                        <th className="py-3 px-4">Contact Info</th>
                        <th className="py-3 px-4">Bank & KYC</th>
                        <th className="py-3 px-4 text-right">Daily Salary</th>
                        <th className="py-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEmployees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xs">
                                {emp.firstName?.charAt(0) || 'E'}
                              </div>
                              <div>
                                <div>{emp.employeeName}</div>
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {emp.id} • {emp.designation || 'Fleet Personnel'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-blue-600" />
                              <span>{formatMineSiteDisplay(emp.customMineSite || emp.mineSite) || 'Unassigned Mine'}</span>
                            </div>
                            {emp.assignedVehicle && (
                              <div className="text-[10px] text-slate-600 flex items-center gap-1 mt-1 font-mono">
                                <Truck className="w-3 h-3 text-slate-400" />
                                <span className="font-semibold text-slate-700">{formatVehicleDisplay(emp.assignedVehicle)}</span>
                              </div>
                            )}
                            {emp.linkedDriverId && (
                              <div className="mt-1">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Linked Driver Profile ({emp.driverStatus || 'Active'})
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {emp.cellNumber && (
                              <div className="font-mono text-slate-700 flex items-center gap-1 text-[11px]">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{emp.cellNumber}</span>
                              </div>
                            )}
                            {emp.companyEmail && (
                              <div className="text-slate-500 flex items-center gap-1 text-[10px] mt-0.5">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span>{emp.companyEmail}</span>
                              </div>
                            )}
                            {!emp.cellNumber && !emp.companyEmail && (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="text-[11px] text-slate-700 font-mono">
                              {emp.bankName || 'SBI'} • A/C: {emp.bankAcNo || '—'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              IFSC: {emp.ifscCode || 'SBIN0001234'}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              DOJ: {emp.dateOfJoining || '—'}{emp.relievingDate ? ` • DOE: ${emp.relievingDate}` : ''}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <span className="font-semibold text-slate-900 font-mono text-xs">
                              ₹{(emp.dailySalary || 0).toLocaleString('en-IN')}
                            </span>
                            <div className="text-[10px] text-slate-400">/ day</div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <Badge
                              variant={emp.status === 'Active' ? 'positive' : 'neutral'}
                              size="sm"
                            >
                              {emp.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ======================================================== */}
        {/* TAB 2: DAILY ATTENDANCE ROSTER */}
        {/* ======================================================== */}
        {activeTab === 'roster' && (
          <>
            {/* Roster Controls */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    value={rosterDate}
                    onChange={(e) => setRosterDate(e.target.value)}
                    className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setRosterDate(todayStr)}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Today
                </button>

                <div className="flex items-center gap-1.5 ml-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <select
                    value={rosterShift}
                    onChange={(e) => setRosterShift(e.target.value as any)}
                    className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white font-medium"
                  >
                    <option value="Day">Day Shift (06:00 - 18:00)</option>
                    <option value="Night">Night Shift (18:00 - 06:00)</option>
                    <option value="General">General Shift (09:00 - 17:00)</option>
                  </select>
                </div>

                {mineOptions.length > 0 && (
                  <select
                    value={mineFilter}
                    onChange={(e) => setMineFilter(e.target.value)}
                    className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                  >
                    <option value="ALL">All Mine Sites</option>
                    {mineOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-2">
                {canManage && (
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    disabled={isAttendanceLoading || filteredEmployees.length === 0}
                    className="px-3 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark All Present</span>
                  </button>
                )}
              </div>
            </div>

            {/* Notification / Success Banner */}
            {attendanceSuccessMsg && (
              <div className="p-3 mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{attendanceSuccessMsg}</span>
              </div>
            )}

            {/* Attendance Roster Table */}
            {isAttendanceLoading ? (
              <div className="p-12 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
                <p className="text-xs text-slate-500">Retrieving attendance for {rosterDate}...</p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-12 rounded-xl border border-dashed border-slate-300 bg-white shadow-sm text-center">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-700">No personnel eligible for attendance</h3>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Personnel</th>
                        <th className="py-3 px-4">Mine & Vehicle</th>
                        <th className="py-3 px-4 text-right">Daily Wage Rate</th>
                        <th className="py-3 px-4 text-center">Attendance Status Selection</th>
                        <th className="py-3 px-4 text-right">
                          <span>Indicative Payout</span>
                          <span className="block text-[9px] font-normal text-slate-400 lowercase">(provisional)</span>
                        </th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEmployees.map((emp) => {
                        const att = attendanceRecords[emp.id];
                        const currentStatus = att ? att.attendanceStatus : null;
                        const isSaving = savingAttendanceId === emp.id;

                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{emp.employeeName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {emp.id} • {emp.designation || 'Staff'}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="text-slate-800 font-medium">
                                {formatMineSiteDisplay(emp.customMineSite || emp.mineSite) || 'Talcher Site'}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {emp.assignedVehicle ? `Vehicle: ${formatVehicleDisplay(emp.assignedVehicle)}` : 'No Vehicle Assigned'}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                              ₹{(emp.dailySalary || 0).toLocaleString('en-IN')}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
                                <button
                                  type="button"
                                  disabled={isSaving || !canManage}
                                  onClick={() => handleMarkAttendance(emp, 'Present')}
                                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                                    currentStatus === 'Present'
                                      ? 'bg-emerald-600 text-white shadow-sm'
                                      : 'text-slate-600 hover:bg-white'
                                  }`}
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  disabled={isSaving || !canManage}
                                  onClick={() => handleMarkAttendance(emp, 'Half Day')}
                                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                                    currentStatus === 'Half Day'
                                      ? 'bg-amber-600 text-white shadow-sm'
                                      : 'text-slate-600 hover:bg-white'
                                  }`}
                                >
                                  Half Day
                                </button>
                                <button
                                  type="button"
                                  disabled={isSaving || !canManage}
                                  onClick={() => handleMarkAttendance(emp, 'Absent')}
                                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                                    currentStatus === 'Absent'
                                      ? 'bg-rose-600 text-white shadow-sm'
                                      : 'text-slate-600 hover:bg-white'
                                  }`}
                                >
                                  Absent
                                </button>
                                <button
                                  type="button"
                                  disabled={isSaving || !canManage}
                                  onClick={() => handleMarkAttendance(emp, 'On Leave')}
                                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                                    currentStatus === 'On Leave'
                                      ? 'bg-purple-600 text-white shadow-sm'
                                      : 'text-slate-600 hover:bg-white'
                                  }`}
                                >
                                  Leave
                                </button>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                              {att ? (
                                <span className={att.calculatedSalaryAmount > 0 ? 'text-emerald-700' : 'text-slate-400'}>
                                  ₹{att.calculatedSalaryAmount.toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">Pending</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center">
                              {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin text-blue-900 mx-auto" />
                              ) : att ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Logged</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Unmarked</span>
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
          </>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ATTENDANCE & SALARY SUMMARY */}
        {/* ======================================================== */}
        {activeTab === 'summary' && (
          <>
            {/* Month & Year Selectors */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Payroll Month:</span>
                  <select
                    value={summaryMonth}
                    onChange={(e) => setSummaryMonth(parseInt(e.target.value, 10))}
                    className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white font-medium"
                  >
                    <option value={1}>January</option>
                    <option value={2}>February</option>
                    <option value={3}>March</option>
                    <option value={4}>April</option>
                    <option value={5}>May</option>
                    <option value={6}>June</option>
                    <option value={7}>July</option>
                    <option value={8}>August</option>
                    <option value={9}>September</option>
                    <option value={10}>October</option>
                    <option value={11}>November</option>
                    <option value={12}>December</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Year:</span>
                  <select
                    value={summaryYear}
                    onChange={(e) => setSummaryYear(parseInt(e.target.value, 10))}
                    className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white font-medium"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                  </select>
                </div>

                {mineOptions.length > 0 && (
                  <select
                    value={mineFilter}
                    onChange={(e) => setMineFilter(e.target.value)}
                    className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                  >
                    <option value="ALL">All Mine Sites</option>
                    {mineOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Period: {summaryMonth}/01/{summaryYear} – End of Month
              </div>
            </div>

            {/* Aggregates Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  <span>Enrolled Roster</span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{attendanceSummary.length}</div>
                <p className="text-[11px] text-slate-400 mt-1">Personnel evaluated</p>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  <span>Logged Shifts</span>
                  <Calendar className="w-4 h-4 text-slate-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{summaryTotalDays}</div>
                <p className="text-[11px] text-slate-400 mt-1">Total recorded shifts</p>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  <span>Present Days</span>
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-700">{summaryPresentDays}</div>
                <p className="text-[11px] text-slate-400 mt-1">Full operational days</p>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  <span>Indicative Salary Total</span>
                  <IndianRupee className="w-4 h-4 text-blue-900" />
                </div>
                <div className="text-2xl font-bold text-blue-900 font-mono">
                  ₹{summaryTotalPayout.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Indicative wage total (provisional rules)</p>
              </div>
            </div>

            {/* Summary Table */}
            {isSummaryLoading ? (
              <div className="p-12 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
                <p className="text-xs text-slate-500">Compiling monthly salary report...</p>
              </div>
            ) : attendanceSummary.length === 0 ? (
              <div className="p-12 rounded-xl border border-dashed border-slate-300 bg-white shadow-sm text-center">
                <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-700">No attendance data found for this period</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ensure attendance has been logged in the Daily Attendance Roster tab.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-4">Mine & Vehicle</th>
                        <th className="py-3 px-4 text-right">Daily Rate</th>
                        <th className="py-3 px-4 text-right">Logged</th>
                        <th className="py-3 px-4 text-right">Present</th>
                        <th className="py-3 px-4 text-right">Half Day</th>
                        <th className="py-3 px-4 text-right">Absent</th>
                        <th className="py-3 px-4 text-right">Leave</th>
                        <th className="py-3 px-4 text-right">Indicative Payout*</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceSummary.map((sum) => (
                        <tr key={sum.employee} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{sum.employeeName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{sum.employee}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="text-slate-800 font-medium">
                              {formatMineSiteDisplay(sum.mineSite) || 'Talcher Site'}
                            </div>
                            {sum.assignedVehicle && (
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {formatVehicleDisplay(sum.assignedVehicle)}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-slate-800">
                            ₹{(sum.dailySalaryRate || 0).toLocaleString('en-IN')}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-slate-600 font-medium">
                            {sum.totalLoggedDays}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold">
                            {sum.presentDays}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-amber-700">
                            {sum.halfDays}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-rose-600">
                            {sum.absentDays}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-purple-600">
                            {sum.leaveDays}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-blue-900 text-sm">
                            ₹{(sum.totalCalculatedSalary || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200">
                  <p className="text-[10px] text-slate-500 italic">
                    * Indicative calculation (1.0x Present, 0.5x Half Day, 0.0x Absent/Leave). Official wage multipliers and leave compensation rules are provisional pending formal client payroll policy sign-off.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Add Employee Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Add Employee Profile</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enroll new personnel with mine site attribution, vehicle assignment, and daily wage
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateEmployee} className="p-6 space-y-4">
                {modalError && (
                  <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Ramesh"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Nayak"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      value={cellNumber}
                      onChange={(e) => setCellNumber(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Company Email
                    </label>
                    <input
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      placeholder="ramesh@uptoware.com"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Assigned Mine Site
                    </label>
                    <select
                      value={selectedMine}
                      onChange={(e) => setSelectedMine(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                    >
                      {mineOptions.length > 0 ? (
                        mineOptions.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))
                      ) : (
                        <option value="JBR Eastern — Talcher Site">JBR Eastern — Talcher Site</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Assigned Vehicle
                    </label>
                    <input
                      type="text"
                      value={assignedVehicle}
                      onChange={(e) => setAssignedVehicle(e.target.value)}
                      placeholder="e.g. DEMO-OD-01"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Daily Wage Rate (₹)
                    </label>
                    <input
                      type="number"
                      value={dailySalary}
                      onChange={(e) => setDailySalary(e.target.value)}
                      placeholder="850"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Date of Joining (DOJ)
                    </label>
                    <input
                      type="date"
                      value={dateOfJoining}
                      onChange={(e) => setDateOfJoining(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Date of Exit (DOE)
                    </label>
                    <input
                      type="date"
                      value={relievingDate}
                      onChange={(e) => setRelievingDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. State Bank of India"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Bank Account No
                    </label>
                    <input
                      type="text"
                      value={bankAccountNo}
                      onChange={(e) => setBankAccountNo(e.target.value)}
                      placeholder="e.g. 10293847561"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Bank IFSC Code
                    </label>
                    <input
                      type="text"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value)}
                      placeholder="SBIN0001234"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Aadhaar / PAN
                    </label>
                    <input
                      type="text"
                      value={aadhaarNo}
                      onChange={(e) => setAadhaarNo(e.target.value)}
                      placeholder="Aadhaar or PAN No"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Enrolling...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Save Employee</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}

export default function EmployeesPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <PageContainer>
            <div className="flex items-center justify-center p-12 text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Loading Employee Data...</span>
            </div>
          </PageContainer>
        </AppShell>
      }
    >
      <EmployeesContent />
    </Suspense>
  );
}
