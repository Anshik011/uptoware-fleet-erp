import {
  LayoutDashboard,
  Truck,
  UserCheck,
  MapPin,
  Compass,
  Scale,
  Fuel,
  Wrench,
  AlertTriangle,
  Receipt,
  Package,
  Warehouse,
  ArrowLeftRight,
  Users,
  ShoppingCart,
  Shield,
  ShieldCheck,
  IndianRupee,
  TrendingUp,
  FileSpreadsheet,
  Bell,
  CheckSquare,
  Settings,
  Clock,
  LucideIcon,
} from 'lucide-react';

export interface NavSubItem {
  name: string;
  href: string;
  roles?: string[];
  badge?: string;
}

export interface NavSubGroup {
  title: string; // e.g. "PURCHASES", "SALES"
  items: NavSubItem[];
}

export interface ClientNavSection {
  id: string;
  order: number;
  title: string; // e.g. "1. EMPLOYEE DATA"
  shortTitle: string; // "EMPLOYEE DATA"
  href: string;
  icon: LucideIcon;
  roles?: string[];
  groups?: NavSubGroup[]; // for multi-tier sections like SPARE PARTS REPORT
  items?: NavSubItem[]; // for direct sub-item sections
}

/**
 * CLIENT SPECIFICATION NAVIGATION HIERARCHY
 * Controlling Reference: client-requirements/69aa6e64-7a71-4d37-8d9a-511eff8e78ff.pdf (Pages 1 & 2)
 *
 * Strict Preservation of Exact Client Terminology, Ordering, and Hierarchy:
 * 1. EMPLOYEE DATA
 * 2. VEHICLE DATA
 * 3. TRIP REPORT
 * 4. LEAD REPORT
 * 5. SPARE PARTS REPORT (PURCHASES & SALES)
 * 6. STOCK REPORT
 * 7. EMP ATTENDANCE REPORT
 * 8. VEHICLE INCOME REPORT
 * 9. HSD ESCALATION/DE-ESCALATION
 */
