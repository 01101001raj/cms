
import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import {
    Settings, LogOut, Menu, X, Home, Building2
} from 'lucide-react';
import NotificationDropdown from './common/NotificationDropdown';
import RefreshPermissions from './RefreshPermissions';

import { menuItems } from '../constants';

const Sidebar: React.FC<{ isOpen: boolean; closeSidebar: () => void; }> = ({ isOpen, closeSidebar }) => {
    const { currentUser, portal } = useAuth();

    // Modern Sidebar Styles - Premium Dark Theme
    const activeClassName = "bg-white/10 text-white shadow-lg backdrop-blur-sm border-r-4 border-primary";
    const inactiveClassName = "text-slate-400 hover:text-white hover:bg-white/5";

    const renderLink = (link: any) => {
        if (!currentUser?.permissions) return null;
        if (link.portal && portal?.type !== link.portal) return null;
        if (!currentUser.permissions.includes(link.path)) return null;

        return (
            <NavLink
                key={link.name}
                to={link.path}
                onClick={closeSidebar}
                className={({ isActive }) => `
                    group flex items-center px-4 py-3 mx-3 my-1 rounded-xl text-[0.9rem] font-medium transition-all duration-300 ease-out
                    ${isActive ? activeClassName : inactiveClassName}
                `}
            >
                {({ isActive }) => (
                    <>
                        <link.icon
                            size={20}
                            strokeWidth={isActive ? 2 : 1.5}
                            className={`mr-3 transition-colors duration-300 ${isActive ? 'text-primaryLight drop-shadow-md' : 'text-slate-500 group-hover:text-white'}`}
                        />
                        <span className="tracking-wide">{link.name}</span>
                        {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primaryLight shadow-[0_0_8px_rgba(224,231,255,0.6)]" />}
                    </>
                )}
            </NavLink>
        );
    };

    return (
        <aside className={`
            fixed top-0 left-0 z-40 w-72 h-screen 
            bg-[#0f172a] 
            border-r border-slate-800
            transition-transform duration-300 ease-out 
            md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
            flex flex-col shadow-2xl
        `}>
            {/* Sidebar Header */}
            <div className="flex flex-col justify-center h-auto py-6 px-8 border-b border-slate-800/50 bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-start">
                        <img src="/logo.png" alt="NRICH Logo" className="h-20 w-auto object-contain mb-1" />
                        <span className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase ml-1">Enterprise Edition</span>
                    </div>
                </div>
                <button onClick={closeSidebar} className="md:hidden absolute top-6 right-6 p-2 text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Scrollable Nav */}
            <nav className="flex-1 overflow-y-auto py-6 space-y-8 custom-scrollbar scroll-smooth">
                <div>
                    <div className="px-7 mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Main Menu</div>
                    <div className="space-y-0.5">
                        {menuItems.filter(l => l.group === 'main').map(renderLink)}
                    </div>
                </div>

                <div>
                    <div className="px-7 mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Management & Settings</div>
                    <div className="space-y-0.5">
                        {menuItems.filter(l => l.group === 'management').map(renderLink)}
                    </div>
                </div>
            </nav>

            {/* Sidebar Footer */}
            <div className="p-6 border-t border-slate-800/50 bg-slate-900/30">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                        {currentUser?.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-slate-200 truncate">{currentUser?.username}</span>
                        <span className="text-[10px] text-slate-500 truncate capitalize">{currentUser?.role?.replace('_', ' ').toLowerCase()}</span>
                    </div>
                </div>
            </div>
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
                            {portal.type === 'plant' ? <Home size={16} className="text-primary" /> : <Building2 size={16} className="text-primary" />}
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
        <div className="flex min-h-screen bg-background font-sans text-content selection:bg-primary/20">
            <div className="print:hidden">
                <Sidebar isOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
            </div>

            <div className={`flex-1 flex flex-col min-w-0 md:pl-72 transition-all duration-300 print:pl-0`}>
                <div className="print:hidden">
                    <Header openSidebar={() => setIsSidebarOpen(true)} />
                </div>
                <main className="flex-1 p-4 md:p-8 overflow-x-hidden print:p-0 print:overflow-visible">
                    <div className="page-container animate-fade-in print:w-full print:max-w-none">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
