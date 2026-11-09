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
  Palette,
  Clock,
  LucideIcon
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  phase?: string;
  disabled?: boolean;
  roles?: string[]; // Allowed roles (undefined means all authenticated users)
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
  {
    title: 'Fleet Operations',
    items: [
      {
        name: 'Vehicle Management',
        href: '/vehicles',
        icon: Truck,
      },
      {
        name: 'Driver Roster',
        href: '/drivers',
        icon: UserCheck,
      },
      {
        name: 'Shift Allocations',
        href: '/shifts',
        icon: Clock,
      },
      {
        name: 'HRMS Personnel',
        href: '/employees',
        icon: Users,
      },
      {
        name: 'Mine Sites & Pits',
        href: '/mine-sites',
        icon: MapPin,
      },
      {
        name: 'Dispatch Operations',
        href: '/dispatch',
        icon: Compass,
      },
      {
        name: 'Mining Trips Ledger',
        href: '/trips',
        icon: Truck,
      },
      {
        name: 'Weighbridge Operations',
        href: '/weighbridge',
        icon: Scale,
      },
    ],
  },
  {
    title: 'Fuel & Workshop',
    items: [
      {
        name: 'Fuel Logs & Dispensation',
        href: '/fuel',
        icon: Fuel,
      },
      {
        name: 'Breakdown Incidents',
        href: '/breakdowns',
        icon: AlertTriangle,
      },
      {
        name: 'Workshop Maintenance',
        href: '/maintenance',
        icon: Wrench,
      },
      {
        name: 'Operating Expenses',
        href: '/expenses',
        icon: Receipt,
      },
    ],
  },
  {
    title: 'Inventory & Procurement',
    items: [
      {
        name: 'Spare Parts Catalog',
        href: '/spare-parts',
        icon: Package,
      },
      {
        name: 'Warehouses & Bins',
        href: '/warehouses',
        icon: Warehouse,
      },
      {
        name: 'Stock Movements',
        href: '/stock-movements',
        icon: ArrowLeftRight,
      },
      {
        name: 'Suppliers & Vendors',
        href: '/suppliers',
        icon: Users,
      },
      {
        name: 'Purchase Orders',
        href: '/purchases',
        icon: ShoppingCart,
      },
      {
        name: 'Inventory & Procurement Reports',
        href: '/procurement/reports',
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    title: 'Insurance & Regulatory',
    items: [
      {
        name: 'Insurance Policies',
        href: '/insurance',
        icon: Shield,
      },
      {
        name: 'Statutory Compliance',
        href: '/compliance',
        icon: ShieldCheck,
      },
      {
        name: 'Compliance Reports',
        href: '/compliance/reports',
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    title: 'Commercial & Analytics',
    items: [
      {
        name: 'Financial Dashboard',
        href: '/finance',
        icon: LayoutDashboard,
        roles: ['Fleet Manager', 'Accountant', 'Administrator'],
      },
      {
        name: 'Billed Revenue',
        href: '/revenue',
        icon: IndianRupee,
        roles: ['Fleet Manager', 'Accountant', 'Administrator'],
      },
      {
        name: 'Customer Collections',
        href: '/collections',
        icon: Receipt,
        roles: ['Fleet Manager', 'Accountant', 'Administrator'],
      },
      {
        name: 'Fleet Profitability',
        href: '/profitability',
        icon: TrendingUp,
        roles: ['Fleet Manager', 'Accountant', 'Administrator'],
      },
      {
        name: 'Finance & Analytics Reports',
        href: '/reports',
        icon: FileSpreadsheet,
        roles: ['Fleet Manager', 'Accountant', 'Administrator'],
      },
    ],
  },
  {
    title: 'Governance & Settings',
    items: [
      {
        name: 'Operational Alerts',
        href: '/alerts',
        icon: Bell,
      },
      {
        name: 'Approval Center',
        href: '/approvals',
        icon: CheckSquare,
      },
      {
        name: 'System Administration',
        href: '/admin',
        icon: Settings,
        roles: ['Fleet Manager', 'Administrator'],
      },
    ],
  },
];

