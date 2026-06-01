(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/Desktop/reallll/src/hooks/use-toast.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "reducer",
    ()=>reducer,
    "toast",
    ()=>toast,
    "useToast",
    ()=>useToast
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 2000 // 2 seconds auto-dismiss
;
const actionTypes = {
    ADD_TOAST: "ADD_TOAST",
    UPDATE_TOAST: "UPDATE_TOAST",
    DISMISS_TOAST: "DISMISS_TOAST",
    REMOVE_TOAST: "REMOVE_TOAST"
};
let count = 0;
function genId() {
    count = (count + 1) % Number.MAX_SAFE_INTEGER;
    return count.toString();
}
const toastTimeouts = new Map();
const addToRemoveQueue = (toastId)=>{
    if (toastTimeouts.has(toastId)) return;
    const timeout = setTimeout(()=>{
        toastTimeouts.delete(toastId);
        dispatch({
            type: "REMOVE_TOAST",
            toastId
        });
    }, TOAST_REMOVE_DELAY);
    toastTimeouts.set(toastId, timeout);
};
const reducer = (state, action)=>{
    switch(action.type){
        case "ADD_TOAST":
            return {
                ...state,
                toasts: [
                    action.toast,
                    ...state.toasts
                ].slice(0, TOAST_LIMIT)
            };
        case "UPDATE_TOAST":
            return {
                ...state,
                toasts: state.toasts.map((t)=>t.id === action.toast.id ? {
                        ...t,
                        ...action.toast
                    } : t)
            };
        case "DISMISS_TOAST":
            {
                const { toastId } = action;
                if (toastId) {
                    addToRemoveQueue(toastId);
                } else {
                    state.toasts.forEach((toast)=>addToRemoveQueue(toast.id));
                }
                return {
                    ...state,
                    toasts: state.toasts.map((t)=>t.id === toastId || toastId === undefined ? {
                            ...t,
                            open: false
                        } : t)
                };
            }
        case "REMOVE_TOAST":
            if (action.toastId === undefined) return {
                ...state,
                toasts: []
            };
            return {
                ...state,
                toasts: state.toasts.filter((t)=>t.id !== action.toastId)
            };
    }
};
const listeners = [];
let memoryState = {
    toasts: []
};
function dispatch(action) {
    memoryState = reducer(memoryState, action);
    listeners.forEach((listener)=>listener(memoryState));
}
function toast({ ...props }) {
    const id = genId();
    const update = (props)=>dispatch({
            type: "UPDATE_TOAST",
            toast: {
                ...props,
                id
            }
        });
    const dismiss = ()=>dispatch({
            type: "DISMISS_TOAST",
            toastId: id
        });
    dispatch({
        type: "ADD_TOAST",
        toast: {
            ...props,
            id,
            open: true,
            onOpenChange: (open)=>{
                if (!open) dismiss();
            }
        }
    });
    return {
        id,
        dismiss,
        update
    };
}
function useToast() {
    _s();
    const [state, setState] = __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](memoryState);
    __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useToast.useEffect": ()=>{
            listeners.push(setState);
            return ({
                "useToast.useEffect": ()=>{
                    const index = listeners.indexOf(setState);
                    if (index > -1) listeners.splice(index, 1);
                }
            })["useToast.useEffect"];
        }
    }["useToast.useEffect"], [
        state
    ]);
    return {
        ...state,
        toast,
        dismiss: (toastId)=>dispatch({
                type: "DISMISS_TOAST",
                toastId
            })
    };
}
_s(useToast, "SPWE98mLGnlsnNfIwu/IAKTSZtk=");
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/hooks/useRealtime.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getRealtimeSocket",
    ()=>getRealtimeSocket,
    "useRealtime",
    ()=>useRealtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/socket.io-client/build/esm/index.js [app-client] (ecmascript) <locals>");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
