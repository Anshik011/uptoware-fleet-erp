export type VehicleStatus = 'Active' | 'On Trip' | 'Under Maintenance' | 'Breakdown' | 'Out of Service';

export type StatutoryHealth = 'valid' | 'expiring_soon' | 'expired' | 'missing';

export interface StatutoryDocument {
  title: string;
  expiryDate: string | null;
  status: StatutoryHealth;
  daysRemaining: number | null;
}

export interface Vehicle {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  status: VehicleStatus;
  assignedDriverId: string | null;
  assignedDriverName: string | null;
  lastOdometer: number;
  payloadCapacityTons: number;
  fuelType: string;
  statutory: {
    overall: StatutoryHealth;
    insurance: StatutoryDocument;
    fitness: StatutoryDocument;
    puc: StatutoryDocument;
    roadTax: StatutoryDocument;
    permit: StatutoryDocument;
  };
  lastUpdated?: string;
}

export type DriverStatus = 'Active' | 'Suspended' | 'Left';

export interface Driver {
  id: string;
  name: string;
  fullName: string;
  status: DriverStatus;
  cellNumber: string | null;
  licenseNumber: string | null;
  issuingDate: string | null;
  expiryDate: string | null;
  medicalFitnessExpiry: string | null;
  safetyScore: number;
  assignedVehicle: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  isTestRecord?: boolean;
  licenseStatus: StatutoryHealth;
  daysToLicenseExpiry: number | null;
  totalTrips?: number;
  totalTonnage?: number;
}

export type TripStatus =
  | 'Draft'
  | 'Dispatched'
  | 'Weighbridge Confirmed'
  | 'Approved'
  | 'Delivered'
  | 'Cancelled';

export interface MiningTrip {
  id: string;
  namingSeries?: string;
  vehicle: string;
  driver: string;
  driverName?: string;
  mineSite: string;
  mineSiteName?: string;
  destination: string;
  materialType: string;
  challanNumber?: string | null;
  tripStatus?: TripStatus;
  workflowState?: string;
  status: string; // Backward compatibility with existing UI components
  grossWeightTons?: number;
  tareWeightTons?: number;
  netWeightTons: number;
  confirmedBy?: string | null;
  confirmedOn?: string | null;
  ratePerTon?: number;
  grossRevenue: number;
  openingOdometer?: number;
  closingOdometer?: number;
  dispatchDateTime: string;
  departureDateTime?: string | null;
  returnDateTime?: string | null;
  modified?: string;
  approvedBy?: string | null;
  approvedOn?: string | null;
  cancelledBy?: string | null;
  cancelledOn?: string | null;
  cancellationReason?: string | null;
  billingStatus?: string;
  billingNote?: string | null;
  salesInvoice?: string | null;
  isTestRecord?: boolean;
}

export interface CreateMiningTripInput {
  vehicle: string;
  driver: string;
  mineSite: string;
  destination: string;
  materialType: string;
  challanNumber?: string;
  dispatchDateTime: string;
  ratePerTon?: number;
  openingOdometer?: number;
  isTestRecord?: boolean;
}

export interface TripTransitionInput {
  action: 'Dispatch' | 'Confirm Weighbridge' | 'Approve' | 'Mark Delivered' | 'Cancel' | string;
  grossWeightTons?: number;
  tareWeightTons?: number;
  closingOdometer?: number;
  returnDateTime?: string;
  cancellationReason?: string;
}

export interface FleetAlert {
  id: string;
  title: string;
  category: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: string;
  vehicle: string | null;
  driver?: string | null;
  sourceDoctype?: string | null;
  sourceName?: string | null;
  recipientRole?: string | null;
  forUser?: string | null;
  message?: string | null;
  timestamp: string;
  actionRequired: string | null;
  resolvedBy?: string | null;
  resolvedOn?: string | null;
  resolutionNote?: string | null;
  acknowledgedBy?: string | null;
  acknowledgedOn?: string | null;
  isTestRecord?: boolean;
}

export interface DashboardSummary {
  kpi: {
    totalVehicles: number;
    activeVehicles: number;
    inMaintenance: number;
    inBreakdown: number;
    outOfService: number;
    utilizationRate: number;
    totalCapacityTons: number;
    activeCapacityTons: number;
    completedTrips: number;
    inProgressTrips: number;
    totalRevenue: number;
    totalOperatingCost: number;
    fuelCost: number;
    maintenanceCost: number;
    netOperatingIncome: number;
  };
  recentTrips: MiningTrip[];
  recentAlerts: FleetAlert[];
}

