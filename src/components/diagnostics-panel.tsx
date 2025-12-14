'use client';

import { useEffect, useState } from 'react';
import { getDiagLogs, clearDiagLogs } from '@/lib/diag';

export function DiagnosticsPanel() {
    const [visible, setVisible] = useState(false);
    const [logs, setLogs] = useState(getDiagLogs());
    const isDebug = process.env.NEXT_PUBLIC_DEBUG_DIAG === 'true';

    useEffect(() => {
        if (!visible) return;
        const interval = setInterval(() => {
            setLogs([...getDiagLogs()]); // Copy to trigger re-render
        }, 1000);
        return () => clearInterval(interval);
    }, [visible]);

    if (!isDebug) return null;

    if (!visible) {
        return (
            <button
                onClick={() => setVisible(true)}
                className="fixed bottom-20 right-4 z-[9999] bg-red-900/80 text-white text-xs px-2 py-1 rounded-full shadow-lg backdrop-blur-sm opacity-50 hover:opacity-100"
            >
                DIAG
            </button>
        );
    }

    return (
        <div className="fixed bottom-0 right-0 w-full md:w-96 h-96 bg-black/90 text-green-400 font-mono text-xs z-[9999] flex flex-col border-t-2 border-green-800 shadow-2xl">
            <div className="flex justify-between items-center p-2 bg-gray-900 border-b border-gray-800">
                <h3 className="font-bold">Diagnostics ({logs.length})</h3>
                <div className="flex gap-2">
                    <button onClick={() => clearDiagLogs()} className="px-2 hover:bg-white/10 rounded">CLS</button>
                    <button onClick={() => setVisible(false)} className="px-2 hover:bg-white/10 rounded">X</button>
                </div>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-1">
                {logs.map((log, i) => (
                    <div key={i} className="border-b border-gray-800/50 pb-1">
                        <span className="text-gray-500">[{log.timestamp.split('T')[1].slice(0, 8)}]</span>{' '}
                        <span className="font-bold text-yellow-400">{log.event}</span>
                        {log.data && (
                            <pre className="mt-1 text-gray-400 whitespace-pre-wrap pl-4 border-l-2 border-gray-700">
                                {JSON.stringify(log.data, null, 2)}
                            </pre>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