let socketInstance = null;
let connectionCount = 0;
// WebSocket enabled — using same-origin connection (no separate port needed)
const isWebSocketAvailable = ()=>{
    return ("TURBOPACK compile-time value", "object") !== 'undefined';
};
function useRealtime(options = {}) {
    _s();
    const { userId, role, companyId, onLoanCreated, onLoanUpdated, onLoanStatusChanged, onPaymentReceived, onNotification, onDashboardRefresh, onCreditUpdated, pollInterval = 300_000 } = options;
    const callbacksRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])({
        onLoanCreated,
        onLoanUpdated,
        onLoanStatusChanged,
        onPaymentReceived,
        onNotification,
        onDashboardRefresh,
        onCreditUpdated
    });
    // Track last refresh time to throttle visibility-change refreshes
    const lastRefreshRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(Date.now());
    // Always keep callbacks ref up-to-date (avoids stale closures)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useRealtime.useEffect": ()=>{
            callbacksRef.current = {
                onLoanCreated,
                onLoanUpdated,
                onLoanStatusChanged,
                onPaymentReceived,
                onNotification,
                onDashboardRefresh,
                onCreditUpdated
            };
        }
    }["useRealtime.useEffect"], [
        onLoanCreated,
        onLoanUpdated,
        onLoanStatusChanged,
        onPaymentReceived,
        onNotification,
        onDashboardRefresh,
        onCreditUpdated
    ]);
    // ─── WebSocket path ──────────────────────────────────────────────────────────
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useRealtime.useEffect": ()=>{
            if (!userId || !role || !isWebSocketAvailable()) return;
            if (!socketInstance) {
                try {
                    socketInstance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["io"])('/', {
                        transports: [
                            'websocket',
                            'polling'
                        ],
                        reconnection: true,
                        reconnectionAttempts: 5,
                        reconnectionDelay: 3000
                    });
                } catch (error) {
                    console.log('[realtime] WebSocket not available:', error);
                    return;
                }
            }
            const socket = socketInstance;
            connectionCount++;
            // Expose globally so other components (e.g. NotificationBell) can subscribe directly
            if ("TURBOPACK compile-time truthy", 1) window.__realtimeSocket = socket;
            socket.emit('register', {
                userId,
                role
            });
            if (companyId) socket.emit('join-company', companyId);
            const handleLoanCreated = {
                "useRealtime.useEffect.handleLoanCreated": (loan)=>callbacksRef.current.onLoanCreated?.(loan)
            }["useRealtime.useEffect.handleLoanCreated"];
            const handleLoanUpdated = {
                "useRealtime.useEffect.handleLoanUpdated": (data)=>callbacksRef.current.onLoanUpdated?.(data)
            }["useRealtime.useEffect.handleLoanUpdated"];
            const handleLoanStatusChanged = {
                "useRealtime.useEffect.handleLoanStatusChanged": (data)=>callbacksRef.current.onLoanStatusChanged?.(data)
            }["useRealtime.useEffect.handleLoanStatusChanged"];
            const handlePaymentReceived = {
                "useRealtime.useEffect.handlePaymentReceived": (data)=>callbacksRef.current.onPaymentReceived?.(data)
            }["useRealtime.useEffect.handlePaymentReceived"];
            const handleNotification = {
                "useRealtime.useEffect.handleNotification": (n)=>callbacksRef.current.onNotification?.(n)
            }["useRealtime.useEffect.handleNotification"];
            const handleDashboardRefresh = {
                "useRealtime.useEffect.handleDashboardRefresh": ()=>callbacksRef.current.onDashboardRefresh?.()
            }["useRealtime.useEffect.handleDashboardRefresh"];
            const handleCreditUpdated = {
                "useRealtime.useEffect.handleCreditUpdated": (c)=>callbacksRef.current.onCreditUpdated?.(c)
            }["useRealtime.useEffect.handleCreditUpdated"];
            socket.on('loan:created', handleLoanCreated);
            socket.on('loan:updated', handleLoanUpdated);
            socket.on('loan:status-changed', handleLoanStatusChanged);
            socket.on('payment:received', handlePaymentReceived);
            socket.on('notification', handleNotification);
            socket.on('dashboard:refresh', handleDashboardRefresh);
            socket.on('credit:updated', handleCreditUpdated);
            return ({
                "useRealtime.useEffect": ()=>{
                    connectionCount--;
                    socket.off('loan:created', handleLoanCreated);
                    socket.off('loan:updated', handleLoanUpdated);
                    socket.off('loan:status-changed', handleLoanStatusChanged);
                    socket.off('payment:received', handlePaymentReceived);
                    socket.off('notification', handleNotification);
                    socket.off('dashboard:refresh', handleDashboardRefresh);
                    socket.off('credit:updated', handleCreditUpdated);
                    if (connectionCount === 0 && socketInstance) {
                        socketInstance.disconnect();
                        socketInstance = null;
                    }
                }
            })["useRealtime.useEffect"];
        }
    }["useRealtime.useEffect"], [
        userId,
        role,
        companyId
    ]);
    // ─── Polling fallback ────────────────────────────────────────────────────────
    // Acts as a safety net for missed events and Vercel/PWA deployments.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useRealtime.useEffect": ()=>{
            if (!userId || !pollInterval || pollInterval <= 0) return;
            let intervalId = null;
            // Small initial delay so the first data load completes before polling starts
            // Disable constant polling to prevent random "without reason" updates.
            // The dashboard will only refresh via explicit WebSocket events or manual refresh.
            // We only keep the small startDelay in case WebSockets fail immediately on mount.
            const startDelay = setTimeout({
                "useRealtime.useEffect.startDelay": ()=>{
                    if (!socketInstance || !socketInstance.connected) {
                        if (document.visibilityState === 'visible') {
                            callbacksRef.current.onDashboardRefresh?.();
                        }
                    }
                }
            }["useRealtime.useEffect.startDelay"], 5000);
            return ({
                "useRealtime.useEffect": ()=>{
                    clearTimeout(startDelay);
                }
            })["useRealtime.useEffect"];
        }
    }["useRealtime.useEffect"], [
        userId,
        pollInterval
    ]);
    // ─── Visibility change restart ───────────────────────────────────────────────
    // Refresh when tab becomes visible after being hidden. Throttled to 60s minimum.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useRealtime.useEffect": ()=>{
            if (!userId) return;
            const VISIBILITY_REFRESH_THROTTLE_MS = 60_000; // 60 seconds — prevents rapid tab-switch spam
            // Mount-timer: only fire if WebSocket didn't connect within 3s
            // This avoids a double-refresh (socket connect + mount timer) on every page load
            const mountTimer = setTimeout({
                "useRealtime.useEffect.mountTimer": ()=>{
                    if (!socketInstance || !socketInstance.connected) {
                        // WebSocket unavailable — do an initial refresh to ensure fresh data
                        callbacksRef.current.onDashboardRefresh?.();
                        lastRefreshRef.current = Date.now();
                    }
                }
            }["useRealtime.useEffect.mountTimer"], 3000); // give socket 3s to connect before deciding to poll
            const handleVisibilityChange = {
                "useRealtime.useEffect.handleVisibilityChange": ()=>{
                    if (document.visibilityState === 'visible') {
                        const now = Date.now();
                        // Only refresh on visibility change IF websocket is dead, otherwise rely on realtime events
                        if ((!socketInstance || !socketInstance.connected) && now - lastRefreshRef.current >= VISIBILITY_REFRESH_THROTTLE_MS) {
                            lastRefreshRef.current = now;
                            callbacksRef.current.onDashboardRefresh?.();
                        }
                    }
                }
            }["useRealtime.useEffect.handleVisibilityChange"];
            document.addEventListener('visibilitychange', handleVisibilityChange);
            return ({
                "useRealtime.useEffect": ()=>{
                    clearTimeout(mountTimer);
                    document.removeEventListener('visibilitychange', handleVisibilityChange);
                }
            })["useRealtime.useEffect"];
        }
    }["useRealtime.useEffect"], [
        userId
    ]);
    const requestRefresh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useRealtime.useCallback[requestRefresh]": ()=>{
            if (socketInstance && isWebSocketAvailable()) {
                socketInstance.emit('request-refresh');
            }
            // Also trigger local refresh immediately
            callbacksRef.current.onDashboardRefresh?.();
        }
    }["useRealtime.useCallback[requestRefresh]"], []);
    return {
        requestRefresh,
        isRealtimeAvailable: isWebSocketAvailable()
    };
}
_s(useRealtime, "iMepd8d9LamBsuGY8ejFs9e30wQ=");
function getRealtimeSocket() {
    return socketInstance;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/hooks/useStats.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useStats",
    ()=>useStats
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/@tanstack/react-query/build/modern/useQuery.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
function useStats({ role = 'SUPER_ADMIN', userId = '', companyId = '', refetchInterval = 0, enabled = true } = {}) {
    _s();
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (userId) params.set('userId', userId);
    if (companyId) params.set('companyId', companyId);
    const { data, isLoading, error, refetch } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            'stats',
            role,
            userId,
            companyId
        ],
        queryFn: {
            "useStats.useQuery": async ()=>{
                const res = await fetch(`/api/stats?${params.toString()}`, {
                    cache: 'no-store'
                });
                if (!res.ok) throw new Error('Failed to fetch stats');
                return res.json();
            }
        }["useStats.useQuery"],
        staleTime: 25_000,
        gcTime: 60_000,
        refetchInterval: refetchInterval || false,
        refetchIntervalInBackground: false,
        enabled: enabled && !!role,
        retry: 2,
        retryDelay: 1000
    });
    const defaults = {
        totalActiveLoans: 0,
        onlineLoanCount: 0,
        offlineLoanCount: 0,
        totalCustomers: 0,
        pendingLoans: 0,
        disbursedLoans: 0,
        closedLoans: 0,
        totalCompanies: 0,
        totalAgents: 0,
        totalStaff: 0,
        todayEMIs: 0,
        overdueEMIs: 0,
        generatedAt: ''
    };
    return {
        stats: data ?? defaults,
        loading: isLoading,
        error,
        refetch
    };
}
_s(useStats, "yikAt8TET1R6zMqPPBLxeeIrY9Y=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/hooks/useSystemSettings.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "invalidateSystemSettingsCache",
    ()=>invalidateSystemSettingsCache,
    "useSystemSettings",
    ()=>useSystemSettings
]);
/**
 * useSystemSettings — lightweight hook to fetch SystemSettings from /api/system-settings.
 * Caches the result in module-level memory so it's only fetched once per browser session.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
const DEFAULT = {
    penaltyPerDay: 100,
    penaltyGraceDays: 0,
    penaltyMaxAmount: null,
    colorGreenDays: 2,
    colorYellowDays: 1,
    colorRedDaysOverdue: 0,
    agentCanSeeMirror: false,
    staffCanSeeMirror: false,
    companyCanSeeMirror: false,
    accountantCanSeeMirror: false,
    sendEMIReminderDaysBefore: 3,
    sendEMISameDayReminder: true,
    sendPenaltyNotify: true,
    penaltyNotifyIntervalHrs: 24,
    onlineProcessingFeeMode: 'AT_DISBURSEMENT',
    offlineProcessingFeeMode: 'AT_CREATION'
};
// Module-level cache so we don't re-fetch on every component mount
let cachedSettings = null;
let fetchPromise = null;
async function loadSettings() {
    if (cachedSettings) return cachedSettings;
    if (fetchPromise) return fetchPromise;
    fetchPromise = fetch('/api/system-settings').then((r)=>r.json()).then((data)=>{
        if (data.success && data.settings) {
            cachedSettings = {
                ...DEFAULT,
                ...data.settings
            };
        } else {
            cachedSettings = DEFAULT;
        }
        fetchPromise = null;
        return cachedSettings;
    }).catch(()=>{
        fetchPromise = null;
        cachedSettings = DEFAULT;
        return DEFAULT;
    });
    return fetchPromise;
}
function invalidateSystemSettingsCache() {
    cachedSettings = null;
    fetchPromise = null;
}
// Get initial settings synchronously for useState lazy initializer
function getInitialSettings() {
    return cachedSettings ?? DEFAULT;
}
// Get initial loading state synchronously for useState lazy initializer
function getInitialLoading() {
    return !cachedSettings;
}
function useSystemSettings() {
    _s();
    // Use lazy initializers to avoid calling setState in effect
    const [settings, setSettings] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(getInitialSettings);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(getInitialLoading);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useSystemSettings.useEffect": ()=>{
            // If we already have cached settings, no need to fetch
            if (cachedSettings) {
                return;
            }
            loadSettings().then({
                "useSystemSettings.useEffect": (s)=>{
                    setSettings(s);
                    setLoading(false);
                }
            }["useSystemSettings.useEffect"]);
        }
    }["useSystemSettings.useEffect"], []);
    return {
        settings,
        loading
    };
}
_s(useSystemSettings, "KABrt/uPDV3EFPjMOxIBBq1OjhI=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/hooks/useLocationTracking.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "useLocationTracking",
    ()=>useLocationTracking
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
function useLocationTracking(options = {}) {
    _s();
    const { userId, autoTrackOnMount = false, autoTrackAction = 'APP_OPEN' } = options;
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        isLoading: false,
        isSupported: ("TURBOPACK compile-time value", "object") !== 'undefined' && 'geolocation' in navigator,
        permissionStatus: 'unknown',
        lastLocation: null,
        error: null
    });
    const hasAutoTracked = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    // Get device information
    const getDeviceInfo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useLocationTracking.useCallback[getDeviceInfo]": ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            const userAgent = navigator.userAgent;
            let browser = 'Unknown';
            let os = 'Unknown';
            let deviceType = 'Desktop';
            // Detect browser
            if (userAgent.includes('Firefox')) {
                browser = 'Firefox';
            } else if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
                browser = 'Chrome';
            } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
                browser = 'Safari';
            } else if (userAgent.includes('Edg')) {
                browser = 'Edge';
            } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
                browser = 'Opera';
            }
            // Detect OS
            if (userAgent.includes('Windows')) {
                os = 'Windows';
            } else if (userAgent.includes('Mac OS')) {
                os = 'MacOS';
            } else if (userAgent.includes('Linux')) {
                os = 'Linux';
            } else if (userAgent.includes('Android')) {
                os = 'Android';
            } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
                os = 'iOS';
            }
            // Detect device type
            if (/Mobi|Android/i.test(userAgent)) {
                deviceType = 'Mobile';
            } else if (/Tablet|iPad/i.test(userAgent)) {
                deviceType = 'Tablet';
            }
            return {
                deviceType,
                browser,
                os
            };
        }
    }["useLocationTracking.useCallback[getDeviceInfo]"], []);
    // Check permission status
    const checkPermission = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useLocationTracking.useCallback[checkPermission]": async ()=>{
            if (!state.isSupported) {
                return 'unknown';
            }
            try {
                // Try to use the Permissions API if available
                if ('permissions' in navigator) {
                    const permission = await navigator.permissions.query({
                        name: 'geolocation'
                    });
                    return permission.state;
                }
            } catch  {
            // Permissions API not supported, will check on first geolocation call
            }
            return 'unknown';
        }
    }["useLocationTracking.useCallback[checkPermission]"], [
        state.isSupported
    ]);
    // Get current position
    const getCurrentPosition = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useLocationTracking.useCallback[getCurrentPosition]": ()=>{
            return new Promise({
                "useLocationTracking.useCallback[getCurrentPosition]": (resolve, reject)=>{
                    if (!state.isSupported) {
                        reject(new Error('Geolocation is not supported by this browser'));
                        return;
                    }
                    setState({
                        "useLocationTracking.useCallback[getCurrentPosition]": (prev)=>({
                                ...prev,
                                isLoading: true,
                                error: null
                            })
                    }["useLocationTracking.useCallback[getCurrentPosition]"]);
                    navigator.geolocation.getCurrentPosition({
                        "useLocationTracking.useCallback[getCurrentPosition]": (position)=>{
                            const locationData = {
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude,
                                accuracy: position.coords.accuracy
                            };
                            setState({
                                "useLocationTracking.useCallback[getCurrentPosition]": (prev)=>({
                                        ...prev,
                                        isLoading: false,
                                        lastLocation: locationData,
                                        permissionStatus: 'granted'
                                    })
                            }["useLocationTracking.useCallback[getCurrentPosition]"]);
                            resolve(locationData);
                        }
                    }["useLocationTracking.useCallback[getCurrentPosition]"], {
                        "useLocationTracking.useCallback[getCurrentPosition]": (error)=>{
                            let errorMessage = 'Failed to get location';
                            let permissionStatus = 'prompt';
                            switch(error.code){
                                case error.PERMISSION_DENIED:
                                    errorMessage = 'Location permission denied by user';
                                    permissionStatus = 'denied';
                                    break;
                                case error.POSITION_UNAVAILABLE:
                                    errorMessage = 'Location information unavailable';
                                    break;
                                case error.TIMEOUT:
                                    errorMessage = 'Location request timed out';
                                    break;
                            }
                            setState({
                                "useLocationTracking.useCallback[getCurrentPosition]": (prev)=>({
                                        ...prev,
                                        isLoading: false,
                                        error: errorMessage,
                                        permissionStatus
                                    })
                            }["useLocationTracking.useCallback[getCurrentPosition]"]);
                            reject(new Error(errorMessage));
                        }
                    }["useLocationTracking.useCallback[getCurrentPosition]"], {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 60000
                    });
                }
            }["useLocationTracking.useCallback[getCurrentPosition]"]);
        }
    }["useLocationTracking.useCallback[getCurrentPosition]"], [
        state.isSupported
    ]);
    // Track location and send to API
    const trackLocation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useLocationTracking.useCallback[trackLocation]": async (action, additionalData)=>{
            try {
                // Get current position
                const locationData = await getCurrentPosition();
                // If no userId provided, return just the location data
                if (!userId) {
                    return {
                        success: true,
                        location: {
                            latitude: locationData.latitude,
                            longitude: locationData.longitude,
                            action,
                            createdAt: new Date()
                        }
                    };
                }
                // Send to API
                const response = await fetch('/api/location/track', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId,
                        latitude: locationData.latitude,
                        longitude: locationData.longitude,
                        accuracy: locationData.accuracy,
                        action,
                        loanApplicationId: additionalData?.loanApplicationId,
                        paymentId: additionalData?.paymentId,
                        deviceInfo: getDeviceInfo()
                    })
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to save location');
                }
                return {
                    success: true,
                    locationId: data.locationId,
                    location: data.location
                };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                setState({
                    "useLocationTracking.useCallback[trackLocation]": (prev)=>({
                            ...prev,
                            error: errorMessage
                        })
                }["useLocationTracking.useCallback[trackLocation]"]);
                return {
                    success: false,
                    error: errorMessage
                };
            }
        }
    }["useLocationTracking.useCallback[trackLocation]"], [
        userId,
        getCurrentPosition,
        getDeviceInfo
    ]);
    // Request permission explicitly (useful for showing UI feedback)
    const requestPermission = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useLocationTracking.useCallback[requestPermission]": async ()=>{
            if (!state.isSupported) {
                return false;
            }
            try {
                await getCurrentPosition();
                return true;
            } catch  {
                return false;
            }
        }
    }["useLocationTracking.useCallback[requestPermission]"], [
        state.isSupported,
        getCurrentPosition
    ]);
    // Auto-track on mount if enabled
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useLocationTracking.useEffect": ()=>{
            if (autoTrackOnMount && userId && !hasAutoTracked.current && state.isSupported) {
                hasAutoTracked.current = true;
                // Check permission first
                checkPermission().then({
                    "useLocationTracking.useEffect": (status)=>{
                        if (status !== 'denied') {
                            trackLocation(autoTrackAction).catch({
                                "useLocationTracking.useEffect": ()=>{
                                // Silently fail for auto-track
                                }
                            }["useLocationTracking.useEffect"]);
                        }
                    }
                }["useLocationTracking.useEffect"]);
            }
        }
    }["useLocationTracking.useEffect"], [
        autoTrackOnMount,
        userId,
        autoTrackAction,
        state.isSupported,
        checkPermission,
        trackLocation
    ]);
    // Check initial permission status
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useLocationTracking.useEffect": ()=>{
            if (state.isSupported) {
                checkPermission().then({
                    "useLocationTracking.useEffect": (status)=>{
                        setState({
                            "useLocationTracking.useEffect": (prev)=>({
                                    ...prev,
                                    permissionStatus: status
                                })
                        }["useLocationTracking.useEffect"]);
                    }
                }["useLocationTracking.useEffect"]);
            }
        }
    }["useLocationTracking.useEffect"], [
        state.isSupported,
        checkPermission
    ]);
    return {
        // State
        isLoading: state.isLoading,
        isSupported: state.isSupported,
        permissionStatus: state.permissionStatus,
        lastLocation: state.lastLocation,
        error: state.error,
        // Actions
        trackLocation,
        getCurrentPosition,
        requestPermission,
        getDeviceInfo,
        // Utilities
        isPermissionDenied: state.permissionStatus === 'denied',
        isPermissionGranted: state.permissionStatus === 'granted'
    };
}
_s(useLocationTracking, "ekI9jMSU7jIijpe+X+I1X0DgnCg=");
const __TURBOPACK__default__export__ = useLocationTracking;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/hooks/useAutoRefresh.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAutoRefresh",
    ()=>useAutoRefresh,
    "useRelativeTime",
    ()=>useRelativeTime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
function useAutoRefresh({ onRefresh, intervalMs = 30_000, enabled = true, visibilityThrottleMs = 15_000 }) {
    _s();
    const [lastUpdated, setLastUpdated] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const onRefreshRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(onRefresh);
    const lastRefreshTimeRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    // Always keep ref current to avoid stale closures
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useAutoRefresh.useEffect": ()=>{
            onRefreshRef.current = onRefresh;
        }
    }["useAutoRefresh.useEffect"], [
        onRefresh
    ]);
    const doRefresh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAutoRefresh.useCallback[doRefresh]": async ()=>{
            if (!enabled) return;
            try {
                await onRefreshRef.current();
            } catch  {
            // swallow — caller handles errors
            }
            lastRefreshTimeRef.current = Date.now();
            setLastUpdated(new Date());
        }
    }["useAutoRefresh.useCallback[doRefresh]"], [
        enabled
    ]);
    // ── Interval polling ────────────────────────────────────────────────────────
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useAutoRefresh.useEffect": ()=>{
            if (!enabled || intervalMs <= 0) return;
            const id = setInterval({
                "useAutoRefresh.useEffect.id": ()=>{
                    if (document.visibilityState === 'visible') {
                        doRefresh();
                    }
                }
            }["useAutoRefresh.useEffect.id"], intervalMs);
            return ({
                "useAutoRefresh.useEffect": ()=>clearInterval(id)
            })["useAutoRefresh.useEffect"];
        }
    }["useAutoRefresh.useEffect"], [
        enabled,
        intervalMs,
        doRefresh
    ]);
    // ── Visibility-change refresh ───────────────────────────────────────────────
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useAutoRefresh.useEffect": ()=>{
            if (!enabled) return;
            const handleVisibilityChange = {
                "useAutoRefresh.useEffect.handleVisibilityChange": ()=>{
                    if (document.visibilityState === 'visible') {
                        const elapsed = Date.now() - lastRefreshTimeRef.current;
                        if (elapsed >= visibilityThrottleMs) {
                            doRefresh();
                        }
                    }
                }
            }["useAutoRefresh.useEffect.handleVisibilityChange"];
            document.addEventListener('visibilitychange', handleVisibilityChange);
            return ({
                "useAutoRefresh.useEffect": ()=>document.removeEventListener('visibilitychange', handleVisibilityChange)
            })["useAutoRefresh.useEffect"];
        }
    }["useAutoRefresh.useEffect"], [
        enabled,
        visibilityThrottleMs,
        doRefresh
    ]);
    return {
        lastUpdated,
        forceRefresh: doRefresh
    };
}
_s(useAutoRefresh, "BcYvZShgOCDdwdKHxmZWrm3qek8=");
function useRelativeTime(date) {
    _s1();
    const [label, setLabel] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useRelativeTime.useEffect": ()=>{
            if (!date) {
                setLabel('');
                return;
            }
            const update = {
                "useRelativeTime.useEffect.update": ()=>{
                    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
                    if (secs < 5) setLabel('just now');
                    else if (secs < 60) setLabel(`${secs}s ago`);
                    else if (secs < 3600) setLabel(`${Math.floor(secs / 60)}m ago`);
                    else setLabel(`${Math.floor(secs / 3600)}h ago`);
                }
            }["useRelativeTime.useEffect.update"];
            update();
            const id = setInterval(update, 10_000);
            return ({
                "useRelativeTime.useEffect": ()=>clearInterval(id)
            })["useRelativeTime.useEffect"];
        }
    }["useRelativeTime.useEffect"], [
        date
    ]);
    return label;
}
_s1(useRelativeTime, "DHXRUwZX5SaRGJCIwH7DHrimuyM=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/contexts/RefreshContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RefreshProvider",
    ()=>RefreshProvider,
    "useRefresh",
    ()=>useRefresh
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
/**
 * Global Refresh Context
 * ─────────────────────
 * Provides an instant, lightweight refresh signal to ALL components
 * without prop-drilling or parent re-fetches.
 *
 * How it works:
 *   1. RefreshProvider wraps the app in DashboardLayout
 *   2. Socket.io 'dashboard:refresh' increments a global counter
 *   3. Any component uses `useRefresh()` and re-fetches when refreshKey changes
 *   4. Any component calls `triggerRefresh()` after a local write to notify all sections
 *
 * Usage in any component:
 *   const { refreshKey, triggerRefresh } = useRefresh();
 *   useEffect(() => { fetchMyData(); }, [refreshKey]);
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
const RefreshContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])({
    refreshKey: 0,
    triggerRefresh: ()=>{},
    lastRefreshedAt: null
});
function RefreshProvider({ children }) {
    _s();
    const [refreshKey, setRefreshKey] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [lastRefreshedAt, setLastRefreshedAt] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Throttle: max one refresh per 2 seconds to prevent cascade re-renders
    const lastFireRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    const triggerRefresh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "RefreshProvider.useCallback[triggerRefresh]": ()=>{
            const now = Date.now();
            if (now - lastFireRef.current < 2000) return;
            lastFireRef.current = now;
            setRefreshKey({
                "RefreshProvider.useCallback[triggerRefresh]": (k)=>k + 1
            }["RefreshProvider.useCallback[triggerRefresh]"]);
            setLastRefreshedAt(new Date());
        }
    }["RefreshProvider.useCallback[triggerRefresh]"], []);
    // Listen to Socket.io events via the global socket set by useRealtime
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "RefreshProvider.useEffect": ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            const handleRefresh = {
                "RefreshProvider.useEffect.handleRefresh": ()=>triggerRefresh()
            }["RefreshProvider.useEffect.handleRefresh"];
            const attach = {
                "RefreshProvider.useEffect.attach": ()=>{
                    const socket = window.__realtimeSocket;
                    if (!socket) return false;
                    socket.on('dashboard:refresh', handleRefresh);
                    socket.on('report:invalidated', handleRefresh);
                    socket.on('payment:received', handleRefresh);
                    return true;
                }
            }["RefreshProvider.useEffect.attach"];
            // Socket may not be ready immediately — poll for up to 10 seconds
            if (!attach()) {
                let polls = 0;
                const timer = setInterval({
                    "RefreshProvider.useEffect.timer": ()=>{
                        if (attach() || ++polls > 20) clearInterval(timer);
                    }
                }["RefreshProvider.useEffect.timer"], 500);
                return ({
                    "RefreshProvider.useEffect": ()=>{
                        clearInterval(timer);
                        const s = window.__realtimeSocket;
                        if (s) {
                            s.off('dashboard:refresh', handleRefresh);
                            s.off('report:invalidated', handleRefresh);
                            s.off('payment:received', handleRefresh);
                        }
                    }
                })["RefreshProvider.useEffect"];
            }
            return ({
                "RefreshProvider.useEffect": ()=>{
                    const s = window.__realtimeSocket;
                    if (s) {
                        s.off('dashboard:refresh', handleRefresh);
                        s.off('report:invalidated', handleRefresh);
                        s.off('payment:received', handleRefresh);
                    }
                }
            })["RefreshProvider.useEffect"];
        }
    }["RefreshProvider.useEffect"], [
        triggerRefresh
    ]);
    // Refresh on tab becoming visible (handles background → foreground)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "RefreshProvider.useEffect": ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            const onVisible = {
                "RefreshProvider.useEffect.onVisible": ()=>{
                    if (document.visibilityState === 'visible') triggerRefresh();
                }
            }["RefreshProvider.useEffect.onVisible"];
            document.addEventListener('visibilitychange', onVisible);
            return ({
                "RefreshProvider.useEffect": ()=>document.removeEventListener('visibilitychange', onVisible)
            })["RefreshProvider.useEffect"];
        }
    }["RefreshProvider.useEffect"], [
        triggerRefresh
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RefreshContext.Provider, {
        value: {
            refreshKey,
            triggerRefresh,
            lastRefreshedAt
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/contexts/RefreshContext.tsx",
        lineNumber: 105,
        columnNumber: 5
    }, this);
}
_s(RefreshProvider, "7KwacOtx4W7q+meqqMepwl8TL6s=");
_c = RefreshProvider;
function useRefresh() {
    _s1();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(RefreshContext);
}
_s1(useRefresh, "gDsCjeeItUuvgOWf1v4qoK9RF6k=");
var _c;
__turbopack_context__.k.register(_c, "RefreshProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/utils/helpers.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// EMI Calculation Engine
__turbopack_context__.s([
    "calculateEMI",
    ()=>calculateEMI,
    "calculateRiskScore",
    ()=>calculateRiskScore,
    "copyToClipboard",
    ()=>copyToClipboard,
    "debounce",
    ()=>debounce,
    "formatCurrency",
    ()=>formatCurrency,
    "formatDate",
    ()=>formatDate,
    "formatNumber",
    ()=>formatNumber,
    "generateApplicationNo",
    ()=>generateApplicationNo,
    "generateCode",
    ()=>generateCode,
    "generateReceiptNo",
    ()=>generateReceiptNo,
    "generateReceiptNumber",
    ()=>generateReceiptNumber,
    "generateTransactionId",
    ()=>generateTransactionId,
    "getRiskLevel",
    ()=>getRiskLevel,
    "getStatusColor",
    ()=>getStatusColor,
    "getStatusLabel",
    ()=>getStatusLabel,
    "truncateText",
    ()=>truncateText,
    "validateAadhaar",
    ()=>validateAadhaar,
    "validateEmail",
    ()=>validateEmail,
    "validateIFSC",
    ()=>validateIFSC,
    "validatePAN",
    ()=>validatePAN,
    "validatePassword",
    ()=>validatePassword,
    "validatePhone",
    ()=>validatePhone
]);
function calculateEMI(principal, annualInterestRate, tenureMonths, interestType = 'FLAT', startDate = new Date()) {
    // Handle backwards compatibility where interestType might be a Date
    const actualInterestType = typeof interestType === 'string' ? interestType : 'FLAT';
    const actualStartDate = typeof interestType === 'object' && interestType instanceof Date ? interestType : startDate;
    const monthlyRate = annualInterestRate / 12 / 100;
    let emi;
    let totalInterest;
    let totalAmount;
    if (actualInterestType === 'FLAT') {
        // FLAT Interest: Interest is calculated on the full principal for the entire tenure
        // Formula: EMI = (Principal + Total Interest) / Tenure
        // Total Interest = Principal * Rate * Tenure / 100
        totalInterest = Math.round(principal * annualInterestRate * tenureMonths / 1200 * 100) / 100;
        totalAmount = principal + totalInterest;
        emi = Math.round(totalAmount / tenureMonths * 100) / 100;
    } else {
        // REDUCING Balance: Standard EMI formula
        // Formula: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
        if (monthlyRate === 0) {
            emi = principal / tenureMonths;
        } else {
            const ratePowerN = Math.pow(1 + monthlyRate, tenureMonths);
            emi = principal * monthlyRate * ratePowerN / (ratePowerN - 1);
        }
        totalAmount = emi * tenureMonths;
        totalInterest = totalAmount - principal;
    }
    const schedule = [];
    let outstandingPrincipal = principal;
    for(let i = 1; i <= tenureMonths; i++){
        let interestForMonth;
        let principalForMonth;
        if (actualInterestType === 'FLAT') {
            // For FLAT, interest is same every month
            interestForMonth = principal * annualInterestRate / 1200;
            principalForMonth = emi - interestForMonth;
            outstandingPrincipal = Math.max(0, outstandingPrincipal - principalForMonth);
        } else {
            // For REDUCING, interest is on outstanding balance
            interestForMonth = outstandingPrincipal * monthlyRate;
            principalForMonth = emi - interestForMonth;
            outstandingPrincipal = Math.max(0, outstandingPrincipal - principalForMonth);
        }
        const dueDate = new Date(actualStartDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        schedule.push({
            installmentNumber: i,
            dueDate,
            principal: Math.round(principalForMonth * 100) / 100,
            interest: Math.round(interestForMonth * 100) / 100,
            totalAmount: Math.round(emi * 100) / 100,
            outstandingPrincipal: Math.round(outstandingPrincipal * 100) / 100
        });
    }
    return {
        emi: Math.round(emi * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        schedule
    };
}
function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}
function formatCurrency(amount) {
    // FIX-46: Guard against undefined/null to prevent NaN display
    if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount);
}
function formatNumber(num) {
    return new Intl.NumberFormat('en-IN').format(num);
}
function generateApplicationNo() {
    const prefix = 'LA';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}
function generateTransactionId() {
    const prefix = 'TXN';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}
function generateReceiptNo() {
    const prefix = 'RCP';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}
function validatePAN(pan) {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
}
function validateIFSC(ifsc) {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc.toUpperCase());
}
function validateAadhaar(aadhaar) {
    const aadhaarRegex = /^[2-9]{1}[0-9]{3}[0-9]{4}[0-9]{4}$/;
    return aadhaarRegex.test(aadhaar.replace(/\s/g, ''));
}
function validatePhone(phone) {
    const phoneRegex = /^[6-9][0-9]{9}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
}
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function calculateRiskScore(params) {
    let score = 0;
    if (params.multipleApplications) score += 15;
    if (params.activeLoans > 3) score += 20;
    else if (params.activeLoans > 1) score += 10;
    const ratio = params.requestedAmount / (params.income * 12);
    if (ratio > 5) score += 25;
    else if (ratio > 3) score += 15;
    else if (ratio > 1) score += 5;
    if (params.overdueHistory) score += 30;
    if (params.employmentType === 'UNEMPLOYED') score += 20;
    else if (params.employmentType === 'SELF_EMPLOYED') score += 5;
    return Math.min(100, score);
}
function getRiskLevel(score) {
    if (score < 20) return 'LOW';
    if (score < 40) return 'MEDIUM';
    if (score < 60) return 'HIGH';
    return 'CRITICAL';
}
function generateCode(prefix) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}
const generateReceiptNumber = generateReceiptNo;
function validatePassword(password) {
    const errors = [];
    if (password.length < 6) errors.push('Password must be at least 6 characters');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
    return {
        valid: errors.length === 0,
        errors
    };
}
function getStatusColor(status) {
    const colors = {
        SUBMITTED: 'bg-blue-100 text-blue-700',
        SA_APPROVED: 'bg-emerald-100 text-emerald-700',
        COMPANY_APPROVED: 'bg-teal-100 text-teal-700',
        AGENT_APPROVED_STAGE1: 'bg-cyan-100 text-cyan-700',
        LOAN_FORM_COMPLETED: 'bg-violet-100 text-violet-700',
        SESSION_CREATED: 'bg-amber-100 text-amber-700',
        CUSTOMER_SESSION_APPROVED: 'bg-green-100 text-green-700',
        FINAL_APPROVED: 'bg-green-100 text-green-700',
        ACTIVE: 'bg-green-100 text-green-700',
        DISBURSED: 'bg-blue-100 text-blue-700',
        REJECTED_BY_SA: 'bg-red-100 text-red-700',
        REJECTED_BY_COMPANY: 'bg-red-100 text-red-700',
        REJECTED_FINAL: 'bg-red-100 text-red-700',
        SESSION_REJECTED: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
}
function getStatusLabel(status) {
    const labels = {
        SUBMITTED: 'New Application',
        SA_APPROVED: 'SA Approved',
        COMPANY_APPROVED: 'Company Approved',
        AGENT_APPROVED_STAGE1: 'Agent Approved',
        LOAN_FORM_COMPLETED: 'Verification Complete',
        SESSION_CREATED: 'Sanction Created',
        CUSTOMER_SESSION_APPROVED: 'Customer Approved',
        FINAL_APPROVED: 'Final Approved',
        ACTIVE: 'Active',
        DISBURSED: 'Disbursed',
        REJECTED_BY_SA: 'Rejected',
        REJECTED_BY_COMPANY: 'Rejected',
        REJECTED_FINAL: 'Rejected',
        SESSION_REJECTED: 'Sanction Rejected'
    };
    return labels[status] || status;
}
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}
function debounce(func, wait) {
    let timeout;
    return (...args)=>{
        clearTimeout(timeout);
        timeout = setTimeout(()=>func(...args), wait);
    };
}
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    return new Promise((resolve, reject)=>{
        if (document.execCommand('copy')) {
            resolve();
        } else {
            reject(new Error('Failed to copy text'));
        }
        textArea.remove();
    });
} // Force recompile Thu Mar 12 19:07:56 UTC 2026
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/utils/openDoc.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Opens a document or image URL safely in a new browser tab.
 *
 * Chrome blocks navigation to bare data: URLs ("Not allowed to navigate top frame to data URL").
 * The fix: convert the base64 data URL → Blob → blob:// URL, which Chrome fully allows.
 * For normal http(s) URLs, just open directly.
 */ __turbopack_context__.s([
    "openDoc",
    ()=>openDoc
]);
const openDoc = (url)=>{
    if (!url) return;
    if (url.startsWith('data:')) {
        try {
            // Extract mime type and raw base64 string
            const commaIdx = url.indexOf(',');
            const header = url.substring(0, commaIdx); // e.g. "data:image/jpeg;base64"
            const base64 = url.substring(commaIdx + 1); // the actual base64 data
            const mimeMatch = header.match(/data:([^;]+)/);
            const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
            // Decode base64 → Uint8Array
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for(let i = 0; i < binary.length; i++){
                bytes[i] = binary.charCodeAt(i);
            }
            // Create a Blob and a temporary blob:// URL
            const blob = new Blob([
                bytes
            ], {
                type: mime
            });
            const blobUrl = URL.createObjectURL(blob);
            const newTab = window.open(blobUrl, '_blank');
            // Revoke after 30 s — enough time for the tab to load the content
            setTimeout(()=>URL.revokeObjectURL(blobUrl), 30_000);
            if (!newTab) {
                // Popup was blocked — fall back to same-tab navigation
                URL.revokeObjectURL(blobUrl);
                window.location.href = blobUrl;
            }
        } catch (err) {
            console.error('[openDoc] Failed to open data URL as Blob:', err);
        }
    } else {
        // Normal http / https URL — open directly
        window.open(url, '_blank', 'noopener,noreferrer');
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/utils/imageCompression.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "compressImage",
    ()=>compressImage
]);
const compressImage = (file, maxWidth = 800, quality = 0.7)=>{
    return new Promise((resolve, reject)=>{
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event)=>{
            const img = new Image();
            img.src = event.target?.result;
            img.onload = ()=>{
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round(height * maxWidth / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                // Always compress to JPEG for smallest data URL size
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };
            img.onerror = (error)=>reject(error);
        };
        reader.onerror = (error)=>reject(error);
    });
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/utils/accountingExport.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "exportAsImage",
    ()=>exportAsImage,
    "exportAsPDF",
    ()=>exportAsPDF,
    "exportAsWord",
    ()=>exportAsWord,
    "exportBalanceSheetCSV",
    ()=>exportBalanceSheetCSV,
    "exportLedgerCSV",
    ()=>exportLedgerCSV,
    "exportPersonalLedgerCSV",
    ()=>exportPersonalLedgerCSV,
    "exportProfitLossCSV",
    ()=>exportProfitLossCSV,
    "exportTrialBalanceCSV",
    ()=>exportTrialBalanceCSV,
    "handleExport",
    ()=>handleExport,
    "printToPDF",
    ()=>printToPDF
]);
/**
 * Accounting Export Utilities
 * Supports: Excel (CSV/TSV), PDF (jsPDF), Image (html2canvas), Word (.doc)
 * GoI-ready formatting for NBFC financial statements
 */ const INR = (n)=>new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2
    }).format(n);
