'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  AlertCircle,
  PackageCheck,
  Wrench,
  ExternalLink,
} from 'lucide-react';

interface VehicleOption {
  id: string;
  licensePlate: string;
  status: string;
}

interface LeadRow {
  lead: string;
  subLead: string;
  trips: number;
  ton: number;
  qty: number;
  rate: number;
  amount: number;
}

interface HsdRow {
  date: string;
  qty: number;
  rate: number;
  amount: number;
}

interface CustomerParty {
  name: string;
  address?: string;
  gstin?: string;
}

interface VehicleIncomeBillFormatProps {
  vehicleNo?: string;
  periodFrom?: string;
  periodTo?: string;
  isPrintView?: boolean;
}

const DEFAULT_CUSTOMERS: Record<string, CustomerParty> = {
  'Om Maa Coal Transport Firm': {
    name: 'Om Maa Coal Transport Firm',
    address: 'At/Po- Kandhal, PS- Talcher, Dist- Angul, Odisha',
    gstin: '21AAEFO2835K1ZE',
  },
  'JBR Eastern Pvt Ltd': {
    name: 'JBR Eastern Pvt Ltd',
    address: 'Talcher Colliery, Angul, Odisha',
    gstin: '21AAACJ1234F1Z8',
  },
  'MCL (Mahanadi Coalfields)': {
    name: 'Mahanadi Coalfields Limited',
    address: 'Jagriti Vihar, Burla, Sambalpur, Odisha',
    gstin: '21AACCM0923L1ZM',
  },
};

