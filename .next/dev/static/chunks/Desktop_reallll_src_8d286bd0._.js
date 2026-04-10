(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/Desktop/reallll/src/components/ui/sonner.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Toaster",
    ()=>Toaster
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next-themes/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
const Toaster = ({ ...props })=>{
    _s();
    const { theme = "system" } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Toaster"], {
        theme: theme,
        className: "toaster group",
        style: {
            "--normal-bg": "var(--popover)",
            "--normal-text": "var(--popover-foreground)",
            "--normal-border": "var(--border)"
        },
        ...props
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/components/ui/sonner.tsx",
        lineNumber: 10,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(Toaster, "EriOrahfenYKDCErPq+L6926Dw4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"]
    ];
});
_c = Toaster;
;
var _c;
__turbopack_context__.k.register(_c, "Toaster");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/lib/firebase.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "auth",
    ()=>auth,
    "googleProvider",
    ()=>googleProvider,
    "initRecaptcha",
    ()=>initRecaptcha,
    "sendPhoneOTP",
    ()=>sendPhoneOTP,
    "signInWithEmail",
    ()=>signInWithEmail,
    "signInWithGoogle",
    ()=>signInWithGoogle,
    "signOutUser",
    ()=>signOutUser,
    "signUpWithEmail",
    ()=>signUpWithEmail,
    "verifyPhoneOTP",
    ()=>verifyPhoneOTP
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/firebase/app/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/@firebase/app/dist/esm/index.esm.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/firebase/auth/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/@firebase/auth/dist/esm/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$firebase$2f$analytics$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/firebase/analytics/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$analytics$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/@firebase/analytics/dist/esm/index.esm.js [app-client] (ecmascript)");
;
;
;
// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCF4gb2yUKlONY4MzUzZkP3pHQKPWmirmM",
    authDomain: "moneymitra-70b76.firebaseapp.com",
    projectId: "moneymitra-70b76",
    storageBucket: "moneymitra-70b76.firebasestorage.app",
    messagingSenderId: "134001766587",
    appId: "1:134001766587:web:f9912f485295b51b93f99e",
    measurementId: "G-HEY81VX5T1"
};
// Initialize Firebase
const app = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initializeApp"])(firebaseConfig);
// Initialize Analytics safely (it only works on the browser/client-side)
if ("TURBOPACK compile-time truthy", 1) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$analytics$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isSupported"])().then((supported)=>{
        if (supported) (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$analytics$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAnalytics"])(app);
    });
}
const auth = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAuth"])(app);
const googleProvider = new __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GoogleAuthProvider"]();
const signInWithGoogle = async ()=>{
    try {
        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["signInWithPopup"])(auth, googleProvider);
        return {
            success: true,
            user: result.user
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};
const signInWithEmail = async (email, password)=>{
    try {
        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["signInWithEmailAndPassword"])(auth, email, password);
        return {
            success: true,
            user: result.user
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};
const signUpWithEmail = async (email, password)=>{
    try {
        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createUserWithEmailAndPassword"])(auth, email, password);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sendEmailVerification"])(result.user);
        return {
            success: true,
            user: result.user
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};
const signOutUser = async ()=>{
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["signOut"])(auth);
        return {
            success: true
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};
const initRecaptcha = (buttonId)=>{
    if ("TURBOPACK compile-time truthy", 1) {
        window.recaptchaVerifier = new __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RecaptchaVerifier"](auth, buttonId, {
            size: 'invisible',
            callback: ()=>{}
        });
    }
};
const sendPhoneOTP = async (phoneNumber, buttonId)=>{
    try {
        initRecaptcha(buttonId);
        const appVerifier = window.recaptchaVerifier;
        const provider = new __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PhoneAuthProvider"](auth);
        const verificationId = await provider.verifyPhoneNumber(phoneNumber, appVerifier);
        return {
            success: true,
            verificationId
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};
const verifyPhoneOTP = async (verificationId, otp)=>{
    try {
        const credential = __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PhoneAuthProvider"].credential(verificationId, otp);
        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["signInWithCredential"])(auth, credential);
        return {
            success: true,
            user: result.user
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/contexts/AuthContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/firebase/auth/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/@firebase/auth/dist/esm/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/lib/firebase.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
// Helper to get initial user from sessionStorage (client-side only)
function getInitialUser() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        const demoUserStr = sessionStorage.getItem('demoUser');
        if (demoUserStr) {
            const storedUser = JSON.parse(demoUserStr);
            console.log('[Auth] Restored user from sessionStorage:', storedUser.email, storedUser.role);
            return storedUser;
        }
    } catch  {
    // Ignore errors
    }
    return null;
}
// Helper to get initial loading state
function getInitialLoading() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    // If we have a user in sessionStorage, we're not loading
    return !sessionStorage.getItem('demoUser');
}
function AuthProvider({ children }) {
    _s();
    // Use lazy initializers to read from sessionStorage during initial render
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [firebaseUser, setFirebaseUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const initializedRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    const fetchUserData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[fetchUserData]": async (fbUser)=>{
            try {
                const idToken = await fbUser.getIdToken();
                const response = await fetch('/api/auth/sync', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({
                        email: fbUser.email,
                        firebaseUid: fbUser.uid,
                        name: fbUser.displayName,
                        profilePicture: fbUser.photoURL,
                        phone: fbUser.phoneNumber
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        }
    }["AuthProvider.useCallback[fetchUserData]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthProvider.useEffect": ()=>{
            // Prevent double initialization
            if (initializedRef.current) return;
            initializedRef.current = true;
            // 1. Try to restore from sessionStorage FIRST (fastest)
            const storedUser = getInitialUser();
            if (storedUser) {
                setUser(storedUser);
                setLoading(false);
                return;
            }
            // 2. No cached user, check Firebase auth
            const unsubscribe = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["onAuthStateChanged"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"], {
                "AuthProvider.useEffect.unsubscribe": async (fbUser)=>{
                    setFirebaseUser(fbUser);
                    if (fbUser) {
                        await fetchUserData(fbUser);
                        setLoading(false);
                    } else {
                        setLoading(false);
                    }
                }
            }["AuthProvider.useEffect.unsubscribe"]);
            return ({
                "AuthProvider.useEffect": ()=>unsubscribe()
            })["AuthProvider.useEffect"];
        }
    }["AuthProvider.useEffect"], [
        fetchUserData
    ]);
    const signIn = async (email, password)=>{
        setLoading(true);
        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["signInWithEmail"])(email, password);
        if (!result.success) {
            setLoading(false);
            return {
                success: false,
                error: result.error
            };
        }
        return {
            success: true
        };
    };
    const signUp = async (email, password, name)=>{
        setLoading(true);
        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["signInWithEmail"])(email, password);
        if (!result.success) {
            setLoading(false);
            return {
                success: false,
                error: result.error
            };
        }
        return {
            success: true
        };
    };
    const signInGoogle = async ()=>{
        setLoading(true);
        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["signInWithGoogle"])();
        if (!result.success) {
            setLoading(false);
            return {
                success: false,
                error: result.error
            };
        }
        return {
            success: true
        };
    };
    const signOut = async ()=>{
        if ("TURBOPACK compile-time truthy", 1) {
            sessionStorage.removeItem('demoUser');
        }
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["signOut"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"]);
        setUser(null);
        setFirebaseUser(null);
    };
    const refreshUser = async ()=>{
        if (firebaseUser) {
            await fetchUserData(firebaseUser);
        } else if (user?.id) {
            // For demo/non-Firebase users, fetch fresh data from API
            try {
                const response = await fetch(`/api/user/details?userId=${user.id}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.user) {
                        const updatedUser = {
                            ...user,
                            ...data.user
                        };
                        setUser(updatedUser);
                        if ("TURBOPACK compile-time truthy", 1) {
                            sessionStorage.setItem('demoUser', JSON.stringify(updatedUser));
                            localStorage.setItem('lastActivity', Date.now().toString());
                        }
                    }
                }
            } catch (error) {
                console.error('Error refreshing user:', error);
            }
        }
    };
    const customerRegister = async (data)=>{
        setLoading(true);
        try {
            const response = await fetch('/api/auth/customer-register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (response.ok && result.success) {
                setUser(result.user);
                if ("TURBOPACK compile-time truthy", 1) {
                    sessionStorage.setItem('demoUser', JSON.stringify(result.user));
                    localStorage.setItem('lastActivity', Date.now().toString());
                }
                setLoading(false);
                return {
                    success: true,
                    user: result.user
                };
            }
            setLoading(false);
            return {
                success: false,
                error: result.error || 'Registration failed'
            };
        } catch  {
            setLoading(false);
            return {
                success: false,
                error: 'Network error'
            };
        }
    };
    const customerLogin = async (email, password)=>{
        setLoading(true);
        try {
            const response = await fetch('/api/auth/customer-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });
            const result = await response.json();
            if (response.ok && result.success) {
                setUser(result.user);
                if ("TURBOPACK compile-time truthy", 1) {
                    sessionStorage.setItem('demoUser', JSON.stringify(result.user));
                    localStorage.setItem('lastActivity', Date.now().toString());
                }
                setLoading(false);
                return {
                    success: true,
                    user: result.user
                };
            }
            setLoading(false);
            return {
                success: false,
                error: result.error || 'Login failed'
            };
        } catch  {
            setLoading(false);
            return {
                success: false,
                error: 'Network error'
            };
        }
    };
    const forgotPassword = async (email)=>{
        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email
                })
            });
            const result = await response.json();
            return {
                success: response.ok,
                error: result.error,
                verificationCode: result.verificationCode
            };
        } catch  {
            return {
                success: false,
                error: 'Network error'
            };
        }
    };
    const resetPassword = async (email, code, newPassword)=>{
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    verificationCode: code,
                    newPassword
                })
            });
            const result = await response.json();
            return {
                success: response.ok,
                error: result.error
            };
        } catch  {
            return {
                success: false,
                error: 'Network error'
            };
        }
    };
    const staffLogin = async (email, password, verificationCode)=>{
        setLoading(true);
        try {
            const response = await fetch('/api/auth/staff-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    verificationCode
                })
            });
            const result = await response.json();
            if (result.requiresCode) {
                setLoading(false);
                return {
                    success: false,
                    requiresCode: true
                };
            }
            if (response.ok && result.success) {
                setUser(result.user);
                if ("TURBOPACK compile-time truthy", 1) {
                    sessionStorage.setItem('demoUser', JSON.stringify(result.user));
                    localStorage.setItem('lastActivity', Date.now().toString());
                }
                setLoading(false);
                return {
                    success: true,
                    user: result.user
                };
            }
            setLoading(false);
            return {
                success: false,
                error: result.error || 'Login failed'
            };
        } catch  {
            setLoading(false);
            return {
                success: false,
                error: 'Network error'
            };
        }
    };
    const trackLocation = async (action, loanApplicationId)=>{
        if (!user?.id) return;
        try {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(async (position)=>{
                    await fetch('/api/location/track', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userId: user.id,
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            action,
                            loanApplicationId
                        })
                    });
                });
            }
        } catch (error) {
            console.error('Location tracking error:', error);
        }
    };
    const loginAsDemo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[loginAsDemo]": async ()=>{
            console.log('Demo login disabled - use email/password authentication');
        }
    }["AuthProvider.useCallback[loginAsDemo]"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: {
            user,
            firebaseUser,
            loading,
            signIn,
            signUp,
            signInGoogle,
            signOut,
            refreshUser,
            loginAsDemo,
            customerRegister,
            customerLogin,
            forgotPassword,
            resetPassword,
            staffLogin,
            trackLocation
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/contexts/AuthContext.tsx",
        lineNumber: 376,
        columnNumber: 5
    }, this);
}
_s(AuthProvider, "g00OS8P6aY7mt0C/h8falDPFRBQ=");
_c = AuthProvider;
function useAuth() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
_s1(useAuth, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "AuthProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/contexts/CompanyContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CompanyProvider",
    ()=>CompanyProvider,
    "useCompany",
    ()=>useCompany
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
const CompanyContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function CompanyProvider({ children }) {
    _s();
    const [selectedCompanyId, setSelectedCompanyId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('all');
    const [companies, setCompanies] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const refreshCompanies = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "CompanyProvider.useCallback[refreshCompanies]": async ()=>{
            try {
                setLoading(true);
                // Use noCache=true to ensure fresh data after deletions
                const response = await fetch('/api/company?isActive=true&noCache=true');
                const data = await response.json();
                if (data.companies) {
                    setCompanies(data.companies.map({
                        "CompanyProvider.useCallback[refreshCompanies]": (c)=>({
                                id: c.id,
                                name: c.name,
                                code: c.code,
                                isActive: c.isActive
                            })
                    }["CompanyProvider.useCallback[refreshCompanies]"]));
                } else {
                    setCompanies([]);
                }
            } catch (error) {
                console.error('Error fetching companies:', error);
                setCompanies([]);
            } finally{
                setLoading(false);
            }
        }
    }["CompanyProvider.useCallback[refreshCompanies]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CompanyProvider.useEffect": ()=>{
            refreshCompanies();
        }
    }["CompanyProvider.useEffect"], [
        refreshCompanies
    ]);
    const selectedCompany = selectedCompanyId === 'all' ? null : companies.find((c)=>c.id === selectedCompanyId) || null;
    const isMultiCompanyView = selectedCompanyId === 'all';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CompanyContext.Provider, {
        value: {
            selectedCompanyId,
            selectedCompany,
            companies,
            setSelectedCompanyId,
            isMultiCompanyView,
            loading,
            refreshCompanies
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/contexts/CompanyContext.tsx",
        lineNumber: 64,
        columnNumber: 5
    }, this);
}
_s(CompanyProvider, "sOmubNb9MTvnnsU3wh+E2TuF1iM=");
_c = CompanyProvider;
function useCompany() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(CompanyContext);
    if (context === undefined) {
        throw new Error('useCompany must be used within a CompanyProvider');
    }
    return context;
}
_s1(useCompany, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "CompanyProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/contexts/SettingsContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SettingsProvider",
    ()=>SettingsProvider,
    "default",
    ()=>__TURBOPACK__default__export__,
    "useCompanyBranding",
    ()=>useCompanyBranding,
    "useCurrencySettings",
    ()=>useCurrencySettings,
    "useSettings",
    ()=>useSettings
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature();
'use client';
;
// Default settings with sensible defaults
const defaultSettings = {
    companyName: 'MM Square',
    companyLogo: '/logo.png',
    companyTagline: 'Your Trusted Financial Partner',
    companyEmail: 'support@mmsquare.com',
    companyPhone: '+91 1800-123-4567',
    companyAddress: 'Bhavnagar, Gujarat, India',
    defaultCurrency: 'INR',
    currencySymbol: '₹',
    timezone: 'Asia/Kolkata',
    defaultInterestRate: 12,
    minInterestRate: 8,
    maxInterestRate: 24,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    emailNotifications: true,
    smsNotifications: true,
    emiReminders: true,
    fraudAlerts: true,
    twoFactorAuth: false,
    ipWhitelist: false
};
// Local storage key for caching
const SETTINGS_STORAGE_KEY = 'app_settings_cache';
const SETTINGS_TIMESTAMP_KEY = 'app_settings_timestamp';
// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;
// Memory cache for current session
let memoryCache = null;
let memoryCacheTimestamp = 0;
// Create context with default values
const SettingsContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])({
    settings: defaultSettings,
    loading: true,
    error: null,
    refreshSettings: async ()=>{},
    updateSettings: async ()=>{}
});
// Helper function to get cached settings from localStorage
function getCachedSettings() {
    try {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        // Check memory cache first (fastest)
        if (memoryCache && Date.now() - memoryCacheTimestamp < CACHE_DURATION) {
            return {
                settings: memoryCache,
                isValid: true
            };
        }
        // Check localStorage cache
        const cachedData = localStorage.getItem(SETTINGS_STORAGE_KEY);
        const cachedTimestamp = localStorage.getItem(SETTINGS_TIMESTAMP_KEY);
        if (cachedData && cachedTimestamp) {
            const timestamp = parseInt(cachedTimestamp, 10);
            const isValid = Date.now() - timestamp < CACHE_DURATION;
            if (isValid) {
                const parsedSettings = JSON.parse(cachedData);
                // Update memory cache
                memoryCache = parsedSettings;
                memoryCacheTimestamp = timestamp;
                return {
                    settings: parsedSettings,
                    isValid: true
                };
            }
            return {
                settings: JSON.parse(cachedData),
                isValid: false
            };
        }
        return {
            settings: null,
            isValid: false
        };
    } catch  {
        return {
            settings: null,
            isValid: false
        };
    }
}
// Helper function to save settings to cache
function saveToCache(settings) {
    try {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        const now = Date.now();
        // Save to memory cache
        memoryCache = settings;
        memoryCacheTimestamp = now;
        // Save to localStorage
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        localStorage.setItem(SETTINGS_TIMESTAMP_KEY, now.toString());
    } catch (error) {
        console.error('Failed to save settings to cache:', error);
    }
}
// Helper function to clear cache
function clearCache() {
    memoryCache = null;
    memoryCacheTimestamp = 0;
    if ("TURBOPACK compile-time truthy", 1) {
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
        localStorage.removeItem(SETTINGS_TIMESTAMP_KEY);
    }
}
function SettingsProvider({ children }) {
    _s();
    // Initialize with default settings to avoid hydration mismatch
    // Cached settings will be loaded in useEffect after mount
    const [settings, setSettings] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(defaultSettings);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Use ref to track if we've already fetched settings
    const hasFetchedRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    // Use ref to prevent multiple simultaneous fetches
    const fetchingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    // Use ref to track if hydration is complete
    const hydratedRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    // Fetch settings from API
    const fetchSettings = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SettingsProvider.useCallback[fetchSettings]": async (forceRefresh = false)=>{
            // Prevent duplicate fetches
            if (fetchingRef.current) return;
            // Check if we have valid cached data
            if (!forceRefresh) {
                const { settings: cachedSettings, isValid } = getCachedSettings();
                if (isValid && cachedSettings) {
                    setSettings({
                        ...defaultSettings,
                        ...cachedSettings
                    });
                    setLoading(false);
                    return;
                }
            }
            fetchingRef.current = true;
            setError(null);
            try {
                const response = await fetch('/api/settings', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    // Use cache for GET requests, but bypass if force refresh
                    cache: forceRefresh ? 'no-store' : 'default'
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch settings: ${response.status}`);
                }
                const data = await response.json();
                if (data.settings) {
                    // Merge with defaults to ensure all fields are present
                    const mergedSettings = {
                        ...defaultSettings,
                        ...data.settings
                    };
                    // Update state
                    setSettings(mergedSettings);
                    // Save to cache
                    saveToCache(mergedSettings);
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
                console.error('Error fetching settings:', err);
                setError(errorMessage);
                // On error, try to use cached settings even if expired
                const { settings: cachedSettings } = getCachedSettings();
                if (cachedSettings) {
                    setSettings({
                        ...defaultSettings,
                        ...cachedSettings
                    });
                }
            } finally{
                setLoading(false);
                fetchingRef.current = false;
            }
        }
    }["SettingsProvider.useCallback[fetchSettings]"], []);
    // Refresh settings (force refresh from API)
    const refreshSettings = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SettingsProvider.useCallback[refreshSettings]": async ()=>{
            clearCache();
            await fetchSettings(true);
        }
    }["SettingsProvider.useCallback[refreshSettings]"], [
        fetchSettings
    ]);
    // Update settings via API
    const updateSettings = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SettingsProvider.useCallback[updateSettings]": async (newSettings)=>{
            try {
                const response = await fetch('/api/settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        settings: newSettings
                    })
                });
                if (!response.ok) {
                    throw new Error(`Failed to update settings: ${response.status}`);
                }
                const result = await response.json();
                if (result.success) {
                    // Merge new settings with current settings
                    const updatedSettings = {
                        ...settings,
                        ...newSettings
                    };
                    // Update state
                    setSettings(updatedSettings);
                    // Update cache
                    saveToCache(updatedSettings);
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
                console.error('Error updating settings:', err);
                throw new Error(errorMessage);
            }
        }
    }["SettingsProvider.useCallback[updateSettings]"], [
        settings
    ]);
    // Fetch settings on mount (only once)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SettingsProvider.useEffect": ()=>{
            if (!hasFetchedRef.current) {
                hasFetchedRef.current = true;
                // First, try to load from cache for instant display
                if (!hydratedRef.current) {
                    hydratedRef.current = true;
                    const { settings: cachedSettings, isValid } = getCachedSettings();
                    if (isValid && cachedSettings) {
                        setSettings({
                            ...defaultSettings,
                            ...cachedSettings
                        });
                        setLoading(false);
                        // Still fetch in background to ensure fresh data
                        fetchSettings(true);
                        return;
                    }
                }
                fetchSettings();
            }
        }
    }["SettingsProvider.useEffect"], [
        fetchSettings
    ]);
    // Memoize context value to prevent unnecessary re-renders
    const contextValue = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "SettingsProvider.useMemo[contextValue]": ()=>({
                settings,
                loading,
                error,
                refreshSettings,
                updateSettings
            })
    }["SettingsProvider.useMemo[contextValue]"], [
        settings,
        loading,
        error,
        refreshSettings,
        updateSettings
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SettingsContext.Provider, {
        value: contextValue,
        children: children
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/contexts/SettingsContext.tsx",
        lineNumber: 320,
        columnNumber: 5
    }, this);
}
_s(SettingsProvider, "E9pv6fGfzgDAoxpDPq0Gw8dSibQ=");
_c = SettingsProvider;
function useSettings() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
_s1(useSettings, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
function useCompanyBranding() {
    _s2();
    const { settings } = useSettings();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "useCompanyBranding.useMemo": ()=>({
                companyName: settings.companyName,
                companyLogo: settings.companyLogo,
                companyTagline: settings.companyTagline
            })
    }["useCompanyBranding.useMemo"], [
        settings.companyName,
        settings.companyLogo,
        settings.companyTagline
    ]);
}
_s2(useCompanyBranding, "fiitAGr+8ii9sDNBfIrX8GUaKAc=", false, function() {
    return [
        useSettings
    ];
});
function useCurrencySettings() {
    _s3();
    const { settings } = useSettings();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "useCurrencySettings.useMemo": ()=>({
                currency: settings.defaultCurrency,
                symbol: settings.currencySymbol,
                timezone: settings.timezone
            })
    }["useCurrencySettings.useMemo"], [
        settings.defaultCurrency,
        settings.currencySymbol,
        settings.timezone
    ]);
}
_s3(useCurrencySettings, "fiitAGr+8ii9sDNBfIrX8GUaKAc=", false, function() {
    return [
        useSettings
    ];
});
const __TURBOPACK__default__export__ = SettingsContext;
var _c;
__turbopack_context__.k.register(_c, "SettingsProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/contexts/SecurityContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SecurityProvider",
    ()=>SecurityProvider,
    "useSecurity",
    ()=>useSecurity,
    "withSecurity",
    ()=>withSecurity
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
;
const SecurityContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(null);
// Default session timeout: 30 minutes
const DEFAULT_SESSION_TIMEOUT = 30 * 60 * 1000;
// Warning shown 5 minutes before timeout
const WARNING_THRESHOLD = 5 * 60 * 1000;
// Activity check interval: 1 minute
const ACTIVITY_CHECK_INTERVAL = 60 * 1000;
function SecurityProvider({ children }) {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    // Session state - Initialize with consistent values to avoid hydration mismatch
    const [lastActivity, setLastActivity] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0); // Will be set in useEffect
    const [isAuthenticated, setIsAuthenticated] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [showWarning, setShowWarning] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [warningTimeRemaining, setWarningTimeRemaining] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    // Security settings - DISABLE security features by default to prevent login issues
    const [sessionTimeout, setSessionTimeout] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(DEFAULT_SESSION_TIMEOUT);
    const [enableSecurityFeatures, setEnableSecurityFeatures] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Real-time updates - disabled by default to prevent DB connection limit issues
    const [isRealTimeEnabled, setRealTimeEnabled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [lastUpdate, setLastUpdate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0); // Will be set in useEffect
    // Refs
    const activityTimeoutRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const warningIntervalRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const realTimeIntervalRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Helper to check if user has active session
    const hasActiveSession = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SecurityProvider.useCallback[hasActiveSession]": ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            return !!sessionStorage.getItem('demoUser');
        }
    }["SecurityProvider.useCallback[hasActiveSession]"], []);
    // Handle session timeout - defined first since it's used by other functions
    const handleSessionTimeout = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SecurityProvider.useCallback[handleSessionTimeout]": ()=>{
            // Always check for active session before timing out
            if (hasActiveSession()) {
                console.log('[Security] Active session found, skipping timeout');
                localStorage.setItem('lastActivity', Date.now().toString());
                return;
            }
            if (!enableSecurityFeatures) return;
            console.log('[Security] No active session, timing out');
            // Clear auth data
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('lastActivity');
            sessionStorage.clear();
            setIsAuthenticated(false);
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error('Session Expired', {
                description: 'Your session has expired due to inactivity. Please log in again.'
            });
            // Redirect to home page (which shows landing/login)
            router.push('/');
        }
    }["SecurityProvider.useCallback[handleSessionTimeout]"], [
        enableSecurityFeatures,
        router,
        hasActiveSession
    ]);
    // Track user activity
    const trackActivity = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SecurityProvider.useCallback[trackActivity]": ()=>{
            if (!enableSecurityFeatures) return;
            setLastActivity(Date.now());
            setShowWarning(false);
            // Store last activity in localStorage
            localStorage.setItem('lastActivity', Date.now().toString());
            // Clear existing timeout
            if (activityTimeoutRef.current) {
                clearTimeout(activityTimeoutRef.current);
            }
            // Set new timeout
            activityTimeoutRef.current = setTimeout({
                "SecurityProvider.useCallback[trackActivity]": ()=>{
                    handleSessionTimeout();
                }
            }["SecurityProvider.useCallback[trackActivity]"], sessionTimeout);
        }
    }["SecurityProvider.useCallback[trackActivity]"], [
        enableSecurityFeatures,
        sessionTimeout,
        handleSessionTimeout
    ]);
    // Reset session
    const resetSession = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SecurityProvider.useCallback[resetSession]": ()=>{
            setLastActivity(Date.now());
            setShowWarning(false);
            setIsAuthenticated(true);
            localStorage.setItem('lastActivity', Date.now().toString());
        }
    }["SecurityProvider.useCallback[resetSession]"], []);
    // Extend session
    const extendSession = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SecurityProvider.useCallback[extendSession]": ()=>{
            trackActivity();
            setShowWarning(false);
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Session Extended', {
                description: 'Your session has been extended.'
            });
        }
    }["SecurityProvider.useCallback[extendSession]"], [
        trackActivity
    ]);
    // Refresh data callback
    const refreshData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SecurityProvider.useCallback[refreshData]": ()=>{
            setLastUpdate(Date.now());
            // Dispatch custom event for components to listen to
            window.dispatchEvent(new CustomEvent('dataRefresh', {
                detail: {
                    timestamp: Date.now()
                }
            }));
        }
    }["SecurityProvider.useCallback[refreshData]"], []);
    // Check for session timeout on mount and activity
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SecurityProvider.useEffect": ()=>{
            if (!enableSecurityFeatures) return;
            // Check if there's a valid session in sessionStorage (user logged in this tab)
            if (hasActiveSession()) {
                // Valid session exists - update lastActivity to now
                localStorage.setItem('lastActivity', Date.now().toString());
                console.log('[Security] Active session found on mount');
            } else {
                // Only check for expired session if there's NO active session in this tab
                const storedActivity = localStorage.getItem('lastActivity');
                if (storedActivity) {
                    const timeSinceLastActivity = Date.now() - parseInt(storedActivity);
                    if (timeSinceLastActivity > sessionTimeout) {
                        // Old session expired, but don't redirect - let user login fresh
                        localStorage.removeItem('lastActivity');
                        console.log('[Security] Old expired session found, cleared');
                    }
                }
            }
            // Set up activity listeners
            const events = [
                'mousedown',
                'mousemove',
                'keypress',
                'scroll',
                'touchstart',
                'click'
            ];
            const handleUserActivity = {
                "SecurityProvider.useEffect.handleUserActivity": ()=>{
                    trackActivity();
                }
            }["SecurityProvider.useEffect.handleUserActivity"];
            events.forEach({
                "SecurityProvider.useEffect": (event)=>{
                    document.addEventListener(event, handleUserActivity, {
                        passive: true
                    });
                }
            }["SecurityProvider.useEffect"]);
            // Set up warning check interval
            warningIntervalRef.current = setInterval({
                "SecurityProvider.useEffect": ()=>{
                    const timeSinceActivity = Date.now() - lastActivity;
                    const timeRemaining = sessionTimeout - timeSinceActivity;
                    if (timeRemaining <= WARNING_THRESHOLD && timeRemaining > 0) {
                        setShowWarning(true);
                        setWarningTimeRemaining(Math.ceil(timeRemaining / 1000 / 60)); // in minutes
                    } else {
                        setShowWarning(false);
                    }
                }
            }["SecurityProvider.useEffect"], ACTIVITY_CHECK_INTERVAL);
            // Set up real-time update interval (if enabled)
            if (isRealTimeEnabled) {
                realTimeIntervalRef.current = setInterval({
                    "SecurityProvider.useEffect": ()=>{
                        refreshData();
                    }
                }["SecurityProvider.useEffect"], 30000); // Every 30 seconds
            }
            // Handle page visibility change (refresh/logout on tab switch)
            const handleVisibilityChange = {
                "SecurityProvider.useEffect.handleVisibilityChange": ()=>{
                    if (document.visibilityState === 'visible') {
                        // Check if there's an active session first
                        if (hasActiveSession()) {
                            localStorage.setItem('lastActivity', Date.now().toString());
                            refreshData();
                            return;
                        }
                        // Check if session expired while tab was hidden
                        const storedActivity = localStorage.getItem('lastActivity');
                        if (storedActivity) {
                            const timeSinceLastActivity = Date.now() - parseInt(storedActivity);
                            if (timeSinceLastActivity > sessionTimeout) {
                                handleSessionTimeout();
                            } else {
                                // Refresh data when tab becomes visible
                                refreshData();
                            }
                        }
                    }
                }
            }["SecurityProvider.useEffect.handleVisibilityChange"];
            document.addEventListener('visibilitychange', handleVisibilityChange);
            // Handle beforeunload (page refresh/close)
            const handleBeforeUnload = {
                "SecurityProvider.useEffect.handleBeforeUnload": ()=>{
                    localStorage.setItem('lastActivity', Date.now().toString());
                }
            }["SecurityProvider.useEffect.handleBeforeUnload"];
            window.addEventListener('beforeunload', handleBeforeUnload);
            return ({
                "SecurityProvider.useEffect": ()=>{
                    events.forEach({
                        "SecurityProvider.useEffect": (event)=>{
                            document.removeEventListener(event, handleUserActivity);
                        }
                    }["SecurityProvider.useEffect"]);
                    document.removeEventListener('visibilitychange', handleVisibilityChange);
                    window.removeEventListener('beforeunload', handleBeforeUnload);
                    if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
                    if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
                    if (realTimeIntervalRef.current) clearInterval(realTimeIntervalRef.current);
                }
            })["SecurityProvider.useEffect"];
        }
    }["SecurityProvider.useEffect"], [
        enableSecurityFeatures,
        sessionTimeout,
        isRealTimeEnabled,
        trackActivity,
        handleSessionTimeout,
        lastActivity,
        refreshData,
        hasActiveSession
    ]);
    // Effect for real-time updates toggle
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SecurityProvider.useEffect": ()=>{
            if (isRealTimeEnabled && !realTimeIntervalRef.current) {
                realTimeIntervalRef.current = setInterval({
                    "SecurityProvider.useEffect": ()=>{
                        refreshData();
                    }
                }["SecurityProvider.useEffect"], 30000);
            } else if (!isRealTimeEnabled && realTimeIntervalRef.current) {
                clearInterval(realTimeIntervalRef.current);
                realTimeIntervalRef.current = null;
            }
        }
    }["SecurityProvider.useEffect"], [
        isRealTimeEnabled,
        refreshData
    ]);
    const value = {
        sessionTimeout,
        lastActivity,
        isAuthenticated,
        trackActivity,
        resetSession,
        showWarning,
        warningTimeRemaining,
        extendSession,
        enableSecurityFeatures,
        setEnableSecurityFeatures,
        isRealTimeEnabled,
        setRealTimeEnabled,
        lastUpdate,
        refreshData
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SecurityContext.Provider, {
        value: value,
        children: [
            children,
            showWarning && enableSecurityFeatures && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-[9999] flex items-center justify-center bg-black/50",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4 animate-in fade-in zoom-in duration-200",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-4 mb-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        className: "w-6 h-6 text-amber-600",
                                        fill: "none",
                                        viewBox: "0 0 24 24",
                                        stroke: "currentColor",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            strokeLinecap: "round",
                                            strokeLinejoin: "round",
                                            strokeWidth: 2,
                                            d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/contexts/SecurityContext.tsx",
                                            lineNumber: 281,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/Desktop/reallll/src/contexts/SecurityContext.tsx",
                                        lineNumber: 280,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/contexts/SecurityContext.tsx",
                                    lineNumber: 279,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "text-lg font-semibold text-gray-900",
                                            children: "Session Timeout Warning"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/contexts/SecurityContext.tsx",
                                            lineNumber: 285,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm text-gray-500",
                                            children: "Your session will expire soon"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/contexts/SecurityContext.tsx",
                                            lineNumber: 286,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/contexts/SecurityContext.tsx",
                                    lineNumber: 284,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/contexts/SecurityContext.tsx",
                            lineNumber: 278,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-gray-600 mb-4",
                            children: [
                                "Due to inactivity, your session will expire in ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "font-bold text-amber-600",
                                    children: [
                                        warningTimeRemaining,
                                        " minute",
                                        warningTimeRemaining !== 1 ? 's' : ''
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/contexts/SecurityContext.tsx",
                                    lineNumber: 290,
                                    columnNumber: 62
                                }, this),
                                ". Would you like to extend your session?"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/contexts/SecurityContext.tsx",
                            lineNumber: 289,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>{
                                        handleSessionTimeout();
                                    },
                                    className: "flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors",
                                    children: "Logout Now"
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/contexts/SecurityContext.tsx",
                                    lineNumber: 294,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: extendSession,
                                    className: "flex-1 px-4 py-2 text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors",
                                    children: "Extend Session"
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/contexts/SecurityContext.tsx",
                                    lineNumber: 302,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/contexts/SecurityContext.tsx",
                            lineNumber: 293,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Desktop/reallll/src/contexts/SecurityContext.tsx",
                    lineNumber: 277,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/Desktop/reallll/src/contexts/SecurityContext.tsx",
                lineNumber: 276,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Desktop/reallll/src/contexts/SecurityContext.tsx",
        lineNumber: 271,
        columnNumber: 5
    }, this);
}
_s(SecurityProvider, "NW6WYipQyWypGrP7pUeZmAb9/OM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = SecurityProvider;
function useSecurity() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(SecurityContext);
    if (!context) {
        throw new Error('useSecurity must be used within a SecurityProvider');
    }
    return context;
}
_s1(useSecurity, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
function withSecurity(Component) {
    var _s = __turbopack_context__.k.signature();
    return _s(function ProtectedRoute(props) {
        _s();
        const { isAuthenticated, trackActivity } = useSecurity();
        const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
            "withSecurity.ProtectedRoute.useEffect": ()=>{
                if (!isAuthenticated) {
                    router.push('/');
                }
            }
        }["withSecurity.ProtectedRoute.useEffect"], [
            isAuthenticated,
            router
        ]);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
            "withSecurity.ProtectedRoute.useEffect": ()=>{
                trackActivity();
            }
        }["withSecurity.ProtectedRoute.useEffect"], [
            trackActivity
        ]);
        if (!isAuthenticated) {
            return null;
        }
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Component, {
            ...props
        }, void 0, false, {
            fileName: "[project]/Desktop/reallll/src/contexts/SecurityContext.tsx",
            lineNumber: 344,
            columnNumber: 12
        }, this);
    }, "ejC/01JBFHuPhYU7rj8RiR9NImE=", false, function() {
        return [
            useSecurity,
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
        ];
    });
}
var _c;
__turbopack_context__.k.register(_c, "SecurityProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/providers/QueryProvider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>QueryProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/@tanstack/query-core/build/modern/queryClient.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function QueryProvider({ children }) {
    _s();
    const [queryClient] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "QueryProvider.useState": ()=>new __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClient"]({
                defaultOptions: {
                    queries: {
                        // Stale time: data is fresh for 60 seconds (increased for better performance)
                        staleTime: 60 * 1000,
                        // Cache time: keep unused data for 10 minutes
                        gcTime: 10 * 60 * 1000,
                        // Don't refetch on window focus by default (reduces API calls)
                        refetchOnWindowFocus: false,
                        // Refetch on reconnect when internet comes back
                        refetchOnReconnect: true,
                        // Retry failed requests once
                        retry: 1,
                        // Retry delay with exponential backoff
                        retryDelay: {
                            "QueryProvider.useState": (attemptIndex)=>Math.min(1000 * 2 ** attemptIndex, 30000)
                        }["QueryProvider.useState"],
                        // Use structural sharing for better performance
                        structuralSharing: true,
                        // Don't refetch on mount if data exists
                        refetchOnMount: false
                    },
                    mutations: {
                        // Retry mutations once
                        retry: 1
                    }
                }
            })
    }["QueryProvider.useState"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClientProvider"], {
        client: queryClient,
        children: children
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/providers/QueryProvider.tsx",
        lineNumber: 38,
        columnNumber: 5
    }, this);
}
_s(QueryProvider, "zHxcbmFpQgTY+U772jwkrsVrW8s=");
_c = QueryProvider;
var _c;
__turbopack_context__.k.register(_c, "QueryProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/lib/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/components/ui/button.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Button",
    ()=>Button,
    "buttonVariants",
    ()=>buttonVariants
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/@radix-ui/react-slot/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/class-variance-authority/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/lib/utils.ts [app-client] (ecmascript)");
;
;
;
;
const buttonVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive", {
    variants: {
        variant: {
            default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
            destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
            outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
            secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
            ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
            link: "text-primary underline-offset-4 hover:underline"
        },
        size: {
            default: "h-9 px-4 py-2 has-[>svg]:px-3",
            sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
            lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
            icon: "size-9"
        }
    },
    defaultVariants: {
        variant: "default",
        size: "default"
    }
});
function Button({ className, variant, size, asChild = false, ...props }) {
    const Comp = asChild ? __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Slot"] : "button";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Comp, {
        "data-slot": "button",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(buttonVariants({
            variant,
            size,
            className
        })),
        ...props
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/components/ui/button.tsx",
        lineNumber: 51,
        columnNumber: 5
    }, this);
}
_c = Button;
;
var _c;
__turbopack_context__.k.register(_c, "Button");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/components/ui/card.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Card",
    ()=>Card,
    "CardAction",
    ()=>CardAction,
    "CardContent",
    ()=>CardContent,
    "CardDescription",
    ()=>CardDescription,
    "CardFooter",
    ()=>CardFooter,
    "CardHeader",
    ()=>CardHeader,
    "CardTitle",
    ()=>CardTitle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/lib/utils.ts [app-client] (ecmascript)");
