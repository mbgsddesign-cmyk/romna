'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { useTranslation } from '@/hooks/use-translation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Smartphone, 
  Shield, 
  Zap,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState } from 'react';

type ConnectionStatus = 'disconnected' | 'connected' | 'running';

export default function OperatorPage() {
  const { t, locale } = useTranslation();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [localEndpoint, setLocalEndpoint] = useState('http://localhost:8080');
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    
    setTimeout(() => {
      setStatus('connected');
      setIsTestingConnection(false);
    }, 2000);
  };

  const handleRunTestAction = () => {
    setStatus('running');
    
    setTimeout(() => {
      setStatus('connected');
    }, 3000);
  };

  return (
    <PageWrapper className="px-5">
      <div className="mobile-container">
        <header className="pt-8 pb-6">
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="mb-4">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-[28px] font-extrabold mb-2">
            {locale === 'ar' ? 'جسر المشغل' : 'OperatorBridge'}
          </h1>
          <p className="text-muted-foreground text-[14px]">
            {locale === 'ar' 
              ? 'تحكم آمن بالهاتف (تجريبي)' 
              : 'Safe phone control (Beta)'}
          </p>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Alert className="border-warning/50 bg-warning/5">
            <AlertCircle className="w-4 h-4 text-warning" />
            <AlertDescription className="text-sm">
              {locale === 'ar'
                ? 'هذه الميزة تجريبية. تتطلب تطبيق محلي منفصل.'
                : 'This feature is experimental. Requires a separate local app.'}
            </AlertDescription>
          </Alert>
        </motion.div>

        <div className="space-y-4 pb-24">
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-[16px] bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-[16px] font-bold">Connection Status</h3>
                <div className="flex items-center gap-2 mt-1">
                  {status === 'disconnected' && (
                    <>
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Disconnected</span>
                    </>
                  )}
                  {status === 'connected' && (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span className="text-sm text-success">Connected</span>
                    </>
                  )}
                  {status === 'running' && (
                    <>
                      <Zap className="w-4 h-4 text-accent animate-pulse" />
                      <span className="text-sm text-accent">Running action...</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Local Endpoint URL
                </label>
                <Input
                  value={localEndpoint}
                  onChange={(e) => setLocalEndpoint(e.target.value)}
                  placeholder="http://localhost:8080"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="flex-1"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || status !== 'disconnected'}
                >
                  {isTestingConnection ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={handleRunTestAction}
                  disabled={status !== 'connected'}
                >
                  Run Test
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
            <div className="flex items-start gap-3 mb-4">
              <Shield className="w-6 h-6 text-accent shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-[15px] font-bold mb-2">Privacy & Safety</h3>
                <div className="space-y-2 text-[13px] text-muted-foreground">
                  <p>• No passwords are accessed or stored</p>
                  <p>• No mass messages or spam allowed</p>
                  <p>• No financial actions permitted</p>
                  <p>• Requires confirmation for sensitive steps</p>
                  <p>• Full audit log of all actions</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-[16px] font-bold mb-3">How It Works</h3>
            <div className="space-y-3 text-[13px] text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 text-accent font-bold text-[11px]">
                  1
                </div>
                <p>ROMANA suggests an action plan based on your request</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 text-accent font-bold text-[11px]">
                  2
                </div>
                <p>You review and approve the plan</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 text-accent font-bold text-[11px]">
                  3
                </div>
                <p>Each sensitive step requires your confirmation</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 text-accent font-bold text-[11px]">
                  4
                </div>
                <p>All actions are logged with timestamps</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-[16px] font-bold mb-3">Setup Instructions</h3>
            <div className="space-y-2 text-[13px] text-muted-foreground">
              <p>1. Download the ROMANA Local Connector app</p>
              <p>2. Install and run the app on your computer</p>
              <p>3. Enter the endpoint URL shown in the app above</p>
              <p>4. Click "Test Connection" to verify</p>
            </div>
            <Button size="sm" variant="outline" className="w-full mt-4" disabled>
              Download Connector (Coming Soon)
            </Button>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
