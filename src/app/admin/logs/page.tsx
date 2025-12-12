'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, User, Calendar, Filter, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { supabase } from '@/lib/supabase';
import { AuditLog, Profile } from '@/lib/database.types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

interface LogWithUser extends AuditLog {
  profile?: Profile;
}

const actionColors: Record<string, string> = {
  user_signup: 'bg-[#2ECC71]/10 text-[#2ECC71]',
  user_login: 'bg-primary/10 text-primary',
  user_logout: 'bg-muted text-muted-foreground',
  task_created: 'bg-accent/10 text-accent',
  event_created: 'bg-[#F3C96B]/20 text-[#F3C96B]',
  intent_executed: 'bg-[#9B59B6]/10 text-[#9B59B6]',
  integration_connected: 'bg-[#25D366]/10 text-[#25D366]',
  integration_disconnected: 'bg-destructive/10 text-destructive',
};

export default function AdminLogsPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<LogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [actions, setActions] = useState<string[]>([]);

  const fetchLogs = async () => {
    setLoading(true);
    
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (actionFilter !== 'all') {
      query = query.eq('action', actionFilter);
    }
    if (dateFilter) {
      const start = new Date(dateFilter);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateFilter);
      end.setHours(23, 59, 59, 999);
      query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
    }

    const { data: logsData } = await query;
    
    if (logsData) {
      const logsWithUsers = await Promise.all(
        logsData.map(async (log) => {
          if (log.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', log.user_id)
              .single();
            return { ...log, profile: profile || undefined };
          }
          return log;
        })
      );
      setLogs(logsWithUsers);
      
      const uniqueActions = [...new Set(logsData.map(l => l.action))];
      setActions(uniqueActions);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, dateFilter]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border bg-background text-sm flex-1 min-w-[140px]"
        >
          <option value="all">{t('filterByAction')}</option>
          {actions.map(action => (
            <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-auto"
        />
        <Button variant="outline" size="icon" onClick={fetchLogs}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card className="divide-y divide-border">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse h-16 bg-muted rounded" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {t('noData')}
          </div>
        ) : (
          logs.map((log, index) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.02 }}
              className="p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={actionColors[log.action] || 'bg-muted text-muted-foreground'}>
                      {log.action.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-3 h-3 text-muted-foreground" />
                    <span className="truncate">
                      {log.profile?.name || log.profile?.email || 'System'}
                    </span>
                  </div>
                  {log.entity_type && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.entity_type}: {log.entity_id}
                    </p>
                  )}
                  {log.ip_address && (
                    <p className="text-xs text-muted-foreground">
                      IP: {log.ip_address}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), 'MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), 'HH:mm:ss')}
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </Card>
    </motion.div>
  );
}