;
;
function Card({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("bg-white text-gray-900 flex flex-col gap-6 rounded-xl border border-gray-200 py-6 shadow-sm", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/components/ui/card.tsx",
        lineNumber: 7,
        columnNumber: 5
    }, this);
}
_c = Card;
function CardHeader({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card-header",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/components/ui/card.tsx",
        lineNumber: 20,
        columnNumber: 5
    }, this);
}
_c1 = CardHeader;
function CardTitle({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card-title",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("leading-none font-semibold", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/components/ui/card.tsx",
        lineNumber: 33,
        columnNumber: 5
    }, this);
}
_c2 = CardTitle;
function CardDescription({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card-description",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-muted-foreground text-sm", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/components/ui/card.tsx",
        lineNumber: 43,
        columnNumber: 5
    }, this);
}
_c3 = CardDescription;
function CardAction({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card-action",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/components/ui/card.tsx",
        lineNumber: 53,
        columnNumber: 5
    }, this);
}
_c4 = CardAction;
function CardContent({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card-content",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-6", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/components/ui/card.tsx",
        lineNumber: 66,
        columnNumber: 5
    }, this);
}
_c5 = CardContent;
function CardFooter({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card-footer",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center px-6 [.border-t]:pt-6", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/components/ui/card.tsx",
        lineNumber: 76,
        columnNumber: 5
    }, this);
}
_c6 = CardFooter;
;
var _c, _c1, _c2, _c3, _c4, _c5, _c6;
__turbopack_context__.k.register(_c, "Card");
__turbopack_context__.k.register(_c1, "CardHeader");
__turbopack_context__.k.register(_c2, "CardTitle");
__turbopack_context__.k.register(_c3, "CardDescription");
__turbopack_context__.k.register(_c4, "CardAction");
__turbopack_context__.k.register(_c5, "CardContent");
__turbopack_context__.k.register(_c6, "CardFooter");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PWAInstallPrompt
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/ui/card.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/download.js [app-client] (ecmascript) <export default as Download>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$smartphone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Smartphone$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/smartphone.js [app-client] (ecmascript) <export default as Smartphone>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$share$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Share$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/share.js [app-client] (ecmascript) <export default as Share>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/plus.js [app-client] (ecmascript) <export default as Plus>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function PWAInstallPrompt() {
    _s();
    const [deferredPrompt, setDeferredPrompt] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [showPrompt, setShowPrompt] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showIOSInstructions, setShowIOSInstructions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isInstalled, setIsInstalled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Handle install prompt event
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PWAInstallPrompt.useEffect": ()=>{
            // Check if already installed
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
            if (isStandalone) {
                return;
            }
            // Check if iOS
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const handleBeforeInstallPrompt = {
                "PWAInstallPrompt.useEffect.handleBeforeInstallPrompt": (e)=>{
                    e.preventDefault();
                    setDeferredPrompt(e);
                    // Show prompt after a delay
                    const timer = setTimeout({
                        "PWAInstallPrompt.useEffect.handleBeforeInstallPrompt.timer": ()=>{
                            const dismissed = localStorage.getItem('pwa-install-dismissed');
                            if (!dismissed) {
                                setShowPrompt(true);
                            }
                        }
                    }["PWAInstallPrompt.useEffect.handleBeforeInstallPrompt.timer"], 5000);
                    return ({
                        "PWAInstallPrompt.useEffect.handleBeforeInstallPrompt": ()=>clearTimeout(timer)
                    })["PWAInstallPrompt.useEffect.handleBeforeInstallPrompt"];
                }
            }["PWAInstallPrompt.useEffect.handleBeforeInstallPrompt"];
            // For iOS, show install button after delay
            if (isIOS) {
                const timer = setTimeout({
                    "PWAInstallPrompt.useEffect.timer": ()=>{
                        const dismissed = localStorage.getItem('pwa-install-dismissed');
                        if (!dismissed) {
                            setShowPrompt(true);
                        }
                    }
                }["PWAInstallPrompt.useEffect.timer"], 5000);
                return ({
                    "PWAInstallPrompt.useEffect": ()=>clearTimeout(timer)
                })["PWAInstallPrompt.useEffect"];
            }
            window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            return ({
                "PWAInstallPrompt.useEffect": ()=>{
                    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
                }
            })["PWAInstallPrompt.useEffect"];
        }
    }["PWAInstallPrompt.useEffect"], []);
    // Listen for app installed event
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PWAInstallPrompt.useEffect": ()=>{
            const handleAppInstalled = {
                "PWAInstallPrompt.useEffect.handleAppInstalled": ()=>{
                    setIsInstalled(true);
                    setShowPrompt(false);
                    setDeferredPrompt(null);
                }
            }["PWAInstallPrompt.useEffect.handleAppInstalled"];
            window.addEventListener('appinstalled', handleAppInstalled);
            return ({
                "PWAInstallPrompt.useEffect": ()=>{
                    window.removeEventListener('appinstalled', handleAppInstalled);
                }
            })["PWAInstallPrompt.useEffect"];
        }
    }["PWAInstallPrompt.useEffect"], []);
    const handleInstallClick = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "PWAInstallPrompt.useCallback[handleInstallClick]": async ()=>{
            if (!deferredPrompt) return;
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsInstalled(true);
            }
            setDeferredPrompt(null);
            setShowPrompt(false);
        }
    }["PWAInstallPrompt.useCallback[handleInstallClick]"], [
        deferredPrompt
    ]);
    const handleDismiss = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "PWAInstallPrompt.useCallback[handleDismiss]": ()=>{
            setShowPrompt(false);
            setShowIOSInstructions(false);
            localStorage.setItem('pwa-install-dismissed', Date.now().toString());
        }
    }["PWAInstallPrompt.useCallback[handleDismiss]"], []);
    const handleIOSInstall = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "PWAInstallPrompt.useCallback[handleIOSInstall]": ()=>{
            setShowIOSInstructions(true);
        }
    }["PWAInstallPrompt.useCallback[handleIOSInstall]"], []);
    // Don't show if already installed
    if (isInstalled) return null;
    // Check iOS
    const isIOS = ("TURBOPACK compile-time value", "object") !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    // iOS Install Instructions Modal
    if (showIOSInstructions) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                className: "border-2 border-emerald-200 shadow-2xl bg-white",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                    className: "p-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-start justify-between mb-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$smartphone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Smartphone$3e$__["Smartphone"], {
                                                className: "w-5 h-5 text-white"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                                lineNumber: 118,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                            lineNumber: 117,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: "font-semibold text-gray-900",
                                                    children: "Install Money Mitra"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                                    lineNumber: 121,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-xs text-gray-500",
                                                    children: "Add to Home Screen"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                                    lineNumber: 122,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                            lineNumber: 120,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                    lineNumber: 116,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    variant: "ghost",
                                    size: "sm",
                                    onClick: handleDismiss,
                                    className: "h-8 w-8 p-0",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                        lineNumber: 126,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                    lineNumber: 125,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                            lineNumber: 115,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-3 text-sm",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-3 p-2 bg-gray-50 rounded-lg",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-semibold",
                                            children: "1"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                            lineNumber: 132,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Tap the"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                                    lineNumber: 134,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$share$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Share$3e$__["Share"], {
                                                    className: "w-5 h-5 text-emerald-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                                    lineNumber: 135,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Share button"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                                    lineNumber: 136,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                            lineNumber: 133,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                    lineNumber: 131,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-3 p-2 bg-gray-50 rounded-lg",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-semibold",
                                            children: "2"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                            lineNumber: 141,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Scroll down and tap"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                                    lineNumber: 143,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                                    className: "w-4 h-4 text-emerald-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                                    lineNumber: 144,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: '"Add to Home Screen"'
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                                    lineNumber: 145,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                            lineNumber: 142,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                    lineNumber: 140,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-3 p-2 bg-gray-50 rounded-lg",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-semibold",
                                            children: "3"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                            lineNumber: 150,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: 'Tap "Add" in the top right'
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                            lineNumber: 151,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                    lineNumber: 149,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                            lineNumber: 130,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                    lineNumber: 114,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                lineNumber: 113,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
            lineNumber: 112,
            columnNumber: 7
        }, this);
    }
    // Standard install prompt (Android/Chrome)
    if (!showPrompt) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm animate-in slide-in-from-bottom duration-300",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
            className: "border-2 border-emerald-200 shadow-2xl bg-white",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                className: "p-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-start justify-between mb-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__["Download"], {
                                            className: "w-5 h-5 text-white"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                            lineNumber: 170,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                        lineNumber: 169,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "font-semibold text-gray-900",
                                                children: "Install Money Mitra"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                                lineNumber: 173,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-gray-500",
                                                children: "Add to your home screen"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                                lineNumber: 174,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                        lineNumber: 172,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                lineNumber: 168,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                variant: "ghost",
                                size: "sm",
                                onClick: handleDismiss,
                                className: "h-8 w-8 p-0",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                    className: "w-4 h-4"
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                    lineNumber: 178,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                lineNumber: 177,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                        lineNumber: 167,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-gray-600 mb-4",
                        children: "Install Money Mitra for quick access, offline support, and a better experience!"
                    }, void 0, false, {
                        fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                        lineNumber: 182,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                onClick: isIOS ? handleIOSInstall : handleInstallClick,
                                className: "flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__["Download"], {
                                        className: "w-4 h-4 mr-2"
                                    }, void 0, false, {
                                        fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                        lineNumber: 191,
                                        columnNumber: 15
                                    }, this),
                                    "Install App"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                lineNumber: 187,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                variant: "outline",
                                onClick: handleDismiss,
                                children: "Not Now"
                            }, void 0, false, {
                                fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                                lineNumber: 194,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                        lineNumber: 186,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
                lineNumber: 166,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
            lineNumber: 165,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/components/pwa/PWAInstallPrompt.tsx",
        lineNumber: 164,
        columnNumber: 5
    }, this);
}
_s(PWAInstallPrompt, "Ie2r8FdIX0kxb1uqCE1U+fBdNfA=");
_c = PWAInstallPrompt;
var _c;
__turbopack_context__.k.register(_c, "PWAInstallPrompt");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/components/PrefetchDataProvider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PrefetchDataProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function PrefetchDataProvider({ userId, userRole, companyId }) {
    _s();
    const queryClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"])();
    const hasPrefetched = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PrefetchDataProvider.useEffect": ()=>{
            // Only prefetch once per session
            if (hasPrefetched.current) return;
            hasPrefetched.current = true;
            const prefetchData = {
                "PrefetchDataProvider.useEffect.prefetchData": async ()=>{
                    const startTime = performance.now();
                    console.log('[Prefetch] Starting data prefetch...');
                    // Prefetch all data in parallel for maximum speed
                    const prefetchPromises = [];
                    // 1. Settings (always needed)
                    prefetchPromises.push(queryClient.prefetchQuery({
                        queryKey: [
                            'settings'
                        ],
                        queryFn: {
                            "PrefetchDataProvider.useEffect.prefetchData": ()=>fetch('/api/settings').then({
                                    "PrefetchDataProvider.useEffect.prefetchData": (r)=>r.json()
                                }["PrefetchDataProvider.useEffect.prefetchData"])
                        }["PrefetchDataProvider.useEffect.prefetchData"],
                        staleTime: 5 * 60 * 1000
                    }));
                    // 2. CMS Services (landing page data)
                    prefetchPromises.push(queryClient.prefetchQuery({
                        queryKey: [
                            'cmsServices'
                        ],
                        queryFn: {
                            "PrefetchDataProvider.useEffect.prefetchData": ()=>fetch('/api/cms/service?type=all').then({
                                    "PrefetchDataProvider.useEffect.prefetchData": (r)=>r.json()
                                }["PrefetchDataProvider.useEffect.prefetchData"])
                        }["PrefetchDataProvider.useEffect.prefetchData"],
                        staleTime: 5 * 60 * 1000
                    }));
                    // 3. CMS Products (loan products)
                    prefetchPromises.push(queryClient.prefetchQuery({
                        queryKey: [
                            'cmsProducts'
                        ],
                        queryFn: {
                            "PrefetchDataProvider.useEffect.prefetchData": ()=>fetch('/api/cms/product?isActive=true').then({
                                    "PrefetchDataProvider.useEffect.prefetchData": (r)=>r.json()
                                }["PrefetchDataProvider.useEffect.prefetchData"])
                        }["PrefetchDataProvider.useEffect.prefetchData"],
                        staleTime: 5 * 60 * 1000
                    }));
                    // 4. Companies list
                    prefetchPromises.push(queryClient.prefetchQuery({
                        queryKey: [
                            'companies'
                        ],
                        queryFn: {
                            "PrefetchDataProvider.useEffect.prefetchData": ()=>fetch('/api/company?isActive=true').then({
                                    "PrefetchDataProvider.useEffect.prefetchData": (r)=>r.json()
                                }["PrefetchDataProvider.useEffect.prefetchData"])
                        }["PrefetchDataProvider.useEffect.prefetchData"],
                        staleTime: 5 * 60 * 1000
                    }));
                    // 5. User-specific data (if logged in)
                    if (userId && userRole) {
                        // User details
                        prefetchPromises.push(queryClient.prefetchQuery({
                            queryKey: [
                                'user',
                                userId
                            ],
                            queryFn: {
                                "PrefetchDataProvider.useEffect.prefetchData": ()=>fetch(`/api/user/${userId}`).then({
                                        "PrefetchDataProvider.useEffect.prefetchData": (r)=>r.json()
                                    }["PrefetchDataProvider.useEffect.prefetchData"])
                            }["PrefetchDataProvider.useEffect.prefetchData"],
                            staleTime: 60 * 1000
                        }));
                        // Role-based data
                        if ([
                            'SUPER_ADMIN',
                            'ACCOUNTANT',
                            'CASHIER'
                        ].includes(userRole)) {
                            // All users
                            prefetchPromises.push(queryClient.prefetchQuery({
                                queryKey: [
                                    'users',
                                    {
                                        role: 'STAFF'
                                    }
                                ],
                                queryFn: {
                                    "PrefetchDataProvider.useEffect.prefetchData": ()=>fetch('/api/user?role=STAFF').then({
                                            "PrefetchDataProvider.useEffect.prefetchData": (r)=>r.json()
                                        }["PrefetchDataProvider.useEffect.prefetchData"])
                                }["PrefetchDataProvider.useEffect.prefetchData"],
                                staleTime: 60 * 1000
                            }));
                            prefetchPromises.push(queryClient.prefetchQuery({
                                queryKey: [
                                    'users',
                                    {
                                        role: 'AGENT'
                                    }
                                ],
                                queryFn: {
                                    "PrefetchDataProvider.useEffect.prefetchData": ()=>fetch('/api/user?role=AGENT').then({
                                            "PrefetchDataProvider.useEffect.prefetchData": (r)=>r.json()
                                        }["PrefetchDataProvider.useEffect.prefetchData"])
                                }["PrefetchDataProvider.useEffect.prefetchData"],
                                staleTime: 60 * 1000
                            }));
                            prefetchPromises.push(queryClient.prefetchQuery({
                                queryKey: [
                                    'users',
                                    {
                                        role: 'CASHIER'
                                    }
                                ],
                                queryFn: {
                                    "PrefetchDataProvider.useEffect.prefetchData": ()=>fetch('/api/user?role=CASHIER').then({
                                            "PrefetchDataProvider.useEffect.prefetchData": (r)=>r.json()
                                        }["PrefetchDataProvider.useEffect.prefetchData"])
                                }["PrefetchDataProvider.useEffect.prefetchData"],
                                staleTime: 60 * 1000
                            }));
                        }
                        // Active loans (for all roles except CUSTOMER)
                        if (userRole !== 'CUSTOMER') {
                            prefetchPromises.push(queryClient.prefetchQuery({
                                queryKey: [
                                    'activeLoans'
                                ],
                                queryFn: {
                                    "PrefetchDataProvider.useEffect.prefetchData": ()=>fetch('/api/loan/all-active').then({
                                            "PrefetchDataProvider.useEffect.prefetchData": (r)=>r.json()
                                        }["PrefetchDataProvider.useEffect.prefetchData"])
                                }["PrefetchDataProvider.useEffect.prefetchData"],
                                staleTime: 30 * 1000
                            }));
                            // Offline loans
                            prefetchPromises.push(queryClient.prefetchQuery({
                                queryKey: [
                                    'offlineLoans'
                                ],
                                queryFn: {
                                    "PrefetchDataProvider.useEffect.prefetchData": ()=>fetch('/api/offline-loan?page=1&limit=50').then({
                                            "PrefetchDataProvider.useEffect.prefetchData": (r)=>r.json()
                                        }["PrefetchDataProvider.useEffect.prefetchData"])
                                }["PrefetchDataProvider.useEffect.prefetchData"],
                                staleTime: 30 * 1000
                            }));
                            // EMI reminders
                            const today = new Date();
                            prefetchPromises.push(queryClient.prefetchQuery({
                                queryKey: [
                                    'emiCalendar',
                                    `${today.getFullYear()}-${today.getMonth() + 1}`
                                ],
                                queryFn: {
                                    "PrefetchDataProvider.useEffect.prefetchData": ()=>fetch(`/api/emi-reminder?action=calendar&userId=${userId}&userRole=${userRole}&year=${today.getFullYear()}&month=${today.getMonth() + 1}`).then({
                                            "PrefetchDataProvider.useEffect.prefetchData": (r)=>r.json()
                                        }["PrefetchDataProvider.useEffect.prefetchData"])
                                }["PrefetchDataProvider.useEffect.prefetchData"],
                                staleTime: 30 * 1000
                            }));
                            prefetchPromises.push(queryClient.prefetchQuery({
                                queryKey: [
                                    'emiTodayTomorrow'
                                ],
                                queryFn: {
                                    "PrefetchDataProvider.useEffect.prefetchData": ()=>fetch(`/api/emi-reminder?action=today-tomorrow&userId=${userId}&userRole=${userRole}`).then({
                                            "PrefetchDataProvider.useEffect.prefetchData": (r)=>r.json()
                                        }["PrefetchDataProvider.useEffect.prefetchData"])
                                }["PrefetchDataProvider.useEffect.prefetchData"],
                                staleTime: 30 * 1000
                            }));
                        }
                        // Customer-specific data
                        if (userRole === 'CUSTOMER') {
                            prefetchPromises.push(queryClient.prefetchQuery({
                                queryKey: [
                                    'customerLoans',
                                    userId
                                ],
                                queryFn: {
                                    "PrefetchDataProvider.useEffect.prefetchData": ()=>fetch(`/api/loan/list?customerId=${userId}`).then({
                                            "PrefetchDataProvider.useEffect.prefetchData": (r)=>r.json()
                                        }["PrefetchDataProvider.useEffect.prefetchData"])
                                }["PrefetchDataProvider.useEffect.prefetchData"],
                                staleTime: 30 * 1000
                            }));
                        }
                        // Agent/Staff specific data
                        if (userRole === 'AGENT' || userRole === 'STAFF') {
                            prefetchPromises.push(queryClient.prefetchQuery({
                                queryKey: [
                                    'agentLoans',
                                    userId
                                ],
                                queryFn: {
                                    "PrefetchDataProvider.useEffect.prefetchData": ()=>fetch(`/api/loan/list?agentId=${userId}`).then({
                                            "PrefetchDataProvider.useEffect.prefetchData": (r)=>r.json()
                                        }["PrefetchDataProvider.useEffect.prefetchData"])
                                }["PrefetchDataProvider.useEffect.prefetchData"],
                                staleTime: 30 * 1000
                            }));
                        }
                        // Company-specific data
                        if (companyId) {
                            prefetchPromises.push(queryClient.prefetchQuery({
                                queryKey: [
                                    'company',
                                    companyId
                                ],
                                queryFn: {
                                    "PrefetchDataProvider.useEffect.prefetchData": ()=>fetch(`/api/company?id=${companyId}`).then({
                                            "PrefetchDataProvider.useEffect.prefetchData": (r)=>r.json()
                                        }["PrefetchDataProvider.useEffect.prefetchData"])
                                }["PrefetchDataProvider.useEffect.prefetchData"],
                                staleTime: 5 * 60 * 1000
                            }));
                        }
                    }
                    // Wait for all prefetches to complete
                    await Promise.allSettled(prefetchPromises);
                    const endTime = performance.now();
                    console.log(`[Prefetch] Completed in ${(endTime - startTime).toFixed(0)}ms`);
                }
            }["PrefetchDataProvider.useEffect.prefetchData"];
            // Start prefetching immediately
            prefetchData();
        }
    }["PrefetchDataProvider.useEffect"], [
        userId,
        userRole,
        companyId,
        queryClient
    ]);
    return null; // This component doesn't render anything
}
_s(PrefetchDataProvider, "DbvyHrA0FfiR34hMiccuuoMQ35I=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"]
    ];
});
_c = PrefetchDataProvider;
var _c;
__turbopack_context__.k.register(_c, "PrefetchDataProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/components/DataPrefetchWrapper.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DataPrefetchWrapper
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/contexts/AuthContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$PrefetchDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/PrefetchDataProvider.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function DataPrefetchWrapper({ children }) {
    _s();
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$PrefetchDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                userId: user?.id || undefined,
                userRole: user?.role || undefined,
                companyId: user?.companyId || undefined
            }, void 0, false, {
                fileName: "[project]/Desktop/reallll/src/components/DataPrefetchWrapper.tsx",
                lineNumber: 14,
                columnNumber: 7
            }, this),
            children
        ]
    }, void 0, true);
}
_s(DataPrefetchWrapper, "9ep4vdl3mBfipxjmc+tQCDhw6Ik=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"]
    ];
});
_c = DataPrefetchWrapper;
var _c;
__turbopack_context__.k.register(_c, "DataPrefetchWrapper");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=Desktop_reallll_src_8d286bd0._.js.map