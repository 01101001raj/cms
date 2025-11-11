
import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import {
  Settings, LogOut, Menu, X, Home, Building2
} from 'lucide-react';
import NotificationDropdown from './common/NotificationDropdown';
import { menuItems } from '../constants';

const Sidebar: React.FC<{ isOpen: boolean; closeSidebar: () => void; }> = ({ isOpen, closeSidebar }) => {
    const { currentUser, portal } = useAuth();
    const activeClassName = "bg-primary/10 text-primary border-r-4 border-primary";
    const inactiveClassName = "text-contentSecondary hover:bg-slate-100";

    const renderLink = (link: any) => {
        if (!currentUser?.permissions) return null;
        
        // If a portal type is specified for the link, check it matches the current portal
        if (link.portal && portal?.type !== link.portal) return null;

        const hasAccess = currentUser.permissions.includes(link.path);

        if (!hasAccess) return null;


        return (
            <NavLink
                key={link.name}
                to={link.path}
                onClick={closeSidebar}
                className={({ isActive }) => `flex items-center px-4 py-3 text-sm font-medium transition-colors ${isActive ? activeClassName : inactiveClassName}`}
            >
                <link.icon size={18} className="mr-3" />
                {link.name}
            </NavLink>
        );
    };

    return (
        <aside className={`fixed top-0 left-0 z-40 w-64 h-screen bg-card border-r border-border transition-transform md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
            <div className="flex items-center justify-between h-16 px-4 border-b flex-shrink-0">
                <h1 className="text-xl font-bold text-primary">Distributor Portal</h1>
                <button onClick={closeSidebar} className="md:hidden p-1">
                    <X size={20} />
                </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4">
                {menuItems.filter(l => l.group === 'main').map(renderLink)}
                <div className="px-4 mt-4 mb-2 text-xs font-semibold uppercase text-contentSecondary">Management</div>
                {menuItems.filter(l => l.group === 'management').map(renderLink)}
            </nav>
        </aside>
    );
};

const Header: React.FC<{ openSidebar: () => void; }> = ({ openSidebar }) => {
    const { currentUser, logout, portal, setPortal } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };
    
    const handlePortalChange = () => {
        setPortal(null);
        navigate('/select-portal');
    };

    return (
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-sm border-b border-border h-16">
            <div className="flex items-center justify-between h-full px-4 md:px-6">
                <button onClick={openSidebar} className="md:hidden p-1">
                    <Menu size={24} />
                </button>
                <div className="hidden md:block">
                    {portal && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border text-sm">
                            {portal.type === 'plant' ? <Home size={16} className="text-primary"/> : <Building2 size={16} className="text-primary"/>}
                            <span className="font-semibold">{portal.name}</span>
                            {currentUser?.role === UserRole.PLANT_ADMIN && (
                                <button onClick={handlePortalChange} className="text-xs text-primary hover:underline ml-2"> (change)</button>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex items-center space-x-4">
                    <NotificationDropdown />
                    <div className="relative group pb-2">
                        <button className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                                {currentUser?.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="hidden md:block text-left">
                                <p className="text-sm font-semibold">{currentUser?.username}</p>
                                <p className="text-xs text-contentSecondary">{currentUser?.role}</p>
                            </div>
                        </button>
                        <div className="absolute right-0 mt-2 w-48 bg-card rounded-md shadow-lg z-10 hidden group-hover:block border border-border">
                            <NavLink to="/settings" className="block px-4 py-2 text-sm text-contentSecondary hover:bg-slate-100">
                                <Settings size={14} className="inline mr-2" /> Settings
                            </NavLink>
                            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                <LogOut size={14} className="inline mr-2" /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

const Layout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen">
            <Sidebar isOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
            <div className="flex-1 flex flex-col md:ml-64">
                <Header openSidebar={() => setIsSidebarOpen(true)} />
                <main className="flex-1 p-4 md:p-6 bg-background">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