export const clientNavigationSections: ClientNavSection[] = [
  {
    id: 'employee-data',
    order: 1,
    title: '1. EMPLOYEE DATA',
    shortTitle: 'EMPLOYEE DATA',
    href: '/employees',
    icon: Users,
    items: [
      { name: 'EMP HOME', href: '/employees?tab=directory' },
      { name: 'NEW EMP ADD', href: '/employees?action=new' },
      { name: 'ACTIVE EMP', href: '/employees?status=Active' },
      { name: 'EXIT EMP', href: '/employees?status=Left' },
    ],
  },
  {
    id: 'vehicle-data',
    order: 2,
    title: '2. VEHICLE DATA',
    shortTitle: 'VEHICLE DATA',
    href: '/vehicles',
    icon: Truck,
    items: [
      { name: 'VEHICLE HOME', href: '/vehicles' },
      { name: 'VEHICLE ENTRY', href: '/vehicles?action=new' },
      { name: 'VEHICLE REPORT', href: '/vehicles?view=report' },
      { name: 'WITHDRAW VEHICLES', href: '/vehicles?status=Withdrawn' },
    ],
  },
  {
    id: 'trip-report',
    order: 3,
    title: '3. TRIP REPORT',
    shortTitle: 'TRIP REPORT',
    href: '/trips',
    icon: Compass,
    items: [
      { name: 'TRIP HOME', href: '/trips' },
      { name: 'TRIP ENTRY', href: '/trips?action=new' },
      { name: 'SITE SUP TRIP ENTRY', href: '/trips?action=site_sup' },
      { name: 'TRIP REPORT', href: '/trips?view=report' },
    ],
  },
  {
    id: 'lead-report',
    order: 4,
    title: '4. LEAD REPORT',
    shortTitle: 'LEAD REPORT',
    href: '/leads',
    icon: MapPin,
    items: [
      { name: 'LEAD HOME', href: '/leads?tab=home' },
      { name: 'LEAD ENTRY', href: '/leads?action=new' },
      { name: 'LEAD REPORT', href: '/leads?tab=report' },
    ],
  },
  {
    id: 'spare-parts-report',
    order: 5,
    title: '5. SPARE PARTS REPORT',
    shortTitle: 'SPARE PARTS REPORT',
    href: '/spare-parts',
    icon: Package,
    groups: [
      {
        title: 'PURCHASES',
        items: [
          { name: 'HOME', href: '/purchases' },
          { name: 'SPARE PARTS ENTRY', href: '/purchases?action=new' },
          { name: 'SPARE PARTS REPORT', href: '/purchases?view=report' },
          { name: 'VENDOR ENTRY', href: '/suppliers?action=new' },
          { name: 'VENDOR REPORT', href: '/suppliers' },
        ],
      },
      {
        title: 'SALES',
        items: [
          { name: 'HOME', href: '/sales' },
          { name: 'SALE ENTRY', href: '/sales?action=new' },
          { name: 'SALE PARTS REPORT', href: '/sales?view=report' },
        ],
      },
    ],
  },
  {
    id: 'stock-report',
    order: 6,
    title: '6. STOCK REPORT',
    shortTitle: 'STOCK REPORT',
    href: '/spare-parts',
    icon: Warehouse,
    items: [
      { name: 'STOCK HOME', href: '/spare-parts' },
      { name: 'STOCK REPORT', href: '/stock-movements' },
      { name: 'STOCK ADJUSTMENT', href: '/spare-parts?action=adjust' },
    ],
  },
  {
    id: 'emp-attendance-report',
    order: 7,
    title: '7. EMP ATTENDANCE REPORT',
    shortTitle: 'EMP ATTENDANCE REPORT',
    href: '/employees?tab=roster',
    icon: UserCheck,
    items: [
      { name: 'HOME', href: '/employees?tab=directory' },
      { name: 'ATTENDANCE ENTRY', href: '/employees?tab=roster' },
      { name: 'ATTENDANCE SUMMARY', href: '/employees?tab=summary' },
    ],
  },
  {
    id: 'vehicle-income-report',
    order: 8,
    title: '8. VEHICLE INCOME REPORT',
    shortTitle: 'VEHICLE INCOME REPORT',
    href: '/reports?report=Vehicle+Earning+Summary+Report',
    icon: IndianRupee,
    items: [
      { name: 'VEHICLE EARNING REPORT', href: '/reports?report=Vehicle+Earning+Summary+Report' },
    ],
  },
  {
    id: 'hsd-escalation',
    order: 9,
    title: '9. HSD ESCALATION/DE-ESCALATION',
    shortTitle: 'HSD ESCALATION/DE-ESCALATION',
    href: '/fuel/average',
    icon: Fuel,
    items: [
      { name: 'HSD AVERAGE MENU', href: '/fuel/average' },
      { name: 'HSD ESCALATION/DE-ESCALATION REPORT', href: '/reports?report=HSD+Fuel+Price+Escalation+Report' },
    ],
  },
];

/**
 * TECHNICAL & WORKSHOP ADMINISTRATION
 * Segregated strictly from client operational navigation to preserve compliance.
 */
export const administrationNavSection = {
  title: '10. TECHNICAL & WORKSHOP CONTROLS',
  roles: ['Fleet Manager', 'Workshop Supervisor', 'Accountant', 'Administrator'],
  items: [
    { name: 'Mine Sites & Pits', href: '/mine-sites', icon: MapPin },
    { name: 'Shift Allocations', href: '/shifts', icon: Clock },
    { name: 'Weighbridge Scale', href: '/weighbridge', icon: Scale },
    { name: 'Fuel Logs & Dispensation', href: '/fuel', icon: Fuel },
    { name: 'Breakdown Incidents', href: '/breakdowns', icon: AlertTriangle },
    { name: 'Workshop Maintenance', href: '/maintenance', icon: Wrench },
    { name: 'Operating Expenses', href: '/expenses', icon: Receipt },
    { name: 'Insurance Policies', href: '/insurance', icon: Shield },
    { name: 'Statutory Compliance', href: '/compliance', icon: ShieldCheck },
    { name: 'Approval Center', href: '/approvals', icon: CheckSquare },
    { name: 'Operational Alerts', href: '/alerts', icon: Bell },
    { name: 'Data Import Hub', href: '/import', icon: FileSpreadsheet },
    { name: 'System Settings', href: '/admin', icon: Settings },
  ],
};

// Backwards compatibility interface for any components referencing NavSection
export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  phase?: string;
  disabled?: boolean;
  roles?: string[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navigationSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        name: 'Fleet Dashboard',
        href: '/',
        icon: LayoutDashboard,
      },
    ],
  },
];