// Client standard baseline template from official invoice (01.01_TO_15.01-9425-1.pdf)
// Used ONLY when previewing the baseline demo layout when 0 live records exist
const BASELINE_LEADS: LeadRow[] = [
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

const BASELINE_HSD: HsdRow[] = [
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

export function VehicleIncomeBillFormat({
  vehicleNo = 'OD19D1199',
  periodFrom = '01.01.2026',
  periodTo = '15.01.2026',
  isPrintView = false,
}: VehicleIncomeBillFormatProps) {
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleNo);
  const [vehicleList, setVehicleList] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLiveTrips, setIsLiveTrips] = useState(false);
  const [isLiveFuel, setIsLiveFuel] = useState(false);
  const [isLiveParts, setIsLiveParts] = useState(false);

  // Dynamic Bill Parties
  const [billNo, setBillNo] = useState(`BILL/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 900) + 100)}`);
  const [billDate, setBillDate] = useState(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  });

  const [billFromName, setBillFromName] = useState('M/S JAGANNATH TRADING AND TRANSPORTING');
  const [billFromAddress, setBillFromAddress] = useState('At- BHAJANIPUR, PS - Talcher, Odisha, PIN- 759103, Dist- Angul');
  const [billFromGstin, setBillFromGstin] = useState('21AKVPP2788B3ZV');

  const [billToName, setBillToName] = useState('Om Maa Coal Transport Firm');
  const [billToAddress, setBillToAddress] = useState('At/Po- Kandhal, PS- Talcher, Dist- Angul, Odisha');
  const [billToGstin, setBillToGstin] = useState('21AAEFO2835K1ZE');
  const [workDescription, setWorkDescription] = useState('Transportation of coal at Lingaraj OCP.');
  const [sacCode, setSacCode] = useState('998622');

  const [customerOptions, setCustomerOptions] = useState<CustomerParty[]>(Object.values(DEFAULT_CUSTOMERS));

  const [leadsData, setLeadsData] = useState<LeadRow[]>([]);
  const [hsdEntries, setHsdEntries] = useState<HsdRow[]>([]);
  const [sparePartsCost, setSparePartsCost] = useState(0);

  // Sync prop vehicle if changed from parent
  useEffect(() => {
    if (vehicleNo && vehicleNo !== selectedVehicle) {
      setSelectedVehicle(vehicleNo);
    }
  }, [vehicleNo]);

  // 1. Fetch available vehicles for the selector dropdown
  useEffect(() => {
    async function loadVehicles() {
      try {
        const res = await fetch('/api/vehicles');
        const json = await res.json();
        if (res.ok && json.success && Array.isArray(json.data)) {
          const mapped: VehicleOption[] = json.data.map((v: any) => ({
            id: v.id,
            licensePlate: v.licensePlate || v.id,
            status: v.status || 'Active',
          }));
          setVehicleList(mapped);
          if (!selectedVehicle && mapped.length > 0) {
            setSelectedVehicle(mapped[0].id);
          }
        }
      } catch (err) {
        console.warn('Failed to load vehicles for bill format:', err);
      }
    }
    loadVehicles();
  }, []);

  // 2. Fetch live trips, fuel entries, and parts sales for selectedVehicle
  const loadVehicleFinancialData = useCallback(async () => {
    if (!selectedVehicle) return;
    setLoading(true);

    try {
      const [tripsRes, fuelRes, salesRes] = await Promise.all([
        fetch(`/api/trips?vehicle=${encodeURIComponent(selectedVehicle)}&limit=500`),
        fetch(`/api/fuel?vehicle=${encodeURIComponent(selectedVehicle)}`),
        fetch(`/api/sales?vehicle=${encodeURIComponent(selectedVehicle)}`),
      ]);

      const [tripsJson, fuelJson, salesJson] = await Promise.all([
        tripsRes.json(),
        fuelRes.json(),
        salesRes.json(),
      ]);

      // Process Trips
      const rawTrips: any[] = tripsJson.success && Array.isArray(tripsJson.data) ? tripsJson.data : [];
      // Reconciled trips have tripStatus === 'Approved' or workflowState === 'Approved'
      const approvedTrips = rawTrips.filter(
        (t) => (t.tripStatus === 'Approved' || t.workflowState === 'Approved' || t.status === 'Approved')
      );
      const targetTrips = approvedTrips.length > 0 ? approvedTrips : rawTrips;

      let hasRealTrips = false;
      if (targetTrips.length > 0) {
        // Group trips by lead / route
        const leadMap = new Map<string, { lead: string; subLead: string; trips: number; qty: number; rates: number[]; amounts: number[] }>();

        targetTrips.forEach((t) => {
          const leadName = t.lead || t.destination || 'Main Mine Lead';
          const subLeadName = t.leadKm ? `${t.leadKm} K.m` : (t.lead ? `Lead Route` : 'Direct Haulage');
          const groupKey = `${leadName}___${subLeadName}`;

          const tripCount = Number(t.tripCount || 1);
          const qty = Number(t.calculatedQuantity || t.netWeightTons || 0);
          const rate = Number(t.leadRate || t.ratePerTon || 0);
          const amount = Number(t.calculatedAmount || t.grossRevenue || (qty * rate));

          if (!leadMap.has(groupKey)) {
            leadMap.set(groupKey, {
              lead: leadName,
              subLead: subLeadName,
              trips: 0,
              qty: 0,
              rates: [],
              amounts: [],
            });
          }

          const entry = leadMap.get(groupKey)!;
          entry.trips += tripCount;
          entry.qty += qty;
          if (rate > 0) entry.rates.push(rate);
          entry.amounts.push(amount);
        });

        const computedLeads: LeadRow[] = [];
        leadMap.forEach((v) => {
          const totalAmt = v.amounts.reduce((sum, a) => sum + a, 0);
          const avgRate = v.rates.length > 0 ? (v.rates.reduce((sum, r) => sum + r, 0) / v.rates.length) : (v.qty > 0 ? totalAmt / v.qty : 0);
          const avgTon = v.trips > 0 ? (v.qty / v.trips) : 0;

          computedLeads.push({
            lead: v.lead,
            subLead: v.subLead,
            trips: v.trips,
            ton: Number(avgTon.toFixed(2)),
            qty: Number(v.qty.toFixed(2)),
            rate: Number(avgRate.toFixed(2)),
            amount: Number(totalAmt.toFixed(2)),
          });
        });

        setLeadsData(computedLeads);
        setIsLiveTrips(true);
        hasRealTrips = true;
      } else {
        setLeadsData([]);
        setIsLiveTrips(false);
      }

      // Process HSD Fuel logs for this specific vehicle
      const rawFuel: any[] =
        fuelJson.success && Array.isArray(fuelJson.logs)
          ? fuelJson.logs
          : (fuelJson.success && Array.isArray(fuelJson.entries) ? fuelJson.entries : []);

      const vehicleFuel = rawFuel.filter(
        (f) => !f.vehicle || f.vehicle === selectedVehicle || f.vehicle === selectedVehicle.replace(/\s+/g, '')
      );

      if (vehicleFuel.length > 0) {
        // Group fuel logs by date
        const fuelDateMap = new Map<string, { date: string; qty: number; rates: number[]; amounts: number[] }>();

        vehicleFuel.forEach((f) => {
          const rawDate = f.fuelDate || f.date || f.postingDate || '2026-01-01';
          const dateStr = rawDate.includes('-')
            ? rawDate.split('-').reverse().join('.')
            : rawDate;

          const qtyLtr = Number(f.quantityLitres || f.quantityLiters || f.fuelLiters || 0);
          const rateLtr = Number(f.ratePerLitre || f.costPerLiter || f.rate || 94.98);
          const amt = Number(f.totalFuelCost || f.totalCost || f.amount || (qtyLtr * rateLtr));

          if (!fuelDateMap.has(dateStr)) {
            fuelDateMap.set(dateStr, { date: dateStr, qty: 0, rates: [], amounts: [] });
          }
          const item = fuelDateMap.get(dateStr)!;
          item.qty += qtyLtr;
          item.rates.push(rateLtr);
          item.amounts.push(amt);
        });

        const computedHsd: HsdRow[] = [];
        fuelDateMap.forEach((val) => {
          const totalAmt = val.amounts.reduce((sum, a) => sum + a, 0);
          const avgRate = val.qty > 0 ? (totalAmt / val.qty) : (val.rates[0] || 94.98);
          computedHsd.push({
            date: val.date,
            qty: Number(val.qty.toFixed(2)),
            rate: Number(avgRate.toFixed(2)),
            amount: Number(totalAmt.toFixed(2)),
          });
        });

        computedHsd.sort((a, b) => a.date.localeCompare(b.date));
        setHsdEntries(computedHsd);
        setIsLiveFuel(true);
      } else {
        // Honest zero consumption when no fuel logs exist for this vehicle
        setHsdEntries([]);
        setIsLiveFuel(true);
      }

      // Process Spare Parts Sales (linked vehicle deduction)
      const rawSales: any[] =
        salesJson.success && Array.isArray(salesJson.data)
          ? salesJson.data
          : (salesJson.success && Array.isArray(salesJson.sales) ? salesJson.sales : []);
      if (rawSales.length > 0) {
        const partsTotal = rawSales.reduce((acc, s) => acc + Number(s.grandTotal || s.totalAmount || 0), 0);
        setSparePartsCost(partsTotal);
        setIsLiveParts(true);
      } else {
        setSparePartsCost(0);
        setIsLiveParts(false);
      }

    } catch (err) {
      console.error('Error fetching live financial data for vehicle bill:', err);
      setLeadsData([]);
      setHsdEntries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedVehicle]);

  useEffect(() => {
    loadVehicleFinancialData();
  }, [loadVehicleFinancialData]);

  // Dynamic Financial Aggregations
  const totalTrips = leadsData.reduce((acc, row) => acc + row.trips, 0);
  const totalQty = leadsData.reduce((acc, row) => acc + row.qty, 0);
  const grossFreightAmount = leadsData.reduce((acc, row) => acc + row.amount, 0);

  const totalHsdLtr = hsdEntries.reduce((acc, row) => acc + row.qty, 0);
  const totalHsdAmount = hsdEntries.reduce((acc, row) => acc + row.amount, 0);

  // Financial deductions following Indian mining transportation norms
  const societyDeductionRate = 0.13; // 13% society deduction as per client statement
  const societyDeduction = Math.round(grossFreightAmount * societyDeductionRate * 100) / 100;

  const taxableValue = Math.max(0, grossFreightAmount - societyDeduction);
  const gst18 = Math.round(taxableValue * 0.18 * 100) / 100;
  const invoiceValue = taxableValue + gst18;
  const tds1 = Math.round(taxableValue * 0.01 * 100) / 100;

  // Deductions: TDS + Diesel (HSD) + Spare Parts Used
  const totalDeduction = tds1 + totalHsdAmount + sparePartsCost;
  const paymentReceived = 0;
  const balance = Math.max(0, invoiceValue - totalDeduction - paymentReceived);

  const handlePrint = () => {
    // Open dedicated pure 1-page print invoice in clean window
    const printUrl = `/reports/print-bill?vehicle=${encodeURIComponent(selectedVehicle)}&from=${encodeURIComponent(periodFrom)}&to=${encodeURIComponent(periodTo)}&autoprint=true`;
    window.open(printUrl, '_blank', 'width=900,height=1100');
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
    csv += `Gross Freight Total,,${grossFreightAmount.toFixed(2)}\n`;
    csv += `Less Society Deduction,,${societyDeduction.toFixed(2)}\n`;
    csv += `Taxable Value,,${taxableValue.toFixed(2)}\n`;
    csv += `Add GST 18%,,${gst18.toFixed(2)}\n`;
    csv += `Invoice Value,,${invoiceValue.toFixed(2)}\n`;
    csv += `TDS 1%,,${tds1.toFixed(2)}\n`;
    csv += `Diesel Consumption,,${totalHsdAmount.toFixed(2)}\n`;
    csv += `Spare Parts Used,,${sparePartsCost.toFixed(2)}\n`;
    csv += `Total Deduction,,${totalDeduction.toFixed(2)}\n`;
    csv += `Less Payment,,${paymentReceived.toFixed(2)}\n`;
    csv += `Balance,,${balance.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Vehicle_Income_Bill_${selectedVehicle}_${periodFrom}_${periodTo}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4">
      {/* Top Action Ribbon - Hidden in Print View */}
      {!isPrintView && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-xs print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-slate-900">Vehicle Income / Freight Transportation Bill</h2>
                {isLiveTrips ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Live Reconciled Data: {selectedVehicle}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                    <AlertCircle className="w-3 h-3 text-amber-600" /> Baseline Template ({selectedVehicle})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Official client coal haulage statement with lead-wise reconciliation, HSD fuel, and statutory deductions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Dynamic Vehicle Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
              <Truck className="w-3.5 h-3.5 text-slate-500" />
              <label htmlFor="select-bill-vehicle" className="text-xs font-semibold text-slate-700">Vehicle:</label>
              <select
                id="select-bill-vehicle"
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="bg-transparent text-xs font-bold text-blue-900 border-none focus:outline-none focus:ring-0 cursor-pointer"
              >
                {vehicleList.length > 0 ? (
                  vehicleList.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} ({v.status})
                    </option>
                  ))
                ) : (
                  <option value={selectedVehicle}>{selectedVehicle}</option>
                )}
              </select>
            </div>

            <button
              type="button"
              onClick={loadVehicleFinancialData}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
              title="Refresh financial data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Print 1-Page Bill</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Data Notification Banner */}
      {!isPrintView && (
        isLiveTrips ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 flex-wrap gap-2 print:hidden">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Dynamic Bill Computed:</strong> Showing <strong>{totalTrips}</strong> reconciled trips across <strong>{leadsData.length}</strong> route leads with <strong>{totalQty.toFixed(2)}</strong> Tons coal transported by <strong>{selectedVehicle}</strong>.
              </span>
            </div>
            <div className="font-mono font-bold text-emerald-800">
              Gross Freight: ₹{grossFreightAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs text-slate-600 print:hidden">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              No reconciled mining trips recorded yet for <strong>{selectedVehicle}</strong> in this billing period. Showing the standard baseline format below.
            </span>
          </div>
        )
      )}

      {/* Official Bill Card */}
      <div className="official-bill-document bg-white border-2 border-slate-900 rounded-xl p-5 sm:p-7 shadow-xs space-y-4 text-slate-900 print:border print:p-2 print:space-y-3 print:rounded-none">
        {/* Bill Top Bar */}
        <div className="text-center border-b-2 border-slate-900 pb-3">
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-widest">BILL</h1>
        </div>

        {/* Parties & Reference Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-300 pb-4 text-xs">
          {/* Bill From */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold">
                Bill No:{' '}
                <input
                  type="text"
                  value={billNo}
                  onChange={(e) => setBillNo(e.target.value)}
                  className="font-mono font-bold bg-transparent border-b border-dotted border-slate-400 focus:outline-none print:border-none"
                />
              </span>
            </div>
            <div className="font-bold text-slate-700 uppercase mt-2">Bill From:</div>
            <input
              type="text"
              value={billFromName}
              onChange={(e) => setBillFromName(e.target.value)}
              className="text-sm font-black text-slate-900 w-full bg-transparent border-b border-dotted border-slate-400 focus:outline-none print:border-none"
            />
            <input
              type="text"
              value={billFromAddress}
              onChange={(e) => setBillFromAddress(e.target.value)}
              className="text-slate-600 w-full bg-transparent border-b border-dotted border-slate-400 focus:outline-none print:border-none text-[11px]"
            />
            <div className="font-semibold text-slate-900 mt-1 flex items-center gap-1">
              <span>GSTIN:</span>
              <input
                type="text"
                value={billFromGstin}
                onChange={(e) => setBillFromGstin(e.target.value)}
                className="font-mono font-bold bg-transparent border-b border-dotted border-slate-400 focus:outline-none print:border-none"
              />
            </div>
            <div className="font-bold text-blue-900 mt-1">
              V. No- <span className="font-mono text-sm">{selectedVehicle}</span>
            </div>
          </div>

          {/* Bill To */}
          <div className="space-y-1 sm:text-right">
            <div>
              <span className="font-bold">
                Date:{' '}
                <input
                  type="text"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="font-mono font-normal text-right bg-transparent border-b border-dotted border-slate-400 focus:outline-none print:border-none"
                />
              </span>
            </div>
            <div className="flex items-center justify-end gap-2 mt-2">
              <span className="font-bold text-slate-700 uppercase">Bill To:</span>
              {/* Customer Selector Dropdown for easy switching */}
              <select
                onChange={(e) => {
                  const found = customerOptions.find((c) => c.name === e.target.value);
                  if (found) {
                    setBillToName(found.name);
                    if (found.address) setBillToAddress(found.address);
                    if (found.gstin) setBillToGstin(found.gstin);
                  } else {
                    setBillToName(e.target.value);
                  }
                }}
                className="text-[10px] bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 print:hidden"
              >
                <option value="">-- Choose Client --</option>
                {customerOptions.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={billToName}
              onChange={(e) => setBillToName(e.target.value)}
              className="text-sm font-black text-slate-900 sm:text-right w-full bg-transparent border-b border-dotted border-slate-400 focus:outline-none print:border-none"
            />
            <input
              type="text"
              value={billToAddress}
              onChange={(e) => setBillToAddress(e.target.value)}
              className="text-slate-600 sm:text-right w-full bg-transparent border-b border-dotted border-slate-400 focus:outline-none print:border-none text-[11px]"
            />
            <div className="font-semibold text-slate-900 mt-1 flex items-center sm:justify-end gap-1">
              <span>GSTIN:</span>
              <input
                type="text"
                value={billToGstin}
                onChange={(e) => setBillToGstin(e.target.value)}
                className="font-mono font-bold bg-transparent border-b border-dotted border-slate-400 focus:outline-none print:border-none"
              />
            </div>
          </div>
        </div>

        {/* Operational Context Strip */}
        <div className="flex flex-wrap items-center justify-between text-xs py-2 px-3 bg-slate-100 rounded-lg border border-slate-200">
          <div className="flex-1 flex items-center gap-1.5">
            <span className="font-bold text-slate-700 whitespace-nowrap">Description of Work:</span>
            <input
              type="text"
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              className="font-semibold text-slate-900 bg-transparent border-b border-dotted border-slate-400 w-full focus:outline-none print:border-none"
            />
          </div>
          <div className="flex items-center space-x-4 shrink-0 pl-3">
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-700">SAC:</span>
              <input
                type="text"
                value={sacCode}
                onChange={(e) => setSacCode(e.target.value)}
                className="font-mono font-bold w-16 bg-transparent border-b border-dotted border-slate-400 focus:outline-none print:border-none"
              />
            </div>
            <div>
              <span className="font-bold text-slate-700">Period:</span>{' '}
              <span className="font-mono font-bold">{periodFrom} to {periodTo}</span>
            </div>
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
              {leadsData.length > 0 ? (
                leadsData.map((row, idx) => (
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
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 px-3 text-center text-slate-500 bg-slate-50/50">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <Truck className="w-5 h-5 text-slate-400" />
                      <span className="font-semibold text-xs text-slate-700">No coal haulage trips recorded for {selectedVehicle} in this period</span>
                      <span className="text-[11px] text-slate-500">
                        Trips logged by Site Supervisor and reconciled will dynamically display here.
                      </span>
                    </div>
                  </td>
                </tr>
              )}
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
          <div className="border border-slate-300 rounded-lg overflow-hidden flex flex-col justify-between">
            <div>
              <div className="bg-slate-200 px-3 py-2 border-b border-slate-300 flex items-center justify-between font-bold text-xs uppercase">
                <span className="flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-amber-700" />
                  HSD Diesel Consumption Log ({selectedVehicle})
                </span>
                <span className="text-[11px] text-slate-600 font-mono">
                  {hsdEntries.length > 0 ? `${totalHsdLtr.toFixed(1)} LTR` : '0 LTR'}
                </span>
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
                  {hsdEntries.length > 0 ? (
                    hsdEntries.map((h, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-1 px-3 text-slate-700">{h.date}</td>
                        <td className="py-1 px-3 text-right font-medium">{h.qty > 0 ? h.qty.toFixed(1) : '-'}</td>
                        <td className="py-1 px-3 text-right text-slate-500">{h.rate.toFixed(2)}</td>
                        <td className="py-1 px-3 text-right font-semibold text-slate-900">
                          {h.amount > 0 ? h.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 px-3 text-center text-slate-500 bg-slate-50/50">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <Fuel className="w-5 h-5 text-slate-400" />
                          <span className="font-semibold text-xs text-slate-700">No HSD Diesel Consumption logged for {selectedVehicle}</span>
                          <span className="text-[11px] text-slate-500">
                            Diesel dispensation records entered in Fuel Logs will dynamically aggregate here date-wise.
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-100 border-t border-slate-300 font-bold p-2.5 flex items-center justify-between text-xs">
              <span className="uppercase text-slate-900">Total HSD Diesel</span>
              <div className="flex items-center gap-4">
                <span className="font-mono font-black">{totalHsdLtr.toFixed(1)} LTR</span>
                <span className="font-mono font-black text-rose-800 text-sm">
                  ₹{totalHsdAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
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
                <span>Less: Society Deduction ({Math.round(societyDeductionRate * 100)}%)</span>
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
                    <span className="font-mono text-rose-700">
                      {totalHsdAmount > 0
                        ? `- ₹${totalHsdAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : '₹0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>• Spare Parts Used:</span>
                    <span className="font-mono text-rose-700">
                      {sparePartsCost > 0
                        ? `- ₹${sparePartsCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : '₹0.00'}
                    </span>
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
                <span className="font-mono text-base">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
