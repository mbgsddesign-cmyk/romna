'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorDescription = searchParams.get('error_description');
      const errorMessage = searchParams.get('error');

      if (errorMessage || errorDescription) {
        const msg = errorDescription || errorMessage || 'Authentication failed';
        console.error('Auth callback error param:', msg);
        setError(msg);
        toast.error(msg);
        setTimeout(() => router.push('/auth/login'), 2000);
        return;
      }

      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Session exchange error:', error);
            setError(error.message);
            toast.error(error.message);
            setTimeout(() => router.push('/auth/login'), 2000);
          } else {
            console.log('Session exchanged successfully', data.user?.email);
            // Successful authentication
            // Redirect to home page
            router.push('/');
          }
        } catch (err) {
          console.error('Unexpected auth error:', err);
          setError('An unexpected error occurred');
          setTimeout(() => router.push('/auth/login'), 2000);
        }
      } else {
        // No code found, check if session exists
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push('/');
        } else {
          // No code and no session, redirect to login
          router.push('/auth/login');
        }
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
          <Loader2 className="h-8 w-8 text-destructive animate-spin" /> 
          {/* Using loader as error icon placeholder or keep spinning if retrying? 
              Actually let's use a static icon for error if we weren't redirecting immediately, 
              but we are redirecting. Let's keep it simple. */}
        </div>
        <h1 className="text-xl font-semibold text-destructive mb-2">Authentication Failed</h1>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <p className="text-xs text-muted-foreground mt-6">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Verifying...</h1>
      <p className="text-muted-foreground">Completing your secure sign in</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
