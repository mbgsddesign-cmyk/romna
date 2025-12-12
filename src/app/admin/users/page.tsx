'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MoreVertical, Shield, User, Ban, Eye, Plug, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { supabase } from '@/lib/supabase';
import { ProfileWithSubscription, UserRole, UserStatus } from '@/lib/database.types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<ProfileWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase.from('profiles').select('*');
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: profiles } = await query.order('created_at', { ascending: false });
    
    if (profiles) {
      const usersWithSubs = await Promise.all(
        profiles.map(async (profile) => {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', profile.id)
            .single();
          return { ...profile, subscription: sub || undefined };
        })
      );
      setUsers(usersWithSubs);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, statusFilter]);

  const updateUserRole = async (userId: string, role: UserRole) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      toast.error(t('error'));
    } else {
      toast.success(t('success'));
      fetchUsers();
    }
    setSelectedUser(null);
  };

  const updateUserStatus = async (userId: string, status: UserStatus) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      toast.error(t('error'));
    } else {
      toast.success(t('success'));
      fetchUsers();
    }
    setSelectedUser(null);
  };

  const getRoleBadge = (role: UserRole) => {
    return role === 'ADMIN' 
      ? <Badge className="bg-primary/10 text-primary">{t('admin')}</Badge>
      : <Badge variant="secondary">{t('user')}</Badge>;
  };

  const getStatusBadge = (status: UserStatus) => {
    const styles = {
      active: 'bg-[#2ECC71]/10 text-[#2ECC71]',
      banned: 'bg-destructive/10 text-destructive',
      suspended: 'bg-[#F39C12]/10 text-[#F39C12]',
    };
    return <Badge className={styles[status]}>{t(status)}</Badge>;
  };

  const getPlanBadge = (plan?: string) => {
    const styles = {
      free: 'bg-muted text-muted-foreground',
      pro: 'bg-accent/10 text-accent',
      enterprise: 'bg-[#F3C96B]/20 text-[#F3C96B]',
    };
    return plan ? <Badge className={styles[plan as keyof typeof styles]}>{t(plan as 'free' | 'pro' | 'enterprise')}</Badge> : null;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('searchUsers')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={fetchUsers}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
          className="px-3 py-2 rounded-xl border bg-background text-sm"
        >
          <option value="all">{t('allRoles')}</option>
          <option value="USER">{t('user')}</option>
          <option value="ADMIN">{t('admin')}</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as UserStatus | 'all')}
          className="px-3 py-2 rounded-xl border bg-background text-sm"
        >
          <option value="all">{t('allStatus')}</option>
          <option value="active">{t('active')}</option>
          <option value="banned">{t('banned')}</option>
          <option value="suspended">{t('suspended')}</option>
        </select>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-12 bg-muted rounded" />
              </Card>
            ))}
          </div>
        ) : users.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            {t('noData')}
          </Card>
        ) : (
          users.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{user.name || 'No name'}</span>
                      {getRoleBadge(user.role)}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {getStatusBadge(user.status)}
                      {getPlanBadge(user.subscription?.plan)}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{t('createdAt')}: {format(new Date(user.created_at), 'MMM d, yyyy')}</span>
                      {user.last_active_at && (
                        <span>{t('lastActive')}: {format(new Date(user.last_active_at), 'MMM d')}</span>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                    {selectedUser === user.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-0 top-10 z-10 bg-card border rounded-xl shadow-lg p-2 min-w-[160px]"
                      >
                        {user.role === 'USER' ? (
                          <button
                            onClick={() => updateUserRole(user.id, 'ADMIN')}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted"
                          >
                            <Shield className="w-4 h-4" />
                            {t('makeAdmin')}
                          </button>
                        ) : (
                          <button
                            onClick={() => updateUserRole(user.id, 'USER')}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted"
                          >
                            <User className="w-4 h-4" />
                            {t('makeUser')}
                          </button>
                        )}
                        {user.status === 'active' ? (
                          <button
                            onClick={() => updateUserStatus(user.id, 'banned')}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted text-destructive"
                          >
                            <Ban className="w-4 h-4" />
                            {t('banUser')}
                          </button>
                        ) : (
                          <button
                            onClick={() => updateUserStatus(user.id, 'active')}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted text-[#2ECC71]"
                          >
                            <User className="w-4 h-4" />
                            {t('unbanUser')}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedUser(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted"
                        >
                          <Eye className="w-4 h-4" />
                          {t('viewLogs')}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted"
                        >
                          <Plug className="w-4 h-4" />
                          {t('viewIntegrations')}
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}