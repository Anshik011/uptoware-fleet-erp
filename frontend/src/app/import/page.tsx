'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Truck,
  Users,
  MapPin,
  Compass,
  Package,
  Building2,
  ClipboardList,
  Fuel,
  ArrowRight,
  FileText,
} from 'lucide-react';

interface ModuleOption {
  id: string;
  doctype: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  keyFields: string[];
}

const MODULES: ModuleOption[] = [
  {
    id: 'vehicles',
    doctype: 'Vehicle',
    title: 'Vehicles',
    description: 'Fleet assets, haulage tippers, dumpers, and utility carriers with Transport Type.',
    icon: Truck,
    keyFields: ['License Plate*', 'Make*', 'Model*', 'Transport Type (Transport / Non Transport)*', 'Mine Site*'],
  },
  {
    id: 'employees',
    doctype: 'Employee',
    title: 'Employees & Drivers',
    description: 'Workforce master with Indian mining compliance (CMPF, VT, DL, Form O).',
    icon: Users,
    keyFields: ['Full Name*', 'Designation*', 'Father/Spouse Name*', 'Skill Category*', 'PF Type (CMPF/EPF)*', 'DL Expiry', 'VT No'],
  },
  {
    id: 'mine-sites',
    doctype: 'Mine Site',
    title: 'Mine Sites',
    description: 'Operational quarry and pit locations, customer links, and mineral types.',
    icon: MapPin,
    keyFields: ['Mine Site Name*', 'Customer / Client*', 'Mineral Type*', 'Target Tonnage (MT)*'],
  },
  {
    id: 'leads',
    doctype: 'Fleet Lead',
    title: 'Fleet Leads',
    description: 'Haulage corridors and pit-to-siding routes with distance bands (3-4, 4-5 KM).',
    icon: Compass,
    keyFields: ['Lead Name*', 'Mine Site*', 'Destination*', 'Distance Band (KM)*', 'Rate/Ton (₹)*'],
  },
  {
    id: 'spare-parts',
    doctype: 'Item',
    title: 'Spare Parts & Items',
    description: 'Inventory catalog, mechanical spares, lubricants, tyres, and reorder levels.',
    icon: Package,
    keyFields: ['Part Name*', 'Item Group*', 'Unit of Measure*', 'Standard Rate (₹)*', 'Part Number / OEM Ref'],
  },
  {
    id: 'suppliers',
    doctype: 'Supplier',
    title: 'Suppliers & Vendors',
    description: 'Procurement vendors, spare parts suppliers, and fuel providers with GSTIN/PAN.',
    icon: Building2,
    keyFields: ['Supplier Name*', 'Supplier Group*', 'Supplier Type*', 'PAN Number', 'GSTIN'],
  },
  {
    id: 'trips',
    doctype: 'Mining Trip',
    title: 'Mining Trips',
    description: 'Daily supervisor trips with Shift A/B/C, trip count multipliers, and odometers.',
    icon: ClipboardList,
    keyFields: ['Vehicle No*', 'Driver ID*', 'Mine Site*', 'Shift (Shift A/B/C)*', 'Distance Band*', 'Trip Count*'],
  },
  {
    id: 'fuel',
    doctype: 'Fuel Log',
    title: 'Fuel Logs',
    description: 'Dispensation logs, litres pumped, fuel source, and odometer progression.',
    icon: Fuel,
    keyFields: ['Vehicle No*', 'Driver ID*', 'Refuel Date*', 'Dispensed Litres*', 'Fuel Source*', 'Odometer*'],
  },
];

