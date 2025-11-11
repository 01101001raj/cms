import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Notification, NotificationType } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import { Bell, Wallet, Package, Sparkles, UserPlus, XCircle, Check } from 'lucide-react';

const NOTIFICATION_ICONS: Record<NotificationType, React.ReactElement> = {
    [NotificationType.WALLET_LOW]: <Wallet className="text-contentSecondary" />,
    [NotificationType.ORDER_PLACED]: <Package className="text-contentSecondary" />,
    [NotificationType.ORDER_FAILED]: <XCircle className="text-red-500" />,
    [NotificationType.NEW_SCHEME]: <Sparkles className="text-contentSecondary" />,
    [NotificationType.DISTRIBUTOR_ADDED]: <UserPlus className="text-contentSecondary" />,
};

const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleMarkAllAsRead = async () => {
        await api.markAllNotificationsAsRead();
        fetchNotifications();
    };

    const handleMarkAsRead = async (id: string) => {
        await api.markNotificationAsRead(id);
        fetchNotifications();
    };

    const filteredNotifications = notifications.filter(n => filter === 'all' || !n.isRead);

    const timeSince = (date: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    };

    return (
        <Card>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold">Notifications</h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                     <div className="flex gap-1 p-1 bg-background rounded-lg border border-border">
                        <Button variant={filter === 'all' ? 'primary' : 'secondary'} size="sm" onClick={() => setFilter('all')} className={`w-1/2 ${filter !== 'all' ? '!bg-transparent border-none shadow-none !text-contentSecondary hover:!bg-slate-200' : 'shadow'}`}>All</Button>
                        <Button variant={filter === 'unread' ? 'primary' : 'secondary'} size="sm" onClick={() => setFilter('unread')} className={`w-1/2 ${filter !== 'unread' ? '!bg-transparent border-none shadow-none !text-contentSecondary hover:!bg-slate-200' : 'shadow'}`}>Unread</Button>
                    </div>
                    <Button onClick={handleMarkAllAsRead} variant="secondary" size="sm" disabled={notifications.every(n => n.isRead)}>
                        <Check size={14}/> Mark all as read
                    </Button>
                </div>
            </div>
            {loading ? (
                <div className="text-center p-8">Loading notifications...</div>
            ) : (
                <div className="space-y-3">
                    {filteredNotifications.length > 0 ? filteredNotifications.map(notification => (
                        <div key={notification.id} className={`flex items-start p-4 rounded-lg transition-colors ${notification.isRead ? 'bg-background' : 'bg-white border-2 border-primary/20'}`}>
                            <div className="flex-shrink-0 mr-4 mt-1">
                                {NOTIFICATION_ICONS[notification.type]}
                            </div>
                            <div className="flex-grow">
                                <p className={`text-sm ${!notification.isRead ? 'font-semibold text-content' : 'text-contentSecondary'}`}>{notification.message}</p>
                                <p className="text-xs text-contentSecondary mt-1">{timeSince(notification.date)}</p>
                            </div>
                            {!notification.isRead && (
                                <button title="Mark as read" onClick={() => handleMarkAsRead(notification.id)} className="ml-4 p-1 rounded-full hover:bg-slate-200">
                                    <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>
                                </button>
                            )}
                        </div>
                    )) : (
                        <p className="text-center p-8 text-contentSecondary">No notifications to display.</p>
                    )}
                </div>
            )}
        </Card>
    );
};

export default NotificationsPage;
