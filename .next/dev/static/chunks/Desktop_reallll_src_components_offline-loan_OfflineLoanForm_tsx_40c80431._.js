(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>OfflineLoanForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/ui/input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/ui/label.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/ui/badge.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/ui/alert.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/ui/dialog.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/ui/select.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/user.js [app-client] (ecmascript) <export default as User>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$indian$2d$rupee$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__IndianRupee$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/indian-rupee.js [app-client] (ecmascript) <export default as IndianRupee>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/calendar.js [app-client] (ecmascript) <export default as Calendar>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/file-text.js [app-client] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/plus.js [app-client] (ecmascript) <export default as Plus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/save.js [app-client] (ecmascript) <export default as Save>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-client] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronUp$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/chevron-up.js [app-client] (ecmascript) <export default as ChevronUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/building-2.js [app-client] (ecmascript) <export default as Building2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/upload.js [app-client] (ecmascript) <export default as Upload>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/circle-check-big.js [app-client] (ecmascript) <export default as CheckCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/info.js [app-client] (ecmascript) <export default as Info>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-client] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-client] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$car$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Car$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/car.js [app-client] (ecmascript) <export default as Car>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calculator$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Calculator$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/calculator.js [app-client] (ecmascript) <export default as Calculator>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/wallet.js [app-client] (ecmascript) <export default as Wallet>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$landmark$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Landmark$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/landmark.js [app-client] (ecmascript) <export default as Landmark>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$banknote$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Banknote$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/banknote.js [app-client] (ecmascript) <export default as Banknote>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/hooks/use-toast.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$loan$2f$GoldLoanReceipt$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/loan/GoldLoanReceipt.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$loan$2f$VehicleLoanReceipt$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/loan/VehicleLoanReceipt.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
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
;
;
// Document types for upload
const DOCUMENT_TYPES = [
    {
        id: 'pan_card',
        name: 'PAN Card',
        desc: 'Front side',
        required: true
    },
    {
        id: 'aadhaar_front',
        name: 'Aadhaar Front',
        desc: 'Front side',
        required: true
    },
    {
        id: 'aadhaar_back',
        name: 'Aadhaar Back',
        desc: 'Back side',
        required: true
    },
    {
        id: 'income_proof',
        name: 'Income Proof',
        desc: 'Salary slip/ITR',
        required: false
    },
    {
        id: 'address_proof',
        name: 'Address Proof',
        desc: 'Utility bill',
        required: false
    },
    {
        id: 'photo',
        name: 'Photo',
        desc: 'Passport size',
        required: false
    },
    {
        id: 'election_card',
        name: 'Election Card',
        desc: 'Voter ID',
        required: false
    },
    {
        id: 'house_photo',
        name: 'House Photo',
        desc: 'Residence photo',
        required: false
    },
    {
        id: 'guarantor_photo',
        name: 'Guarantor Photo',
        desc: 'Guarantor passport photo',
        required: false
    },
    {
        id: 'passbook_photo',
        name: 'Passbook Photo',
        desc: 'Bank passbook front page',
        required: false
    }
];
function OfflineLoanForm({ createdById, createdByRole, onLoanCreated }) {
    _s();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [submitting, setSubmitting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showAdvanced, setShowAdvanced] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [companies, setCompanies] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loadingCompanies, setLoadingCompanies] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [bankAccounts, setBankAccounts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loadingBankAccounts, setLoadingBankAccounts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [loanProducts, setLoanProducts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loadingProducts, setLoadingProducts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [uploadingDoc, setUploadingDoc] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [uploadedDocs, setUploadedDocs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    // Combined payment sources state
    const [paymentSources, setPaymentSources] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loadingPaymentSources, setLoadingPaymentSources] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Interest Only and Mirror Loan states
    const [isInterestOnly, setIsInterestOnly] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isMirrorLoan, setIsMirrorLoan] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [mirrorCompanyId, setMirrorCompanyId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [mirrorInterestRate, setMirrorInterestRate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('15'); // User-entered rate
    const [mirrorInterestType, setMirrorInterestType] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('REDUCING'); // User-selected type
    const [showMirrorDialog, setShowMirrorDialog] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Cashbook balance for ALL companies (not just Company 3)
    const [cashbookBalance, setCashbookBalance] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loadingCashbook, setLoadingCashbook] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Split payment states
    const [useSplitPayment, setUseSplitPayment] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [bankAmount, setBankAmount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [cashAmount, setCashAmount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    // GPS Location states
    const [gpsLoading, setGpsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [gpsError, setGpsError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Secondary payment pages for C3 non-mirror loans
    const [secondaryPaymentPages, setSecondaryPaymentPages] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedSecondaryPageId, setSelectedSecondaryPageId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [loadingSecPages, setLoadingSecPages] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Extra EMI always goes to personal credit (no secondary payment page for offline loans)
    // Form data - declared before useMemo hooks that depend on it
    const [formData, setFormData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        customerAadhaar: '',
        customerPan: '',
        customerAddress: '',
        customerCity: '',
        customerState: '',
        customerPincode: '',
        customerDOB: '',
        customerOccupation: '',
        customerMonthlyIncome: '',
        customerLocation: '',
        reference1Name: '',
        reference1Phone: '',
        reference1Relation: '',
        reference2Name: '',
        reference2Phone: '',
        reference2Relation: '',
        loanType: 'PERSONAL',
        productId: '',
        loanAmount: '',
        interestRate: '12',
        interestType: 'FLAT',
        tenure: '12',
        emiAmount: '',
        processingFee: '0',
        chargesAmount: '0',
        disbursementDate: new Date().toISOString().slice(0, 10),
        disbursementMode: 'CASH',
        disbursementRef: '',
        startDate: new Date().toISOString().slice(0, 10),
        notes: '',
        internalNotes: '',
        // Company selection - REQUIRED for all roles
        companyId: '',
        // Bank account for disbursement
        bankAccountId: '',
        // Interest Only loan
        isInterestOnly: false
    });
    // Get all companies that can be mirror target (ALL companies except the selected one)
    // Any company can create a mirror loan to any OTHER company
    const availableMirrorCompanies = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "OfflineLoanForm.useMemo[availableMirrorCompanies]": ()=>{
            return companies.filter({
                "OfflineLoanForm.useMemo[availableMirrorCompanies]": (c)=>c.id !== formData.companyId
            }["OfflineLoanForm.useMemo[availableMirrorCompanies]"]);
        }
    }["OfflineLoanForm.useMemo[availableMirrorCompanies]"], [
        companies,
        formData.companyId
    ]);
    // Calculate EMI schedule for original loan
    const originalEmiSchedule = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "OfflineLoanForm.useMemo[originalEmiSchedule]": ()=>{
            const P = parseFloat(formData.loanAmount) || 0;
            const rate = parseFloat(formData.interestRate) || 0;
            const months = parseInt(formData.tenure) || 0;
            const type = formData.interestType || 'FLAT';
            if (P <= 0 || rate <= 0 || months <= 0) return [];
            const schedule = [];
            if (type === 'FLAT') {
                const totalInterest = P * rate * months / 1200;
                const totalAmount = P + totalInterest;
                const emi = totalAmount / months;
                const principalPerMonth = P / months;
                const interestPerMonth = totalInterest / months;
                for(let i = 1; i <= months; i++){
                    schedule.push({
                        installmentNumber: i,
                        principal: principalPerMonth,
                        interest: interestPerMonth,
                        emi,
                        outstandingPrincipal: Math.max(0, P - principalPerMonth * i)
                    });
                }
            } else {
                // Reducing balance
                const monthlyRate = rate / 100 / 12;
                const emi = monthlyRate === 0 ? P / months : P * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
                let outstanding = P;
                for(let i = 1; i <= months; i++){
                    const interest = outstanding * monthlyRate;
                    const principal = emi - interest;
                    outstanding = Math.max(0, outstanding - principal);
                    schedule.push({
                        installmentNumber: i,
                        principal,
                        interest,
                        emi,
                        outstandingPrincipal: outstanding
                    });
                }
            }
            return schedule;
        }
    }["OfflineLoanForm.useMemo[originalEmiSchedule]"], [
        formData.loanAmount,
        formData.interestRate,
        formData.tenure,
        formData.interestType
    ]);
    // Calculate EMI schedule for mirror loan using user-entered rate and type
    const mirrorEmiSchedule = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "OfflineLoanForm.useMemo[mirrorEmiSchedule]": ()=>{
            if (!isMirrorLoan || !mirrorCompanyId) return [];
            const P = parseFloat(formData.loanAmount) || 0;
            const mirrorRate = parseFloat(mirrorInterestRate) || 0;
            const originalEmi = originalEmiSchedule.length > 0 ? originalEmiSchedule[0].emi : 0;
            if (P <= 0 || mirrorRate <= 0 || originalEmi <= 0) return [];
            const schedule = [];
            const monthlyRate = mirrorRate / 100 / 12;
            let outstanding = P;
            let installmentNumber = 1;
            // Use same EMI amount, calculate reducing schedule
            while(outstanding > 0.01 && installmentNumber <= 100){
                const interest = outstanding * monthlyRate;
                let principal = originalEmi - interest;
                if (principal >= outstanding) {
                    principal = outstanding;
                    const lastEmi = principal + interest;
                    schedule.push({
                        installmentNumber,
                        principal,
                        interest,
                        emi: lastEmi,
                        outstandingPrincipal: 0
                    });
                    break;
                }
                outstanding = Math.max(0, outstanding - principal);
                schedule.push({
                    installmentNumber,
                    principal,
                    interest,
                    emi: originalEmi,
                    outstandingPrincipal: outstanding
                });
                installmentNumber++;
            }
            return schedule;
        }
    }["OfflineLoanForm.useMemo[mirrorEmiSchedule]"], [
        isMirrorLoan,
        mirrorCompanyId,
        formData.loanAmount,
        originalEmiSchedule,
        mirrorInterestRate
    ]);
    // Calculate extra EMIs and mirror loan summary
    const mirrorLoanSummary = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "OfflineLoanForm.useMemo[mirrorLoanSummary]": ()=>{
            if (!isMirrorLoan || mirrorEmiSchedule.length === 0) return null;
            const originalTenure = originalEmiSchedule.length;
            const mirrorTenure = mirrorEmiSchedule.length;
            const extraEMICount = Math.max(0, originalTenure - mirrorTenure);
            const originalTotalInterest = originalEmiSchedule.reduce({
                "OfflineLoanForm.useMemo[mirrorLoanSummary].originalTotalInterest": (sum, e)=>sum + e.interest
            }["OfflineLoanForm.useMemo[mirrorLoanSummary].originalTotalInterest"], 0);
            const mirrorTotalInterest = mirrorEmiSchedule.reduce({
                "OfflineLoanForm.useMemo[mirrorLoanSummary].mirrorTotalInterest": (sum, e)=>sum + e.interest
            }["OfflineLoanForm.useMemo[mirrorLoanSummary].mirrorTotalInterest"], 0);
            const interestSaved = originalTotalInterest - mirrorTotalInterest;
            const mirrorRate = parseFloat(mirrorInterestRate) || 0;
            return {
                originalTenure,
                mirrorTenure,
                extraEMICount,
                interestSaved,
                mirrorRate,
                mirrorTotalInterest
            };
        }
    }["OfflineLoanForm.useMemo[mirrorLoanSummary]"], [
        isMirrorLoan,
        mirrorEmiSchedule,
        originalEmiSchedule,
        mirrorInterestRate
    ]);
    // Helper to check if selected company is Company 3 (mirror loans only for Company 3)
    const isSelectedCompany3 = ()=>{
        if (!formData.companyId || companies.length < 3) return false;
        // Check by code C3
        const selectedCompany = companies.find((c)=>c.id === formData.companyId);
        if (selectedCompany?.code === 'C3') return true;
        // Check by position (3rd company by creation order)
        const sortedCompanies = [
            ...companies
        ].sort((a, b)=>new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
        if (sortedCompanies.length >= 3 && sortedCompanies[2].id === formData.companyId) return true;
        return false;
    };
    // Gold Loan Receipt State
    const [goldLoanData, setGoldLoanData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        grossWeight: 0,
        netWeight: 0,
        goldRate: 0,
        valuationAmount: 0,
        loanAmount: 0,
        ownerName: '',
        goldItemPhoto: '',
        karat: 22,
        numberOfItems: 1,
        itemDescription: '',
        verificationDate: new Date().toISOString().slice(0, 10),
        verifiedBy: '',
        remarks: ''
    });
    // Vehicle Loan Receipt State
    const [vehicleLoanData, setVehicleLoanData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        vehicleType: 'CAR',
        vehicleNumber: '',
        manufacturer: '',
        model: '',
        yearOfManufacture: new Date().getFullYear(),
        valuationAmount: 0,
        loanAmount: 0,
        ownerName: '',
        rcBookPhoto: '',
        vehiclePhoto: '',
        chassisNumber: '',
        engineNumber: '',
        fuelType: 'PETROL',
        color: '',
        verificationDate: new Date().toISOString().slice(0, 10),
        verifiedBy: '',
        remarks: ''
    });
    // Fetch companies and products on dialog open
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "OfflineLoanForm.useEffect": ()=>{
            if (open) {
                fetchCompanies();
                fetchLoanProducts();
                fetchSecondaryPaymentPages();
            }
        }
    }["OfflineLoanForm.useEffect"], [
        open
    ]);
    const fetchSecondaryPaymentPages = async ()=>{
        try {
            setLoadingSecPages(true);
            const res = await fetch('/api/secondary-payment-pages?activeOnly=true');
            if (res.ok) {
                const data = await res.json();
                setSecondaryPaymentPages(data.pages || []);
            }
        } catch (e) {
            console.error('Failed to fetch secondary payment pages:', e);
        } finally{
            setLoadingSecPages(false);
        }
    };
    // Re-fetch payment sources when dialog opens (fresh balances every time)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "OfflineLoanForm.useEffect": ()=>{
            if (open && formData.companyId) {
                fetchPaymentSources(formData.companyId);
                fetchCashbookBalance(formData.companyId);
            }
        }
    }["OfflineLoanForm.useEffect"], [
        open
    ]);
    // Fetch bank accounts AND cashbook when company changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "OfflineLoanForm.useEffect": ()=>{
            if (formData.companyId) {
                fetchPaymentSources(formData.companyId);
                fetchCashbookBalance(formData.companyId);
                // Reset split payment states
                setUseSplitPayment(false);
                setBankAmount(0);
                setCashAmount(0);
            } else {
                setBankAccounts([]);
                setPaymentSources([]);
                setCashbookBalance(null);
            }
        }
    }["OfflineLoanForm.useEffect"], [
        formData.companyId
    ]); // removed companies.length dependency that caused stale fetches
    // Fetch bank accounts when mirror company is selected (for mirror loan disbursement)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "OfflineLoanForm.useEffect": ()=>{
            if (isMirrorLoan && mirrorCompanyId) {
                // For mirror loans, fetch the mirror company's payment sources for disbursement
                setBankAccounts([]); // Clear existing accounts first
                setPaymentSources([]);
                setFormData({
                    "OfflineLoanForm.useEffect": (prev)=>({
                            ...prev,
                            bankAccountId: ''
                        })
                }["OfflineLoanForm.useEffect"]); // Reset selection
                fetchPaymentSources(mirrorCompanyId);
                fetchCashbookBalance(mirrorCompanyId);
                // Reset split payment states
                setUseSplitPayment(false);
                setBankAmount(0);
                setCashAmount(0);
            } else if (!isMirrorLoan && formData.companyId) {
                // Normal flow - fetch both for selected company
                fetchPaymentSources(formData.companyId);
                fetchCashbookBalance(formData.companyId);
            }
        }
    }["OfflineLoanForm.useEffect"], [
        isMirrorLoan,
        mirrorCompanyId
    ]);
    // Fetch cashbook balance for Company 3
    const fetchCashbookBalance = async (companyId)=>{
        try {
            setLoadingCashbook(true);
            const res = await fetch(`/api/accountant/cashbook?companyId=${companyId}`);
            if (res.ok) {
                const data = await res.json();
                setCashbookBalance(data.currentBalance || 0);
            }
        } catch (error) {
            console.error('Failed to fetch cashbook:', error);
        } finally{
            setLoadingCashbook(false);
        }
    };
    // Update form when product is selected - Auto-apply Interest Only based on product
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "OfflineLoanForm.useEffect": ()=>{
            if (formData.productId) {
                const product = loanProducts.find({
                    "OfflineLoanForm.useEffect.product": (p)=>p.id === formData.productId
                }["OfflineLoanForm.useEffect.product"]);
                if (product) {
                    // Auto-apply Interest Only based on product
                    const productIsInterestOnly = product.isInterestOnly || false;
                    setIsInterestOnly(productIsInterestOnly);
                    setFormData({
                        "OfflineLoanForm.useEffect": (prev)=>({
                                ...prev,
                                loanType: product.loanType,
                                interestRate: product.defaultInterestRate.toString(),
                                tenure: productIsInterestOnly ? '0' : product.defaultTenure.toString(),
                                // processingFee intentionally NOT auto-set — it must be set manually at loan creation
                                isInterestOnly: productIsInterestOnly
                            })
                    }["OfflineLoanForm.useEffect"]);
                }
            }
        }
    }["OfflineLoanForm.useEffect"], [
        formData.productId,
        formData.loanAmount,
        loanProducts
    ]);
    const fetchCompanies = async ()=>{
        try {
            setLoadingCompanies(true);
            const res = await fetch('/api/company?isActive=true');
            if (res.ok) {
                const data = await res.json();
                setCompanies(data.companies || []);
                // Auto-select first company if only one exists
                if (data.companies?.length === 1) {
                    setFormData((prev)=>({
                            ...prev,
                            companyId: data.companies[0].id
                        }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch companies:', error);
        } finally{
            setLoadingCompanies(false);
        }
    };
    const fetchLoanProducts = async ()=>{
        try {
            setLoadingProducts(true);
            const res = await fetch('/api/cms/product?isActive=true');
            if (res.ok) {
                const data = await res.json();
                setLoanProducts(data.products || []);
            }
        } catch (error) {
            console.error('Failed to fetch loan products:', error);
        } finally{
            setLoadingProducts(false);
        }
    };
    const fetchBankAccounts = async (companyId)=>{
        try {
            setLoadingBankAccounts(true);
            // Use the accountant bank-accounts API which properly filters by company
            const res = await fetch(`/api/accountant/bank-accounts?companyId=${companyId}`);
            if (res.ok) {
                const data = await res.json();
                const accounts = data.bankAccounts || [];
                setBankAccounts(accounts);
                // Auto-select default bank
                const defaultBank = accounts.find((b)=>b.isDefault);
                if (defaultBank) {
                    setFormData((prev)=>({
                            ...prev,
                            bankAccountId: defaultBank.id
                        }));
                } else if (accounts.length > 0) {
                    // Select first bank if no default
                    setFormData((prev)=>({
                            ...prev,
                            bankAccountId: accounts[0].id
                        }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch bank accounts:', error);
            setBankAccounts([]);
        } finally{
            setLoadingBankAccounts(false);
        }
    };
    // Fetch combined payment sources (Bank + Cash)
    const fetchPaymentSources = async (companyId)=>{
        try {
            setLoadingPaymentSources(true);
            const res = await fetch(`/api/payment-sources?companyId=${companyId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setPaymentSources(data.paymentSources || []);
                    // Also update bankAccounts for backward compatibility
                    const bankSources = (data.paymentSources || []).filter((s)=>s.type === 'BANK');
                    setBankAccounts(bankSources.map((s)=>({
                            id: s.id,
                            bankName: s.name,
                            accountNumber: s.accountNumber || '',
                            currentBalance: s.currentBalance,
                            isDefault: s.isDefault
                        })));
                    // Auto-select default
                    const defaultSource = data.paymentSources.find((s)=>s.isDefault);
                    if (defaultSource) {
                        setFormData((prev)=>({
                                ...prev,
                                bankAccountId: defaultSource.id,
                                disbursementMode: defaultSource.type === 'CASH' ? 'CASH' : 'BANK_TRANSFER'
                            }));
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch payment sources:', error);
        } finally{
            setLoadingPaymentSources(false);
        }
    };
    // Calculate EMI based on interest type
    const calculateEmi = ()=>{
        const P = parseFloat(formData.loanAmount) || 0;
        const annualRate = parseFloat(formData.interestRate) || 0;
        const n = parseInt(formData.tenure) || 1;
        const interestType = formData.interestType || 'FLAT';
        if (P > 0 && annualRate > 0 && n > 0) {
            if (interestType === 'FLAT') {
                // FLAT Interest: Total Interest = P * R * T / 100, EMI = (P + Total Interest) / n
                const totalInterest = P * annualRate * n / 1200;
                const totalAmount = P + totalInterest;
                return Math.round(totalAmount / n);
            } else {
                // REDUCING Balance: Standard EMI formula
                const r = annualRate / 100 / 12;
                const emi = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
                return Math.round(emi);
            }
        }
        return 0;
    };
    const handleInputChange = (field, value)=>{
        setFormData((prev)=>({
                ...prev,
                [field]: value
            }));
        // When company changes, reset mirror only if the NEW company is the same as the current mirror company
        // (can't mirror to yourself). Do NOT reset based on company code — backend validates this.
        if (field === 'companyId' && mirrorCompanyId && mirrorCompanyId === value) {
            setMirrorCompanyId('');
        }
        if ([
            'loanAmount',
            'interestRate',
            'tenure',
            'interestType'
        ].includes(field)) {
            setTimeout(()=>{
                const emi = calculateEmi();
                setFormData((prev)=>({
                        ...prev,
                        emiAmount: emi.toString()
                    }));
            }, 100);
        }
    };
    // Handle document upload
    const handleDocumentUpload = async (documentType, file)=>{
        // Validate file type
        const allowedTypes = [
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/webp',
            'application/pdf'
        ];
        if (!allowedTypes.includes(file.type)) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"])({
                title: 'Invalid File Type',
                description: 'Only images (PNG, JPG, WEBP) and PDF files are allowed.',
                variant: 'destructive'
            });
            return;
        }
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"])({
                title: 'File Too Large',
                description: 'Maximum file size is 10MB.',
                variant: 'destructive'
            });
            return;
        }
        setUploadingDoc(documentType);
        setUploadedDocs((prev)=>({
                ...prev,
                [documentType]: {
                    url: '',
                    name: file.name,
                    uploading: true
                }
            }));
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('file', file);
            formDataUpload.append('documentType', documentType);
            formDataUpload.append('uploadedBy', createdById);
            const response = await fetch('/api/upload/document', {
                method: 'POST',
                body: formDataUpload
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }
            setUploadedDocs((prev)=>({
                    ...prev,
                    [documentType]: {
                        url: data.url,
                        name: file.name,
                        uploading: false
                    }
                }));
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"])({
                title: 'Upload Successful',
                description: `${DOCUMENT_TYPES.find((d)=>d.id === documentType)?.name || documentType} uploaded successfully.`
            });
        } catch (error) {
            setUploadedDocs((prev)=>{
                const newDocs = {
                    ...prev
                };
                delete newDocs[documentType];
                return newDocs;
            });
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"])({
                title: 'Upload Failed',
                description: error instanceof Error ? error.message : 'Failed to upload document.',
                variant: 'destructive'
            });
        } finally{
            setUploadingDoc(null);
        }
    };
    // Remove uploaded document
    const handleRemoveDocument = (documentType)=>{
        setUploadedDocs((prev)=>{
            const newDocs = {
                ...prev
            };
            delete newDocs[documentType];
            return newDocs;
        });
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"])({
            title: 'Document Removed',
            description: 'The document has been removed.'
        });
    };
    const handleSubmit = async ()=>{
        // Validate required fields including company
        // For Interest Only loans, tenure is not required
        const requiresTenure = !isInterestOnly && (!formData.tenure || parseInt(formData.tenure) <= 0);
        if (!formData.customerName || !formData.customerPhone || !formData.loanAmount || !formData.interestRate || requiresTenure || !formData.disbursementDate || !formData.startDate || !formData.companyId) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"])({
                title: 'Validation Error',
                description: 'Please fill all required fields including Company',
                variant: 'destructive'
            });
            return;
        }
        // Validate Gold Loan Receipt Data
        if (formData.loanType === 'GOLD') {
            if (!goldLoanData.grossWeight || !goldLoanData.netWeight || !goldLoanData.goldRate || !goldLoanData.valuationAmount || !goldLoanData.loanAmount || !goldLoanData.ownerName) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"])({
                    title: 'Gold Loan Receipt Required',
                    description: 'Please fill all required fields in the Gold Loan Receipt',
                    variant: 'destructive'
                });
                return;
            }
        }
        // Validate Vehicle Loan Receipt Data
        if (formData.loanType === 'VEHICLE') {
            if (!vehicleLoanData.vehicleType || !vehicleLoanData.vehicleNumber || !vehicleLoanData.manufacturer || !vehicleLoanData.valuationAmount || !vehicleLoanData.loanAmount || !vehicleLoanData.ownerName || !vehicleLoanData.rcBookPhoto || !vehicleLoanData.vehiclePhoto) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"])({
                    title: 'Vehicle Loan Receipt Required',
                    description: 'Please fill all required fields in the Vehicle Loan Receipt including photos',
                    variant: 'destructive'
                });
                return;
            }
        }
        try {
            setSubmitting(true);
            const loanAmountNum = parseFloat(formData.loanAmount);
            // Calculate bank and cash amounts based on split payment
            let finalBankAmount = 0;
            let finalCashAmount = 0;
            if (useSplitPayment) {
                finalBankAmount = bankAmount;
                finalCashAmount = cashAmount;
                // Validate split amounts
                if (finalBankAmount + finalCashAmount !== loanAmountNum) {
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"])({
                        title: 'Split Amount Error',
                        description: `Bank amount (₹${finalBankAmount.toLocaleString()}) + Cash amount (₹${finalCashAmount.toLocaleString()}) must equal loan amount (₹${loanAmountNum.toLocaleString()})`,
                        variant: 'destructive'
                    });
                    setSubmitting(false);
                    return;
                }
                // Validate bank balance if bank amount > 0
                if (finalBankAmount > 0) {
                    const selectedBank = bankAccounts.find((b)=>b.id === formData.bankAccountId);
                    if (!selectedBank) {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"])({
                            title: 'Bank Account Required',
                            description: 'Please select a bank account for the bank portion of disbursement',
                            variant: 'destructive'
                        });
                        setSubmitting(false);
                        return;
                    }
                    if (selectedBank.currentBalance < finalBankAmount) {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"])({
                            title: 'Insufficient Bank Balance',
                            description: `Bank account has ₹${selectedBank.currentBalance.toLocaleString()} but you're trying to disburse ₹${finalBankAmount.toLocaleString()}`,
                            variant: 'destructive'
                        });
                        setSubmitting(false);
                        return;
                    }
                }
                // Validate cash balance if cash amount > 0
                if (finalCashAmount > 0 && cashbookBalance !== null && cashbookBalance < finalCashAmount) {
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"])({
                        title: 'Insufficient Cash Balance',
                        description: `Cashbook has ₹${cashbookBalance.toLocaleString()} but you're trying to disburse ₹${finalCashAmount.toLocaleString()}`,
                        variant: 'destructive'
                    });
                    setSubmitting(false);
                    return;
                }
            } else {
                // Non-split payment: determine based on disbursement mode
                if (formData.disbursementMode === 'CASH') {
                    finalCashAmount = loanAmountNum;
                } else {
                    finalBankAmount = loanAmountNum;
                }
            }
            const requestBody = {
                createdById,
                createdByRole,
                ...formData,
                loanAmount: parseFloat(formData.loanAmount),
                interestRate: parseFloat(formData.interestRate),
                tenure: isInterestOnly ? 0 : parseInt(formData.tenure),
                emiAmount: parseFloat(formData.emiAmount) || calculateEmi(),
                processingFee: parseFloat(formData.processingFee) || 0,
                chargesAmount: parseFloat(formData.chargesAmount || '0') || 0,
                customerMonthlyIncome: formData.customerMonthlyIncome ? parseFloat(formData.customerMonthlyIncome) : null,
                customerDOB: formData.customerDOB || null,
                bankAccountId: formData.bankAccountId || null,
                // Secondary payment page for C3 non-mirror loans
                secondaryPaymentPageId: isSelectedCompany3() && !isMirrorLoan ? selectedSecondaryPageId || null : null,
                // Documents
                documents: uploadedDocs,
                // Interest Only Loan
                isInterestOnly,
                // Mirror Loan
                isMirrorLoan,
                mirrorCompanyId: isMirrorLoan ? mirrorCompanyId : null,
                mirrorInterestRate: isMirrorLoan ? parseFloat(mirrorInterestRate) : null,
                mirrorInterestType: isMirrorLoan ? mirrorInterestType : null,
                // Extra EMI goes to personal credit (not company credit)
                extraEmiGoesToPersonalCredit: isMirrorLoan ? true : false,
                // Split payment info
                useSplitPayment,
                bankAmount: finalBankAmount,
                cashAmount: finalCashAmount
            };
            // Add Gold Loan Receipt Data
            if (formData.loanType === 'GOLD') {
                requestBody.goldLoanDetail = {
                    ...goldLoanData,
                    verifiedBy: createdById
                };
            }
            // Add Vehicle Loan Receipt Data
            if (formData.loanType === 'VEHICLE') {
                requestBody.vehicleLoanDetail = {
                    ...vehicleLoanData,
                    verifiedBy: createdById
                };
            }
            const res = await fetch('/api/offline-loan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    const isInterestOnlyLoan = data.loan?.isInterestOnlyLoan || isInterestOnly;
                    const emiGenerated = data.emiCount > 0;
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"])({
                        title: '🎉 Loan Created Successfully!',
                        description: isInterestOnlyLoan ? `Interest Only loan ${data.loan.loanNumber} created for ${formData.customerName}. Loan Amount: ₹${parseFloat(formData.loanAmount).toLocaleString()}. Monthly Interest: ₹${(parseFloat(formData.loanAmount) * parseFloat(formData.interestRate) / 100 / 12).toLocaleString()}` : emiGenerated ? `Loan ${data.loan.loanNumber} created for ${formData.customerName}. Amount: ₹${parseFloat(formData.loanAmount).toLocaleString()}. ${data.emiCount} EMIs generated.` : `Loan ${data.loan.loanNumber} created for ${formData.customerName}. Amount: ₹${parseFloat(formData.loanAmount).toLocaleString()}.`
                    });
                    // Warn if mirror was requested but failed to create
                    if (isMirrorLoan && mirrorCompanyId && !data.mirrorLoan) {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"])({
                            title: '⚠️ Mirror Loan Not Created',
                            description: 'The main loan was created, but the mirror loan could not be created. Please create it manually or contact support.',
                            variant: 'destructive'
                        });
                    } else if (data.mirrorLoan) {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"])({
                            title: '✅ Mirror Loan Created',
                            description: `Mirror loan ${data.mirrorLoan.mirrorLoanNumber} created successfully with ${data.mirrorLoan.extraEMICount || 0} extra EMIs.`
                        });
                    }
                    setOpen(false);
                    resetForm();
                    onLoanCreated?.();
                    // Fire-and-forget: credit charges to creator's personal account
                    const charges = parseFloat(formData.chargesAmount || '0') || 0;
                    if (charges > 0 && createdById) {
                        fetch('/api/user/personal-credit', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                userId: createdById,
                                amount: charges,
                                loanId: data.loan?.id,
                                description: 'Offline loan charges'
                            })
                        }).catch((err)=>console.error('[Charges] Failed to credit personal amount:', err));
                    }
                }
            } else {
                const error = await res.json();
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"])({
                    title: 'Error',
                    description: error.error || 'Failed to create loan',
                    variant: 'destructive'
                });
            }
        } catch (error) {
            console.error('Loan creation error:', error);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"])({
                title: 'Error',
                description: 'Failed to create loan',
                variant: 'destructive'
            });
        } finally{
            setSubmitting(false);
        }
    };
    const resetForm = ()=>{
        setFormData({
            customerName: '',
            customerPhone: '',
            customerEmail: '',
            customerAadhaar: '',
            customerPan: '',
            customerAddress: '',
            customerCity: '',
            customerState: '',
            customerPincode: '',
            customerOccupation: '',
            customerMonthlyIncome: '',
            customerDOB: '',
            reference1Name: '',
            reference1Phone: '',
            reference1Relation: '',
            reference2Name: '',
            reference2Phone: '',
            reference2Relation: '',
            loanType: 'PERSONAL',
            productId: '',
            loanAmount: '',
            interestRate: '12',
            interestType: 'FLAT',
            tenure: '12',
            emiAmount: '',
            processingFee: '0',
            chargesAmount: '0',
            disbursementDate: new Date().toISOString().slice(0, 10),
            disbursementMode: 'CASH',
            disbursementRef: '',
            startDate: new Date().toISOString().slice(0, 10),
            notes: '',
            internalNotes: '',
            companyId: '',
            bankAccountId: '',
            isInterestOnly: false,
            customerLocation: ''
        });
        // Reset Interest Only and Mirror Loan states
        setIsInterestOnly(false);
        setIsMirrorLoan(false);
        setMirrorCompanyId('');
        setMirrorInterestRate('15');
        setMirrorInterestType('REDUCING');
        setCashbookBalance(null);
        // Reset split payment states
        setUseSplitPayment(false);
        setBankAmount(0);
        setCashAmount(0);
        // Reset Gold Loan Data
        setGoldLoanData({
            grossWeight: 0,
            netWeight: 0,
            goldRate: 0,
            valuationAmount: 0,
            loanAmount: 0,
            ownerName: '',
            goldItemPhoto: '',
            karat: 22,
            numberOfItems: 1,
            itemDescription: '',
            verificationDate: new Date().toISOString().slice(0, 10),
            verifiedBy: '',
            remarks: ''
        });
        // Reset Vehicle Loan Data
        setVehicleLoanData({
            vehicleType: 'CAR',
            vehicleNumber: '',
            manufacturer: '',
            model: '',
            yearOfManufacture: new Date().getFullYear(),
            valuationAmount: 0,
            loanAmount: 0,
            ownerName: '',
            rcBookPhoto: '',
            vehiclePhoto: '',
            chassisNumber: '',
            engineNumber: '',
            fuelType: 'PETROL',
            color: '',
            verificationDate: new Date().toISOString().slice(0, 10),
            verifiedBy: '',
            remarks: ''
        });
        // Reset documents
        setUploadedDocs({});
        setShowAdvanced(false);
    };
    const formatCurrency = (amount)=>{
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount);
    };
    const selectedProduct = loanProducts.find((p)=>p.id === formData.productId);
    // ── Balance validation helpers ─────────────────────────────────────────────
    const loanAmountNum = parseFloat(formData.loanAmount || '0') || 0;
    const selectedBankAccount = bankAccounts.find((b)=>b.id === formData.bankAccountId);
    const cashAvailable = cashbookBalance ?? 0;
    // Split-payment balance checks
    const splitBankInsufficient = useSplitPayment && bankAmount > 0 && selectedBankAccount ? selectedBankAccount.currentBalance < bankAmount : false;
    const splitCashInsufficient = useSplitPayment && cashAmount > 0 ? cashAvailable < cashAmount : false;
    const splitTotalMismatch = useSplitPayment && loanAmountNum > 0 ? Math.abs(bankAmount + cashAmount - loanAmountNum) > 0.01 : false;
    // Single-payment balance check
    const singleSourceSelected = paymentSources.find((s)=>s.id === formData.bankAccountId);
    const singleInsufficient = !useSplitPayment && singleSourceSelected ? singleSourceSelected.currentBalance < loanAmountNum : false;
    const canCreate = !!formData.companyId && !submitting && !splitBankInsufficient && !splitCashInsufficient && !splitTotalMismatch && !singleInsufficient;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                onClick: ()=>setOpen(true),
                className: "bg-gradient-to-r from-emerald-500 to-teal-500",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                        className: "h-4 w-4 mr-2"
                    }, void 0, false, {
                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                        lineNumber: 1028,
                        columnNumber: 9
                    }, this),
                    " Create Offline Loan"
                ]
            }, void 0, true, {
                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                lineNumber: 1027,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Dialog"], {
                open: open,
                onOpenChange: setOpen,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogContent"], {
                    className: "w-[95vw] sm:max-w-4xl max-h-[95vh] overflow-y-auto p-4 sm:p-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogHeader"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogTitle"], {
                                    className: "flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                                            className: "h-5 w-5"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1034,
                                            columnNumber: 62
                                        }, this),
                                        " Create Offline Loan"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                    lineNumber: 1034,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogDescription"], {
                                    children: "Fill in the customer and loan details below"
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                    lineNumber: 1035,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                            lineNumber: 1033,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-6 py-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "p-4 bg-amber-50 rounded-lg border border-amber-200",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "font-semibold flex items-center gap-2 text-amber-800 mb-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__["Building2"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1042,
                                                    columnNumber: 17
                                                }, this),
                                                " Select Company *"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1041,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Select"], {
                                            value: formData.companyId,
                                            onValueChange: (v)=>handleInputChange('companyId', v),
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectTrigger"], {
                                                    className: formData.companyId ? '' : 'border-red-300',
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectValue"], {
                                                        placeholder: "Select company for this loan..."
                                                    }, void 0, false, {
                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                        lineNumber: 1046,
                                                        columnNumber: 19
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1045,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectContent"], {
                                                    children: companies.map((company)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectItem"], {
                                                            value: company.id,
                                                            children: [
                                                                company.name,
                                                                " (",
                                                                company.code,
                                                                ")"
                                                            ]
                                                        }, company.id, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1050,
                                                            columnNumber: 21
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1048,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1044,
                                            columnNumber: 15
                                        }, this),
                                        !formData.companyId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-red-500 mt-1",
                                            children: "Company selection is required"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1057,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                    lineNumber: 1040,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "p-4 bg-emerald-50 rounded-lg border border-emerald-200",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "font-semibold flex items-center gap-2 text-emerald-800 mb-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$indian$2d$rupee$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__IndianRupee$3e$__["IndianRupee"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1064,
                                                    columnNumber: 17
                                                }, this),
                                                " Select Loan Product *"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1063,
                                            columnNumber: 15
                                        }, this),
                                        loadingProducts ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2 text-gray-500",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                    className: "h-4 w-4 animate-spin"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1068,
                                                    columnNumber: 19
                                                }, this),
                                                " Loading products..."
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1067,
                                            columnNumber: 17
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Select"], {
                                                    value: formData.productId,
                                                    onValueChange: (v)=>handleInputChange('productId', v),
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectTrigger"], {
                                                            className: formData.productId ? '' : 'border-red-300',
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectValue"], {
                                                                placeholder: "Select loan product..."
                                                            }, void 0, false, {
                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                lineNumber: 1074,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1073,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectContent"], {
                                                            children: loanProducts.map((product)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectItem"], {
                                                                    value: product.id,
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "flex items-center gap-2",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                children: product.icon
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                lineNumber: 1080,
                                                                                columnNumber: 29
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                children: product.title
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                lineNumber: 1081,
                                                                                columnNumber: 29
                                                                            }, this),
                                                                            product.isInterestOnly ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                                                                                className: "bg-purple-100 text-purple-700 text-xs",
                                                                                children: "Interest Only"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                lineNumber: 1083,
                                                                                columnNumber: 31
                                                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "text-gray-500 text-xs",
                                                                                children: [
                                                                                    "(",
                                                                                    product.defaultInterestRate,
                                                                                    "% p.a., ",
                                                                                    product.defaultTenure,
                                                                                    " months)"
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                lineNumber: 1085,
                                                                                columnNumber: 31
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1079,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                }, product.id, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1078,
                                                                    columnNumber: 25
                                                                }, this))
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1076,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1072,
                                                    columnNumber: 19
                                                }, this),
                                                selectedProduct && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mt-3 p-3 bg-white rounded-lg border text-sm",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-gray-600",
                                                            children: selectedProduct.description
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1095,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-xs text-gray-500",
                                                                            children: "Interest Rate"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1098,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "font-medium",
                                                                            children: [
                                                                                selectedProduct.minInterestRate,
                                                                                "% - ",
                                                                                selectedProduct.maxInterestRate,
                                                                                "%"
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1099,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1097,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-xs text-gray-500",
                                                                            children: "Tenure"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1102,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "font-medium",
                                                                            children: selectedProduct.isInterestOnly ? 'Set at Start Loan' : `${selectedProduct.minTenure} - ${selectedProduct.maxTenure} months`
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1103,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1101,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-xs text-gray-500",
                                                                            children: "Loan Amount"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1111,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "font-medium",
                                                                            children: [
                                                                                formatCurrency(selectedProduct.minAmount),
                                                                                " - ",
                                                                                formatCurrency(selectedProduct.maxAmount)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1112,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1110,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1096,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1094,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                    lineNumber: 1062,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "font-semibold flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__["User"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1123,
                                                    columnNumber: 69
                                                }, this),
                                                " Customer Details"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1123,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "Customer Name *"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1125,
                                                            columnNumber: 44
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                            value: formData.customerName,
                                                            onChange: (e)=>handleInputChange('customerName', e.target.value),
                                                            placeholder: "Full name"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1125,
                                                            columnNumber: 74
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1125,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "Phone Number *"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1126,
                                                            columnNumber: 44
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                            value: formData.customerPhone,
                                                            onChange: (e)=>handleInputChange('customerPhone', e.target.value),
                                                            placeholder: "10-digit number"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1126,
                                                            columnNumber: 73
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1126,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "Email"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1127,
                                                            columnNumber: 44
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                            type: "email",
                                                            value: formData.customerEmail,
                                                            onChange: (e)=>handleInputChange('customerEmail', e.target.value)
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1127,
                                                            columnNumber: 64
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1127,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "PAN Number"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1128,
                                                            columnNumber: 44
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                            value: formData.customerPan,
                                                            onChange: (e)=>handleInputChange('customerPan', e.target.value.toUpperCase()),
                                                            maxLength: 10
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1128,
                                                            columnNumber: 69
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1128,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "Aadhaar Number"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1129,
                                                            columnNumber: 44
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                            value: formData.customerAadhaar,
                                                            onChange: (e)=>handleInputChange('customerAadhaar', e.target.value),
                                                            maxLength: 12
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1129,
                                                            columnNumber: 73
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1129,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "Occupation"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1130,
                                                            columnNumber: 44
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                            value: formData.customerOccupation,
                                                            onChange: (e)=>handleInputChange('customerOccupation', e.target.value)
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1130,
                                                            columnNumber: 69
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1130,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "Monthly Income"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1131,
                                                            columnNumber: 44
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                            type: "number",
                                                            value: formData.customerMonthlyIncome,
                                                            onChange: (e)=>handleInputChange('customerMonthlyIncome', e.target.value)
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1131,
                                                            columnNumber: 73
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1131,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "Date of Birth"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1132,
                                                            columnNumber: 44
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                            type: "date",
                                                            value: formData.customerDOB,
                                                            onChange: (e)=>handleInputChange('customerDOB', e.target.value)
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1132,
                                                            columnNumber: 72
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1132,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1124,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "space-y-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                    children: "Address *"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1134,
                                                    columnNumber: 42
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                    value: formData.customerAddress,
                                                    onChange: (e)=>handleInputChange('customerAddress', e.target.value)
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1134,
                                                    columnNumber: 66
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1134,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "City"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1136,
                                                            columnNumber: 44
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                            value: formData.customerCity,
                                                            onChange: (e)=>handleInputChange('customerCity', e.target.value)
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1136,
                                                            columnNumber: 63
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1136,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "State"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1137,
                                                            columnNumber: 44
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                            value: formData.customerState,
                                                            onChange: (e)=>handleInputChange('customerState', e.target.value)
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1137,
                                                            columnNumber: 64
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1137,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "Pincode"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1138,
                                                            columnNumber: 44
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                            value: formData.customerPincode,
                                                            onChange: (e)=>handleInputChange('customerPincode', e.target.value),
                                                            maxLength: 6
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1138,
                                                            columnNumber: 66
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1138,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1135,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                    lineNumber: 1122,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4 pt-4 border-t",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "font-semibold flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$indian$2d$rupee$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__IndianRupee$3e$__["IndianRupee"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1144,
                                                    columnNumber: 69
                                                }, this),
                                                " Loan Details"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1144,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "Loan Type"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1147,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                            value: selectedProduct?.title || formData.loanType,
                                                            disabled: true,
                                                            className: "bg-gray-50"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1148,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1146,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "Loan Amount *"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1150,
                                                            columnNumber: 44
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                            type: "number",
                                                            value: formData.loanAmount,
                                                            onChange: (e)=>handleInputChange('loanAmount', e.target.value)
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1150,
                                                            columnNumber: 72
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1150,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "Interest Rate (% p.a.) *"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1151,
                                                            columnNumber: 44
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                            type: "number",
                                                            step: "0.1",
                                                            value: formData.interestRate,
                                                            onChange: (e)=>handleInputChange('interestRate', e.target.value)
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1151,
                                                            columnNumber: 83
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1151,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "Interest Type"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1153,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Select"], {
                                                            value: formData.interestType || 'FLAT',
                                                            onValueChange: (v)=>handleInputChange('interestType', v),
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectTrigger"], {
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectValue"], {}, void 0, false, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1156,
                                                                        columnNumber: 23
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1155,
                                                                    columnNumber: 21
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectContent"], {
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectItem"], {
                                                                            value: "FLAT",
                                                                            children: "Flat Rate"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1159,
                                                                            columnNumber: 23
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectItem"], {
                                                                            value: "REDUCING",
                                                                            children: "Reduce Rate"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1160,
                                                                            columnNumber: 23
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1158,
                                                                    columnNumber: 21
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1154,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-xs text-gray-500",
                                                            children: formData.interestType === 'REDUCING' ? 'Interest calculated on outstanding balance' : 'Interest calculated on principal for full tenure'
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1163,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1152,
                                                    columnNumber: 17
                                                }, this),
                                                !isInterestOnly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "Tenure (months) *"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1171,
                                                            columnNumber: 46
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                            type: "number",
                                                            value: formData.tenure,
                                                            onChange: (e)=>handleInputChange('tenure', e.target.value)
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1171,
                                                            columnNumber: 78
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1171,
                                                    columnNumber: 19
                                                }, this),
                                                isInterestOnly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "Tenure"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1176,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "p-3 bg-purple-50 rounded-lg border border-purple-200",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-sm text-purple-700",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__["Info"], {
                                                                        className: "h-4 w-4 inline mr-1"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1179,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    "Tenure will be set when starting the loan"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                lineNumber: 1178,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1177,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1175,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: isInterestOnly ? 'Monthly Interest' : 'EMI Amount (Auto-calculated)'
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1186,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                                    type: "number",
                                                                    value: isInterestOnly ? (parseFloat(formData.loanAmount || '0') * parseFloat(formData.interestRate || '0') / 100 / 12).toFixed(0) : calculateEmi(),
                                                                    disabled: true,
                                                                    className: "bg-gray-100 text-gray-700 font-semibold"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1188,
                                                                    columnNumber: 21
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                                                                    variant: "outline",
                                                                    className: "text-emerald-700 border-emerald-300",
                                                                    children: formatCurrency(isInterestOnly ? parseFloat(formData.loanAmount || '0') * parseFloat(formData.interestRate || '0') / 100 / 12 : calculateEmi())
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1197,
                                                                    columnNumber: 21
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1187,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-xs text-gray-500",
                                                            children: isInterestOnly ? 'Monthly interest payment. Customer pays this until loan is started.' : 'EMI is auto-calculated based on Loan Amount, Interest Rate, Tenure & Interest Type'
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1204,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1185,
                                                    columnNumber: 17
                                                }, this),
                                                !isMirrorLoan && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "Processing Fee"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1213,
                                                            columnNumber: 46
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                            type: "number",
                                                            value: formData.processingFee,
                                                            onChange: (e)=>handleInputChange('processingFee', e.target.value)
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1213,
                                                            columnNumber: 75
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1213,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2 p-3 bg-orange-50 border border-orange-200 rounded-lg",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            className: "font-semibold text-orange-800 flex items-center gap-2",
                                                            children: [
                                                                "💵 Charges Amount (₹)",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-xs text-orange-500 font-normal",
                                                                    children: "→ Your Personal Credit"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1219,
                                                                    columnNumber: 21
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1217,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                            type: "number",
                                                            min: "0",
                                                            placeholder: "0",
                                                            value: formData.chargesAmount || '',
                                                            onChange: (e)=>handleInputChange('chargesAmount', e.target.value),
                                                            className: "border-orange-200"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1221,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-xs text-orange-600",
                                                            children: [
                                                                "Credited to ",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                    children: "your personal account"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1230,
                                                                    columnNumber: 33
                                                                }, this),
                                                                " only. No accounting entry created."
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1229,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1216,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1145,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                    lineNumber: 1143,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4 pt-4 border-t",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "font-semibold flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1239,
                                                    columnNumber: 69
                                                }, this),
                                                " Loan Options"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1239,
                                            columnNumber: 15
                                        }, this),
                                        isInterestOnly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-2",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                                                            className: "bg-purple-100 text-purple-700",
                                                            children: "Interest Only Loan (Auto-applied)"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1246,
                                                            columnNumber: 23
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                        lineNumber: 1245,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm text-purple-600 mt-1",
                                                        children: "Customer pays only monthly interest until loan is activated. Principal remains unchanged."
                                                    }, void 0, false, {
                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                        lineNumber: 1248,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mt-3 p-3 bg-white rounded-lg border border-purple-200",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex justify-between items-center",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-purple-700 font-medium",
                                                                        children: "Monthly Interest Payment:"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1253,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-xl font-bold text-purple-600",
                                                                        children: formatCurrency(parseFloat(formData.loanAmount || '0') * parseFloat(formData.interestRate || '0') / 100 / 12)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1254,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                lineNumber: 1252,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-xs text-purple-500 mt-2",
                                                                children: 'No EMI schedule will be generated. Customer pays interest monthly until "Start Loan" is clicked.'
                                                            }, void 0, false, {
                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                lineNumber: 1258,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                        lineNumber: 1251,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                lineNumber: 1244,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1243,
                                            columnNumber: 17
                                        }, this),
                                        formData.companyId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "checkbox",
                                                    id: "isMirrorLoan",
                                                    checked: isMirrorLoan,
                                                    onChange: (e)=>{
                                                        setIsMirrorLoan(e.target.checked);
                                                    },
                                                    className: "mt-1 h-4 w-4 text-blue-600 rounded border-blue-300 focus:ring-blue-500"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1269,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex-1",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            htmlFor: "isMirrorLoan",
                                                            className: "font-medium text-blue-800 cursor-pointer",
                                                            children: "Create Mirror Loan"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1279,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm text-blue-600 mt-1",
                                                            children: [
                                                                "Create a duplicate loan record in another company with different interest rate/type.",
                                                                isInterestOnly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "block mt-1 text-purple-600 font-medium",
                                                                    children: "⚡ Interest-Only: Mirror company will collect interest at the mirror rate monthly."
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1285,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1282,
                                                            columnNumber: 21
                                                        }, this),
                                                        isMirrorLoan && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "mt-3 space-y-3",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                                            className: "text-blue-700 font-medium",
                                                                            children: "Select Mirror Company *"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1294,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Select"], {
                                                                            value: mirrorCompanyId,
                                                                            onValueChange: setMirrorCompanyId,
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectTrigger"], {
                                                                                    className: "mt-1",
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectValue"], {
                                                                                        placeholder: "Select mirror company..."
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                        lineNumber: 1297,
                                                                                        columnNumber: 31
                                                                                    }, this)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1296,
                                                                                    columnNumber: 29
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectContent"], {
                                                                                    children: availableMirrorCompanies.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectItem"], {
                                                                                            value: c.id,
                                                                                            children: [
                                                                                                c.name,
                                                                                                " (",
                                                                                                c.code,
                                                                                                ")"
                                                                                            ]
                                                                                        }, c.id, true, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1301,
                                                                                            columnNumber: 33
                                                                                        }, this))
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1299,
                                                                                    columnNumber: 29
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1295,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        availableMirrorCompanies.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-xs text-red-500 mt-1",
                                                                            children: "No other companies available. Create another company to enable mirror loan."
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1308,
                                                                            columnNumber: 29
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1293,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "grid grid-cols-2 gap-3",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                                                    className: "text-blue-700 font-medium",
                                                                                    children: "Mirror Interest Rate (%) *"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1315,
                                                                                    columnNumber: 29
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                                                    type: "number",
                                                                                    placeholder: "e.g., 15",
                                                                                    value: mirrorInterestRate,
                                                                                    onChange: (e)=>setMirrorInterestRate(e.target.value),
                                                                                    className: "mt-1"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1316,
                                                                                    columnNumber: 29
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                    className: "text-xs text-gray-500 mt-1",
                                                                                    children: "Enter the interest rate for this mirror loan"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1323,
                                                                                    columnNumber: 29
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1314,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                                                    className: "text-blue-700 font-medium",
                                                                                    children: "Interest Type *"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1326,
                                                                                    columnNumber: 29
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Select"], {
                                                                                    value: mirrorInterestType,
                                                                                    onValueChange: setMirrorInterestType,
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectTrigger"], {
                                                                                            className: "mt-1",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectValue"], {}, void 0, false, {
                                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                lineNumber: 1329,
                                                                                                columnNumber: 33
                                                                                            }, this)
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1328,
                                                                                            columnNumber: 31
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectContent"], {
                                                                                            children: [
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectItem"], {
                                                                                                    value: "REDUCING",
                                                                                                    children: "Reducing Balance"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                    lineNumber: 1332,
                                                                                                    columnNumber: 33
                                                                                                }, this),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectItem"], {
                                                                                                    value: "FLAT",
                                                                                                    children: "Flat Rate"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                    lineNumber: 1333,
                                                                                                    columnNumber: 33
                                                                                                }, this)
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1331,
                                                                                            columnNumber: 31
                                                                                        }, this)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1327,
                                                                                    columnNumber: 29
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                    className: "text-xs text-gray-500 mt-1",
                                                                                    children: "How interest is calculated"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1336,
                                                                                    columnNumber: 29
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1325,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1313,
                                                                    columnNumber: 25
                                                                }, this),
                                                                mirrorCompanyId && mirrorLoanSummary && originalEmiSchedule.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "mt-4 space-y-4",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "grid grid-cols-3 gap-3",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "p-3 bg-emerald-50 rounded-lg border border-emerald-200",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-xs text-emerald-600",
                                                                                            children: "Interest Saved"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1346,
                                                                                            columnNumber: 33
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-lg font-bold text-emerald-700",
                                                                                            children: formatCurrency(mirrorLoanSummary.interestSaved)
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1347,
                                                                                            columnNumber: 33
                                                                                        }, this)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1345,
                                                                                    columnNumber: 31
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "p-3 bg-amber-50 rounded-lg border border-amber-200",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-xs text-amber-600",
                                                                                            children: "Extra EMIs (Company 3 Profit)"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1350,
                                                                                            columnNumber: 33
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-lg font-bold text-amber-700",
                                                                                            children: mirrorLoanSummary.extraEMICount
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1351,
                                                                                            columnNumber: 33
                                                                                        }, this)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1349,
                                                                                    columnNumber: 31
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "p-3 bg-purple-50 rounded-lg border border-purple-200",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-xs text-purple-600",
                                                                                            children: "Mirror Tenure"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1354,
                                                                                            columnNumber: 33
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-lg font-bold text-purple-700",
                                                                                            children: [
                                                                                                mirrorLoanSummary.mirrorTenure,
                                                                                                " months"
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1355,
                                                                                            columnNumber: 33
                                                                                        }, this)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1353,
                                                                                    columnNumber: 31
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1344,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        (()=>{
                                                                            const originalEMI = originalEmiSchedule.length > 0 ? originalEmiSchedule[0].emi : 0;
                                                                            const lastMirrorEMI = mirrorEmiSchedule.length > 0 ? mirrorEmiSchedule[mirrorEmiSchedule.length - 1].emi : 0;
                                                                            const procFee = Math.max(0, Math.round((originalEMI - lastMirrorEMI) * 100) / 100);
                                                                            if (procFee <= 0) return null;
                                                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "p-3 bg-orange-50 rounded-lg border border-orange-300 flex items-center gap-3",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "flex-1",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                className: "text-xs font-semibold text-orange-700 uppercase tracking-wide",
                                                                                                children: "Auto Processing Fee (Read-only)"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                lineNumber: 1368,
                                                                                                columnNumber: 37
                                                                                            }, this),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                className: "text-xs text-orange-600 mt-0.5",
                                                                                                children: [
                                                                                                    "= Original EMI (",
                                                                                                    formatCurrency(originalEMI),
                                                                                                    ")  Mirror Last EMI (",
                                                                                                    formatCurrency(lastMirrorEMI),
                                                                                                    ")"
                                                                                                ]
                                                                                            }, void 0, true, {
                                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                lineNumber: 1369,
                                                                                                columnNumber: 37
                                                                                            }, this),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                className: "text-xs text-orange-500 mt-0.5",
                                                                                                children: "Recorded as income when EMI #1 is paid from original loan"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                lineNumber: 1370,
                                                                                                columnNumber: 37
                                                                                            }, this)
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                        lineNumber: 1367,
                                                                                        columnNumber: 35
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "text-right",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                className: "text-xl font-bold text-orange-700",
                                                                                                children: formatCurrency(procFee)
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                lineNumber: 1373,
                                                                                                columnNumber: 37
                                                                                            }, this),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                className: "text-xs text-orange-500",
                                                                                                children: "Processing Fee"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                lineNumber: 1374,
                                                                                                columnNumber: 37
                                                                                            }, this)
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                        lineNumber: 1372,
                                                                                        columnNumber: 35
                                                                                    }, this)
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                lineNumber: 1366,
                                                                                columnNumber: 33
                                                                            }, this);
                                                                        })(),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "border rounded-lg overflow-hidden",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "bg-gray-100 p-2 border-b",
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                                                                        className: "font-medium text-sm flex items-center gap-2",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calculator$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Calculator$3e$__["Calculator"], {
                                                                                                className: "h-4 w-4"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                lineNumber: 1383,
                                                                                                columnNumber: 35
                                                                                            }, this),
                                                                                            " EMI Schedule Comparison"
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                        lineNumber: 1382,
                                                                                        columnNumber: 33
                                                                                    }, this)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1381,
                                                                                    columnNumber: 31
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "overflow-x-auto max-h-60",
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                                                        className: "w-full text-xs",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                                                                className: "sticky top-0 bg-gray-50",
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                                                    children: [
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                                            className: "px-2 py-1 text-left border-b",
                                                                                                            children: "#"
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                            lineNumber: 1390,
                                                                                                            columnNumber: 39
                                                                                                        }, this),
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                                            className: "px-2 py-1 text-right border-b bg-red-50",
                                                                                                            children: "Original Principal"
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                            lineNumber: 1391,
                                                                                                            columnNumber: 39
                                                                                                        }, this),
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                                            className: "px-2 py-1 text-right border-b bg-red-50",
                                                                                                            children: "Original Interest"
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                            lineNumber: 1392,
                                                                                                            columnNumber: 39
                                                                                                        }, this),
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                                            className: "px-2 py-1 text-right border-b bg-emerald-50",
                                                                                                            children: "Mirror Principal"
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                            lineNumber: 1393,
                                                                                                            columnNumber: 39
                                                                                                        }, this),
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                                            className: "px-2 py-1 text-right border-b bg-emerald-50",
                                                                                                            children: "Mirror Interest"
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                            lineNumber: 1394,
                                                                                                            columnNumber: 39
                                                                                                        }, this)
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                    lineNumber: 1389,
                                                                                                    columnNumber: 37
                                                                                                }, this)
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                lineNumber: 1388,
                                                                                                columnNumber: 35
                                                                                            }, this),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                                                                children: Array.from({
                                                                                                    length: Math.max(originalEmiSchedule.length, mirrorEmiSchedule.length)
                                                                                                }).map((_, idx)=>{
                                                                                                    const originalEMI = originalEmiSchedule[idx];
                                                                                                    const mirrorEMI = mirrorEmiSchedule[idx];
                                                                                                    const isExtraEMI = idx >= mirrorEmiSchedule.length && originalEMI;
                                                                                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                                                        className: isExtraEMI ? 'bg-amber-100' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                                                                                                        children: [
                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                                                className: "px-2 py-1 border-b",
                                                                                                                children: [
                                                                                                                    idx + 1,
                                                                                                                    isExtraEMI && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                                                                                                                        className: "ml-1 bg-amber-500 text-white text-[10px]",
                                                                                                                        children: "EXTRA"
                                                                                                                    }, void 0, false, {
                                                                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                                        lineNumber: 1407,
                                                                                                                        columnNumber: 60
                                                                                                                    }, this)
                                                                                                                ]
                                                                                                            }, void 0, true, {
                                                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                                lineNumber: 1405,
                                                                                                                columnNumber: 43
                                                                                                            }, this),
                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                                                className: "px-2 py-1 text-right border-b",
                                                                                                                children: originalEMI ? formatCurrency(originalEMI.principal) : '-'
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                                lineNumber: 1409,
                                                                                                                columnNumber: 43
                                                                                                            }, this),
                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                                                className: "px-2 py-1 text-right border-b text-red-600",
                                                                                                                children: originalEMI ? formatCurrency(originalEMI.interest) : '-'
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                                lineNumber: 1410,
                                                                                                                columnNumber: 43
                                                                                                            }, this),
                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                                                className: "px-2 py-1 text-right border-b",
                                                                                                                children: mirrorEMI ? formatCurrency(mirrorEMI.principal) : isExtraEMI ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                    className: "text-amber-700",
                                                                                                                    children: "Done"
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                                    lineNumber: 1411,
                                                                                                                    columnNumber: 154
                                                                                                                }, this) : '-'
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                                lineNumber: 1411,
                                                                                                                columnNumber: 43
                                                                                                            }, this),
                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                                                className: "px-2 py-1 text-right border-b text-emerald-600",
                                                                                                                children: mirrorEMI ? formatCurrency(mirrorEMI.interest) : '-'
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                                lineNumber: 1412,
                                                                                                                columnNumber: 43
                                                                                                            }, this)
                                                                                                        ]
                                                                                                    }, idx, true, {
                                                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                        lineNumber: 1404,
                                                                                                        columnNumber: 41
                                                                                                    }, this);
                                                                                                })
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                lineNumber: 1397,
                                                                                                columnNumber: 35
                                                                                            }, this)
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                        lineNumber: 1387,
                                                                                        columnNumber: 33
                                                                                    }, this)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1386,
                                                                                    columnNumber: 31
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1380,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "flex flex-wrap gap-4 text-xs",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "flex items-center gap-1",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "w-3 h-3 bg-amber-100 border border-amber-300 rounded"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1424,
                                                                                            columnNumber: 33
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                            children: "Extra EMI - Goes to Company 3 Cash Book"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1425,
                                                                                            columnNumber: 33
                                                                                        }, this)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1423,
                                                                                    columnNumber: 31
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "flex items-center gap-1",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "w-3 h-3 bg-red-50 border border-red-300 rounded"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1428,
                                                                                            columnNumber: 33
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                            children: [
                                                                                                "Original (",
                                                                                                formData.interestRate,
                                                                                                "% FLAT)"
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1429,
                                                                                            columnNumber: 33
                                                                                        }, this)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1427,
                                                                                    columnNumber: 31
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "flex items-center gap-1",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "w-3 h-3 bg-emerald-50 border border-emerald-300 rounded"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1432,
                                                                                            columnNumber: 33
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                            children: [
                                                                                                "Mirror (",
                                                                                                mirrorLoanSummary.mirrorRate,
                                                                                                "% REDUCING)"
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1433,
                                                                                            columnNumber: 33
                                                                                        }, this)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1431,
                                                                                    columnNumber: 31
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1422,
                                                                            columnNumber: 29
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1342,
                                                                    columnNumber: 27
                                                                }, this),
                                                                mirrorLoanSummary && mirrorLoanSummary.extraEMICount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "p-4 bg-amber-50 rounded-lg border border-amber-300",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "flex items-center gap-2 mb-2",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                                                                                    className: "h-5 w-5 text-amber-600"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1443,
                                                                                    columnNumber: 31
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                                                    className: "text-amber-800 font-semibold",
                                                                                    children: "Extra EMIs - Personal Credit"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1444,
                                                                                    columnNumber: 31
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1442,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-sm text-amber-700",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                                    children: [
                                                                                        mirrorLoanSummary.extraEMICount,
                                                                                        " Extra EMIs"
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1447,
                                                                                    columnNumber: 31
                                                                                }, this),
                                                                                " (profit for Company 3) will go directly to ",
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                                    children: "Personal Credit"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1447,
                                                                                    columnNumber: 136
                                                                                }, this),
                                                                                ". No secondary payment page needed for offline loans."
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1446,
                                                                            columnNumber: 29
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1441,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1291,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1278,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1268,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                    lineNumber: 1238,
                                    columnNumber: 13
                                }, this),
                                false && !isInterestOnly && isSelectedCompany3() && !isMirrorLoan && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-3 pt-4 border-t",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$landmark$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Landmark$3e$__["Landmark"], {
                                                    className: "h-5 w-5 text-violet-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1465,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: "font-semibold text-violet-800",
                                                    children: "Payment Collection Page"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1466,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                                                    className: "bg-violet-100 text-violet-700 text-xs",
                                                    children: "Required for C3 Loans"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1467,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1464,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "p-4 bg-violet-50 border border-violet-200 rounded-lg space-y-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-sm text-violet-700",
                                                    children: [
                                                        "Since ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                            children: "Company 3 (PD Rangani)"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1471,
                                                            columnNumber: 27
                                                        }, this),
                                                        " has no bank account, all EMI payments will be recorded in the ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                            children: "Cashbook"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1472,
                                                            columnNumber: 28
                                                        }, this),
                                                        " and ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                            children: "DayBook"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1472,
                                                            columnNumber: 58
                                                        }, this),
                                                        ". The money the customer pays will go to the selected payment page owner's ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                            children: "personal credit"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1473,
                                                            columnNumber: 61
                                                        }, this),
                                                        "."
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1470,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            className: "font-medium text-violet-800",
                                                            children: [
                                                                "Select Secondary Payment Page ",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-red-500",
                                                                    children: "*"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1477,
                                                                    columnNumber: 53
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1476,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Select"], {
                                                            value: selectedSecondaryPageId,
                                                            onValueChange: setSelectedSecondaryPageId,
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectTrigger"], {
                                                                    className: "mt-1 border-violet-300",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectValue"], {
                                                                        placeholder: loadingSecPages ? 'Loading…' : 'Select payment collection page…'
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1484,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1483,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectContent"], {
                                                                    children: [
                                                                        secondaryPaymentPages.map((page)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectItem"], {
                                                                                value: page.id,
                                                                                children: [
                                                                                    page.name,
                                                                                    " ",
                                                                                    page.upiId ? `— UPI: ${page.upiId}` : '',
                                                                                    " ",
                                                                                    page.accountNumber ? `— Acc: ${page.accountNumber}` : ''
                                                                                ]
                                                                            }, page.id, true, {
                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                lineNumber: 1488,
                                                                                columnNumber: 27
                                                                            }, this)),
                                                                        secondaryPaymentPages.length === 0 && !loadingSecPages && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectItem"], {
                                                                            value: "__none",
                                                                            disabled: true,
                                                                            children: "No pages found — create one first"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1493,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1486,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1479,
                                                            columnNumber: 21
                                                        }, this),
                                                        secondaryPaymentPages.length === 0 && !loadingSecPages && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-xs text-red-500 mt-1",
                                                            children: "⚠️ No secondary payment pages configured. Please create one in the payment pages section."
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1498,
                                                            columnNumber: 23
                                                        }, this),
                                                        selectedSecondaryPageId && (()=>{
                                                            const pg = secondaryPaymentPages.find((p)=>p.id === selectedSecondaryPageId);
                                                            if (!pg) return null;
                                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "mt-2 p-3 bg-white rounded-lg border border-violet-200 text-sm",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "font-semibold text-violet-800",
                                                                        children: pg.name
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1507,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    pg.upiId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "text-violet-600",
                                                                        children: [
                                                                            "UPI: ",
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                                                                children: pg.upiId
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                lineNumber: 1508,
                                                                                columnNumber: 76
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1508,
                                                                        columnNumber: 40
                                                                    }, this),
                                                                    pg.bankName && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "text-violet-600",
                                                                        children: [
                                                                            "Bank: ",
                                                                            pg.bankName,
                                                                            " | ",
                                                                            pg.accountNumber
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1509,
                                                                        columnNumber: 43
                                                                    }, this),
                                                                    pg.ifscCode && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "text-violet-600",
                                                                        children: [
                                                                            "IFSC: ",
                                                                            pg.ifscCode
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1510,
                                                                        columnNumber: 43
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                lineNumber: 1506,
                                                                columnNumber: 25
                                                            }, this);
                                                        })()
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1475,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1469,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                    lineNumber: 1463,
                                    columnNumber: 15
                                }, this),
                                formData.loanType === 'GOLD' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "pt-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2 mb-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                                    className: "h-5 w-5 text-amber-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1523,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: "font-semibold text-amber-800",
                                                    children: "Gold Loan Receipt"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1524,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                                                    className: "bg-amber-100 text-amber-700",
                                                    children: "Required for Gold Loan"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1525,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1522,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Alert"], {
                                            className: "bg-amber-50 border-amber-200 mb-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__["Info"], {
                                                    className: "h-4 w-4 text-amber-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1528,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AlertDescription"], {
                                                    className: "text-amber-700",
                                                    children: "Please fill in all gold item details. This information is mandatory for gold loan processing."
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1529,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1527,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$loan$2f$GoldLoanReceipt$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            data: goldLoanData,
                                            onChange: (data)=>setGoldLoanData((prev)=>({
                                                        ...prev,
                                                        ...data
                                                    }))
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1533,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                    lineNumber: 1521,
                                    columnNumber: 15
                                }, this),
                                formData.loanType === 'VEHICLE' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "pt-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2 mb-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$car$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Car$3e$__["Car"], {
                                                    className: "h-5 w-5 text-blue-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1544,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: "font-semibold text-blue-800",
                                                    children: "Vehicle Loan Receipt"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1545,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                                                    className: "bg-blue-100 text-blue-700",
                                                    children: "Required for Vehicle Loan"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1546,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1543,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Alert"], {
                                            className: "bg-blue-50 border-blue-200 mb-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__["Info"], {
                                                    className: "h-4 w-4 text-blue-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1549,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AlertDescription"], {
                                                    className: "text-blue-700",
                                                    children: "Please fill in all vehicle details including RC Book and Vehicle photos. This information is mandatory for vehicle loan processing."
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1550,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1548,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$loan$2f$VehicleLoanReceipt$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            data: vehicleLoanData,
                                            onChange: (data)=>setVehicleLoanData((prev)=>({
                                                        ...prev,
                                                        ...data
                                                    }))
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1554,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                    lineNumber: 1542,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4 pt-4 border-t",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__["Upload"], {
                                                    className: "h-5 w-5 text-emerald-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1564,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: "font-semibold",
                                                    children: "Document Upload"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1565,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1563,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Alert"], {
                                            className: "bg-blue-50 border-blue-200",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__["Info"], {
                                                    className: "h-4 w-4 text-blue-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1568,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AlertDescription"], {
                                                    className: "text-blue-700 text-sm",
                                                    children: "Upload clear scanned copies or photos. Supported formats: PNG, JPG, WEBP, PDF. Max size: 10MB."
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1569,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1567,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-2 sm:grid-cols-4 gap-4",
                                            children: DOCUMENT_TYPES.map((doc)=>{
                                                const uploaded = uploadedDocs[doc.id];
                                                const isUploading = uploadingDoc === doc.id;
                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "relative",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "file",
                                                            id: `doc-${doc.id}`,
                                                            className: "hidden",
                                                            accept: "image/png,image/jpeg,image/jpg,image/webp,application/pdf",
                                                            onChange: (e)=>{
                                                                const file = e.target.files?.[0];
                                                                if (file) handleDocumentUpload(doc.id, file);
                                                                e.target.value = '';
                                                            },
                                                            disabled: isUploading
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1580,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: `doc-${doc.id}`,
                                                            className: `block p-3 border-2 rounded-lg text-center transition-all cursor-pointer ${uploaded ? 'border-emerald-400 bg-emerald-50' : 'border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/50'} ${isUploading ? 'opacity-70 cursor-wait' : ''}`,
                                                            children: uploaded ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex flex-col items-center",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__["CheckCircle"], {
                                                                        className: "h-6 w-6 text-emerald-500 mb-1"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1602,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "text-xs font-medium text-emerald-700",
                                                                        children: doc.name
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1603,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "text-xs text-emerald-600 truncate max-w-full",
                                                                        children: uploaded.name
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1604,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                                        variant: "ghost",
                                                                        size: "sm",
                                                                        className: "mt-1 text-red-600 hover:text-red-700 hover:bg-red-50 h-6 px-2 text-xs",
                                                                        onClick: (e)=>{
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            handleRemoveDocument(doc.id);
                                                                        },
                                                                        children: "Remove"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1605,
                                                                        columnNumber: 29
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                lineNumber: 1601,
                                                                columnNumber: 27
                                                            }, this) : isUploading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex flex-col items-center",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                                        className: "h-6 w-6 text-emerald-500 animate-spin mb-1"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1620,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "text-xs font-medium text-gray-600",
                                                                        children: "Uploading..."
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1621,
                                                                        columnNumber: 29
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                lineNumber: 1619,
                                                                columnNumber: 27
                                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex flex-col items-center",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__["Upload"], {
                                                                        className: "h-6 w-6 text-gray-400 mb-1"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1625,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "text-xs font-medium",
                                                                        children: doc.name
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1626,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "text-xs text-gray-500",
                                                                        children: doc.desc
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1627,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    doc.required && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-xs text-red-500 mt-1",
                                                                        children: "*Required"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1629,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                lineNumber: 1624,
                                                                columnNumber: 27
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1592,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, doc.id, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1579,
                                                    columnNumber: 21
                                                }, this);
                                            })
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1573,
                                            columnNumber: 15
                                        }, this),
                                        Object.keys(uploadedDocs).length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "p-3 bg-gray-50 rounded-lg",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-sm text-gray-600",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                        children: Object.keys(uploadedDocs).length
                                                    }, void 0, false, {
                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                        lineNumber: 1643,
                                                        columnNumber: 21
                                                    }, this),
                                                    " of ",
                                                    DOCUMENT_TYPES.filter((d)=>d.required).length,
                                                    " required documents uploaded"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                lineNumber: 1642,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1641,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                    lineNumber: 1562,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4 pt-4 border-t",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "font-semibold flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__["Calendar"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1651,
                                                    columnNumber: 69
                                                }, this),
                                                " Dates & Disbursement"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1651,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-2 gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "Disbursement Date *"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1653,
                                                            columnNumber: 44
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                            type: "date",
                                                            value: formData.disbursementDate,
                                                            onChange: (e)=>handleInputChange('disbursementDate', e.target.value)
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1653,
                                                            columnNumber: 78
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1653,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "EMI Start Date *"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1654,
                                                            columnNumber: 44
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                            type: "date",
                                                            value: formData.startDate,
                                                            onChange: (e)=>handleInputChange('startDate', e.target.value)
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1654,
                                                            columnNumber: 75
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1654,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1652,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "p-4 bg-blue-50 rounded-lg border border-blue-200",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                                    className: "font-medium text-blue-800 mb-3 flex items-center gap-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__["Building2"], {
                                                            className: "h-4 w-4"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1660,
                                                            columnNumber: 19
                                                        }, this),
                                                        " Disbursement Account"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1659,
                                                    columnNumber: 17
                                                }, this),
                                                !formData.companyId ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Alert"], {
                                                    className: "bg-amber-50 border-amber-200",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                                                            className: "h-4 w-4 text-amber-600"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1665,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AlertDescription"], {
                                                            className: "text-amber-700 text-sm",
                                                            children: "Please select a company first to see available accounts."
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1666,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1664,
                                                    columnNumber: 19
                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "mb-4 p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg border border-blue-300",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-sm text-blue-700 font-medium mb-2",
                                                                    children: [
                                                                        "Available Funds for ",
                                                                        isMirrorLoan && mirrorCompanyId ? companies.find((c)=>c.id === mirrorCompanyId)?.name : companies.find((c)=>c.id === formData.companyId)?.name
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1674,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "grid grid-cols-2 gap-4",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "p-3 bg-white rounded-lg border",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "flex items-center gap-2",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__["Wallet"], {
                                                                                        className: "h-5 w-5 text-emerald-600"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                        lineNumber: 1678,
                                                                                        columnNumber: 29
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                className: "text-xs text-gray-500",
                                                                                                children: "Cash in Hand"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                lineNumber: 1680,
                                                                                                columnNumber: 31
                                                                                            }, this),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                className: "text-lg font-bold text-emerald-700",
                                                                                                children: loadingCashbook ? 'Loading...' : cashbookBalance !== null ? formatCurrency(cashbookBalance) : '₹0'
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                lineNumber: 1681,
                                                                                                columnNumber: 31
                                                                                            }, this)
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                        lineNumber: 1679,
                                                                                        columnNumber: 29
                                                                                    }, this)
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                lineNumber: 1677,
                                                                                columnNumber: 27
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1676,
                                                                            columnNumber: 25
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "p-3 bg-white rounded-lg border",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "flex items-center gap-2",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__["Building2"], {
                                                                                        className: "h-5 w-5 text-blue-600"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                        lineNumber: 1689,
                                                                                        columnNumber: 29
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                className: "text-xs text-gray-500",
                                                                                                children: "Bank Balance"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                lineNumber: 1691,
                                                                                                columnNumber: 31
                                                                                            }, this),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                className: "text-lg font-bold text-blue-700",
                                                                                                children: loadingBankAccounts ? 'Loading...' : bankAccounts.length > 0 ? formatCurrency(bankAccounts.reduce((sum, acc)=>sum + (acc.currentBalance || 0), 0)) : '₹0'
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                lineNumber: 1692,
                                                                                                columnNumber: 31
                                                                                            }, this)
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                        lineNumber: 1690,
                                                                                        columnNumber: 29
                                                                                    }, this)
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                lineNumber: 1688,
                                                                                columnNumber: 27
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1687,
                                                                            columnNumber: 25
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1675,
                                                                    columnNumber: 23
                                                                }, this),
                                                                formData.loanAmount && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "mt-3 p-2 bg-white rounded border text-sm",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "text-gray-600",
                                                                        children: [
                                                                            "Loan Amount: ",
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "font-bold text-blue-800",
                                                                                children: formatCurrency(parseFloat(formData.loanAmount) || 0)
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                lineNumber: 1704,
                                                                                columnNumber: 42
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                        lineNumber: 1703,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1702,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1673,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "mb-4 p-3 bg-white rounded-lg border border-blue-200",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                    className: "flex items-center gap-2 cursor-pointer",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                            type: "checkbox",
                                                                            checked: useSplitPayment,
                                                                            onChange: (e)=>{
                                                                                setUseSplitPayment(e.target.checked);
                                                                                if (e.target.checked && formData.loanAmount) {
                                                                                    // Initialize with 50-50 split
                                                                                    const amount = parseFloat(formData.loanAmount);
                                                                                    setBankAmount(Math.round(amount / 2));
                                                                                    setCashAmount(Math.round(amount / 2));
                                                                                } else {
                                                                                    setBankAmount(0);
                                                                                    setCashAmount(0);
                                                                                }
                                                                            },
                                                                            className: "h-4 w-4 text-blue-600 rounded border-blue-300"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1713,
                                                                            columnNumber: 25
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "font-medium text-blue-800",
                                                                            children: "Split Payment Between Bank & Cash"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1730,
                                                                            columnNumber: 25
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1712,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-xs text-gray-500 mt-1",
                                                                    children: useSplitPayment ? 'Divide disbursement between bank account and cash' : 'Use a single payment method (bank OR cash)'
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1732,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1711,
                                                            columnNumber: 21
                                                        }, this),
                                                        useSplitPayment ? /* Split Payment UI */ /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "space-y-4",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "grid grid-cols-2 gap-4",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "p-3 bg-white rounded-lg border border-blue-200",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                                                    className: "text-blue-700",
                                                                                    children: "Bank Amount"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1745,
                                                                                    columnNumber: 29
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                                                    type: "number",
                                                                                    value: bankAmount,
                                                                                    onChange: (e)=>{
                                                                                        const newBank = parseFloat(e.target.value) || 0;
                                                                                        const loanAmountNum = parseFloat(formData.loanAmount) || 0;
                                                                                        setBankAmount(newBank);
                                                                                        setCashAmount(loanAmountNum - newBank);
                                                                                    },
                                                                                    className: "mt-1",
                                                                                    placeholder: "Amount from bank"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1746,
                                                                                    columnNumber: 29
                                                                                }, this),
                                                                                bankAccounts.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Select"], {
                                                                                    value: formData.bankAccountId || '',
                                                                                    onValueChange: (v)=>handleInputChange('bankAccountId', v),
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectTrigger"], {
                                                                                            className: "mt-2",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectValue"], {
                                                                                                placeholder: "Select bank..."
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                lineNumber: 1764,
                                                                                                columnNumber: 35
                                                                                            }, this)
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1763,
                                                                                            columnNumber: 33
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectContent"], {
                                                                                            children: bankAccounts.map((acc)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectItem"], {
                                                                                                    value: acc.id,
                                                                                                    children: [
                                                                                                        acc.bankName,
                                                                                                        " (₹",
                                                                                                        acc.currentBalance?.toLocaleString(),
                                                                                                        ")"
                                                                                                    ]
                                                                                                }, acc.id, true, {
                                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                    lineNumber: 1768,
                                                                                                    columnNumber: 37
                                                                                                }, this))
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1766,
                                                                                            columnNumber: 33
                                                                                        }, this)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1759,
                                                                                    columnNumber: 31
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1744,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "p-3 bg-white rounded-lg border border-emerald-200",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                                                    className: "text-emerald-700",
                                                                                    children: "Cash Amount"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1779,
                                                                                    columnNumber: 29
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                                                    type: "number",
                                                                                    value: cashAmount,
                                                                                    onChange: (e)=>{
                                                                                        const newCash = parseFloat(e.target.value) || 0;
                                                                                        const loanAmountNum = parseFloat(formData.loanAmount) || 0;
                                                                                        setCashAmount(newCash);
                                                                                        setBankAmount(loanAmountNum - newCash);
                                                                                    },
                                                                                    className: `mt-1 ${splitCashInsufficient ? 'border-red-500 bg-red-50' : ''}`,
                                                                                    placeholder: "Amount from cash"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1780,
                                                                                    columnNumber: 29
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                    className: `text-xs mt-2 ${splitCashInsufficient ? 'text-red-600 font-semibold' : 'text-emerald-600'}`,
                                                                                    children: [
                                                                                        "Available: ",
                                                                                        cashbookBalance !== null ? formatCurrency(cashbookBalance) : '₹0'
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1792,
                                                                                    columnNumber: 29
                                                                                }, this),
                                                                                splitCashInsufficient && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                    className: "text-xs text-red-600 mt-1",
                                                                                    children: [
                                                                                        "⚠️ Need ",
                                                                                        formatCurrency(cashAmount),
                                                                                        ", only ",
                                                                                        formatCurrency(cashAvailable),
                                                                                        " available"
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1796,
                                                                                    columnNumber: 31
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1778,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1742,
                                                                    columnNumber: 25
                                                                }, this),
                                                                splitBankInsufficient && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Alert"], {
                                                                    className: "bg-red-50 border-red-200",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                                                                            className: "h-4 w-4 text-red-600"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1806,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AlertDescription"], {
                                                                            className: "text-red-700 text-sm",
                                                                            children: [
                                                                                "⚠️ Insufficient bank balance — need ",
                                                                                formatCurrency(bankAmount),
                                                                                ", available ",
                                                                                formatCurrency(selectedBankAccount?.currentBalance ?? 0)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1807,
                                                                            columnNumber: 29
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1805,
                                                                    columnNumber: 27
                                                                }, this),
                                                                formData.loanAmount && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "p-3 bg-gray-50 rounded-lg border",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "flex justify-between items-center text-sm",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                    children: "Total Split:"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1817,
                                                                                    columnNumber: 31
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                    className: bankAmount + cashAmount === parseFloat(formData.loanAmount) ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold',
                                                                                    children: [
                                                                                        formatCurrency(bankAmount + cashAmount),
                                                                                        bankAmount + cashAmount !== parseFloat(formData.loanAmount) && ' ⚠️ Does not match loan amount'
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1818,
                                                                                    columnNumber: 31
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1816,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "flex justify-between items-center text-sm mt-1",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                    children: "Loan Amount:"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1824,
                                                                                    columnNumber: 31
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                    className: "font-bold",
                                                                                    children: formatCurrency(parseFloat(formData.loanAmount) || 0)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1825,
                                                                                    columnNumber: 31
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1823,
                                                                            columnNumber: 29
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1815,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "space-y-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                                            children: "Reference Number (Optional)"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1832,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                                            value: formData.disbursementRef,
                                                                            onChange: (e)=>handleInputChange('disbursementRef', e.target.value),
                                                                            placeholder: "Reference / Cheque No."
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1833,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1831,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1741,
                                                            columnNumber: 23
                                                        }, this) : /* Single Payment Mode - Combined Payment Source Selection */ /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "space-y-4",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "space-y-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                                            children: "Select Payment Source (Bank/Cash) *"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1841,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        loadingPaymentSources ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "flex items-center gap-2 p-3 border rounded-lg bg-gray-50",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                                                    className: "h-4 w-4 animate-spin text-gray-500"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1844,
                                                                                    columnNumber: 31
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                    className: "text-sm text-gray-500",
                                                                                    children: "Loading payment sources..."
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1845,
                                                                                    columnNumber: 31
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1843,
                                                                            columnNumber: 29
                                                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Select"], {
                                                                            value: formData.bankAccountId || '',
                                                                            onValueChange: (v)=>{
                                                                                handleInputChange('bankAccountId', v);
                                                                                // Set disbursement mode based on source type
                                                                                const selectedSource = paymentSources.find((s)=>s.id === v);
                                                                                if (selectedSource) {
                                                                                    handleInputChange('disbursementMode', selectedSource.type === 'CASH' ? 'CASH' : 'BANK_TRANSFER');
                                                                                }
                                                                            },
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectTrigger"], {
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectValue"], {
                                                                                        placeholder: paymentSources.length === 0 ? "No payment sources available" : "Select bank or cash"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                        lineNumber: 1860,
                                                                                        columnNumber: 33
                                                                                    }, this)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1859,
                                                                                    columnNumber: 31
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectContent"], {
                                                                                    children: [
                                                                                        paymentSources.filter((s)=>s.type === 'BANK').length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                                                            children: [
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                    className: "px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 flex items-center gap-1",
                                                                                                    children: [
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$landmark$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Landmark$3e$__["Landmark"], {
                                                                                                            className: "h-3 w-3"
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                            lineNumber: 1867,
                                                                                                            columnNumber: 39
                                                                                                        }, this),
                                                                                                        " BANK ACCOUNTS"
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                    lineNumber: 1866,
                                                                                                    columnNumber: 37
                                                                                                }, this),
                                                                                                paymentSources.filter((s)=>s.type === 'BANK').map((source)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectItem"], {
                                                                                                        value: source.id,
                                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            className: "flex items-center gap-2",
                                                                                                            children: [
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$landmark$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Landmark$3e$__["Landmark"], {
                                                                                                                    className: "h-4 w-4 text-blue-500"
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                                    lineNumber: 1872,
                                                                                                                    columnNumber: 43
                                                                                                                }, this),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    className: "flex flex-col",
                                                                                                                    children: [
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                            className: "font-medium",
                                                                                                                            children: source.name
                                                                                                                        }, void 0, false, {
                                                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                                            lineNumber: 1874,
                                                                                                                            columnNumber: 45
                                                                                                                        }, this),
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                            className: "text-xs text-gray-500",
                                                                                                                            children: [
                                                                                                                                "A/C: ",
                                                                                                                                source.accountNumber,
                                                                                                                                " | Bal: ",
                                                                                                                                formatCurrency(source.currentBalance)
                                                                                                                            ]
                                                                                                                        }, void 0, true, {
                                                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                                            lineNumber: 1875,
                                                                                                                            columnNumber: 45
                                                                                                                        }, this)
                                                                                                                    ]
                                                                                                                }, void 0, true, {
                                                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                                    lineNumber: 1873,
                                                                                                                    columnNumber: 43
                                                                                                                }, this)
                                                                                                            ]
                                                                                                        }, void 0, true, {
                                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                            lineNumber: 1871,
                                                                                                            columnNumber: 41
                                                                                                        }, this)
                                                                                                    }, source.id, false, {
                                                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                        lineNumber: 1870,
                                                                                                        columnNumber: 39
                                                                                                    }, this))
                                                                                            ]
                                                                                        }, void 0, true),
                                                                                        paymentSources.filter((s)=>s.type === 'CASH').length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                                                            children: [
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                    className: "px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 flex items-center gap-1 mt-1",
                                                                                                    children: [
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$banknote$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Banknote$3e$__["Banknote"], {
                                                                                                            className: "h-3 w-3"
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                            lineNumber: 1889,
                                                                                                            columnNumber: 39
                                                                                                        }, this),
                                                                                                        " CASH BOOK"
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                    lineNumber: 1888,
                                                                                                    columnNumber: 37
                                                                                                }, this),
                                                                                                paymentSources.filter((s)=>s.type === 'CASH').map((source)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SelectItem"], {
                                                                                                        value: source.id,
                                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            className: "flex items-center gap-2",
                                                                                                            children: [
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$banknote$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Banknote$3e$__["Banknote"], {
                                                                                                                    className: "h-4 w-4 text-green-500"
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                                    lineNumber: 1894,
                                                                                                                    columnNumber: 43
                                                                                                                }, this),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    className: "flex flex-col",
                                                                                                                    children: [
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                            className: "font-medium",
                                                                                                                            children: source.displayName
                                                                                                                        }, void 0, false, {
                                                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                                            lineNumber: 1896,
                                                                                                                            columnNumber: 45
                                                                                                                        }, this),
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                            className: "text-xs text-gray-500",
                                                                                                                            children: [
                                                                                                                                "Bal: ",
                                                                                                                                formatCurrency(source.currentBalance)
                                                                                                                            ]
                                                                                                                        }, void 0, true, {
                                                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                                            lineNumber: 1897,
                                                                                                                            columnNumber: 45
                                                                                                                        }, this)
                                                                                                                    ]
                                                                                                                }, void 0, true, {
                                                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                                    lineNumber: 1895,
                                                                                                                    columnNumber: 43
                                                                                                                }, this)
                                                                                                            ]
                                                                                                        }, void 0, true, {
                                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                            lineNumber: 1893,
                                                                                                            columnNumber: 41
                                                                                                        }, this)
                                                                                                    }, source.id, false, {
                                                                                                        fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                        lineNumber: 1892,
                                                                                                        columnNumber: 39
                                                                                                    }, this))
                                                                                            ]
                                                                                        }, void 0, true),
                                                                                        paymentSources.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "p-2 text-sm text-muted-foreground",
                                                                                            children: "No payment sources found for this company"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1908,
                                                                                            columnNumber: 35
                                                                                        }, this)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1862,
                                                                                    columnNumber: 31
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1848,
                                                                            columnNumber: 29
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1840,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "space-y-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                                            children: "Reference Number"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1919,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                                            value: formData.disbursementRef,
                                                                            onChange: (e)=>handleInputChange('disbursementRef', e.target.value),
                                                                            placeholder: "Cheque No. / UTR / Reference"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1920,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1918,
                                                                    columnNumber: 25
                                                                }, this),
                                                                formData.bankAccountId && formData.loanAmount && (()=>{
                                                                    const selectedSource = paymentSources.find((s)=>s.id === formData.bankAccountId);
                                                                    if (selectedSource && selectedSource.currentBalance < parseFloat(formData.loanAmount)) {
                                                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Alert"], {
                                                                            className: "bg-red-50 border-red-200",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                                                                                    className: "h-4 w-4 text-red-600"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1929,
                                                                                    columnNumber: 33
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AlertDescription"], {
                                                                                    className: "text-red-700 text-sm",
                                                                                    children: [
                                                                                        "Insufficient balance in ",
                                                                                        selectedSource.type === 'CASH' ? 'Cash Book' : 'Bank Account',
                                                                                        ". Available: ",
                                                                                        formatCurrency(selectedSource.currentBalance),
                                                                                        ", Required: ",
                                                                                        formatCurrency(parseFloat(formData.loanAmount))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1930,
                                                                                    columnNumber: 33
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1928,
                                                                            columnNumber: 31
                                                                        }, this);
                                                                    }
                                                                    return null;
                                                                })(),
                                                                formData.bankAccountId && (()=>{
                                                                    const selectedSource = paymentSources.find((s)=>s.id === formData.bankAccountId);
                                                                    if (selectedSource && selectedSource.currentBalance >= parseFloat(formData.loanAmount || '0')) {
                                                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "flex items-center gap-2",
                                                                                    children: [
                                                                                        selectedSource.type === 'CASH' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$banknote$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Banknote$3e$__["Banknote"], {
                                                                                            className: "h-4 w-4 text-green-600"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1948,
                                                                                            columnNumber: 37
                                                                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$landmark$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Landmark$3e$__["Landmark"], {
                                                                                            className: "h-4 w-4 text-green-600"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1950,
                                                                                            columnNumber: 37
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            children: [
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                    className: "font-medium text-green-700 text-sm",
                                                                                                    children: selectedSource.displayName
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                    lineNumber: 1953,
                                                                                                    columnNumber: 37
                                                                                                }, this),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                    className: "text-xs text-green-600",
                                                                                                    children: [
                                                                                                        "Balance: ",
                                                                                                        formatCurrency(selectedSource.currentBalance)
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                                    lineNumber: 1954,
                                                                                                    columnNumber: 37
                                                                                                }, this)
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1952,
                                                                                            columnNumber: 35
                                                                                        }, this)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1946,
                                                                                    columnNumber: 33
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "text-right",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-xs text-green-600",
                                                                                            children: "After Disbursement"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1958,
                                                                                            columnNumber: 35
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "font-bold text-green-700 text-sm",
                                                                                            children: formatCurrency(selectedSource.currentBalance - parseFloat(formData.loanAmount || '0'))
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                            lineNumber: 1959,
                                                                                            columnNumber: 35
                                                                                        }, this)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                                    lineNumber: 1957,
                                                                                    columnNumber: 33
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                            lineNumber: 1945,
                                                                            columnNumber: 31
                                                                        }, this);
                                                                    }
                                                                    return null;
                                                                })()
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1838,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1658,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                    lineNumber: 1650,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "pt-4 border-t",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            className: "flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900",
                                            onClick: ()=>setShowAdvanced(!showAdvanced),
                                            children: [
                                                showAdvanced ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronUp$3e$__["ChevronUp"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1976,
                                                    columnNumber: 33
                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1976,
                                                    columnNumber: 69
                                                }, this),
                                                "Reference Contacts & Notes"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1975,
                                            columnNumber: 15
                                        }, this),
                                        showAdvanced && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
                                            initial: {
                                                opacity: 0
                                            },
                                            animate: {
                                                opacity: 1
                                            },
                                            className: "space-y-4 mt-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "Guarantor 1"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1983,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "grid grid-cols-3 gap-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                                    placeholder: "Name",
                                                                    value: formData.reference1Name,
                                                                    onChange: (e)=>handleInputChange('reference1Name', e.target.value)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1985,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                                    placeholder: "Phone",
                                                                    value: formData.reference1Phone,
                                                                    onChange: (e)=>handleInputChange('reference1Phone', e.target.value)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1986,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                                    placeholder: "Relation",
                                                                    value: formData.reference1Relation,
                                                                    onChange: (e)=>handleInputChange('reference1Relation', e.target.value)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1987,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1984,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1982,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                            children: "Guarantor 2"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1991,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "grid grid-cols-3 gap-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                                    placeholder: "Name",
                                                                    value: formData.reference2Name,
                                                                    onChange: (e)=>handleInputChange('reference2Name', e.target.value)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1993,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                                    placeholder: "Phone",
                                                                    value: formData.reference2Phone,
                                                                    onChange: (e)=>handleInputChange('reference2Phone', e.target.value)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1994,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                                    placeholder: "Relation",
                                                                    value: formData.reference2Relation,
                                                                    onChange: (e)=>handleInputChange('reference2Relation', e.target.value)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1995,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1992,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1990,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "grid grid-cols-2 gap-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "space-y-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                                    children: "Notes"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1999,
                                                                    columnNumber: 48
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                                    value: formData.notes,
                                                                    onChange: (e)=>handleInputChange('notes', e.target.value)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 1999,
                                                                    columnNumber: 68
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 1999,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "space-y-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                                    children: "Internal Notes"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 2000,
                                                                    columnNumber: 48
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                                    value: formData.internalNotes,
                                                                    onChange: (e)=>handleInputChange('internalNotes', e.target.value)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                                    lineNumber: 2000,
                                                                    columnNumber: 77
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                            lineNumber: 2000,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 1998,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 1981,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                    lineNumber: 1974,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex gap-3 pt-4 border-t",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                            variant: "outline",
                                            className: "flex-1",
                                            onClick: ()=>{
                                                setOpen(false);
                                                resetForm();
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                                    className: "h-4 w-4 mr-2"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 2008,
                                                    columnNumber: 109
                                                }, this),
                                                " Cancel"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 2008,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                            className: "flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 disabled:opacity-50",
                                            onClick: handleSubmit,
                                            disabled: !canCreate,
                                            title: !formData.companyId ? 'Select a company first' : splitCashInsufficient ? `Insufficient cash balance (available: ${formatCurrency(cashAvailable)})` : splitBankInsufficient ? `Insufficient bank balance` : splitTotalMismatch ? 'Split total does not match loan amount' : singleInsufficient ? `Insufficient balance (available: ${formatCurrency(singleSourceSelected?.currentBalance ?? 0)})` : undefined,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__["Save"], {
                                                    className: "h-4 w-4 mr-2"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                                    lineNumber: 2022,
                                                    columnNumber: 17
                                                }, this),
                                                " ",
                                                submitting ? 'Creating...' : 'Create Loan'
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                            lineNumber: 2009,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                                    lineNumber: 2007,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                            lineNumber: 1038,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                    lineNumber: 1032,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/Desktop/reallll/src/components/offline-loan/OfflineLoanForm.tsx",
                lineNumber: 1031,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(OfflineLoanForm, "w4OBqg/bO9ywoPwMIQFuWX7lOzA=");
_c = OfflineLoanForm;
var _c;
__turbopack_context__.k.register(_c, "OfflineLoanForm");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=Desktop_reallll_src_components_offline-loan_OfflineLoanForm_tsx_40c80431._.js.map