export interface CreateVehicleInput {
  licensePlate: string;
  make: string;
  model: string;
  status: VehicleStatus;
  assignedDriverId?: string;
  payloadCapacityTons: number;
  lastOdometer: number;
  fuelType: string;
  insuranceExpiryDate?: string;
  fitnessExpiryDate?: string;
  pucExpiryDate?: string;
  roadTaxExpiryDate?: string;
  permitExpiryDate?: string;
}

export interface CreateDriverInput {
  fullName: string;
  status: DriverStatus;
  cellNumber?: string;
  licenseNumber?: string;
  issuingDate?: string;
  expiryDate?: string;
  medicalFitnessExpiry?: string;
  safetyScore?: number;
  assignedVehicle?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface UpdateDriverInput extends Partial<CreateDriverInput> {}

export type MineSiteStatus = 'Operational' | 'Inactive';

export type MineralType =
  | 'Iron Ore'
  | 'Coal'
  | 'Bauxite'
  | 'Limestone'
  | 'Manganese'
  | 'Overburden'
  | 'Other';

export interface MineSite {
  id: string;
  siteName: string;
  client: string | null;
  clientName?: string | null;
  status: MineSiteStatus;
  mineralType: MineralType;
  dailyTargetTonnage: number;
  activeLoadingPits: number;
  location: string | null;
  ratePerTon: number;
  isTestRecord?: boolean;
  totalTrips?: number;
  totalHauledTons?: number;
}

export interface CustomerOption {
  id: string;
  customerName: string;
}

export interface CreateMineSiteInput {
  siteName: string;
  client?: string;
  status: MineSiteStatus;
  mineralType: MineralType;
  dailyTargetTonnage: number;
  activeLoadingPits: number;
  location?: string;
  ratePerTon: number;
}

export interface UpdateMineSiteInput extends Partial<CreateMineSiteInput> {}

export interface DispatchMetrics {
  pendingDispatches: number;
  assignedTrips: number;
  dispatchedTrips: number;
  awaitingWeighbridge: number;
  deliveredTrips: number;
  activeVehiclesAvailable: number;
  activeDriversAvailable: number;
}

export interface DispatchEligibilityCheck {
  item: string;
  category: 'Vehicle' | 'Driver' | 'Operational';
  status: 'Pass' | 'Fail' | 'Warning';
  details: string;
}

export interface DispatchEligibilityResult {
  eligible: boolean;
  vehicle: string;
  driver: string;
  checks: DispatchEligibilityCheck[];
  errors: string[];
}

export interface WeighbridgeMetrics {
  pendingTripsCount: number;
  completedTodayCount: number;
  totalTonnageWeighed: number;
  averageNetPayloadTons: number;
}

export interface ConfirmWeighbridgeInput {
  tripId: string;
  grossWeightTons: number;
  tareWeightTons: number;
  challanNumber?: string;
}

export type FuelApprovalStatus = 'Draft' | 'Approved' | 'Rejected';
export type FuelSource = 'Site Bowser' | 'External Pump';
export type FuelPaymentMethod = 'Company Card' | 'Bank Transfer' | 'UPI' | 'Cash';

export interface FuelLog {
  id: string;
  vehicle: string;
  driver?: string | null;
  driverName?: string | null;
  mineSite?: string | null;
  mineSiteName?: string | null;
  fuelDate: string;
  fuelSource: FuelSource;
  odometerReading: number;
  previousOdometer?: number | null;
  distanceTravelled?: number;
  isFullTank: boolean;
  kmPerLitre?: number;
  efficiencyNote?: string | null;
  quantityLitres: number;
  ratePerLitre: number;
  totalCost: number;
  paymentMethod?: FuelPaymentMethod | null;
  fuelStation?: string | null;
  fuelSlipDoc?: string | null;
  remarks?: string | null;
  approvalStatus: FuelApprovalStatus;
  approvedBy?: string | null;
  approvedOn?: string | null;
  rejectedBy?: string | null;
  rejectedOn?: string | null;
  rejectionReason?: string | null;
  workflowState?: string | null;
  owner?: string | null;
  isTestRecord?: boolean;
  creation?: string;
  modified?: string;
}

export interface FuelMetrics {
  totalLitres: number;
  totalFuelCost: number;
  averageRatePerLitre: number;
  averageKmPerLitre: number;
  pendingApprovalsCount: number;
  approvedLogsCount: number;
}

export interface CreateFuelLogInput {
  vehicle: string;
  driver?: string;
  mineSite?: string;
  fuelDate: string;
  fuelSource: FuelSource;
  odometerReading: number;
  isFullTank?: boolean;
  quantityLitres: number;
  ratePerLitre: number;
  totalCost?: number;
  paymentMethod?: FuelPaymentMethod;
  fuelStation?: string;
  remarks?: string;
  isTestRecord?: boolean;
}

export interface FuelTransitionInput {
  action: 'Approve' | 'Reject' | 'Re-open' | string;
  rejectionReason?: string;
}



// ============================================================================
// PHASE 3 — MODULE A: VEHICLE BREAKDOWN & MAINTENANCE
// ============================================================================

export type BreakdownType =
  | 'Engine'
  | 'Hydraulic'
  | 'Tyre'
  | 'Electrical'
  | 'Transmission'
  | 'Brake'
  | 'Other';

export type BreakdownSeverity = 'Low' | 'Medium' | 'Critical';

export type RepairStatus =
  | 'Reported'
  | 'Approved'
  | 'In Workshop'
  | 'Awaiting Parts'
  | 'Repaired'
  | 'Closed';

export type BreakdownWorkflowAction =
  | 'Approve'
  | 'Reject'
  | 'Send to Workshop'
  | 'Request Parts'
  | 'Parts Received'
  | 'Mark Repaired'
  | 'Close Breakdown';

export interface VehicleBreakdownPart {
  name?: string;
  itemCode: string;
  itemName?: string;
  stockUom?: string;
  plannedQty: number;
  issuedQty?: number;
  warehouse: string;
  rate?: number;
  amount?: number;
  stockEntry?: string;
  status?: 'Planned' | 'Partially Issued' | 'Issued';
  returnedQty?: number;
  netIssuedQty?: number;
}

export interface VehicleBreakdown {
  id: string;
  namingSeries?: string;
  breakdownDate?: string;
  breakdownTime?: string;
  breakdownDatetime?: string;
  vehicle: string;
  vehiclePlate?: string;
  driver?: string | null;
  driverName?: string | null;
  mineSite?: string | null;
  mineSiteName?: string | null;
  relatedTrip?: string | null;
  breakdownType: BreakdownType;
  severity: BreakdownSeverity;
  breakdownLocation?: string;
  odometerReading?: number | null;
  reportedBy?: string | null;
  reportedByName?: string | null;
  description?: string;
  repairStatus: RepairStatus;
  assignedWorkshop?: string | null;
  assignedWorkshopName?: string | null;
  workflowState?: string | null;
  repairStartDate?: string | null;
  repairStartTime?: string | null;
  repairStartDatetime?: string | null;
  repairCompletedDate?: string | null;
  repairCompletedTime?: string | null;
  repairCompletionDatetime?: string | null;
  downtimeHours: number;
  repairDetails?: string | null;
  repairDescription?: string | null;
  workOrder?: string | null;
  partsCost: number;
  laborCost: number;
  labourCost?: number;
  totalCost: number;
  totalRepairCost?: number;
  totalMaintenanceCost?: number;
  parts: VehicleBreakdownPart[];
  partsTable?: VehicleBreakdownPart[];
  approvedBy?: string | null;
  approvedOn?: string | null;
  closedBy?: string | null;
  closedOn?: string | null;
  resolutionType?: 'Repaired' | 'Rejected' | null;
  rejectionReason?: string | null;
  isTestRecord?: boolean;
  creation?: string;
  modified?: string;
}

export interface BreakdownMetrics {
  totalIncidents: number;
  totalBreakdowns?: number;
  inWorkshopCount: number;
  activeInWorkshop?: number;
  awaitingPartsCount: number;
  awaitingParts?: number;
  criticalIncidents: number;
  totalDowntimeHours: number;
  closedIncidents: number;
  totalRepairCost?: number;
}

export interface CreateBreakdownInput {
  vehicle: string;
  driver?: string;
  mineSite?: string;
  relatedTrip?: string;
  breakdownDate?: string;
  breakdownTime?: string;
  breakdownDatetime?: string;
  breakdownType: BreakdownType;
  severity: BreakdownSeverity;
  breakdownLocation?: string;
  odometerReading?: number;
  description?: string;
  assignedWorkshop?: string;
  repairDetails?: string;
  laborCost?: number;
  parts?: VehicleBreakdownPart[];
  isTestRecord?: boolean;
}

export interface UpdateBreakdownInput {
  assignedWorkshop?: string;
  repairStartDate?: string;
  repairStartTime?: string;
  repairStartDatetime?: string;
  repairCompletedDate?: string;
  repairCompletedTime?: string;
  repairCompletionDatetime?: string;
  repairDetails?: string;
  repairDescription?: string;
  laborCost?: number;
  labourCost?: number;
  parts?: VehicleBreakdownPart[];
  partsTable?: VehicleBreakdownPart[];
}

export interface BreakdownTransitionInput {
  action: BreakdownWorkflowAction;
  repairDetails?: string;
  repairDescription?: string;
  laborCost?: number;
  labourCost?: number;
  parts?: VehicleBreakdownPart[];
  partsTable?: VehicleBreakdownPart[];
  rejectionReason?: string;
  repairCompletionDatetime?: string;
}

// ============================================================================
// PHASE 3 — MODULE B: OPERATIONAL EXPENSE MANAGEMENT
// ============================================================================

export type ExpenseWorkflowAction =
  | 'Submit for Approval'
  | 'Approve'
  | 'Reject'
  | 'Re-open';

export type ExpenseCategory =
  | 'Toll and Road Charges'
  | 'Parking'
  | 'Loading and Unloading'
  | 'Food and Accommodation'
  | 'Weighbridge Charges'
  | 'Permit and Documentation'
  | 'Miscellaneous Operational Expenses';

export type ExpenseApprovalStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
export type ExpenseAccountingStatus = 'Unposted' | 'Posted' | 'Cancelled';
export type ExpensePaymentStatus = 'Unpaid' | 'Paid';

export interface OperationalExpense {
  id: string;
  namingSeries?: string;
  expenseDate: string;
  expenseCategory: ExpenseCategory;
  amount: number;
  currency?: string;
  company?: string;
  approvalStatus: ExpenseApprovalStatus;
  accountingStatus: ExpenseAccountingStatus;
  paymentStatus: ExpensePaymentStatus;
  paidAmount?: number;
  postedAmount?: number;
  vehicle?: string | null;
  miningTrip?: string | null;
  mineSite?: string | null;
  mineSiteName?: string | null;
  driver?: string | null;
  driverName?: string | null;
  supplier?: string | null;
  supplierName?: string | null;
  payeeName?: string | null;
  paymentMethod?: string | null;
  billReference?: string | null;
  receiptAttachment?: string | null;
  description?: string | null;
  rejectionReason?: string | null;
  expenseAccount?: string | null;
  paymentAccount?: string | null;
  costCenter?: string | null;
  postingDocumentType?: string | null;
  postingDocumentName?: string | null;
  postedBy?: string | null;
  postedOn?: string | null;
  submittedBy?: string | null;
  submittedOn?: string | null;
  approvedBy?: string | null;
  approvedOn?: string | null;
  rejectedBy?: string | null;
  rejectedOn?: string | null;
  owner?: string | null;
  isTestRecord?: boolean;
  creation?: string;
  modified?: string;
}

export interface ExpenseMetrics {
  totalDisbursed: number;
  approvedAmount: number;
  pendingApprovalsCount: number;
  unpostedAmount: number;
  topCategoryName?: string;
  topCategoryAmount?: number;
}

export interface CreateExpenseInput {
  expenseDate: string;
  expenseCategory: ExpenseCategory;
  amount: number;
  vehicle?: string;
  miningTrip?: string;
  mineSite?: string;
  driver?: string;
  supplier?: string;
  payeeName?: string;
  paymentMethod?: string;
  billReference?: string;
  receiptAttachment?: string;
  description?: string;
  expenseAccount?: string;
  paymentAccount?: string;
  costCenter?: string;
  company?: string;
  isTestRecord?: boolean;
}

export interface UpdateExpenseInput extends Partial<CreateExpenseInput> {}

export interface ExpenseTransitionInput {
  action: ExpenseWorkflowAction | string;
  rejectionReason?: string;
}

// ==========================================
// PHASE 4: INVENTORY & PROCUREMENT INTERFACES
// ==========================================

export interface WarehouseBalance {
  warehouse: string;
  warehouseName: string;
  actualQty: number;
  reservedQty: number;
  orderedQty: number;
  projectedQty: number;
  valuationRate: number;
  stockValue: number;
}

export interface SparePartItem {
  id: string;
  itemCode: string;
  itemName: string;
  itemGroup: string;
  stockUom: string;
  valuationRate: number;
  isStockItem: boolean;
  partNumber?: string;
  compatibleModel?: string;
  preferredSupplier?: string;
  isTestRecord?: boolean;
  totalActualQty: number;
  totalReservedQty: number;
  totalOrderedQty: number;
  totalProjectedQty: number;
  totalStockValue: number;
  reorderLevel: number;
  reorderQty: number;
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  warehouseBalances: WarehouseBalance[];
}

export interface CreateSparePartInput {
  itemCode: string;
  itemName: string;
  itemGroup: string;
  stockUom: string;
  valuationRate: number;
  partNumber?: string;
  compatibleModel?: string;
  preferredSupplier?: string;
  reorderLevel?: number;
  reorderQty?: number;
  isTestRecord?: boolean;
}

export interface Warehouse {
  id: string;
  name: string;
  warehouseName: string;
  company: string;
  isGroup: boolean;
  totalItems: number;
  totalValuation: number;
}

export interface StockMovementItem {
  itemCode: string;
  itemName: string;
  qty: number;
  uom: string;
  basicRate: number;
  amount: number;
  sWarehouse?: string;
  tWarehouse?: string;
}

export interface StockMovement {
  id: string;
  name: string;
  entryType: 'Material Issue' | 'Material Receipt' | 'Material Transfer';
  purpose: string;
  postingDate: string;
  postingTime?: string;
  fromWarehouse?: string;
  toWarehouse?: string;
  vehicle?: string;
  vehicleBreakdown?: string;
  isReturn?: boolean;
  isTestRecord?: boolean;
  docstatus: number; // 0=Draft, 1=Submitted, 2=Cancelled
  status: 'Draft' | 'Submitted' | 'Cancelled';
  totalQty: number;
  totalAmount: number;
  items: StockMovementItem[];
}

export interface CreateStockEntryInput {
  entryType: 'Material Issue' | 'Material Receipt' | 'Material Transfer';
  postingDate?: string;
  fromWarehouse?: string;
  toWarehouse?: string;
  vehicle?: string;
  vehicleBreakdown?: string;
  isReturn?: boolean;
  isTestRecord?: boolean;
  items: Array<{
    itemCode: string;
    qty: number;
    uom?: string;
    rate?: number;
    sWarehouse?: string;
    tWarehouse?: string;
  }>;
}

export interface Supplier {
  id: string;
  name: string;
  supplierName: string;
  supplierGroup: string;
  supplierType?: string;
  country?: string;
  pan?: string;
  isPreferred?: boolean;
  isTestRecord?: boolean;
  totalPurchases: number;
  outstandingPayables: number;
  activeOrdersCount: number;
}

export interface CreateSupplierInput {
  supplierName: string;
  supplierGroup: string;
  supplierType?: string;
  country?: string;
  pan?: string;
  isPreferred?: boolean;
  isTestRecord?: boolean;
}

export interface PurchaseOrderItem {
  itemCode: string;
  itemName: string;
  qty: number;
  rate: number;
  amount: number;
  uom: string;
  warehouse: string;
  scheduleDate?: string;
}

export interface PurchaseOrder {
  id: string;
  name: string;
  supplier: string;
  supplierName?: string;
  transactionDate: string;
  scheduleDate?: string;
  grandTotal: number;
  status: string; // 'Draft' | 'To Receive and Bill' | 'To Bill' | 'To Receive' | 'Completed' | 'Cancelled'
  docstatus: number;
  procurementType?: string;
  vehicle?: string;
  vehicleBreakdown?: string;
  mineSite?: string;
  approvedBy?: string;
  approvedOn?: string;
  isTestRecord?: boolean;
  items: PurchaseOrderItem[];
}

export interface CreatePurchaseOrderInput {
  supplier: string;
  transactionDate: string;
  scheduleDate?: string;
  procurementType?: string;
  vehicle?: string;
  vehicleBreakdown?: string;
  mineSite?: string;
  isTestRecord?: boolean;
  items: Array<{
    itemCode: string;
    qty: number;
    rate: number;
    warehouse?: string;
    scheduleDate?: string;
  }>;
}

export interface PurchaseReceiptItem {
  itemCode: string;
  itemName?: string;
  qty: number;
  receivedQty: number;
  rate: number;
  amount: number;
  warehouse: string;
  purchaseOrder?: string;
}

export interface PurchaseReceipt {
  id: string;
  name: string;
  supplier: string;
  postingDate: string;
  grandTotal: number;
  status: string;
  docstatus: number;
  purchaseOrder?: string;
  procurementType?: string;
  vehicle?: string;
  vehicleBreakdown?: string;
  mineSite?: string;
  verifiedBy?: string;
  verifiedOn?: string;
  isTestRecord?: boolean;
  items: PurchaseReceiptItem[];
}

export interface PurchaseInvoiceItem {
  itemCode: string;
  itemName?: string;
  qty: number;
  rate: number;
  amount: number;
  warehouse?: string;
  purchaseOrder?: string;
}

export interface PurchaseInvoice {
  id: string;
  name: string;
  supplier: string;
  postingDate: string;
  dueDate?: string;
  grandTotal: number;
  outstandingAmount: number;
  status: string; // 'Draft' | 'Unpaid' | 'Partially Paid' | 'Paid' | 'Cancelled'
  docstatus: number;
  purchaseOrder?: string;
  procurementType?: string;
  vehicle?: string;
  vehicleBreakdown?: string;
  mineSite?: string;
  approvedBy?: string;
  approvedOn?: string;
  isTestRecord?: boolean;
  items: PurchaseInvoiceItem[];
}

export interface InventoryMetrics {
  totalInventoryValue: number;
  activePartsCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingReceiptsCount: number;
  totalMovementsCount: number;
}

export interface ProcurementMetrics {
  totalSpend: number;
  openOrdersCount: number;
  pendingReceiptsCount: number;
  outstandingPayables: number;
  activeSuppliersCount: number;
}

export interface PartsConsumptionRecord {
  itemCode: string;
  itemName: string;
  vehicle?: string;
  breakdown?: string;
  mineSite?: string;
  postingDate: string;
  qty: number;
  uom: string;
  amount: number;
  stockEntry: string;
}

export interface FleetReportColumn {
  label: string;
  fieldname: string;
  fieldtype: string;
  width?: number;
}

export interface FleetReportResult {
  columns: FleetReportColumn[];
  result: Record<string, any>[];
  reportName: string;
}

// =============================================================================
// PHASE 5 — INSURANCE & STATUTORY COMPLIANCE TYPES
// =============================================================================

export type PolicyType =
  | 'Comprehensive'
  | 'Third Party Liability'
  | 'Zero Depreciation'
  | 'Commercial Fleet Standard';

export type PolicyStatus = 'Draft' | 'Active' | 'Expired' | 'Cancelled';

export interface VehicleInsurancePolicy {
  id: string;
  name: string;
  policyNo: string;
  vehicle: string;
  vehiclePlate?: string;
  insuranceCompany: string;
  policyType: PolicyType;
  policyStatus: PolicyStatus;
  company: string;
  startDate: string;
  endDate: string;
  premiumAmount: number;
  idvAmount: number;
  thirdPartyLiabilityLimit?: number;
  policyDoc?: string | null;
  isRenewal: boolean;
  previousPolicy?: string | null;
  previousPolicyNo?: string | null;
  approvedBy?: string | null;
  approvedOn?: string | null;
  cancelledBy?: string | null;
  cancelledOn?: string | null;
  cancellationReason?: string | null;
  remarks?: string | null;
  isTestRecord?: boolean;
  daysRemaining?: number;
  expiryUrgency?: 'valid' | 'expiring_soon' | 'expired';
}

export interface CreateInsurancePolicyInput {
  policyNo: string;
  vehicle: string;
  insuranceCompany: string;
  policyType: string;
  startDate: string;
  endDate: string;
  premiumAmount: number;
  idvAmount?: number;
  thirdPartyLiabilityLimit?: number;
  remarks?: string;
  policyDoc?: string;
  activateNow?: boolean;
  isTestRecord?: boolean;
}

export interface RenewInsurancePolicyInput {
  policyName: string;
  newPolicyNo: string;
  startDate: string;
  endDate: string;
  premiumAmount: number;
  insuranceCompany?: string;
  remarks?: string;
  activateNow?: boolean;
}

export interface InsuranceMetrics {
  totalPolicies: number;
  activePolicies: number;
  expiringSoon: number;
  expired: number;
  totalPremiumSpent: number;
  averagePremium: number;
}

export interface StatutoryDocDetail {
  title: string;
  documentType: 'Insurance' | 'Fitness' | 'PUC' | 'Road Tax' | 'Permit';
  docNumber?: string | null;
  provider?: string | null;
  startDate?: string | null;
  expiryDate: string | null;
  docUrl?: string | null;
  status: StatutoryHealth;
  daysRemaining: number | null;
}

export interface VehicleComplianceRecord {
  vehicle: string;
  licensePlate: string;
  make: string;
  model: string;
  vehicleStatus: VehicleStatus;
  overallCompliance: StatutoryHealth;
  insurance: StatutoryDocDetail;
  fitness: StatutoryDocDetail;
  puc: StatutoryDocDetail;
  roadTax: StatutoryDocDetail;
  permit: StatutoryDocDetail;
  isTestRecord?: boolean;
}

export interface ComplianceMetrics {
  totalVehicles: number;
  fullyCompliant: number;
  expiringSoon: number;
  nonCompliant: number;
  insuranceExpired: number;
  fitnessExpired: number;
}

export interface UpdateComplianceInput {
  vehicle: string;
  documentType: 'Fitness' | 'PUC' | 'Road Tax' | 'Permit';
  expiryDate: string;
  docUrl?: string;
}

// ============================================================================
// PHASE 7: ALERTS, APPROVALS & ADMINISTRATION TYPES
// ============================================================================

export interface AlertMetrics {
  totalAlerts: number;
  unreadAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  resolvedAlerts: number;
  byCategory: Record<string, number>;
}

export type ApprovalDocType =
  | 'Mining Trip'
  | 'Fuel Log'
  | 'Vehicle Breakdown'
  | 'Operational Expense'
  | 'Purchase Order'
  | 'Vehicle Insurance Policy';

export interface ApprovalItem {
  id: string;
  doctype: ApprovalDocType;
  title: string;
  submitter: string;
  submissionDate: string;
  currentState: string;
  targetState?: string;
  allowedActions: string[];
  vehicle?: string | null;
  driver?: string | null;
  mineSite?: string | null;
  amount?: number | null;
  quantity?: number | null;
  urgency?: 'Critical' | 'High' | 'Medium' | 'Low';
  details?: Record<string, unknown>;
  canSelfApprove?: boolean;
  isCurrentUserOwner?: boolean;
}

export interface ApprovalMetrics {
  totalPending: number;
  pendingTrips: number;
  pendingFuel: number;
  pendingBreakdowns: number;
  pendingExpenses: number;
  pendingPurchases: number;
  pendingInsurance: number;
}

export interface ApprovalActionInput {
  doctype: ApprovalDocType;
  id: string;
  action: string;
  rejectionReason?: string;
  notes?: string;
}

export interface UserRosterItem {
  name: string;
  fullName: string;
  email: string;
  enabled: number;
  roles: string[];
  userType: string;
  creation: string;
  lastLogin?: string | null;
}

export interface RolePermissionItem {
  doctype: string;
  role: string;
  read: number;
  write: number;
  create: number;
  submit: number;
  cancel: number;
  report: number;
}

export interface FleetOperationalSettings {
  warning_window_days: number;
  reminder_intervals: string;
  notification_recipient_role: string;
  min_fuel_efficiency_kml: number;
  breakdown_escalation_hours: number;
  repeated_breakdown_threshold: number;
  enforce_insurance_on_dispatch: number;
  enforce_fitness_on_dispatch: number;
  enforce_puc_on_dispatch: number;
  enforce_road_tax_on_dispatch: number;
  enforce_permit_on_dispatch: number;
  enable_fleet_notifications: number;
  enable_in_app_notifications: number;
}

export interface SystemHealthStatus {
  backendStatus: 'healthy' | 'degraded' | 'down';
  backendLatencyMs: number;
  databaseStatus: 'healthy' | 'down';
  redisStatus: 'healthy' | 'down';
  frontendStatus: 'healthy';
  uptimeSeconds: number;
  activeJobs: number;
  timestamp: string;
  versions: {
    frappeFramework: string;
    erpnext: string;
    nextjs: string;
  };
}




// ==========================================
// PHASE 9: HRMS, DOCUMENTS & SHIFT ALLOCATION
// ==========================================

export type DriverDocumentCategory =
  | 'Driving License'
  | 'Driving Licence'
  | 'Medical Certificate'
  | 'Medical Fitness Certificate'
  | 'Aadhaar Card'
  | 'Aadhaar / Identity Proof'
  | 'Police Verification'
  | 'Eye Test Certificate'
  | 'Hazardous Material Certificate'
  | 'Background Verification'
  | 'Training Certificate'
  | 'Address Proof'
  | 'Other'
  | 'Other Documents';

export type VehicleDocumentCategory =
  | 'Registration Certificate (RC)'
  | 'Vehicle Registration Certificate (RC)'
  | 'Fitness Certificate'
  | 'Pollution Under Control (PUC)'
  | 'PUC Certificate'
  | 'National / State Permit'
  | 'Road Tax Token'
  | 'Road Tax Receipt'
  | 'Insurance Policy Document'
  | 'Insurance Policy'
  | 'Mining Pass / Entry Permit'
  | 'Vehicle Pollution Documents'
  | 'Other Statutory Documents'
  | 'Other Vehicle Documents'
  | 'Other';

export type DocumentVerificationStatus = 'Pending' | 'Verified' | 'Rejected';

export interface DriverDocument {
  id: string;
  driver: string;
  driverName?: string;
  documentCategory: DriverDocumentCategory | string;
  documentNumber?: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  issuingAuthority?: string | null;
  fileAttachment: string;
  fileName?: string;
  fileType?: string;
  verificationStatus: DocumentVerificationStatus;
  verifiedBy?: string | null;
  verificationDate?: string | null;
  rejectionReason?: string | null;
  remarks?: string | null;
  replacedDocument?: string | null;
  isActive: boolean;
  uploadedBy?: string | null;
  uploadDate?: string | null;
  isTestRecord: boolean;
}

export interface VehicleDocument {
  id: string;
  vehicle: string;
  licensePlate?: string;
  documentCategory: VehicleDocumentCategory | string;
  documentNumber?: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  issuingAuthority?: string | null;
  fileAttachment: string;
  fileName?: string;
  fileType?: string;
  verificationStatus: DocumentVerificationStatus;
  verifiedBy?: string | null;
  verificationDate?: string | null;
  rejectionReason?: string | null;
  remarks?: string | null;
  replacedDocument?: string | null;
  isActive: boolean;
  uploadedBy?: string | null;
  uploadDate?: string | null;
  isTestRecord: boolean;
}

export type ShiftTypeOption =
  | 'Morning (06:00 - 14:00)'
  | 'Afternoon (14:00 - 22:00)'
  | 'Evening (14:00 - 22:00)'
  | 'Night (22:00 - 06:00)'
  | 'General (09:00 - 18:00)'
  | 'General / Full Day';

export type ShiftAllocationStatus = 'Scheduled' | 'Active' | 'Completed' | 'Cancelled';

export interface VehicleDriverShiftAllocation {
  id: string;
  vehicle: string;
  licensePlate?: string;
  driver: string;
  driverName?: string;
  shiftType: ShiftTypeOption | string;
  allocationStart: string;
  allocationEnd?: string | null;
  status: ShiftAllocationStatus;
  isPrimary: boolean;
  remarks?: string | null;
  createdByUser?: string | null;
  isTestRecord: boolean;
}

export interface EmployeeProfile {
  id: string;
  employeeName: string;
  firstName: string;
  lastName?: string | null;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Left';
  gender?: string | null;
  dateOfBirth?: string | null;
  dateOfJoining?: string | null;
  cellNumber?: string | null;
  companyEmail?: string | null;
  personalEmail?: string | null;
  department?: string | null;
  designation?: string | null;
  branch?: string | null;
  reportsTo?: string | null;
  userId?: string | null;
  linkedDriverId?: string | null;
  image?: string | null;
}
