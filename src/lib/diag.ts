export type DiagEvent =
    | 'VOICE_LISTEN_START'
    | 'VOICE_GOT_AUDIO'
    | 'STT_ONLINE_START'
    | 'STT_ONLINE_SUCCESS'
    | 'STT_ONLINE_ERROR'
    | 'STT_OFFLINE_START'
    | 'STT_OFFLINE_SUCCESS'
    | 'STT_OFFLINE_ERROR'
    | 'NLU_START'
    | 'NLU_RESULT'
    | 'STORAGE_WRITE'
    | 'PULSE_TRIGGER'
    | 'DECISION_STATE'
    | 'SETTINGS_MOUNT'
    | 'SETTINGS_ERROR';

interface DiagEntry {
    timestamp: string;
    event: DiagEvent;
    data?: any;
    sessionId: string;
}

const MAX_LOGS = 50;
const SESSION_ID = Math.random().toString(36).substring(7);

// In-memory log (could be persisted to localStorage if needed across reloads, 
// but for stability analysis we usually want fresh session logs)
let logs: DiagEntry[] = [];

/**
 * Log a diagnostic event if NEXT_PUBLIC_DEBUG_DIAG is 'true'.
 */
export function diag(event: DiagEvent, data?: any) {
    if (process.env.NEXT_PUBLIC_DEBUG_DIAG !== 'true') return;

    const entry: DiagEntry = {
        timestamp: new Date().toISOString(),
        event,
        data,
        sessionId: SESSION_ID,
    };

    logs.unshift(entry);
    if (logs.length > MAX_LOGS) {
        logs = logs.slice(0, MAX_LOGS);
    }

    // Also log to console with a distinctive prefix
    console.log(`[DIAG] ${event}`, data);
}

/**
 * Get current logs (for UI display)
 */
export function getDiagLogs() {
    return logs;
}

/**
 * Clear logs
 */
export function clearDiagLogs() {
    logs = [];
}
