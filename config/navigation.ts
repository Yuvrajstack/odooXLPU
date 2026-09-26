import {
  LayoutDashboard,
  Package,
  Boxes,
  Layers,
  Warehouse,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";
import { UserRole } from "@/types";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  roles?: UserRole[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navigationConfig: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "INVENTORY",
    items: [
      {
        title: "Products",
        href: "/products",
        icon: Package,
      },
      {
        title: "Categories",
        href: "/products/categories",
        icon: Layers,
      },
      {
        title: "Stock Balances",
        href: "/inventory",
        icon: Boxes,
      },
      {
        title: "Warehouses",
        href: "/warehouses",
        icon: Warehouse,
      },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      {
        title: "Receipts",
        href: "/operations/receipts",
        icon: ArrowDownLeft,
      },
      {
        title: "Deliveries",
        href: "/operations/deliveries",
        icon: ArrowUpRight,
      },
      {
        title: "Transfers",
        href: "/operations/transfers",
        icon: ArrowLeftRight,
      },
      {
        title: "Adjustments",
        href: "/operations/adjustments",
        icon: SlidersHorizontal,
      },
      {
        title: "Stock Ledger",
        href: "/operations/ledger",
        icon: History,
      },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        roles: ["ADMIN"],
      },
    ],
  },
];