export default function DataImportPage() {
  const [selectedModule, setSelectedModule] = useState<ModuleOption>(MODULES[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll import status when activeImportId is set
  useEffect(() => {
    if (!activeImportId) return;

    let intervalId: any;
    setIsPolling(true);

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/import/status?id=${encodeURIComponent(activeImportId)}`);
        const json = await res.json();
        if (json.success) {
          setImportStatus(json);
          // If status is final, stop polling
          if (['Success', 'Partial Success', 'Error'].includes(json.status)) {
            setIsPolling(false);
            clearInterval(intervalId);
          }
        }
      } catch (err) {
        console.warn('Error polling import status:', err);
      }
    };

    checkStatus();
    intervalId = setInterval(checkStatus, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [activeImportId]);

  const handleDownloadTemplate = (format: 'excel' | 'csv' | 'master') => {
    let url = '';
    if (format === 'master') {
      url = '/api/import/template?format=master';
    } else {
      url = `/api/import/template?doctype=${encodeURIComponent(selectedModule.doctype)}&format=${format}`;
    }
    window.open(url, '_blank');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleStartImport = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select an Excel (.xlsx) or CSV file to import.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setImportStatus(null);
    setActiveImportId(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('doctype', selectedModule.doctype);

      const res = await fetch('/api/import/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to initiate import in ERPNext.');
      }

      setActiveImportId(json.dataImportId);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during file upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setActiveImportId(null);
    setImportStatus(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Success':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Completed Successfully
          </span>
        );
      case 'Partial Success':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Partial Success
          </span>
        );
      case 'Error':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <AlertCircle className="w-3.5 h-3.5 mr-1" /> Import Failed
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            Pending
          </span>
        );
    }
  };

  const SelectedIcon = selectedModule.icon;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data Import Hub</h1>
          <p className="text-sm text-slate-500 mt-1">
            Bulk upload spreadsheets to populate operational master data natively through ERPNext.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleDownloadTemplate('master')}
            className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Download Master Excel (All 8 Modules)
          </button>
        </div>
      </div>

      {/* Module Selection Tabs */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Select Target Module
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {MODULES.map((m) => {
            const Icon = m.icon;
            const isSelected = selectedModule.id === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedModule(m);
                  resetForm();
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-sm ring-1 ring-blue-600'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`p-2 rounded-md mb-2 ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold leading-tight">{m.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Workflow Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Instructions & Template Download (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
                <SelectedIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Step 1: Download {selectedModule.title} Template
                </h3>
                <p className="text-xs text-slate-500">Target DocType: {selectedModule.doctype}</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">{selectedModule.description}</p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Required & Key Columns:
              </span>
              <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                {selectedModule.keyFields.map((field, idx) => (
                  <li key={idx} className="font-mono text-slate-800">
                    {field}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => handleDownloadTemplate('excel')}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
              >
                <Download className="w-4 h-4 mr-2 text-slate-600" />
                Download {selectedModule.title} (.xlsx)
              </button>
              <button
                onClick={() => handleDownloadTemplate('csv')}
                className="inline-flex items-center justify-center px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
              >
                <FileText className="w-4 h-4 mr-1 text-slate-500" />
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Upload & Import Execution (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Step 2: Upload Completed Spreadsheet
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload your completed Excel (.xlsx) or CSV file. ERPNext will validate all rows automatically.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* File Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                selectedFile
                  ? 'border-blue-500 bg-blue-50/20'
                  : 'border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-slate-50/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center">
                <div className="p-3 bg-white border border-slate-200 rounded-full shadow-sm mb-3">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-bold text-slate-900">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB — Click to choose a different file
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Click to browse or drag and drop your spreadsheet
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Supports Excel (.xlsx, .xls) and CSV</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={resetForm}
                disabled={!selectedFile || isUploading}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-40"
              >
                Clear File
              </button>
              <button
                type="button"
                onClick={handleStartImport}
                disabled={!selectedFile || isUploading}
                className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Uploading to ERPNext...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Start ERPNext Import
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Real-Time Results & Error Log */}
      {importStatus && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-bold text-slate-900">Import Results</h3>
                {getStatusBadge(importStatus.status)}
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Job ID: {importStatus.dataImportId} | Target: {importStatus.referenceDoctype}
              </p>
            </div>
            {isPolling && (
              <span className="inline-flex items-center text-xs text-blue-600 font-medium">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Live updating from ERPNext...
              </span>
            )}
          </div>

          {/* Stat Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                Total Rows Processed
              </span>
              <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">
                {importStatus.payloadCount || importStatus.logs?.length || 0}
              </span>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-4">
              <span className="text-xs font-medium text-emerald-700 uppercase tracking-wider block">
                Successfully Imported
              </span>
              <span className="text-2xl font-bold text-emerald-800 font-mono mt-1 block">
                {importStatus.successCount || 0}
              </span>
            </div>
            <div className="bg-rose-50/50 border border-rose-200 rounded-lg p-4">
              <span className="text-xs font-medium text-rose-700 uppercase tracking-wider block">
                Failed Rows
              </span>
              <span className="text-2xl font-bold text-rose-800 font-mono mt-1 block">
                {importStatus.failedCount || 0}
              </span>
            </div>
          </div>

          {/* Row-by-Row Result Table */}
          {importStatus.logs && importStatus.logs.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3 w-16 text-center">Row</th>
                    <th className="px-4 py-3 w-28">Status</th>
                    <th className="px-4 py-3 w-48">Created Document</th>
                    <th className="px-4 py-3">Details / Validation Messages</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {importStatus.logs.map((log: any, idx: number) => (
                    <tr key={idx} className={log.success ? 'bg-white' : 'bg-rose-50/30'}>
                      <td className="px-4 py-2.5 text-center font-bold text-slate-600">
                        {log.rowNumber || idx + 1}
                      </td>
                      <td className="px-4 py-2.5">
                        {log.success ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800">
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-slate-900">
                        {log.docName || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 font-sans">
                        {log.messages && log.messages.length > 0 ? (
                          <ul className="list-disc list-inside space-y-0.5 text-rose-700">
                            {log.messages.map((m: any, mIdx: number) => (
                              <li key={mIdx}>{typeof m === 'string' ? m : m.message || JSON.stringify(m)}</li>
                            ))}
                          </ul>
                        ) : log.exception ? (
                          <span className="text-rose-700">{log.exception}</span>
                        ) : (
                          <span className="text-slate-400">Record imported and validated successfully.</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
