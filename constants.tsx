// This file can be used for application-wide constants.
import { UserRole } from './types';
import {
  LayoutDashboard, ShoppingCart, History, Wallet, TrendingUp, PackagePlus, PackageCheck,
  Users, Settings, LogOut, Menu, X, UserCog, Bot, Award, Layers, Sparkles, Home, Building2,
  Package, Send
} from 'lucide-react';

export const PLANT_LOCATION_ID = '00000000-0000-0000-0000-000000000000';

export const menuItems = [
    // Main Links
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: [UserRole.PLANT_ADMIN, UserRole.ASM, UserRole.EXECUTIVE, UserRole.STORE_ADMIN, UserRole.USER], group: 'main' },
    { name: 'Onboard Distributor', path: '/distributors/new', icon: PackagePlus, roles: [UserRole.PLANT_ADMIN, UserRole.ASM, UserRole.EXECUTIVE, UserRole.STORE_ADMIN], group: 'main' },
    { name: 'Place Order', path: '/place-order', icon: ShoppingCart, roles: [UserRole.PLANT_ADMIN, UserRole.ASM, UserRole.EXECUTIVE, UserRole.STORE_ADMIN], group: 'main' },
    { name: 'Order History', path: '/order-history', icon: History, roles: [UserRole.PLANT_ADMIN, UserRole.ASM, UserRole.EXECUTIVE, UserRole.STORE_ADMIN, UserRole.USER], group: 'main' },
    { name: 'Recharge Wallet', path: '/recharge-wallet', icon: Wallet, roles: [UserRole.PLANT_ADMIN, UserRole.ASM, UserRole.EXECUTIVE, UserRole.STORE_ADMIN, UserRole.USER], group: 'main' },
    { name: 'Confirm Returns', path: '/confirm-returns', icon: PackageCheck, roles: [UserRole.PLANT_ADMIN, UserRole.ASM, UserRole.STORE_ADMIN], group: 'main' },
    { name: 'Sales Reports', path: '/sales', icon: TrendingUp, roles: [UserRole.PLANT_ADMIN, UserRole.ASM, UserRole.EXECUTIVE, UserRole.STORE_ADMIN, UserRole.USER], group: 'main' },
    { name: 'CEO Insights', path: '/ceo-insights', icon: Bot, roles: [UserRole.PLANT_ADMIN], group: 'main' },
    { name: 'Distributor Scorecard', path: '/distributor-scorecard', icon: Award, roles: [UserRole.PLANT_ADMIN, UserRole.EXECUTIVE], group: 'main' },
    // Management Links
    { name: 'Central Stock', path: '/stock/central', icon: Package, roles: [UserRole.PLANT_ADMIN], group: 'management', portal: 'plant' },
    { name: 'Store Stock', path: '/stock/store', icon: Package, roles: [UserRole.STORE_ADMIN, UserRole.USER], group: 'management', portal: 'store' },
    { name: 'Central Wallet', path: '/wallet/central', icon: Wallet, roles: [UserRole.PLANT_ADMIN], group: 'management', portal: 'plant' },
    { name: 'Manage Products', path: '/products/manage', icon: Layers, roles: [UserRole.PLANT_ADMIN], group: 'management' },
    { name: 'Manage Schemes', path: '/schemes/manage', icon: Sparkles, roles: [UserRole.PLANT_ADMIN], group: 'management' },
    { name: 'Scheme History', path: '/schemes/history', icon: History, roles: [UserRole.PLANT_ADMIN], group: 'management' },
    { name: 'Manage Price Tiers', path: '/price-tiers/manage', icon: Layers, roles: [UserRole.PLANT_ADMIN], group: 'management' },
    { name: 'Special Assignments', path: '/special-assignments', icon: Layers, roles: [UserRole.PLANT_ADMIN], group: 'management' },
    { name: 'Manage Users', path: '/users/manage', icon: UserCog, roles: [UserRole.PLANT_ADMIN], group: 'management' },
    { name: 'Manage Stores', path: '/stores/manage', icon: Building2, roles: [UserRole.PLANT_ADMIN], group: 'management' },
];

export const assignableMenuItems = menuItems;