_c = INR;
// ─── CSV / EXCEL ──────────────────────────────────────────────────────────────
function csvRow(...cells) {
    return cells.map((c)=>`"${String(c).replace(/"/g, '""')}"`).join(',');
}
function downloadCSV(rows, filename) {
    const bom = '\uFEFF'; // UTF-8 BOM so Excel opens in Indian locale
    const blob = new Blob([
        bom + rows.join('\n')
    ], {
        type: 'text/csv;charset=utf-8;'
    });
    triggerDownload(blob, filename);
}
function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
function exportProfitLossCSV(data, companyName, period) {
    const rows = [
        csvRow(`Profit & Loss Statement — ${companyName}`),
        csvRow(`Period: ${period}`),
        csvRow('Generated:', new Date().toLocaleString('en-IN')),
        csvRow(''),
        csvRow('', 'Dr Side (Expenses)', '', 'Cr Side (Income)'),
        csvRow('Particulars', 'Amount (₹)', 'Particulars', 'Amount (₹)'),
        csvRow('---', '---', '---', '---')
    ];
    const income = data.income || [];
    const expenses = data.expenses || [];
    const maxLen = Math.max(income.length, expenses.length);
    for(let i = 0; i < maxLen; i++){
        const exp = expenses[i] || {
            accountName: '',
            amount: 0
        };
        const inc = income[i] || {
            accountName: '',
            amount: 0
        };
        rows.push(csvRow(exp.accountName || '', exp.accountName ? exp.amount : '', inc.accountName || '', inc.accountName ? inc.amount : ''));
    }
    const netProfit = data.netProfit ?? data.totalIncome - data.totalExpenses;
    const isProfit = netProfit >= 0;
    rows.push(csvRow('---', '---', '---', '---'));
    if (isProfit) {
        rows.push(csvRow('Net Profit (Cr)', netProfit, '', ''));
    } else {
        rows.push(csvRow('', '', 'Net Loss (Dr)', Math.abs(netProfit)));
    }
    rows.push(csvRow('TOTAL', data.totalExpenses + (isProfit ? netProfit : 0), 'TOTAL', data.totalIncome + (isProfit ? 0 : Math.abs(netProfit))));
    downloadCSV(rows, `ProfitLoss_${companyName}_${dateSuffix()}.csv`);
}
function exportBalanceSheetCSV(data, companyName) {
    const rows = [
        csvRow(`Balance Sheet — ${companyName}`),
        csvRow(`As on: ${new Date().toLocaleDateString('en-IN')}`),
        csvRow('Generated:', new Date().toLocaleString('en-IN')),
        csvRow(''),
        csvRow('LIABILITIES & CAPITAL', 'Amount (₹)', 'ASSETS', 'Amount (₹)'),
        csvRow('---', '---', '---', '---')
    ];
    const liabilities = [
        ...data.liabilities || data.leftSide?.items || [],
        ...data.equity || []
    ];
    const assets = data.assets || data.rightSide?.items || [];
    const maxLen = Math.max(liabilities.length, assets.length);
    for(let i = 0; i < maxLen; i++){
        const l = liabilities[i] || {
            accountName: '',
            amount: 0
        };
        const a = assets[i] || {
            accountName: '',
            amount: 0
        };
        rows.push(csvRow(l.accountName || l.name || '', l.accountName || l.name ? l.amount || 0 : '', a.accountName || a.name || '', a.accountName || a.name ? a.amount || 0 : ''));
    }
    rows.push(csvRow('---', '---', '---', '---'));
    const totalL = data.totalLiabilities ?? data.leftSide?.total ?? 0;
    const totalE = data.totalEquity ?? 0;
    const totalA = data.totalAssets ?? data.rightSide?.total ?? 0;
    rows.push(csvRow('TOTAL', totalL + totalE, 'TOTAL', totalA));
    rows.push(csvRow(''));
    rows.push(csvRow('Balance Check:', Math.abs(totalL + totalE - totalA) < 1 ? 'BALANCED ✓' : `DIFFERENCE: ${INR(Math.abs(totalL + totalE - totalA))}`));
    downloadCSV(rows, `BalanceSheet_${companyName}_${dateSuffix()}.csv`);
}
function exportTrialBalanceCSV(data, companyName) {
    const rows = [
        csvRow(`Trial Balance — ${companyName}`),
        csvRow(`As on: ${new Date().toLocaleDateString('en-IN')}`),
        csvRow(''),
        csvRow('Account Code', 'Account Name', 'Account Type', 'Debit (₹)', 'Credit (₹)'),
        csvRow('---', '---', '---', '---', '---')
    ];
    const items = data.trialBalance || data || [];
    let totalDr = 0, totalCr = 0;
    for (const item of items){
        rows.push(csvRow(item.accountCode, item.accountName, item.accountType, item.debitBalance > 0 ? item.debitBalance : '', item.creditBalance > 0 ? item.creditBalance : ''));
        totalDr += item.debitBalance || 0;
        totalCr += item.creditBalance || 0;
    }
    rows.push(csvRow('---', '---', '---', '---', '---'));
    rows.push(csvRow('TOTAL', '', '', totalDr, totalCr));
    rows.push(csvRow(''));
    rows.push(csvRow('Balanced:', Math.abs(totalDr - totalCr) < 0.01 ? 'YES ✓' : `NO — Difference: ${INR(Math.abs(totalDr - totalCr))}`));
    downloadCSV(rows, `TrialBalance_${companyName}_${dateSuffix()}.csv`);
}
function exportPersonalLedgerCSV(entries, customerName, companyName) {
    const rows = [
        csvRow(`Personal Ledger (Khata) — ${customerName}`),
        csvRow(`Company: ${companyName}`),
        csvRow(`Generated: ${new Date().toLocaleString('en-IN')}`),
        csvRow(''),
        csvRow('Date', 'Particulars', 'Voucher No', 'Debit (₹)', 'Credit (₹)', 'Balance (₹)'),
        csvRow('---', '---', '---', '---', '---', '---')
    ];
    let balance = 0;
    for (const e of entries){
        const dr = e.debitAmount || e.debit || 0;
        const cr = e.creditAmount || e.credit || 0;
        balance += dr - cr;
        rows.push(csvRow(e.date || e.entryDate || '', e.narration || e.description || '', e.voucherNo || e.referenceNo || '', dr || '', cr || '', balance));
    }
    downloadCSV(rows, `PersonalLedger_${customerName}_${dateSuffix()}.csv`);
}
function exportLedgerCSV(entries, accountName, companyName) {
    const rows = [
        csvRow(`Ledger Account — ${accountName}`),
        csvRow(`Company: ${companyName}`),
        csvRow(`Generated: ${new Date().toLocaleString('en-IN')}`),
        csvRow(''),
        csvRow('Date', 'Particulars', 'Vch No', 'Debit (₹)', 'Credit (₹)', 'Balance (₹)'),
        csvRow('---', '---', '---', '---', '---', '---')
    ];
    let balance = 0;
    for (const e of entries){
        const dr = e.debitAmount || 0;
        const cr = e.creditAmount || 0;
        balance += dr - cr;
        rows.push(csvRow(new Date(e.entryDate || e.date).toLocaleDateString('en-IN'), e.narration || e.description || '', e.voucherNo || '', dr || '', cr || '', balance));
    }
    downloadCSV(rows, `Ledger_${accountName}_${dateSuffix()}.csv`);
}
function printToPDF(elementId, title) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    const styles = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; background: #fff; padding: 20mm; }
      h1 { font-size: 16pt; text-align: center; margin-bottom: 4px; }
      h2 { font-size: 13pt; text-align: center; margin-bottom: 12px; color: #333; }
      .subtitle { text-align: center; font-size: 10pt; margin-bottom: 20px; color: #555; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      th { background: #f0f0f0; border: 1px solid #999; padding: 6px 8px; font-weight: bold; text-align: left; }
      td { border: 1px solid #ccc; padding: 5px 8px; }
      .text-right { text-align: right; }
      .font-bold { font-weight: bold; }
      .total-row { background: #f9f9f9; font-weight: bold; border-top: 2px solid #333; }
      .net-row { background: #e8f5e9; font-weight: bold; }
      .loss-row { background: #fce8e8; font-weight: bold; }
      .section-header { background: #1a1a2e; color: white; padding: 4px 8px; font-weight: bold; }
      .balanced { color: green; font-weight: bold; }
      .unbalanced { color: red; font-weight: bold; }
      @media print { @page { size: A4; margin: 15mm; } }
    </style>
  `;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title>${styles}</head><body>`);
    printWindow.document.write(`<h1>${title}</h1>`);
    printWindow.document.write(`<div class="subtitle">Generated: ${new Date().toLocaleString('en-IN')}</div>`);
    printWindow.document.write(el.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(()=>{
        printWindow.print();
        printWindow.close();
    }, 500);
}
async function exportAsImage(elementId, filename) {
    try {
        const html2canvas = (await __turbopack_context__.A("[project]/Desktop/reallll/node_modules/html2canvas/dist/html2canvas.js [app-client] (ecmascript, async loader)")).default;
        const el = document.getElementById(elementId);
        if (!el) {
            alert('Element not found');
            return;
        }
        const canvas = await html2canvas(el, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
        });
        canvas.toBlob((blob)=>{
            if (blob) triggerDownload(blob, `${filename}_${dateSuffix()}.png`);
        }, 'image/png');
    } catch (e) {
        console.error('Image export failed:', e);
        alert('Image export failed. Please try PDF instead.');
    }
}
function exportAsWord(elementId, filename, title) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
    <head>
      <meta charset="utf-8"/>
      <title>${title}</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 11pt; margin: 2cm; }
        h1, h2 { text-align: center; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #999; padding: 4px 8px; }
        th { background: #f0f0f0; font-weight: bold; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p style="text-align:center;color:#555">Generated: ${new Date().toLocaleString('en-IN')}</p>
      ${el.innerHTML}
    </body>
    </html>
  `;
    const blob = new Blob([
        '\ufeff',
        html
    ], {
        type: 'application/msword'
    });
    triggerDownload(blob, `${filename}_${dateSuffix()}.doc`);
}
async function exportAsPDF(elementId, filename, title) {
    try {
        const { jsPDF } = await __turbopack_context__.A("[project]/Desktop/reallll/node_modules/jspdf/dist/jspdf.es.min.js [app-client] (ecmascript, async loader)");
        const html2canvas = (await __turbopack_context__.A("[project]/Desktop/reallll/node_modules/html2canvas/dist/html2canvas.js [app-client] (ecmascript, async loader)")).default;
        const el = document.getElementById(elementId);
        if (!el) return;
        const canvas = await html2canvas(el, {
            scale: 2,
            backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = canvas.height * pdfWidth / canvas.width;
        const pageHeight = pdf.internal.pageSize.getHeight();
        let y = 0;
        while(y < pdfHeight){
            if (y > 0) pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, -y, pdfWidth, pdfHeight);
            y += pageHeight;
        }
        pdf.save(`${filename}_${dateSuffix()}.pdf`);
    } catch (e) {
        console.error('PDF export failed:', e);
        // Fallback to print
        printToPDF(elementId, title);
    }
}
async function handleExport(format, opts) {
    switch(format){
        case 'excel':
            if (opts.csvExportFn) opts.csvExportFn();
            break;
        case 'pdf':
            await exportAsPDF(opts.elementId, opts.filename, opts.title);
            break;
        case 'image':
            await exportAsImage(opts.elementId, opts.filename);
            break;
        case 'word':
            exportAsWord(opts.elementId, opts.filename, opts.title);
            break;
        case 'print':
            printToPDF(opts.elementId, opts.title);
            break;
    }
}
// ─── HELPER ──────────────────────────────────────────────────────────────────
function dateSuffix() {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}
var _c;
__turbopack_context__.k.register(_c, "INR");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/utils/exportToExcel.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * exportToExcel.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Zero-dependency CSV export that Excel opens natively.
 * CSV is produced with BOM so Excel shows ₹ and Indian text correctly.
 *
 * Usage:
 *   exportToExcel({ rows, headers, filename: 'DayBook_April2026' });
 */ __turbopack_context__.s([
    "exportToExcel",
    ()=>exportToExcel,
    "fmtINR",
    ()=>fmtINR
]);
function escapeCell(val) {
    if (val == null) return '';
    const str = String(val);
    // Wrap in quotes if it contains comma, newline or quote
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
function exportToExcel({ rows, headers, keys, filename = 'Report', companyName, dateRange, reportTitle }) {
    if (!rows || rows.length === 0) {
        alert('No data to export');
        return;
    }
    const _keys = keys || Object.keys(rows[0]);
    const _heads = headers || _keys;
    const csvLines = [];
    // ── Meta rows (optional) ────────────────────────────────────────────
    if (reportTitle) csvLines.push(`"${reportTitle}"`);
    if (companyName) csvLines.push(`"Company: ${companyName}"`);
    if (dateRange) csvLines.push(`"Period: ${dateRange}"`);
    if (reportTitle || companyName || dateRange) csvLines.push(''); // blank separator
    // ── Header row ───────────────────────────────────────────────────────
    csvLines.push(_heads.map(escapeCell).join(','));
    // ── Data rows ────────────────────────────────────────────────────────
    for (const row of rows){
        csvLines.push(_keys.map((k)=>escapeCell(row[k])).join(','));
    }
    // ── BOM + blob ───────────────────────────────────────────────────────
    const bom = '\uFEFF'; // UTF-8 BOM – Excel needs this to show ₹ correctly
    const content = bom + csvLines.join('\r\n');
    const blob = new Blob([
        content
    ], {
        type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
const fmtINR = (n)=>'₹' + (n || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/lib/mirror-company-utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Mirror Company Utilities
 * 
 * Mirror companies are identified by the `isMirrorCompany` flag in the Company model.
 * Interest rate for mirror loans is set PER LOAN, not per company.
 * This gives flexibility to use different rates for different loans.
 */ __turbopack_context__.s([
    "getMirrorCompanies",
    ()=>getMirrorCompanies,
    "getOriginalCompany",
    ()=>getOriginalCompany,
    "identifyCompanyType",
    ()=>identifyCompanyType
]);
function identifyCompanyType(company) {
    // Primary: Check the isMirrorCompany flag
    if (company.isMirrorCompany === true) {
        return 'MIRROR_COMPANY';
    }
    if (company.isMirrorCompany === false) {
        return 'ORIGINAL_COMPANY';
    }
    // Fallback: Check by code/name patterns
    const code = (company.code || '').toUpperCase().trim();
    const name = (company.name || '').toLowerCase().trim();
    // Code patterns for mirror companies (C1, C2)
    if (code === 'C1' || code === 'C2' || code === 'COMPANY1' || code === 'COMPANY2') {
        return 'MIRROR_COMPANY';
    }
    // Code patterns for original company (C3)
    if (code === 'C3' || code === 'COMPANY3') {
        return 'ORIGINAL_COMPANY';
    }
    // Name patterns
    if (name.includes('mirror') || name.includes('company 1') || name.includes('company 2')) {
        return 'MIRROR_COMPANY';
    }
    if (name.includes('original') || name.includes('customer') || name.includes('company 3')) {
        return 'ORIGINAL_COMPANY';
    }
    return 'UNKNOWN';
}
function getMirrorCompanies(companies) {
    const mirrorCompanies = companies.filter((c)=>c.isMirrorCompany === true);
    return mirrorCompanies.map((company)=>({
            ...company,
            companyType: 'MIRROR_COMPANY',
            displayName: company.code ? `${company.name} (${company.code})` : company.name
        }));
}
function getOriginalCompany(companies) {
    // First, try to find a company with isMirrorCompany = false
    const originalCompany = companies.find((c)=>c.isMirrorCompany === false);
    if (originalCompany) {
        return originalCompany;
    }
    // Fallback: Find by code/name patterns
    return companies.find((c)=>{
        const code = (c.code || '').toUpperCase().trim();
        const name = (c.name || '').toLowerCase().trim();
        return code === 'C3' || code === 'COMPANY3' || name.includes('original') || name.includes('customer') || name.includes('company 3');
    });
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/lib/generate-receipts-pdf.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "generateAllReceiptsPDF",
    ()=>generateAllReceiptsPDF
]);
'use client';
const fmt = (n)=>new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(n);
const fmtDate = (d)=>{
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};
const toWords = (num)=>{
    const ones = [
        '',
        'One',
        'Two',
        'Three',
        'Four',
        'Five',
        'Six',
        'Seven',
        'Eight',
        'Nine'
    ];
    const tens = [
        '',
        '',
        'Twenty',
        'Thirty',
        'Forty',
        'Fifty',
        'Sixty',
        'Seventy',
        'Eighty',
        'Ninety'
    ];
    const teens = [
        'Ten',
        'Eleven',
        'Twelve',
        'Thirteen',
        'Fourteen',
        'Fifteen',
        'Sixteen',
        'Seventeen',
        'Eighteen',
        'Nineteen'
    ];
    if (num === 0) return 'Zero';
    const h = (n)=>{
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + h(n % 100) : '');
    };
    const t = (n)=>{
        if (n < 1000) return h(n);
        if (n < 100000) return h(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + h(n % 1000) : '');
        if (n < 10000000) return h(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + t(n % 100000) : '');
        return h(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + t(n % 10000000) : '');
    };
    return t(Math.round(num));
};
function generateReceiptHTML(receipt) {
    return `
    <div style="width: 48%; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #111; box-sizing: border-box; padding: 3mm; page-break-inside: avoid;">
      <div style="border: 1.5px solid #1e40af; border-radius: 2px; padding: 3mm; box-sizing: border-box;">
        <!-- Header -->
        <div style="text-align: center; border-bottom: 1px solid #1e40af; padding-bottom: 1.5mm; margin-bottom: 1.5mm;">
          <div style="font-size: 11pt; font-weight: bold; color: #1e40af; letter-spacing: 0.5px;">
            ${receipt.companyName.toUpperCase()}
          </div>
          <div style="font-size: 7pt; color: #666; margin-top: 0.5mm;">Your Trusted Financial Partner</div>
        </div>

        <!-- Title -->
        <div style="text-align: center; font-size: 9pt; font-weight: bold; margin-bottom: 1.5mm; text-decoration: underline;">
          EMI PAYMENT RECEIPT
        </div>

        <!-- Receipt No & Date -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 1.5mm; padding-bottom: 1mm; border-bottom: 1px solid #ccc; font-size: 7.5pt;">
          <span><strong>Receipt No:</strong> <span style="color: #1e40af; font-weight: bold;">${receipt.receiptNo}</span></span>
          <span><strong>Date:</strong> <span style="color: #1e40af;">${fmtDate(receipt.date)}</span></span>
        </div>

        <!-- Customer Info -->
        <div style="margin-bottom: 1.5mm; font-size: 7.5pt;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span><strong>Customer:</strong></span>
            <span>${receipt.customerName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span><strong>F/H Name:</strong></span>
            <span>${receipt.fatherName || '—'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span><strong>Phone:</strong></span>
            <span>${receipt.phone}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span><strong>Loan A/c No:</strong></span>
            <span style="color: #1e40af;">${receipt.loanAccountNo}</span>
          </div>
        </div>

        <div style="border-top: 1px solid #aaa; margin-bottom: 1.5mm;"></div>

        <!-- EMI Details -->
        <div style="margin-bottom: 1.5mm; font-size: 7.5pt;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span><strong>EMI Number:</strong></span>
            <span>${receipt.emiNumber} of ${receipt.totalEmis}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span><strong>Due Date:</strong></span>
            <span>${fmtDate(receipt.dueDate)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span><strong>Payment Date:</strong></span>
            <span>${fmtDate(receipt.paymentDate)}</span>
          </div>
        </div>

        <div style="border-top: 1px solid #aaa; margin-bottom: 1.5mm;"></div>

        <!-- Payment Breakdown -->
        <div style="margin-bottom: 1.5mm; font-size: 7.5pt;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span>Principal:</span>
            <span>${fmt(receipt.isInterestOnly ? 0 : receipt.principalAmount)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span>Interest:</span>
            <span>${fmt(receipt.interestAmount)}</span>
          </div>
          ${receipt.penaltyAmount && receipt.penaltyAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm; color: #dc2626;">
            <span>Penalty:</span>
            <span>${fmt(receipt.penaltyAmount)}</span>
          </div>
          ` : ''}
          <!-- Total -->
          <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #1e40af; padding-top: 1mm; margin-top: 1mm; background: #eff6ff; padding: 1mm 2mm;">
            <span style="font-weight: bold; font-size: 8pt; color: #1e40af;">TOTAL:</span>
            <span style="font-weight: bold; font-size: 10pt; color: #1e40af;">${fmt(receipt.totalAmount)}</span>
          </div>
        </div>

        <!-- Amount in Words -->
        <div style="margin-bottom: 1.5mm; padding: 1mm 2mm; background: #fefce8; border: 1px solid #ca8a04; font-size: 7pt;">
          <span style="font-weight: bold;">In Words: </span>
          <span style="font-style: italic;">${toWords(receipt.totalAmount)} Rupees Only</span>
        </div>

        <!-- Payment Mode & Balance -->
        <div style="margin-bottom: 1.5mm; font-size: 7.5pt;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span><strong>Payment Mode:</strong></span>
            <span>${receipt.paymentMode}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.8mm;">
            <span><strong>Balance Due:</strong></span>
            <span style="font-weight: bold; color: ${receipt.balanceDue > 0 ? '#dc2626' : '#16a34a'};">${fmt(receipt.balanceDue)}</span>
          </div>
        </div>

        ${receipt.isInterestOnly ? `
        <div style="margin-bottom: 1.5mm; padding: 1mm; background: #dbeafe; border: 1px solid #3b82f6; font-size: 7pt;">
          <strong>Note:</strong> Interest Only payment. Principal deferred.
        </div>
        ` : ''}

        <div style="border-top: 1px solid #aaa; margin-bottom: 2mm;"></div>

        <!-- Signatures -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 1.5mm;">
          <div style="text-align: center; width: 33%;">
            <div style="height: 8mm; border-bottom: 1px solid #555; margin-bottom: 0.5mm;"></div>
            <div style="font-size: 7pt; font-weight: bold; color: #1e40af;">Borrower</div>
          </div>
          <div style="text-align: center; width: 30%;">
            <div style="border: 1px dashed #1e40af; border-radius: 50%; width: 14mm; height: 14mm; display: flex; align-items: center; justify-content: center; margin: 0 auto; color: #1e40af; font-size: 5pt; text-align: center;">
              STAMP
            </div>
          </div>
          <div style="text-align: center; width: 33%;">
            <div style="height: 8mm; border-bottom: 1px solid #555; margin-bottom: 0.5mm;"></div>
            <div style="font-size: 7pt; font-weight: bold; color: #1e40af;">Authorized</div>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 2mm; text-align: center; font-size: 6pt; color: #888; border-top: 1px solid #ddd; padding-top: 1mm;">
          Computer generated receipt · ${receipt.companyName} · ${receipt.companyCode}
        </div>
      </div>
    </div>
  `;
}
function generateAllReceiptsPDF(receipts, title = 'All EMI Receipts') {
    // Group receipts into pages of 4
    const receiptsPerPage = 4;
    const pages = [];
    for(let i = 0; i < receipts.length; i += receiptsPerPage){
        pages.push(receipts.slice(i, i + receiptsPerPage));
    }
    // Generate HTML for each page
    const pagesHTML = pages.map((pageReceipts, pageIndex)=>{
        // Create 2x2 grid
        let gridHTML = '';
        for(let i = 0; i < 4; i++){
            if (pageReceipts[i]) {
                gridHTML += generateReceiptHTML(pageReceipts[i]);
            } else {
                // Empty placeholder to maintain grid structure
                gridHTML += '<div style="width: 48%;"></div>';
            }
        }
        return `
      <div class="page" style="width: 210mm; height: 297mm; padding: 8mm; box-sizing: border-box; ${pageIndex < pages.length - 1 ? 'page-break-after: always;' : ''}">
        <div style="display: flex; flex-wrap: wrap; gap: 4mm; justify-content: space-between; height: 100%; align-content: flex-start;">
          ${gridHTML}
        </div>
        <div style="position: absolute; bottom: 5mm; right: 8mm; font-size: 7pt; color: #999;">
          Page ${pageIndex + 1} of ${pages.length}
        </div>
      </div>
    `;
    });
    const fullHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #fff;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
        }
        .page {
          position: relative;
        }
        @media print {
          .page {
            page-break-after: always;
          }
          .page:last-child {
            page-break-after: avoid;
          }
        }
      </style>
    </head>
    <body>
      ${pagesHTML.join('')}
    </body>
    </html>
  `;
    // Create blob and download
    const blob = new Blob([
        fullHTML
    ], {
        type: 'text/html'
    });
    const url = URL.createObjectURL(blob);
    // Open in new window for printing
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
        printWindow.onload = ()=>{
            printWindow.print();
        };
    }
}
const __TURBOPACK__default__export__ = generateAllReceiptsPDF;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/stores/loansStore.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useLoansStore",
    ()=>useLoansStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
;
const CACHE_TTL = 60000; // 60 seconds — reduces redundant DB fetches across tab switches
const useLoansStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
        loans: [],
        activeLoans: [],
        loading: false,
        lastFetch: null,
        activeLastFetch: null,
        setLoans: (loans)=>set({
                loans,
                lastFetch: Date.now()
            }),
        setActiveLoans: (activeLoans)=>set({
                activeLoans,
                activeLastFetch: Date.now()
            }),
        addLoan: (loan)=>set((state)=>({
                    loans: [
                        loan,
                        ...state.loans
                    ]
                })),
        updateLoan: (loanId, updates)=>set((state)=>({
                    loans: state.loans.map((l)=>l.id === loanId ? {
                            ...l,
                            ...updates
                        } : l),
                    activeLoans: state.activeLoans.map((l)=>l.id === loanId ? {
                            ...l,
                            ...updates
                        } : l)
                })),
        removeLoan: (loanId)=>set((state)=>({
                    loans: state.loans.filter((l)=>l.id !== loanId),
                    activeLoans: state.activeLoans.filter((l)=>l.id !== loanId)
                })),
        setLoading: (loading)=>set({
                loading
            }),
        optimisticUpdate: (loanId, updates)=>{
            set((state)=>({
                    loans: state.loans.map((l)=>l.id === loanId ? {
                            ...l,
                            ...updates
                        } : l),
                    activeLoans: state.activeLoans.map((l)=>l.id === loanId ? {
                            ...l,
                            ...updates
                        } : l)
                }));
        },
        revertOptimisticUpdate: (loanId, originalData)=>{
            set((state)=>({
                    loans: state.loans.map((l)=>l.id === loanId ? originalData : l),
                    activeLoans: state.activeLoans.map((l)=>l.id === loanId ? originalData : l)
                }));
        },
        needsRefresh: ()=>{
            const { lastFetch } = get();
            return !lastFetch || Date.now() - lastFetch > CACHE_TTL;
        },
        activeNeedsRefresh: ()=>{
            const { activeLastFetch } = get();
            return !activeLastFetch || Date.now() - activeLastFetch > CACHE_TTL;
        },
        setLastFetch: ()=>set({
                lastFetch: Date.now()
            }),
        setActiveLastFetch: ()=>set({
                activeLastFetch: Date.now()
            }),
        clearCache: ()=>set({
                lastFetch: null,
                activeLastFetch: null
            })
    }));
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/stores/usersStore.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useUsersStore",
    ()=>useUsersStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
;
const CACHE_TTL = 60000; // 1 minute
const useUsersStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
        users: [],
        agents: [],
        staff: [],
        cashiers: [],
        accountants: [],
        customers: [],
        loading: false,
        lastFetch: null,
        setUsers: (users)=>{
            const agents = users.filter((u)=>u.role === 'AGENT');
            const staff = users.filter((u)=>u.role === 'STAFF');
            const cashiers = users.filter((u)=>u.role === 'CASHIER');
            const accountants = users.filter((u)=>u.role === 'ACCOUNTANT');
            const customers = users.filter((u)=>u.role === 'CUSTOMER');
            set({
                users,
                agents,
                staff,
                cashiers,
                accountants,
                customers,
                lastFetch: Date.now()
            });
        },
        addUser: (user)=>set((state)=>({
                    users: [
                        user,
                        ...state.users
                    ],
                    lastFetch: null
                })),
        updateUser: (userId, updates)=>set((state)=>{
                const updatedUsers = state.users.map((u)=>u.id === userId ? {
                        ...u,
                        ...updates
                    } : u);
                return {
                    users: updatedUsers,
                    agents: updatedUsers.filter((u)=>u.role === 'AGENT'),
                    staff: updatedUsers.filter((u)=>u.role === 'STAFF'),
                    cashiers: updatedUsers.filter((u)=>u.role === 'CASHIER'),
                    accountants: updatedUsers.filter((u)=>u.role === 'ACCOUNTANT'),
                    customers: updatedUsers.filter((u)=>u.role === 'CUSTOMER')
                };
            }),
        removeUser: (userId)=>set((state)=>{
                const filteredUsers = state.users.filter((u)=>u.id !== userId);
                return {
                    users: filteredUsers,
                    agents: filteredUsers.filter((u)=>u.role === 'AGENT'),
                    staff: filteredUsers.filter((u)=>u.role === 'STAFF'),
                    cashiers: filteredUsers.filter((u)=>u.role === 'CASHIER'),
                    accountants: filteredUsers.filter((u)=>u.role === 'ACCOUNTANT'),
                    customers: filteredUsers.filter((u)=>u.role === 'CUSTOMER')
                };
            }),
        setLoading: (loading)=>set({
                loading
            }),
        needsRefresh: ()=>{
            const { lastFetch } = get();
            return !lastFetch || Date.now() - lastFetch > CACHE_TTL;
        },
        setLastFetch: ()=>set({
                lastFetch: Date.now()
            }),
        clearCache: ()=>set({
                lastFetch: null
            }),
        getUsersByRole: (role)=>{
            const { users } = get();
            return users.filter((u)=>u.role === role);
        }
    }));
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/stores/companiesStore.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useCompaniesStore",
    ()=>useCompaniesStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
;
const CACHE_TTL = 120000; // 2 minutes
const useCompaniesStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
        companies: [],
        loading: false,
        lastFetch: null,
        setCompanies: (companies)=>set({
                companies,
                lastFetch: Date.now()
            }),
        addCompany: (company)=>set((state)=>({
                    companies: [
                        company,
                        ...state.companies
                    ]
                })),
        updateCompany: (companyId, updates)=>set((state)=>({
                    companies: state.companies.map((c)=>c.id === companyId ? {
                            ...c,
                            ...updates
                        } : c)
                })),
        removeCompany: (companyId)=>set((state)=>({
                    companies: state.companies.filter((c)=>c.id !== companyId)
                })),
        setLoading: (loading)=>set({
                loading
            }),
        needsRefresh: ()=>{
            const { lastFetch } = get();
            return !lastFetch || Date.now() - lastFetch > CACHE_TTL;
        },
        setLastFetch: ()=>set({
                lastFetch: Date.now()
            }),
        clearCache: ()=>set({
                lastFetch: null
            }),
        getCompanyById: (id)=>get().companies.find((c)=>c.id === id)
    }));
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/app/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Home
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/contexts/AuthContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$contexts$2f$SettingsContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/contexts/SettingsContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$landing$2f$LandingPage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/landing/LandingPage.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$admin$2f$SuperAdminDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/admin/SuperAdminDashboard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$company$2f$CompanyDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/company/CompanyDashboard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$agent$2f$AgentDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/agent/AgentDashboard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$staff$2f$StaffDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/staff/StaffDashboard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$cashier$2f$CashierDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/cashier/CashierDashboard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$customer$2f$CustomerDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/customer/CustomerDashboard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$accountant$2f$AccountantDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/accountant/AccountantDashboard.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
;
;
function AppContent() {
    _s();
    const { user, loading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    // Show loading state during SSR and initial hydration
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col items-center gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"
                    }, void 0, false, {
                        fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                        lineNumber: 22,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-gray-600 font-medium",
                        children: "Loading..."
                    }, void 0, false, {
                        fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                        lineNumber: 23,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                lineNumber: 21,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/Desktop/reallll/src/app/page.tsx",
            lineNumber: 20,
            columnNumber: 7
        }, this);
    }
    // If not logged in, show landing page
    if (!user) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$landing$2f$LandingPage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
            fileName: "[project]/Desktop/reallll/src/app/page.tsx",
            lineNumber: 31,
            columnNumber: 12
        }, this);
    }
    // Render appropriate dashboard based on user role
    const renderDashboard = ()=>{
        switch(user.role){
            case 'SUPER_ADMIN':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$admin$2f$SuperAdminDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                    lineNumber: 38,
                    columnNumber: 16
                }, this);
            case 'COMPANY':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$company$2f$CompanyDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                    lineNumber: 40,
                    columnNumber: 16
                }, this);
            case 'AGENT':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$agent$2f$AgentDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                    lineNumber: 42,
                    columnNumber: 16
                }, this);
            case 'STAFF':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$staff$2f$StaffDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                    lineNumber: 44,
                    columnNumber: 16
                }, this);
            case 'CASHIER':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$cashier$2f$CashierDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                    lineNumber: 46,
                    columnNumber: 16
                }, this);
            case 'CUSTOMER':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$customer$2f$CustomerDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                    lineNumber: 48,
                    columnNumber: 16
                }, this);
            case 'ACCOUNTANT':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$accountant$2f$AccountantDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                    lineNumber: 50,
                    columnNumber: 16
                }, this);
            default:
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$landing$2f$LandingPage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                    lineNumber: 52,
                    columnNumber: 16
                }, this);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$contexts$2f$SettingsContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SettingsProvider"], {
        children: renderDashboard()
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/app/page.tsx",
        lineNumber: 57,
        columnNumber: 5
    }, this);
}
_s(AppContent, "EmJkapf7qiLC5Br5eCoEq4veZes=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"]
    ];
});
_c = AppContent;
function Home() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AppContent, {}, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/app/page.tsx",
        lineNumber: 64,
        columnNumber: 10
    }, this);
}
_c1 = Home;
var _c, _c1;
__turbopack_context__.k.register(_c, "AppContent");
__turbopack_context__.k.register(_c1, "Home");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=Desktop_reallll_src_98572e67._.js.map