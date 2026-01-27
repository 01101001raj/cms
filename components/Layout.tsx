
import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import {
    Settings, LogOut, Menu, Home, Building2, User
} from 'lucide-react';
import NotificationDropdown from './common/NotificationDropdown';
import { menuItems } from '../constants';

// Shadcn Components
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const SidebarContent: React.FC<{ closeSidebar?: () => void }> = ({ closeSidebar }) => {
    const { currentUser, portal } = useAuth();

    // Modern Sidebar Styles - Premium Dark Theme
    const activeClassName = "bg-primary text-primary-foreground shadow-md ring-1 ring-white/10";
    const inactiveClassName = "text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200";

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
                    group flex items-center px-3 py-2.5 mx-3 my-1 rounded-md text-sm font-medium transition-all duration-200
                    ${isActive ? activeClassName : inactiveClassName}
                `}
            >
                {({ isActive }) => (
                    <>
                        <link.icon
                            size={18}
                            className={`mr-3 transition-colors duration-200 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'}`}
                        />
                        <span>{link.name}</span>
                    </>
                )}
            </NavLink>
        );
    };

    return (
        <div className="flex flex-col h-full bg-card/95 backdrop-blur-xl border-r border-border shadow-2xl relative overflow-hidden">
            {/* Gradient Overlay for Depth */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

            {/* Sidebar Header */}
            <div className="relative flex flex-col h-auto py-8 px-6 border-b border-border/50 items-center justify-center">
                <div className="flex flex-col items-center justify-center text-center">
                    <span className="font-bold text-2xl tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">NRICH</span>
                    <span className="text-[10px] text-muted-foreground font-semibold tracking-[0.3em] uppercase mt-1">Enterprise</span>
                </div>
            </div>

            {/* Scrollable Nav */}
            <ScrollArea className="flex-1 py-6">
                <div className="px-3 mb-8">
                    <h4 className="mb-3 px-4 text-[11px] font-bold text-muted-foreground/70 tracking-widest uppercase">Main Menu</h4>
                    <div className="space-y-1">
                        {menuItems.filter(l => l.group === 'main').map(renderLink)}
                    </div>
                </div>

                <div className="px-3">
                    <h4 className="mb-3 px-4 text-[11px] font-bold text-muted-foreground/70 tracking-widest uppercase">Management</h4>
                    <div className="space-y-1">
                        {menuItems.filter(l => l.group === 'management').map(renderLink)}
                    </div>
                </div>
            </ScrollArea>

            {/* Sidebar Footer */}
            <div className="relative p-4 border-t border-border/50 bg-accent/20">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer">
                    <Avatar className="h-10 w-10 border-2 border-background ring-1 ring-border shadow-sm">
                        <AvatarImage src={`https://ui-avatars.com/api/?name=${currentUser?.username}&background=0D8ABC&color=fff`} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {currentUser?.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{currentUser?.username}</span>
                        <span className="text-[11px] text-muted-foreground truncate capitalize">{currentUser?.role?.replace('_', ' ').toLowerCase()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Header: React.FC = () => {
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
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border h-16 w-full shadow-sm transition-all duration-300">
            <div className="flex items-center justify-between h-full px-4 md:px-8 max-w-[1600px] mx-auto">
                <div className="flex items-center gap-4">
                    <Sheet>
                        <SheetTrigger asChild>
                            <button className="md:hidden p-2.5 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                                <Menu size={20} />
                            </button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-80 border-r border-border">
                            <SidebarContent />
                        </SheetContent>
                    </Sheet>

                    <div className="hidden md:block">
                        {portal && (
                            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-accent/40 border border-border/60 text-sm shadow-sm hover:bg-accent/60 transition-colors">
                                {portal.type === 'plant' ? <Home size={15} className="text-primary" /> : <Building2 size={15} className="text-primary" />}
                                <span className="font-semibold text-foreground/90">{portal.name}</span>
                                {currentUser?.role === UserRole.PLANT_ADMIN && (
                                    <>
                                        <Separator orientation="vertical" className="h-3.5 mx-1.5 bg-border/80" />
                                        <button onClick={handlePortalChange} className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors hover:underline">Switch</button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-5">
                    <NotificationDropdown />

                    <div className="h-6 w-px bg-border/60 hidden md:block" />

                    <div className="relative group">
                        <button className="flex items-center gap-3 p-1.5 pr-2 rounded-full hover:bg-accent/50 transition-all duration-300 border border-transparent hover:border-border/50 outline-none focus:ring-2 focus:ring-primary/20">
                            <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
                                <AvatarImage src={`https://ui-avatars.com/api/?name=${currentUser?.username}&background=random`} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{currentUser?.username.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="hidden md:flex flex-col items-start leading-none mr-1">
                                <p className="text-sm font-semibold text-foreground/90">{currentUser?.username}</p>
                            </div>
                        </button>

                        <div className="absolute right-0 top-[calc(100%+0.5rem)] w-56 bg-card rounded-xl shadow-xl border border-border/60 overflow-hidden z-50 hidden group-hover:block animate-in fade-in slide-in-from-top-2">
                            <div className="p-3 bg-accent/20 border-b border-border/50">
                                <p className="text-sm font-semibold text-foreground">{currentUser?.username}</p>
                                <p className="text-xs text-muted-foreground capitalize mt-0.5">{currentUser?.role?.replace('_', ' ').toLowerCase()}</p>
                            </div>
                            <div className="p-1.5">
                                <NavLink to="/settings" className="flex items-center w-full px-3 py-2.5 text-sm text-foreground/80 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors">
                                    <Settings size={16} className="mr-2.5 text-muted-foreground" /> Settings
                                </NavLink>
                                <button onClick={handleLogout} className="flex items-center w-full px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors">
                                    <LogOut size={16} className="mr-2.5" /> Log out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

const Layout: React.FC = () => {
    return (
        <div className="flex min-h-screen bg-background font-sans text-foreground selection:bg-primary/20 selection:text-primary">
            {/* Desktop Sidebar */}
            <aside className="hidden md:block w-72 h-screen fixed left-0 top-0 z-40 shadow-xl border-r border-border bg-card">
                <SidebarContent />
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 md:pl-72 transition-all duration-300">
                <Header />
                <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-x-hidden bg-muted/20">
                    <div className="mx-auto max-w-[1600px] animate-fade-in space-y-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
