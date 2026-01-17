
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { User, UserRole, Store } from '../types';
import { useAuth } from '../hooks/useAuth';
import Card from './common/Card';
import Button from './common/Button';
import { PlusCircle, Edit, Trash2, XCircle, UserCog, Save, CheckCircle, KeyRound, ChevronDown, ChevronRight } from 'lucide-react';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import Input from './common/Input';
import Select from './common/Select';
import { assignableMenuItems } from '../constants';
import Loader from './common/Loader';


const UserModal: React.FC<{ user: User | null, onClose: () => void, onSave: () => void, stores: Store[], allUsers: User[] }> = ({ user, onClose, onSave, stores, allUsers }) => {
    const { currentUser } = useAuth();
    const { register, handleSubmit, formState: { errors, isValid }, watch, control } = useForm<User>({
        mode: 'onBlur',
        defaultValues: {
            username: user?.username || '',
            role: user?.role || UserRole.USER,
            storeId: user?.storeId || '',
            permissions: user?.permissions || [],
            asmId: user?.asmId || '',
        },
    });
    const watchedRole = watch('role');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const asms = allUsers.filter(u => u.role === UserRole.ASM);

    const onFormSubmit: SubmitHandler<User> = async (data) => {
        if (!currentUser) return;
        setLoading(true);
        setError(null);
        try {
            if (user) { // Editing
                await api.updateUser({ ...user, ...data }, currentUser.role);
            } else { // Creating
                if (!data.password) {
                    setError("Password is required for new users.");
                    setLoading(false);
                    return;
                }
                await api.addUser(data, currentUser.role);
            }
            onSave();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save user.");
        } finally {
            setLoading(false);
        }
    };

    const availableRoles = () => {
        if (currentUser?.role === UserRole.PLANT_ADMIN) {
            return Object.values(UserRole);
        }
        if (currentUser?.role === UserRole.STORE_ADMIN) {
            return [UserRole.EXECUTIVE, UserRole.USER];
        }
        return [];
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">{user ? 'Edit' : 'Create'} User</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-background"><XCircle /></button>
                </div>
                <form onSubmit={handleSubmit(onFormSubmit)}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <Input
                            label="Username / Email"
                            {...register('username', { required: "Username is required" })}
                            error={errors.username?.message}
                        />
                        <Input
                            label={user ? "New Password (optional)" : "Password"}
                            type="password"
                            {...register('password', {
                                required: !user ? "Password is required for new users." : false,
                                minLength: { value: 6, message: "Password must be at least 6 characters" }
                            })}
                            error={errors.password?.message}
                        />
                        <Select
                            label="Role"
                            {...register('role', { required: "Role is required" })}
                            defaultValue={user?.role}
                            error={errors.role?.message}
                        >
                            {availableRoles().map(role => <option key={role} value={role}>{role}</option>)}
                        </Select>

                        {watchedRole === UserRole.EXECUTIVE && (
                            <Select
                                label="Reports to ASM"
                                {...register('asmId')}
                                defaultValue={user?.asmId}
                            >
                                <option value="">-- Select ASM --</option>
                                {asms.map(asm => <option key={asm.id} value={asm.id}>{asm.username}</option>)}
                            </Select>
                        )}


                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-contentSecondary">Menu Permissions</label>
                            <div className="p-3 border rounded-lg max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50">
                                <Controller
                                    name="permissions"
                                    control={control}
                                    render={({ field }) => (
                                        <>
                                            {assignableMenuItems.map(item => (
                                                <div key={item.path} className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id={`perm-${item.path}`}
                                                        checked={field.value?.includes(item.path)}
                                                        onChange={e => {
                                                            const newPermissions = e.target.checked
                                                                ? [...(field.value || []), item.path]
                                                                : (field.value || []).filter(p => p !== item.path);
                                                            field.onChange(newPermissions);
                                                        }}
                                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                    <label htmlFor={`perm-${item.path}`} className="ml-2 block text-sm text-content">
                                                        {item.name}
                                                    </label>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                />
                            </div>
                        </div>

                        {currentUser?.role === UserRole.PLANT_ADMIN && (
                            <Select
                                label="Assign to Store (optional)"
                                {...register('storeId')}
                                defaultValue={user?.storeId}
                            >
                                <option value="">None (Plant-level)</option>
                                {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                            </Select>
                        )}

                        {error && <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">{error}</div>}
                    </div>
                    <div className="p-4 bg-background border-t flex justify-end gap-4">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" isLoading={loading} disabled={!isValid}>
                            <Save size={16} /> {user ? 'Save Changes' : 'Create User'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const UserManagementPage: React.FC = () => {
    const { currentUser, portal } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [expandedAsms, setExpandedAsms] = useState<Set<string>>(new Set());

    const fetchUsersAndStores = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [userData, storeData] = await Promise.all([
                api.getUsers(portal),
                api.getStores()
            ]);
            setUsers(userData);
            setStores(storeData);
        } catch (err) {
            setError("Failed to fetch user data.");
        } finally {
            setLoading(false);
        }
    }, [portal]);

    useEffect(() => {
        fetchUsersAndStores();
    }, [fetchUsersAndStores]);

    const handleAddNew = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const canManageUser = (targetUser: User): boolean => {
        if (!currentUser) return false;
        if (currentUser.role === UserRole.PLANT_ADMIN) {
            return currentUser.id !== targetUser.id;
        }
        if (currentUser.role === UserRole.STORE_ADMIN) {
            return (targetUser.role === UserRole.EXECUTIVE || targetUser.role === UserRole.USER) &&
                targetUser.storeId === currentUser.storeId;
        }
        return false;
    };


    const handleDelete = async (user: User) => {
        if (!currentUser) return;
        if (window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
            setError(null);
            try {
                await api.deleteUser(user.id, currentUser.id, currentUser.role);
                fetchUsersAndStores();
            } catch (err) {
                setError(err instanceof Error ? err.message : "An unknown error occurred while deleting.");
            }
        }
    };

    const handleSendResetEmail = async (user: User) => {
        setStatusMessage(null);
        if (!window.confirm(`Are you sure you want to send a password reset link to ${user.username}?`)) {
            return;
        }
        try {
            await api.sendPasswordReset(user.username);
            setStatusMessage({ type: 'success', text: `Password reset instructions sent to ${user.username}.` });
            setTimeout(() => setStatusMessage(null), 5000);
        } catch (err) {
            setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : "An unknown error occurred." });
        }
    };

    const handleSave = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        fetchUsersAndStores();
    };

    const getStoreName = (storeId?: string) => {
        if (!storeId) return 'Plant';
        return stores.find(s => s.id === storeId)?.name || 'Unknown Store';
    };

    const toggleAsmExpand = (asmId: string) => {
        setExpandedAsms(prev => {
            const newSet = new Set(prev);
            if (newSet.has(asmId)) {
                newSet.delete(asmId);
            } else {
                newSet.add(asmId);
            }
            return newSet;
        });
    };

    const { asmGroups, otherUsers, asmUserMap } = useMemo(() => {
        const asms = users.filter(u => u.role === UserRole.ASM).sort((a, b) => a.username.localeCompare(b.username));
        const executives = users.filter(u => u.role === UserRole.EXECUTIVE);
        const other = users.filter(u => u.role !== UserRole.ASM && u.role !== UserRole.EXECUTIVE);
        const asmMap = new Map(asms.map(u => [u.id, u.username]));

        const groups = asms.map(asm => ({
            asm,
            executives: executives.filter(exec => exec.asmId === asm.id).sort((a, b) => a.username.localeCompare(b.username))
        }));

        const assignedExecIds = new Set(groups.flatMap(g => g.executives.map(e => e.id)));
        const unassignedExecutives = executives.filter(exec => !assignedExecIds.has(exec.id));

        return {
            asmGroups: groups,
            otherUsers: [...other, ...unassignedExecutives].sort((a, b) => a.username.localeCompare(b.username)),
            asmUserMap: asmMap,
        };
    }, [users]);

    if (!currentUser?.permissions?.includes('/users/manage')) {
        return (
            <Card className="text-center">
                <p className="text-contentSecondary">You do not have permission to manage users.</p>
            </Card>
        );
    }

    const UserRow: React.FC<{ user: User, isSubRow?: boolean }> = ({ user, isSubRow = false }) => (
        <tr className={`border-b last:border-0 ${isSubRow ? 'bg-slate-50' : 'bg-white'} hover:bg-blue-50`}>
            <td className={`p-3 font-semibold ${isSubRow ? 'pl-12' : ''}`}>{user.username}</td>
            <td className="p-3">{user.role}</td>
            <td className="p-3">
                {user.role === UserRole.EXECUTIVE && user.asmId ?
                    `Reports to ${asmUserMap.get(user.asmId) || 'N/A'}` :
                    getStoreName(user.storeId)
                }
            </td>
            <td className="p-3 text-right space-x-2">
                <Button onClick={() => handleSendResetEmail(user)} variant="secondary" size="sm" disabled={!canManageUser(user)} title="Send Password Reset"><KeyRound size={14} /></Button>
                <Button onClick={() => handleEdit(user)} variant="secondary" size="sm" disabled={!canManageUser(user)}><Edit size={14} /></Button>
                <Button onClick={() => handleDelete(user)} variant="danger" size="sm" disabled={!canManageUser(user)}><Trash2 size={14} /></Button>
            </td>
        </tr>
    );

    return (
        <div className="space-y-6">
            {statusMessage && (
                <div className={`flex items-center p-3 rounded-lg text-sm ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {statusMessage.type === 'success' ? <CheckCircle className="mr-2" /> : <XCircle className="mr-2" />}
                    {statusMessage.text}
                </div>
            )}
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-2xl font-bold">Manage Users</h2>
                    <Button onClick={handleAddNew} className="w-full sm:w-auto"><PlusCircle size={16} /> Add New User</Button>
                </div>
                {error && <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">{error}</div>}

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-xs h-12 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-slate-500">Username</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-500">Role</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-500">Assignment / Reports To</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {asmGroups.map(({ asm, executives }) => {
                                const isExpanded = expandedAsms.has(asm.id);
                                return (
                                    <React.Fragment key={asm.id}>
                                        <tr className="border-b last:border-0 bg-blue-50 hover:bg-blue-100/70">
                                            <td className="p-3 font-bold text-blue-800">
                                                <button onClick={() => toggleAsmExpand(asm.id)} className="flex items-center gap-2 w-full text-left">
                                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    {asm.username} ({executives.length} Execs)
                                                </button>
                                            </td>
                                            <td className="p-3 text-blue-800">{asm.role}</td>
                                            <td className="p-3 text-blue-800">{getStoreName(asm.storeId)}</td>
                                            <td className="p-3 text-right space-x-2">
                                                <Button onClick={() => handleSendResetEmail(asm)} variant="secondary" size="sm" disabled={!canManageUser(asm)} title="Send Password Reset"><KeyRound size={14} /></Button>
                                                <Button onClick={() => handleEdit(asm)} variant="secondary" size="sm" disabled={!canManageUser(asm)}><Edit size={14} /></Button>
                                                <Button onClick={() => handleDelete(asm)} variant="danger" size="sm" disabled={!canManageUser(asm)}><Trash2 size={14} /></Button>
                                            </td>
                                        </tr>
                                        {isExpanded && executives.map(exec => <UserRow key={exec.id} user={exec} isSubRow />)}
                                    </React.Fragment>
                                );
                            })}
                            {otherUsers.map(user => (
                                <UserRow key={user.id} user={user} />
                            ))}
                        </tbody>
                    </table>
                </div>

                {loading && <div className="flex justify-center p-12"><Loader text="Loading users..." /></div>}
                {!loading && users.length === 0 && <p className="text-center p-12 text-slate-400">No users found.</p>}
            </Card>

            {isModalOpen && (
                <UserModal
                    user={editingUser}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    stores={stores}
                    allUsers={users}
                />
            )}
        </div>
    );
};


export default UserManagementPage;