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
  const CLIENT_DESIGNATIONS = useMemo(() => [
    'Driver',
    'P/L Opt',
    'Garage Supervisor',
    'Mines Supervisor',
    'Challan Supervisor',
    'Receiver Supervisor',
    'Billing Supervisor',
    'Mechanical',
    'Welding Mechanical',
    'Asst. Mechanical',
    'Helper',
    'Clerk',
    'Data Entry Operator',
    'Office Boy',
    'Security',
  ], []);
  const [designation, setDesignation] = useState('Driver');
  const [isCustomDesignation, setIsCustomDesignation] = useState(false);
  const [customDesignation, setCustomDesignation] = useState('');
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

  // Statutory Indian Mining workforce fields
  const [fatherOrSpouseName, setFatherOrSpouseName] = useState('');
  const [presentAddress, setPresentAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [skillCategory, setSkillCategory] = useState<'SKILL' | 'SEMI SKILL' | 'UNSKILL'>('SKILL');
  const [pfType, setPfType] = useState<'CMPF' | 'PF'>('CMPF');
  const [uanOrCmpfNo, setUanOrCmpfNo] = useState('');
  const [socialCategory, setSocialCategory] = useState<'OBC' | 'SC' | 'ST' | 'GENERAL'>('GENERAL');
  const [dlNo, setDlNo] = useState('');
  const [dlValidity, setDlValidity] = useState('');
  const [vtNo, setVtNo] = useState('');
  const [vtPeriod, setVtPeriod] = useState('');
  const [formO, setFormO] = useState<'YES' | 'NO'>('YES');

  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab 2: Attendance Roster state
  const [rosterDate, setRosterDate] = useState<string>(todayStr);
  const [rosterShift, setRosterShift] = useState<'Shift A' | 'Shift B' | 'Shift C' | 'Day' | 'Night' | 'General'>('Shift A');
  const [rosterFormat, setRosterFormat] = useState<'drivers' | 'staff'>('drivers');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, EmployeeAttendance>>({});
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [savingAttendanceId, setSavingAttendanceId] = useState<string | null>(null);
  const [attendanceSuccessMsg, setAttendanceSuccessMsg] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Tab 3: Summary state
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [summaryMonth, setSummaryMonth] = useState<number>(currentMonth);
  const [summaryYear, setSummaryYear] = useState<number>(currentYear);
  const [summaryDesignationFilter, setSummaryDesignationFilter] = useState<string>('ALL');
  const [summarySearchQuery, setSummarySearchQuery] = useState<string>('');
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

  // Load Vehicles for driver matrix
  const loadVehicles = useCallback(async () => {
    try {
      const res = await fetch('/api/vehicles?limit=200');
      const json = await res.json();
      if (res.ok && json.success) {
        setVehicles(json.data || []);
      }
    } catch (err) {
      console.error('Error loading vehicles:', err);
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
          if (item.shift) {
            map[`${item.employee}_${item.shift}`] = item;
          }
          if (item.vehicle && item.shift) {
            map[`${item.vehicle}_${item.shift}`] = item;
          }
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
    loadVehicles();
  }, [loadEmployees, loadVehicles]);

  useEffect(() => {
    if (activeTab === 'roster') {
      loadAttendanceForDate(rosterDate, mineFilter);
    } else if (activeTab === 'summary') {
      loadAttendanceSummary(summaryMonth, summaryYear, mineFilter);
    }
  }, [activeTab, rosterDate, mineFilter, summaryMonth, summaryYear, loadAttendanceForDate, loadAttendanceSummary]);

  // Handle Mark Attendance for a single employee (General / Current Shift)
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
        [`${emp.id}_${rosterShift}`]: json.data,
        ...(emp.assignedVehicle ? { [`${emp.assignedVehicle}_${rosterShift}`]: json.data } : {}),
      }));
      setAttendanceSuccessMsg(`Recorded ${status} for ${emp.employeeName}`);
      setTimeout(() => setAttendanceSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Error saving attendance: ${err.message}`);
    } finally {
      setSavingAttendanceId(null);
    }
  };

  // Handle Mark Attendance for specific Shift & optional Vehicle
  const handleMarkShiftAttendance = async (
    empId: string,
    shift: 'Shift A' | 'Shift B' | 'Shift C' | 'Day' | 'Night' | 'General',
    status: 'Present' | 'Half Day' | 'Absent' | 'On Leave',
    vehiclePlate?: string
  ) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;
    try {
      const lockKey = vehiclePlate ? `${vehiclePlate}_${shift}` : `${empId}_${shift}`;
      setSavingAttendanceId(lockKey);
      setAttendanceSuccessMsg(null);
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee: emp.id,
          attendanceDate: rosterDate,
          attendanceStatus: status,
          shift,
          vehicle: vehiclePlate || emp.assignedVehicle || undefined,
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
        [`${emp.id}_${shift}`]: json.data,
        ...(vehiclePlate ? { [`${vehiclePlate}_${shift}`]: json.data } : {}),
      }));
      setAttendanceSuccessMsg(`Recorded ${status} for ${emp.employeeName} (${shift})`);
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
    if (!fatherOrSpouseName.trim()) {
      setModalError('Father/Mother/Spouse Name is required for statutory mining compliance.');
      return;
    }

    try {
      setIsSubmitting(true);
      const finalDesig = isCustomDesignation ? customDesignation.trim() : designation.trim();
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          cellNumber: cellNumber.trim() || undefined,
          companyEmail: companyEmail.trim() || undefined,
          department: department.trim() || undefined,
          designation: finalDesig || undefined,
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
          fatherOrSpouseName: fatherOrSpouseName.trim(),
          presentAddress: presentAddress.trim() || undefined,
          permanentAddress: permanentAddress.trim() || undefined,
          dateOfBirth: dateOfBirth.trim() || undefined,
          gender: gender || 'Male',
          skillCategory: skillCategory || 'SKILL',
          pfType: pfType || 'CMPF',
          uanOrCmpfNo: uanOrCmpfNo.trim() || undefined,
          socialCategory: socialCategory || 'GENERAL',
          dlNo: dlNo.trim() || undefined,
          dlValidity: dlValidity.trim() || undefined,
          vtNo: vtNo.trim() || undefined,
          vtPeriod: vtPeriod.trim() || undefined,
          formO: formO || 'YES',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create employee profile.');
      }

      setIsModalOpen(false);
      setFirstName('');
      setLastName('');
      setDesignation('Driver');
      setIsCustomDesignation(false);
      setCustomDesignation('');
      setCellNumber('');
      setCompanyEmail('');
      setAssignedVehicle('');
      setIfscCode('');
      setBankAccountNo('');
      setRelievingDate('');
      setAadhaarNo('');
      setPanNo('');
      setFatherOrSpouseName('');
      setPresentAddress('');
      setPermanentAddress('');
      setDateOfBirth('');
      setGender('Male');
      setSkillCategory('SKILL');
      setPfType('CMPF');
      setUanOrCmpfNo('');
      setSocialCategory('GENERAL');
      setDlNo('');
      setDlValidity('');
      setVtNo('');
      setVtPeriod('');
      setFormO('YES');
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
          subtitle="Integrated employee master directory, daily mine site attendance roster, and automated wage & salary calculation."
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
                <p className="text-[11px] text-slate-400 mt-1">Active employee roster</p>
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
                  <strong>Employee Master Directory:</strong> Synchronized with active vehicle operators and mine site staff rosters. Bulk import templates available in the Data Import Hub.
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                Directory Ready
              </span>
            </div>

            {/* Employee Table */}
            {isLoading ? (
              <div className="p-12 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
                <p className="text-xs text-slate-500">Retrieving personnel records...</p>
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
                    : 'Click "+ Add Employee" to enroll new team members into the fleet personnel registry.'}
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
                                  {emp.skillCategory ? ` • ${emp.skillCategory}` : ''}
                                  {emp.formO === 'YES' ? ' • Form O' : ''}
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
        {/* ======================================================== */}
        {/* TAB 2: DAILY ATTENDANCE ROSTER */}
        {/* ======================================================== */}
        {activeTab === 'roster' && (
          <>
            {/* Roster Controls */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Format Toggle: Driver / Operator vs Other Staff */}
                <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setRosterFormat('drivers')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      rosterFormat === 'drivers'
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Driver & Operator (Vehicle Matrix)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRosterFormat('staff')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      rosterFormat === 'staff'
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Other Staff (Shift Matrix)</span>
                  </button>
                </div>

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

            {/* ======================================================== */}
            {/* FORMAT 1: DRIVER / OPERATOR ATTENDANCE MATRIX */}
            {/* Format: Vehicle No | Shift A | Shift B | Shift C */}
            {/* ======================================================== */}
            {rosterFormat === 'drivers' && (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-900" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Driver & Operator Attendance Entry (By Vehicle)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Assigned driver listed first in each shift selector
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4 w-48">Vehicle No</th>
                        <th className="py-3 px-4 w-32">Vehicle Type</th>
                        <th className="py-3 px-4">Shift A (06:00 - 14:00)</th>
                        <th className="py-3 px-4">Shift B (14:00 - 22:00)</th>
                        <th className="py-3 px-4">Shift C (22:00 - 06:00)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const transportVehicles = vehicles.filter(
                          (v) => (v.customTransportType || 'Transport') !== 'Non Transport'
                        );
                        if (transportVehicles.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400">
                                No transport vehicles found in master.
                              </td>
                            </tr>
                          );
                        }
                        return transportVehicles.map((veh) => {
                          const vPlate = veh.licensePlate || veh.name;
                          const assignedDriverId = veh.assignedDriverId || veh.assignedDriver;
                          const assignedDriverObj = employees.find(
                            (e) => e.id === assignedDriverId || e.assignedVehicle === vPlate
                          );

                          // Drivers list with assigned driver first
                          const sortedDrivers = [...employees].sort((a, b) => {
                            if (a.id === assignedDriverId || a.assignedVehicle === vPlate) return -1;
                            if (b.id === assignedDriverId || b.assignedVehicle === vPlate) return 1;
                            return a.employeeName.localeCompare(b.employeeName);
                          });

                          return (
                            <tr key={veh.id || vPlate} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900 font-mono text-xs">
                                  {formatVehicleDisplay(vPlate)}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {veh.make || 'Tipper'} {veh.model || ''}
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <Badge
                                  variant={veh.customTransportType === 'Non Transport' ? 'warning' : 'neutral'}
                                  size="sm"
                                >
                                  {veh.customTransportType || 'Transport'}
                                </Badge>
                              </td>

                              {/* Shifts A, B, C */}
                              {(['Shift A', 'Shift B', 'Shift C'] as const).map((shift) => {
                                const attRecord =
                                  attendanceRecords[`${vPlate}_${shift}`] ||
                                  attendanceRecords[`${veh.id}_${shift}`];
                                const isSaving = savingAttendanceId === `${vPlate}_${shift}`;

                                return (
                                  <td key={shift} className="py-3 px-4">
                                    <div className="flex flex-col gap-1.5">
                                      <select
                                        defaultValue={attRecord?.employee || assignedDriverObj?.id || ''}
                                        onChange={(e) => {
                                          const driverId = e.target.value;
                                          if (driverId) {
                                            handleMarkShiftAttendance(driverId, shift, 'Present', vPlate);
                                          }
                                        }}
                                        disabled={!canManage || isSaving}
                                        className="text-[11px] px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-900 bg-white"
                                      >
                                        <option value="">-- Assign Driver --</option>
                                        {sortedDrivers.map((d) => {
                                          const isAssigned =
                                            d.id === assignedDriverId || d.assignedVehicle === vPlate;
                                          return (
                                            <option key={d.id} value={d.id}>
                                              {isAssigned ? `★ ${d.employeeName} (Assigned)` : d.employeeName}
                                            </option>
                                          );
                                        })}
                                      </select>

                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          disabled={!canManage || isSaving}
                                          onClick={() => {
                                            const targetId = attRecord?.employee || assignedDriverObj?.id;
                                            if (targetId) {
                                              handleMarkShiftAttendance(targetId, shift, 'Present', vPlate);
                                            } else {
                                              alert('Please select a driver first.');
                                            }
                                          }}
                                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                            attRecord?.attendanceStatus === 'Present'
                                              ? 'bg-emerald-600 text-white shadow-xs'
                                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                          }`}
                                        >
                                          P
                                        </button>
                                        <button
                                          type="button"
                                          disabled={!canManage || isSaving}
                                          onClick={() => {
                                            const targetId = attRecord?.employee || assignedDriverObj?.id;
                                            if (targetId) {
                                              handleMarkShiftAttendance(targetId, shift, 'Absent', vPlate);
                                            } else {
                                              alert('Please select a driver first.');
                                            }
                                          }}
                                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                            attRecord?.attendanceStatus === 'Absent'
                                              ? 'bg-rose-600 text-white shadow-xs'
                                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                          }`}
                                        >
                                          A
                                        </button>
                                        {attRecord && (
                                          <span className="text-[10px] text-slate-500 font-mono ml-1">
                                            {attRecord.attendanceStatus}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* FORMAT 2: OTHER STAFF ATTENDANCE MATRIX */}
            {/* Format: Name | Designation | Shift A | Shift B | Shift C */}
            {/* ======================================================== */}
            {rosterFormat === 'staff' && (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-900" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Other Staff Attendance Entry (Shift P / A)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Mark Present (P) or Absent (A) across operational shifts
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4 w-60">Name</th>
                        <th className="py-3 px-4 w-44">Designation</th>
                        <th className="py-3 px-4 text-center">Shift A (06:00 - 14:00)</th>
                        <th className="py-3 px-4 text-center">Shift B (14:00 - 22:00)</th>
                        <th className="py-3 px-4 text-center">Shift C (22:00 - 06:00)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const isDriverOrPlOpt = (desig?: string | null) => {
                          if (!desig) return false;
                          const d = desig.toLowerCase().trim();
                          return d === 'driver' || d === 'p/l opt' || d === 'pl opt' || d.includes('driver') || d.includes('p/l opt');
                        };
                        const otherStaffList = filteredEmployees.filter((emp) => !isDriverOrPlOpt(emp.designation));

                        if (otherStaffList.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400">
                                No non-driver staff personnel match current filters.
                              </td>
                            </tr>
                          );
                        }

                        return otherStaffList.map((emp) => (
                          <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{emp.employeeName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{emp.id}</div>
                            </td>

                            <td className="py-3 px-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                {emp.designation || 'Staff'}
                              </span>
                            </td>

                            {(['Shift A', 'Shift B', 'Shift C'] as const).map((shift) => {
                              const att = attendanceRecords[`${emp.id}_${shift}`];
                              const isSaving = savingAttendanceId === `${emp.id}_${shift}`;

                              return (
                                <td key={shift} className="py-3 px-4 text-center">
                                  <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
                                    <button
                                      type="button"
                                      disabled={isSaving || !canManage}
                                      onClick={() => handleMarkShiftAttendance(emp.id, shift, 'Present')}
                                      className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                                        att?.attendanceStatus === 'Present'
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : 'text-slate-600 hover:bg-white'
                                      }`}
                                    >
                                      P
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isSaving || !canManage}
                                      onClick={() => handleMarkShiftAttendance(emp.id, shift, 'Absent')}
                                      className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                                        att?.attendanceStatus === 'Absent'
                                          ? 'bg-rose-600 text-white shadow-xs'
                                          : 'text-slate-600 hover:bg-white'
                                      }`}
                                    >
                                      A
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isSaving || !canManage}
                                      onClick={() => handleMarkShiftAttendance(emp.id, shift, 'On Leave')}
                                      className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                                        att?.attendanceStatus === 'On Leave'
                                          ? 'bg-purple-600 text-white shadow-xs'
                                          : 'text-slate-600 hover:bg-white'
                                      }`}
                                    >
                                      L
                                    </button>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ATTENDANCE & SALARY SUMMARY */}
        {/* Format: Month-wise & Designation-wise search at top */}
        {/* 1 to 31 Monthly Matrix Report */}
        {/* ======================================================== */}
        {activeTab === 'summary' && (() => {
          const daysInMonth = new Date(summaryYear, summaryMonth, 0).getDate();
          const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

          // Unique designations for filter dropdown
          const uniqueDesignations = Array.from(
            new Set(
              employees
                .map((e) => e.designation)
                .concat(attendanceSummary.map((s) => s.designation || ''))
                .filter(Boolean)
            )
          ) as string[];

          // Filter summary by designation and search query
          const filteredSummary = attendanceSummary.filter((sum) => {
            if (
              summaryDesignationFilter !== 'ALL' &&
              (sum.designation || 'Staff') !== summaryDesignationFilter
            ) {
              return false;
            }
            if (summarySearchQuery.trim()) {
              const q = summarySearchQuery.toLowerCase().trim();
              const matchName = sum.employeeName.toLowerCase().includes(q);
              const matchId = sum.employee.toLowerCase().includes(q);
              const matchDesig = (sum.designation || '').toLowerCase().includes(q);
              if (!matchName && !matchId && !matchDesig) return false;
            }
            return true;
          });

          return (
            <>
              {/* Search Filters at the Top: Month-wise and Designation-wise */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Month:
                    </span>
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
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Year:
                    </span>
                    <select
                      value={summaryYear}
                      onChange={(e) => setSummaryYear(parseInt(e.target.value, 10))}
                      className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white font-medium"
                    >
                      <option value={2026}>2026</option>
                      <option value={2025}>2025</option>
                      <option value={2027}>2027</option>
                    </select>
                  </div>

                  {/* Designation-wise search option at the top */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Designation:
                    </span>
                    <select
                      value={summaryDesignationFilter}
                      onChange={(e) => setSummaryDesignationFilter(e.target.value)}
                      className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white font-medium"
                    >
                      <option value="ALL">All Designations</option>
                      {uniqueDesignations.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Text search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search Name / ID..."
                      value={summarySearchQuery}
                      onChange={(e) => setSummarySearchQuery(e.target.value)}
                      className="text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white w-48"
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
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  {daysInMonth} Days in Month ({summaryMonth}/{summaryYear})
                </div>
              </div>

              {/* Aggregates Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    <span>Enrolled Roster</span>
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{filteredSummary.length}</div>
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
                  <p className="text-[11px] text-slate-400 mt-1">Indicative wage total</p>
                </div>
              </div>

              {/* 1 to 31 Monthly Attendance Matrix Table */}
              {isSummaryLoading ? (
                <div className="p-12 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
                  <p className="text-xs text-slate-500">Compiling 1-31 monthly matrix report...</p>
                </div>
              ) : filteredSummary.length === 0 ? (
                <div className="p-12 rounded-xl border border-dashed border-slate-300 bg-white shadow-sm text-center">
                  <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <h3 className="text-sm font-semibold text-slate-700">No personnel match current summary criteria</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Try adjusting the month or designation filter.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-3 sticky left-0 bg-slate-50 z-10 w-28">Emp ID</th>
                          <th className="py-3 px-3 sticky left-28 bg-slate-50 z-10 w-44">Name</th>
                          <th className="py-3 px-3 w-28">Designation</th>
                          {dayNumbers.map((d) => (
                            <th key={d} className="py-2 px-1.5 text-center font-mono w-7">
                              {d}
                            </th>
                          ))}
                          <th className="py-3 px-3 text-right w-20">Present</th>
                          <th className="py-3 px-3 text-right w-20">Absent</th>
                          <th className="py-3 px-3 text-right w-28">Total Salary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSummary.map((sum) => (
                          <tr key={sum.employee} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800 sticky left-0 bg-white z-10">
                              {sum.employee}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 sticky left-28 bg-white z-10">
                              {sum.employeeName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                {sum.designation || 'Staff'}
                              </span>
                            </td>

                            {/* 1 to 31 Day Cells */}
                            {dayNumbers.map((d) => {
                              const code = sum.dailyStatus?.[d];
                              return (
                                <td key={d} className="py-2 px-1 text-center font-mono">
                                  {code === 'P' ? (
                                    <span className="inline-block w-5 h-5 leading-5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                      P
                                    </span>
                                  ) : code === 'A' ? (
                                    <span className="inline-block w-5 h-5 leading-5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                      A
                                    </span>
                                  ) : code === 'HD' ? (
                                    <span className="inline-block w-5 h-5 leading-5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                      HD
                                    </span>
                                  ) : code === 'L' ? (
                                    <span className="inline-block w-5 h-5 leading-5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                      L
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 text-[10px]">-</span>
                                  )}
                                </td>
                              );
                            })}

                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                              {sum.presentDays}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                              {sum.absentDays}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">
                              ₹{(sum.totalCalculatedSalary || 0).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                          <td colSpan={3} className="py-2.5 px-3 sticky left-0 bg-slate-100 z-10 uppercase tracking-wider text-[11px] text-slate-800 font-bold">
                            Total Present (Date-Wise)
                          </td>
                          {dayNumbers.map((d) => {
                            const count = filteredSummary.filter((s) => s.dailyStatus?.[d] === 'P').length;
                            const half = filteredSummary.filter((s) => s.dailyStatus?.[d] === 'HD').length;
                            const total = count + (half > 0 ? half * 0.5 : 0);
                            return (
                              <td key={d} className="py-2 px-1 text-center font-mono text-[11px]">
                                {total > 0 ? (
                                  <span className="inline-block px-1 rounded bg-blue-100 text-blue-900 font-bold">
                                    {total}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal">0</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-800 font-bold">
                            {filteredSummary.reduce((acc, s) => acc + (s.presentDays || 0), 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-bold">
                            {filteredSummary.reduce((acc, s) => acc + (s.absentDays || 0), 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-blue-950 font-bold">
                            ₹{filteredSummary.reduce((acc, s) => acc + (s.totalCalculatedSalary || 0), 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 inline-block text-[8px] text-center font-bold">P</span>
                        <span>Present</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 text-rose-800 inline-block text-[8px] text-center font-bold">A</span>
                        <span>Absent</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 text-amber-800 inline-block text-[8px] text-center font-bold">HD</span>
                        <span>Half Day</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-purple-100 border border-purple-300 text-purple-800 inline-block text-[8px] text-center font-bold">L</span>
                        <span>Leave</span>
                      </span>
                    </div>
                    <span className="italic">
                      Month matrix generated live from certified daily employee attendance logs.
                    </span>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* ======================================================== */}
        {/* ADD EMPLOYEE PROFILE MODAL (Indian Statutory Mining Master) */}
        {/* ======================================================== */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Add Employee Profile</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Statutory Indian Mining workforce registration (DGMS Form O, CMPF/PF, Skill & VT)
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

              <form onSubmit={handleCreateEmployee} className="p-6 space-y-5 overflow-y-auto">
                {modalError && (
                  <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Section 1: Personal & Statutory Identity */}
                <div>
                  <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>Personal & Statutory Identity</span>
                  </h3>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Father / Mother / Spouse Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={fatherOrSpouseName}
                        onChange={(e) => setFatherOrSpouseName(e.target.value)}
                        placeholder="e.g. Satish Nayak"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          DOB
                        </label>
                        <input
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Gender
                        </label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value as any)}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Designation <span className="text-rose-500">*</span>
                        </label>
                        {!isCustomDesignation ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomDesignation(true);
                              setCustomDesignation('');
                            }}
                            className="text-[10px] text-blue-700 hover:text-blue-900 font-semibold"
                          >
                            + New
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomDesignation(false);
                              setDesignation('Driver');
                            }}
                            className="text-[10px] text-slate-500 hover:text-slate-700"
                          >
                            Choose List
                          </button>
                        )}
                      </div>
                      {!isCustomDesignation ? (
                        <select
                          value={designation}
                          onChange={(e) => {
                            if (e.target.value === '__CUSTOM__') {
                              setIsCustomDesignation(true);
                              setCustomDesignation('');
                            } else {
                              setDesignation(e.target.value);
                            }
                          }}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white font-medium"
                        >
                          {CLIENT_DESIGNATIONS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                          <option value="__CUSTOM__">+ Add Custom Designation...</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={customDesignation}
                          onChange={(e) => setCustomDesignation(e.target.value)}
                          placeholder="e.g. Weighbridge Incharge"
                          className="w-full text-xs px-3 py-2 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-blue-50/40 font-medium"
                          autoFocus
                          required
                        />
                      )}
                    </div>
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
                  </div>
                </div>

                {/* Section 2: Address Details */}
                <div>
                  <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Address Details</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Present Address
                      </label>
                      <textarea
                        rows={2}
                        value={presentAddress}
                        onChange={(e) => setPresentAddress(e.target.value)}
                        placeholder="Village/Colony, Post, Dist, State"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Permanent Address
                      </label>
                      <textarea
                        rows={2}
                        value={permanentAddress}
                        onChange={(e) => setPermanentAddress(e.target.value)}
                        placeholder="Native Village, Post, Dist, State"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Statutory Mining & Skills (DGMS Rules) */}
                <div>
                  <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Mining Statutory Compliance & Competency</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Skill Category
                      </label>
                      <select
                        value={skillCategory}
                        onChange={(e) => setSkillCategory(e.target.value as any)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white font-medium"
                      >
                        <option value="SKILL">SKILL</option>
                        <option value="SEMI SKILL">SEMI SKILL</option>
                        <option value="UNSKILL">UNSKILL</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Form O (Mines Medical)
                      </label>
                      <select
                        value={formO}
                        onChange={(e) => setFormO(e.target.value as any)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white font-medium"
                      >
                        <option value="YES">YES (Completed)</option>
                        <option value="NO">NO (Pending)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        VT No (Vocational)
                      </label>
                      <input
                        type="text"
                        value={vtNo}
                        onChange={(e) => setVtNo(e.target.value)}
                        placeholder="e.g. VT/MCL/2026/89"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        VT Period
                      </label>
                      <input
                        type="text"
                        value={vtPeriod}
                        onChange={(e) => setVtPeriod(e.target.value)}
                        placeholder="e.g. 2024-2027"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        DL No (Driving License)
                      </label>
                      <input
                        type="text"
                        value={dlNo}
                        onChange={(e) => setDlNo(e.target.value)}
                        placeholder="e.g. OD-05-201800045"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        DL Validity
                      </label>
                      <input
                        type="date"
                        value={dlValidity}
                        onChange={(e) => setDlValidity(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Provident Fund & Banking */}
                <div>
                  <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Provident Fund (CMPF/PF) & Banking</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        PF Type
                      </label>
                      <select
                        value={pfType}
                        onChange={(e) => setPfType(e.target.value as any)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white font-medium"
                      >
                        <option value="CMPF">CMPF (Coal Mines PF)</option>
                        <option value="PF">EPFO / Regular PF</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        UAN / CMPF No
                      </label>
                      <input
                        type="text"
                        value={uanOrCmpfNo}
                        onChange={(e) => setUanOrCmpfNo(e.target.value)}
                        placeholder="e.g. 100987654321 / CMPF-89"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="State Bank of India"
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
                        placeholder="10293847561"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
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
                </div>

                {/* Section 5: Employment & Daily Wage */}
                <div>
                  <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                    <Building className="w-3.5 h-3.5" />
                    <span>Mine Operations & Daily Wage</span>
                  </h3>
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
                        Social Category
                      </label>
                      <select
                        value={socialCategory}
                        onChange={(e) => setSocialCategory(e.target.value as any)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white font-medium"
                      >
                        <option value="GENERAL">GENERAL</option>
                        <option value="OBC">OBC</option>
                        <option value="SC">SC</option>
                        <option value="ST">ST</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
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
                        <span>Save Employee Profile</span>
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
