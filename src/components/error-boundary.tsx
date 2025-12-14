'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4 text-center text-white">
                    <div className="mb-6 h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                        <span className="text-2xl text-red-500">!</span>
                    </div>
                    <h1 className="mb-2 text-xl font-bold">Something went wrong</h1>
                    <p className="mb-6 text-sm text-gray-400 max-w-md">
                        The application encountered a critical error. We've switched to Safe Mode.
                    </p>
                    <div className="flex gap-3">
                        <Button
                            onClick={() => {
                                localStorage.clear();
                                window.location.reload();
                            }}
                            variant="outline"
                            className="border-red-500/20 text-red-500 hover:bg-red-500/10"
                        >
                            Clear Data & Reset
                        </Button>
                        <Button
                            onClick={() => window.location.assign('/')}
                            className="bg-white text-black hover:bg-gray-200"
                        >
                            Return Home
                        </Button>
                    </div>
                    <p className="mt-8 text-xs text-gray-600 font-mono">
                        {this.state.error?.message}
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}
