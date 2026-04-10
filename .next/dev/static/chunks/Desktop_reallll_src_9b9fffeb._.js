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
// Check if WebSocket is available (not available on Vercel serverless)
const isWebSocketAvailable = ()=>{
    // Check if running on Vercel or other serverless platforms
    // Vercel deployments typically have vercel.app in the hostname
    if ("TURBOPACK compile-time truthy", 1) {
        const hostname = window.location.hostname;
        // Disable WebSocket on Vercel deployments
        if (hostname.includes('vercel.app') || hostname.includes('vercel')) {
            return false;
        }
    }
    return true;
};
function useRealtime(options = {}) {
    _s();
    const { userId, role, companyId, onLoanCreated, onLoanUpdated, onLoanStatusChanged, onPaymentReceived, onNotification, onDashboardRefresh, onCreditUpdated } = options;
    const callbacksRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])({
        onLoanCreated,
        onLoanUpdated,
        onLoanStatusChanged,
        onPaymentReceived,
        onNotification,
        onDashboardRefresh,
        onCreditUpdated
    });
    // Update callbacks ref when they change
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
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useRealtime.useEffect": ()=>{
            // Only connect if we have user info AND WebSocket is available
            if (!userId || !role || !isWebSocketAvailable()) return;
            // Create socket connection if not exists
            if (!socketInstance) {
                try {
                    socketInstance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["io"])('/?XTransformPort=3005', {
                        transports: [
                            'websocket',
                            'polling'
                        ],
                        reconnection: true,
                        reconnectionAttempts: 3,
                        reconnectionDelay: 2000
                    });
                } catch (error) {
                    console.log('WebSocket not available:', error);
                    return;
                }
            }
            const socket = socketInstance;
            connectionCount++;
            // Register user
            socket.emit('register', {
                userId,
                role
            });
            // Join company room if specified
            if (companyId) {
                socket.emit('join-company', companyId);
            }
            // Set up event listeners
            const handleLoanCreated = {
                "useRealtime.useEffect.handleLoanCreated": (loan)=>{
                    callbacksRef.current.onLoanCreated?.(loan);
                }
            }["useRealtime.useEffect.handleLoanCreated"];
            const handleLoanUpdated = {
                "useRealtime.useEffect.handleLoanUpdated": (data)=>{
                    callbacksRef.current.onLoanUpdated?.(data);
                }
            }["useRealtime.useEffect.handleLoanUpdated"];
            const handleLoanStatusChanged = {
                "useRealtime.useEffect.handleLoanStatusChanged": (data)=>{
                    callbacksRef.current.onLoanStatusChanged?.(data);
                }
            }["useRealtime.useEffect.handleLoanStatusChanged"];
            const handlePaymentReceived = {
                "useRealtime.useEffect.handlePaymentReceived": (data)=>{
                    callbacksRef.current.onPaymentReceived?.(data);
                }
            }["useRealtime.useEffect.handlePaymentReceived"];
            const handleNotification = {
                "useRealtime.useEffect.handleNotification": (notification)=>{
                    callbacksRef.current.onNotification?.(notification);
                }
            }["useRealtime.useEffect.handleNotification"];
            const handleDashboardRefresh = {
                "useRealtime.useEffect.handleDashboardRefresh": ()=>{
                    callbacksRef.current.onDashboardRefresh?.();
                }
            }["useRealtime.useEffect.handleDashboardRefresh"];
            const handleCreditUpdated = {
                "useRealtime.useEffect.handleCreditUpdated": (credit)=>{
                    callbacksRef.current.onCreditUpdated?.(credit);
                }
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
                    // Only disconnect if no more components are using the socket
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
    // Return function to trigger refresh
    const requestRefresh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useRealtime.useCallback[requestRefresh]": ()=>{
            if (socketInstance && isWebSocketAvailable()) {
                socketInstance.emit('request-refresh');
            }
        }
    }["useRealtime.useCallback[requestRefresh]"], []);
    return {
        requestRefresh,
        isRealtimeAvailable: isWebSocketAvailable()
    };
}
_s(useRealtime, "52Q3nmLiKZaNm2gbpX2AgMeoz5M=");
function getRealtimeSocket() {
    return socketInstance;
}
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
    console.log('[getMirrorCompanies] Input companies:', companies.map((c)=>({
            id: c.id,
            name: c.name,
            code: c.code,
            isMirrorCompany: c.isMirrorCompany
        })));
    // Filter companies that are marked as mirror companies
    const mirrorCompanies = companies.filter((c)=>c.isMirrorCompany === true);
    const result = mirrorCompanies.map((company)=>({
            ...company,
            companyType: 'MIRROR_COMPANY',
            displayName: `${company.name} (${company.code || 'N/A'})`
        }));
    console.log('[getMirrorCompanies] Output mirror companies:', result.map((c)=>({
            name: c.name,
            code: c.code,
            displayName: c.displayName
        })));
    return result;
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
"[project]/Desktop/reallll/src/stores/loansStore.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useLoansStore",
    ()=>useLoansStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
;
const CACHE_TTL = 30000; // 30 seconds
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
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$shared$2f$AIChatbot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/shared/AIChatbot.tsx [app-client] (ecmascript)");
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
                        lineNumber: 23,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-gray-600 font-medium",
                        children: "Loading..."
                    }, void 0, false, {
                        fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                        lineNumber: 24,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                lineNumber: 22,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/Desktop/reallll/src/app/page.tsx",
            lineNumber: 21,
            columnNumber: 7
        }, this);
    }
    // If not logged in, show landing page
    if (!user) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$landing$2f$LandingPage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
            fileName: "[project]/Desktop/reallll/src/app/page.tsx",
            lineNumber: 32,
            columnNumber: 12
        }, this);
    }
    // Render appropriate dashboard based on user role
    const renderDashboard = ()=>{
        switch(user.role){
            case 'SUPER_ADMIN':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$admin$2f$SuperAdminDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                    lineNumber: 39,
                    columnNumber: 16
                }, this);
            case 'COMPANY':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$company$2f$CompanyDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                    lineNumber: 41,
                    columnNumber: 16
                }, this);
            case 'AGENT':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$agent$2f$AgentDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                    lineNumber: 43,
                    columnNumber: 16
                }, this);
            case 'STAFF':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$staff$2f$StaffDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                    lineNumber: 45,
                    columnNumber: 16
                }, this);
            case 'CASHIER':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$cashier$2f$CashierDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                    lineNumber: 47,
                    columnNumber: 16
                }, this);
            case 'CUSTOMER':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$customer$2f$CustomerDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                    lineNumber: 49,
                    columnNumber: 16
                }, this);
            case 'ACCOUNTANT':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$accountant$2f$AccountantDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                    lineNumber: 51,
                    columnNumber: 16
                }, this);
            default:
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$landing$2f$LandingPage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                    lineNumber: 53,
                    columnNumber: 16
                }, this);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$contexts$2f$SettingsContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SettingsProvider"], {
        children: [
            renderDashboard(),
            user && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$shared$2f$AIChatbot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                fileName: "[project]/Desktop/reallll/src/app/page.tsx",
                lineNumber: 60,
                columnNumber: 16
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Desktop/reallll/src/app/page.tsx",
        lineNumber: 58,
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
        lineNumber: 66,
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

//# sourceMappingURL=Desktop_reallll_src_9b9fffeb._.js.map