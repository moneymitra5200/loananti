(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
'use client';
;
;
const EMIReceipt = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"])(_c = (props, ref)=>{
    const { receiptNo, date, customerName, fatherName, phone, address, loanAccountNo, loanAmount, interestRate, tenure, emiNumber, totalEmis, dueDate, paymentDate, principalAmount, interestAmount, penaltyAmount = 0, penaltyWaived = 0, totalAmount, paymentMode, paymentReference, referenceNo, balanceDue, companyName, companyCode, isInterestOnly = false, isPrincipalOnly = false, isPartialPayment = false, isSplitPayment = false, splitCashAmount = 0, splitOnlineAmount = 0, remainingDue = 0, receiptSettings: rs = {} } = props;
    // Shorthand: default all toggles to true (admin can turn off in Settings)
    const show = {
        customerName: rs.showCustomerName ?? true,
        fatherName: rs.showFatherName ?? true,
        phone: rs.showPhone ?? true,
        address: rs.showAddress ?? true,
        loanAccount: rs.showLoanAccount ?? true,
        emiNumber: rs.showEmiNumber ?? true,
        dueDate: rs.showDueDate ?? true,
        paymentDate: rs.showPaymentDate ?? true,
        principal: rs.showPrincipal ?? true,
        interest: rs.showInterest ?? true,
        penalty: rs.showPenalty ?? true,
        totalAmount: rs.showTotalAmount ?? true,
        amountInWords: rs.showAmountInWords ?? true,
        paymentMode: rs.showPaymentMode ?? true,
        referenceNo: rs.showReferenceNo ?? true,
        balanceDue: rs.showBalanceDue ?? true,
        splitBreakdown: rs.showSplitBreakdown ?? true,
        remainingDue: rs.showRemainingDue ?? true,
        signatureSection: rs.showSignatureSection ?? true,
        companyStamp: rs.showCompanyStamp ?? true
    };
    const accentColor = rs.accentColor || '#1e40af';
    const headerSubtitle = rs.headerSubtitle || 'Your Trusted Financial Partner';
    const footerText = rs.footerText || 'This is a computer generated receipt.';
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
    // Determine payment type label + color
    const paymentTypeLabel = isInterestOnly ? 'INTEREST ONLY' : isPrincipalOnly ? 'PRINCIPAL ONLY' : isPartialPayment ? 'PARTIAL PAYMENT' : isSplitPayment ? 'SPLIT PAYMENT' : 'FULL EMI PAYMENT';
    const paymentTypeBg = isInterestOnly ? '#eff6ff' : isPrincipalOnly ? '#fef2f2' : isPartialPayment ? '#fff7ed' : isSplitPayment ? '#f5f3ff' : '#f0fdf4';
    const paymentTypeColor = isInterestOnly ? '#1d4ed8' : isPrincipalOnly ? '#dc2626' : isPartialPayment ? '#ea580c' : isSplitPayment ? '#7c3aed' : '#16a34a';
    const row = (label, value, bold = false, color)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                display: 'flex',
                marginBottom: '1.5mm',
                alignItems: 'baseline'
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    style: {
                        fontWeight: bold ? 'bold' : 'normal',
                        color: color || '#222',
                        fontSize: '9pt',
                        width: '58%',
                        flexShrink: 0
                    },
                    children: label
                }, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                    lineNumber: 173,
                    columnNumber: 7
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    style: {
                        fontWeight: bold ? 'bold' : 'normal',
                        color: color || '#222',
                        fontSize: '9pt',
                        textAlign: 'left',
                        flex: 1
                    },
                    children: value
                }, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                    lineNumber: 174,
                    columnNumber: 7
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
            lineNumber: 172,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0));
    const netPenalty = Math.max(0, penaltyAmount - penaltyWaived);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        style: {
            width: '148mm',
            backgroundColor: '#fff',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '9pt',
            color: '#111',
            boxSizing: 'border-box',
            padding: '4mm'
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                border: `2px solid ${accentColor}`,
                borderRadius: '3px',
                padding: '4mm',
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden'
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(-35deg)',
                        fontSize: '28pt',
                        fontWeight: 'bold',
                        color: accentColor,
                        opacity: 0.055,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        letterSpacing: '2px',
                        zIndex: 0,
                        width: '200%',
                        textAlign: 'center',
                        lineHeight: '1.8'
                    },
                    children: [
                        companyName.toUpperCase(),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                            lineNumber: 211,
                            columnNumber: 38
                        }, ("TURBOPACK compile-time value", void 0)),
                        companyName.toUpperCase(),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                            lineNumber: 212,
                            columnNumber: 38
                        }, ("TURBOPACK compile-time value", void 0)),
                        companyName.toUpperCase()
                    ]
                }, void 0, true, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                    lineNumber: 193,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        position: 'relative',
                        zIndex: 1
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                textAlign: 'center',
                                borderBottom: `1px solid ${accentColor}`,
                                paddingBottom: '2mm',
                                marginBottom: '2mm'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontSize: '14pt',
                                        fontWeight: 'bold',
                                        color: accentColor,
                                        letterSpacing: '0.5px'
                                    },
                                    children: companyName.toUpperCase()
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                    lineNumber: 222,
                                    columnNumber: 11
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontSize: '8pt',
                                        color: '#666',
                                        marginTop: '0.5mm'
                                    },
                                    children: headerSubtitle
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                    lineNumber: 225,
                                    columnNumber: 11
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                            lineNumber: 221,
                            columnNumber: 9
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                textAlign: 'center',
                                marginBottom: '2mm'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontSize: '11pt',
                                        fontWeight: 'bold',
                                        textDecoration: 'underline',
                                        marginBottom: '1.5mm'
                                    },
                                    children: "EMI PAYMENT RECEIPT"
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                    lineNumber: 232,
                                    columnNumber: 11
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'inline-block',
                                        backgroundColor: paymentTypeBg,
                                        border: `1.5px solid ${paymentTypeColor}`,
                                        borderRadius: '3px',
                                        padding: '1mm 4mm',
                                        fontSize: '8.5pt',
                                        fontWeight: 'bold',
                                        color: paymentTypeColor,
                                        letterSpacing: '0.5px'
                                    },
                                    children: paymentTypeLabel
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                    lineNumber: 235,
                                    columnNumber: 11
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                            lineNumber: 231,
                            columnNumber: 9
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '2mm',
                                paddingBottom: '1.5mm',
                                borderBottom: '1px solid #ccc'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        fontSize: '8.5pt'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                            children: "Receipt No:"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 252,
                                            columnNumber: 47
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        " ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                color: accentColor,
                                                fontWeight: 'bold'
                                            },
                                            children: receiptNo
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 252,
                                            columnNumber: 76
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                    lineNumber: 252,
                                    columnNumber: 11
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        fontSize: '8.5pt'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                            children: "Date:"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 253,
                                            columnNumber: 47
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        " ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                color: accentColor
                                            },
                                            children: fmtDate(date)
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 253,
                                            columnNumber: 70
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                    lineNumber: 253,
                                    columnNumber: 11
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                            lineNumber: 251,
                            columnNumber: 9
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                marginBottom: '2mm'
                            },
                            children: [
                                show.customerName && row('Customer Name:', customerName),
                                show.fatherName && row('Father / Husband Name:', fatherName || '—'),
                                show.phone && phone && row('Phone:', phone),
                                show.address && address && row('Address:', address),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        marginBottom: '1.5mm'
                                    },
                                    children: [
                                        show.referenceNo && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                fontSize: '9pt'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: "Reference No:"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                                    lineNumber: 263,
                                                    columnNumber: 68
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                " ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        color: accentColor
                                                    },
                                                    children: referenceNo || paymentReference || '—'
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                                    lineNumber: 263,
                                                    columnNumber: 99
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 263,
                                            columnNumber: 34
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                fontSize: '9pt'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: "Customer ID:"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                                    lineNumber: 264,
                                                    columnNumber: 47
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                " ",
                                                companyCode
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 264,
                                            columnNumber: 13
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                    lineNumber: 262,
                                    columnNumber: 11
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                            lineNumber: 257,
                            columnNumber: 9
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                borderTop: '1px solid #aaa',
                                marginBottom: '2mm'
                            }
                        }, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                            lineNumber: 268,
                            columnNumber: 9
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                marginBottom: '2mm'
                            },
                            children: [
                                show.loanAccount && row('Loan Account No:', loanAccountNo),
                                show.emiNumber && row('EMI Number:', `${emiNumber} of ${totalEmis}`),
                                show.dueDate && row('Due Date:', fmtDate(dueDate)),
                                show.paymentDate && row('Payment Date:', fmtDate(paymentDate))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                            lineNumber: 271,
                            columnNumber: 9
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                borderTop: '1px solid #aaa',
                                marginBottom: '2mm'
                            }
                        }, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                            lineNumber: 278,
                            columnNumber: 9
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                marginBottom: '2mm'
                            },
                            children: [
                                isInterestOnly ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        show.interest && row('Interest Collected:', fmt(interestAmount), false, '#1d4ed8'),
                                        show.principal && row('Principal:', '—', false, '#6b7280')
                                    ]
                                }, void 0, true) : isPrincipalOnly ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        show.principal && row('Principal Collected:', fmt(principalAmount), false, '#dc2626'),
                                        show.interest && row('Interest:', '—', false, '#6b7280')
                                    ]
                                }, void 0, true) : isPartialPayment ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        show.principal && row('Principal (Partial):', fmt(principalAmount)),
                                        show.interest && row('Interest (Partial):', fmt(interestAmount)),
                                        show.remainingDue && remainingDue > 0 && row('Remaining Due:', fmt(remainingDue), false, '#ea580c')
                                    ]
                                }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        show.principal && row('Principal Amount:', fmt(principalAmount)),
                                        show.interest && row('Interest Amount:', fmt(interestAmount))
                                    ]
                                }, void 0, true),
                                show.penalty && penaltyAmount > 0 && row('Penalty Charged:', fmt(penaltyAmount), false, '#dc2626'),
                                show.penalty && penaltyWaived > 0 && row('Penalty Waived:', '− ' + fmt(penaltyWaived), false, '#d97706'),
                                show.penalty && penaltyAmount > 0 && row('Net Penalty:', fmt(netPenalty), false, '#b91c1c'),
                                row('Service Charge:', '₹0.00'),
                                show.totalAmount && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        borderTop: `2px solid ${accentColor}`,
                                        paddingTop: '1.5mm',
                                        marginTop: '1.5mm',
                                        backgroundColor: '#eff6ff',
                                        padding: '1.5mm 2mm'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                fontWeight: 'bold',
                                                fontSize: '10pt',
                                                color: accentColor
                                            },
                                            children: "TOTAL AMOUNT PAID:"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 320,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                fontWeight: 'bold',
                                                fontSize: '12pt',
                                                color: accentColor
                                            },
                                            children: fmt(totalAmount)
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 321,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                    lineNumber: 315,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                            lineNumber: 281,
                            columnNumber: 9
                        }, ("TURBOPACK compile-time value", void 0)),
                        show.splitBreakdown && isSplitPayment && (splitCashAmount > 0 || splitOnlineAmount > 0) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                marginBottom: '2mm',
                                padding: '1.5mm 2mm',
                                backgroundColor: '#f5f3ff',
                                border: '1px solid #7c3aed',
                                borderRadius: '2px'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontWeight: 'bold',
                                        fontSize: '8.5pt',
                                        color: '#7c3aed',
                                        marginBottom: '1mm'
                                    },
                                    children: "Split Payment Breakdown:"
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                    lineNumber: 329,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                fontSize: '8.5pt'
                                            },
                                            children: "Cash Portion:"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 333,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                fontSize: '8.5pt',
                                                fontWeight: 'bold'
                                            },
                                            children: fmt(splitCashAmount)
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 334,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                    lineNumber: 332,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                fontSize: '8.5pt'
                                            },
                                            children: "Online Portion:"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 337,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                fontSize: '8.5pt',
                                                fontWeight: 'bold'
                                            },
                                            children: fmt(splitOnlineAmount)
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 338,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                    lineNumber: 336,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                            lineNumber: 328,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        show.remainingDue && isPartialPayment && remainingDue > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                marginBottom: '2mm',
                                padding: '1.5mm 2mm',
                                backgroundColor: '#fff7ed',
                                border: '1px solid #ea580c',
                                borderRadius: '2px'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontWeight: 'bold',
                                        fontSize: '8.5pt',
                                        color: '#ea580c'
                                    },
                                    children: [
                                        "⚠ Partial Payment — Balance Remaining: ",
                                        fmt(remainingDue)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                    lineNumber: 346,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontSize: '7.5pt',
                                        color: '#9a3412'
                                    },
                                    children: "Remaining amount is due. Please arrange payment as soon as possible."
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                    lineNumber: 349,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                            lineNumber: 345,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        show.amountInWords && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                marginBottom: '2mm',
                                padding: '1.5mm 2mm',
                                backgroundColor: '#fefce8',
                                border: '1px solid #ca8a04'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        fontWeight: 'bold',
                                        fontSize: '8.5pt'
                                    },
                                    children: "Amount in Words: "
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                    lineNumber: 358,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        fontStyle: 'italic',
                                        fontSize: '8.5pt'
                                    },
                                    children: [
                                        toWords(totalAmount),
                                        " Rupees Only"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                    lineNumber: 359,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                            lineNumber: 357,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                marginBottom: '2mm'
                            },
                            children: [
                                show.paymentMode && row('Payment Mode:', isSplitPayment ? 'SPLIT (Cash + Online)' : paymentMode),
                                show.referenceNo && (paymentReference || referenceNo) && !isSplitPayment && row('Transaction Ref:', paymentReference || referenceNo),
                                show.balanceDue && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        marginBottom: '1.5mm'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                fontSize: '9pt',
                                                width: '58%',
                                                flexShrink: 0
                                            },
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                children: "Balance Due:"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                                lineNumber: 370,
                                                columnNumber: 78
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 370,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                fontSize: '9pt',
                                                fontWeight: 'bold',
                                                color: balanceDue > 0 ? '#dc2626' : '#16a34a',
                                                flex: 1
                                            },
                                            children: fmt(balanceDue)
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 371,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                    lineNumber: 369,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                            lineNumber: 364,
                            columnNumber: 9
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                borderTop: '1px solid #aaa',
                                marginBottom: '3mm'
                            }
                        }, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                            lineNumber: 376,
                            columnNumber: 9
                        }, ("TURBOPACK compile-time value", void 0)),
                        show.signatureSection && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-end',
                                marginTop: '2mm'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        textAlign: 'center',
                                        width: show.companyStamp ? '33%' : '48%'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                height: '10mm',
                                                borderBottom: '1px solid #555',
                                                marginBottom: '1mm'
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 382,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '8.5pt',
                                                fontWeight: 'bold',
                                                color: accentColor
                                            },
                                            children: "Borrower"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 383,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '7.5pt',
                                                color: '#555'
                                            },
                                            children: "Signature of Borrower"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 384,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                    lineNumber: 381,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                show.companyStamp && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        textAlign: 'center',
                                        width: '30%'
                                    },
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            border: `1px dashed ${accentColor}`,
                                            borderRadius: '50%',
                                            width: '18mm',
                                            height: '18mm',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto',
                                            color: accentColor,
                                            fontSize: '6.5pt',
                                            textAlign: 'center'
                                        },
                                        children: [
                                            "COMPANY",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                                lineNumber: 394,
                                                columnNumber: 26
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            "STAMP"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                        lineNumber: 388,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                    lineNumber: 387,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        textAlign: 'center',
                                        width: show.companyStamp ? '33%' : '48%'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                height: '10mm',
                                                borderBottom: '1px solid #555',
                                                marginBottom: '1mm'
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 399,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '8.5pt',
                                                fontWeight: 'bold',
                                                color: accentColor
                                            },
                                            children: "Authorized Signatory"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 400,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '7.5pt',
                                                color: '#555'
                                            },
                                            children: [
                                                "For ",
                                                companyName
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                            lineNumber: 401,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                                    lineNumber: 398,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                            lineNumber: 380,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                marginTop: '3mm',
                                textAlign: 'center',
                                fontSize: '7.5pt',
                                color: '#888',
                                borderTop: '1px solid #ddd',
                                paddingTop: '1.5mm'
                            },
                            children: [
                                footerText,
                                " · ",
                                companyName,
                                " · ",
                                companyCode
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                            lineNumber: 407,
                            columnNumber: 9
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
                    lineNumber: 217,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
            lineNumber: 190,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx",
        lineNumber: 181,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
});
_c1 = EMIReceipt;
EMIReceipt.displayName = 'EMIReceipt';
const __TURBOPACK__default__export__ = EMIReceipt;
var _c, _c1;
__turbopack_context__.k.register(_c, "EMIReceipt$forwardRef");
__turbopack_context__.k.register(_c1, "EMIReceipt");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/components/receipt/ReceiptDialog.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ReceiptDialog
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/ui/dialog.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/download.js [app-client] (ecmascript) <export default as Download>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$printer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Printer$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/printer.js [app-client] (ecmascript) <export default as Printer>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/file-text.js [app-client] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$receipt$2f$EMIReceipt$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/receipt/EMIReceipt.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
function ReceiptDialog({ open, onOpenChange, receiptData }) {
    _s();
    const receiptRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [downloading, setDownloading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleDownloadPDF = async ()=>{
        if (!receiptRef.current || !receiptData) return;
        setDownloading(true);
        try {
            const html2pdf = (await __turbopack_context__.A("[project]/Desktop/reallll/node_modules/html2pdf.js/dist/html2pdf.js [app-client] (ecmascript, async loader)")).default;
            const opt = {
                margin: [
                    2,
                    2,
                    2,
                    2
                ],
                filename: `Receipt_${receiptData.receiptNo.replace(/\//g, '-')}.pdf`,
                image: {
                    type: 'jpeg',
                    quality: 0.99
                },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    letterRendering: true,
                    scrollY: 0
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a5',
                    orientation: 'portrait'
                },
                pagebreak: {
                    mode: [
                        'avoid-all',
                        'css',
                        'legacy'
                    ]
                }
            };
            await html2pdf().set(opt).from(receiptRef.current).save();
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally{
            setDownloading(false);
        }
    };
    const handlePrint = ()=>{
        if (!receiptRef.current) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
      <html>
        <head>
          <title>EMI Payment Receipt — ${receiptData?.receiptNo}</title>
          <style>
            @page { size: A5; margin: 0; }
            body { margin: 0; padding: 0; }
            @media print { body { -webkit-print-color-adjust: exact; color-adjust: exact; } }
          </style>
        </head>
        <body>${receiptRef.current.outerHTML}</body>
      </html>
    `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(()=>{
            printWindow.print();
            printWindow.close();
        }, 400);
    };
    if (!receiptData) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Dialog"], {
        open: open,
        onOpenChange: onOpenChange,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogContent"], {
            className: "w-[98vw] max-w-3xl h-[95vh] flex flex-col p-0 gap-0 overflow-hidden",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center justify-between px-4 py-3 border-b bg-white flex-shrink-0",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogTitle"], {
                            className: "flex items-center gap-2 text-base",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                                    className: "h-5 w-5 text-blue-600"
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptDialog.tsx",
                                    lineNumber: 109,
                                    columnNumber: 13
                                }, this),
                                "EMI Receipt — ",
                                receiptData.receiptNo
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptDialog.tsx",
                            lineNumber: 108,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    size: "sm",
                                    onClick: handleDownloadPDF,
                                    disabled: downloading,
                                    className: "bg-blue-600 hover:bg-blue-700 h-8 text-xs px-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__["Download"], {
                                            className: "h-3.5 w-3.5 mr-1"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptDialog.tsx",
                                            lineNumber: 114,
                                            columnNumber: 15
                                        }, this),
                                        downloading ? 'Generating...' : 'Download PDF'
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptDialog.tsx",
                                    lineNumber: 113,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    size: "sm",
                                    variant: "outline",
                                    onClick: handlePrint,
                                    className: "h-8 text-xs px-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$printer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Printer$3e$__["Printer"], {
                                            className: "h-3.5 w-3.5 mr-1"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptDialog.tsx",
                                            lineNumber: 118,
                                            columnNumber: 15
                                        }, this),
                                        " Print"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptDialog.tsx",
                                    lineNumber: 117,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    size: "sm",
                                    variant: "ghost",
                                    onClick: ()=>onOpenChange(false),
                                    className: "h-8 w-8 p-0",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        className: "h-4 w-4"
                                    }, void 0, false, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptDialog.tsx",
                                        lineNumber: 121,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptDialog.tsx",
                                    lineNumber: 120,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptDialog.tsx",
                            lineNumber: 112,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptDialog.tsx",
                    lineNumber: 107,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex-1 overflow-auto bg-gray-100 p-6 flex justify-center",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white shadow-xl",
                        style: {
                            width: '148mm'
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$receipt$2f$EMIReceipt$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            ref: receiptRef,
                            receiptNo: receiptData.receiptNo,
                            date: receiptData.date,
                            customerName: receiptData.customerName,
                            fatherName: receiptData.fatherName,
                            phone: receiptData.phone,
                            address: receiptData.address,
                            loanAccountNo: receiptData.loanAccountNo,
                            loanAmount: receiptData.loanAmount,
                            interestRate: receiptData.interestRate,
                            mirrorInterestRate: receiptData.mirrorInterestRate,
                            tenure: receiptData.tenure,
                            emiNumber: receiptData.emiNumber,
                            totalEmis: receiptData.totalEmis,
                            dueDate: receiptData.dueDate,
                            paymentDate: receiptData.paymentDate,
                            principalAmount: receiptData.principalAmount,
                            interestAmount: receiptData.interestAmount,
                            penaltyAmount: receiptData.penaltyAmount,
                            penaltyWaived: receiptData.penaltyWaived,
                            totalAmount: receiptData.totalAmount,
                            paymentMode: receiptData.paymentMode,
                            paymentReference: receiptData.paymentReference,
                            referenceNo: receiptData.referenceNo,
                            balanceDue: receiptData.balanceDue,
                            companyName: receiptData.companyName,
                            companyCode: receiptData.companyCode,
                            isInterestOnly: receiptData.isInterestOnly,
                            isPrincipalOnly: receiptData.isPrincipalOnly,
                            isPartialPayment: receiptData.isPartialPayment,
                            isSplitPayment: receiptData.isSplitPayment,
                            splitCashAmount: receiptData.splitCashAmount,
                            splitOnlineAmount: receiptData.splitOnlineAmount,
                            remainingDue: receiptData.remainingDue
                        }, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptDialog.tsx",
                            lineNumber: 129,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptDialog.tsx",
                        lineNumber: 128,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptDialog.tsx",
                    lineNumber: 127,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-center text-xs text-gray-400 py-2 border-t bg-white flex-shrink-0",
                    children: "Click Download PDF for a clean single-page A5 receipt"
                }, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptDialog.tsx",
                    lineNumber: 169,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptDialog.tsx",
            lineNumber: 105,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptDialog.tsx",
        lineNumber: 103,
        columnNumber: 5
    }, this);
}
_s(ReceiptDialog, "ikQSyzgNkFPSZMXsPVPTjb0UIrM=");
_c = ReceiptDialog;
var _c;
__turbopack_context__.k.register(_c, "ReceiptDialog");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
'use client';
;
;
const LoanReceipt = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"])(_c = ({ receiptNo, date, companyName, companyCode, companyAddress, companyPhone, companyEmail, customerName, fatherName, customerPhone, customerAddress, customerAadhaar, customerPan, loanAccountNo, loanAmount, interestRate, interestType, tenure, emiAmount, totalInterest, totalAmount, disbursementDate, firstEmiDate, bankName, bankAccountNo, bankIfsc, purpose, witnessName, witnessPhone }, ref)=>{
    const formatCurrency = (amount)=>{
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount);
    };
    const formatDate = (dateStr)=>{
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };
    // Convert number to words
    const numberToWords = (num)=>{
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
        const convertHundreds = (n)=>{
            if (n < 10) return ones[n];
            if (n < 20) return teens[n - 10];
            if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
            return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertHundreds(n % 100) : '');
        };
        const convertThousands = (n)=>{
            if (n < 1000) return convertHundreds(n);
            if (n < 100000) return convertHundreds(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convertHundreds(n % 1000) : '');
            if (n < 10000000) return convertHundreds(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convertThousands(n % 100000) : '');
            return convertHundreds(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convertThousands(n % 10000000) : '');
        };
        return convertThousands(Math.round(num));
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        style: {
            width: '210mm',
            minHeight: '297mm',
            padding: '8mm',
            backgroundColor: '#fff',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '10pt',
            color: '#000',
            boxSizing: 'border-box'
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                border: '2px solid #1e40af',
                borderRadius: '3px',
                padding: '5mm',
                boxSizing: 'border-box',
                height: '100%'
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        textAlign: 'center',
                        borderBottom: '2px solid #1e40af',
                        paddingBottom: '4mm',
                        marginBottom: '4mm'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                fontSize: '18pt',
                                fontWeight: 'bold',
                                color: '#1e40af',
                                letterSpacing: '2px'
                            },
                            children: companyName.toUpperCase()
                        }, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 140,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                fontSize: '9pt',
                                marginTop: '1mm',
                                color: '#666'
                            },
                            children: companyAddress
                        }, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 148,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                fontSize: '9pt',
                                color: '#666'
                            },
                            children: [
                                "Phone: ",
                                companyPhone,
                                " | Email: ",
                                companyEmail
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 151,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                    lineNumber: 134,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        textAlign: 'center',
                        fontSize: '14pt',
                        fontWeight: 'bold',
                        marginBottom: '4mm',
                        textDecoration: 'underline'
                    },
                    children: "LOAN DISBURSEMENT RECEIPT"
                }, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                    lineNumber: 157,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '3mm',
                        paddingBottom: '2mm',
                        borderBottom: '1px solid #000'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        fontWeight: 'bold'
                                    },
                                    children: "Receipt No: "
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                    lineNumber: 176,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        color: '#1e40af',
                                        fontWeight: 'bold'
                                    },
                                    children: receiptNo
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                    lineNumber: 177,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 175,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        fontWeight: 'bold'
                                    },
                                    children: "Date: "
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                    lineNumber: 180,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        color: '#1e40af'
                                    },
                                    children: formatDate(date)
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                    lineNumber: 181,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 179,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                    lineNumber: 168,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        border: '1px solid #1e40af',
                        padding: '3mm',
                        marginBottom: '3mm',
                        backgroundColor: '#f8fafc'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                fontWeight: 'bold',
                                fontSize: '11pt',
                                marginBottom: '2mm',
                                color: '#1e40af'
                            },
                            children: "BORROWER DETAILS"
                        }, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 192,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                            style: {
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '10pt'
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold',
                                                    width: '30%'
                                                },
                                                children: "Borrower Name"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 204,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    customerName
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 205,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 203,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold'
                                                },
                                                children: "Father/Husband Name"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 208,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    fatherName
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 209,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 207,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold'
                                                },
                                                children: "Phone Number"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 212,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    customerPhone
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 213,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 211,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold'
                                                },
                                                children: "Address"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 216,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    customerAddress
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 217,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 215,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold'
                                                },
                                                children: "Aadhaar Number"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 220,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    customerAadhaar || 'N/A'
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 221,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 219,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold'
                                                },
                                                children: "PAN Number"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 224,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    customerPan || 'N/A'
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 225,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 223,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                lineNumber: 202,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 201,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                    lineNumber: 186,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        border: '1px solid #1e40af',
                        padding: '3mm',
                        marginBottom: '3mm',
                        backgroundColor: '#f8fafc'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                fontWeight: 'bold',
                                fontSize: '11pt',
                                marginBottom: '2mm',
                                color: '#1e40af'
                            },
                            children: "LOAN DETAILS"
                        }, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 238,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                            style: {
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '10pt'
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold',
                                                    width: '30%'
                                                },
                                                children: "Loan Account No"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 250,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    loanAccountNo
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 251,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 249,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold'
                                                },
                                                children: "Loan Amount"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 254,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    formatCurrency(loanAmount)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 255,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 253,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold'
                                                },
                                                children: "Interest Rate"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 258,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    interestRate,
                                                    "% (",
                                                    interestType,
                                                    ")"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 259,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 257,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold'
                                                },
                                                children: "Tenure"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 262,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    tenure,
                                                    " Months"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 263,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 261,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold'
                                                },
                                                children: "EMI Amount"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 266,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    formatCurrency(emiAmount),
                                                    "/month"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 267,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 265,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold'
                                                },
                                                children: "Total Interest"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 270,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    formatCurrency(totalInterest)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 271,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 269,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold'
                                                },
                                                children: "Total Repayment"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 274,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    formatCurrency(totalAmount)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 275,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 273,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold'
                                                },
                                                children: "Disbursement Date"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 278,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    formatDate(disbursementDate)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 279,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 277,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold'
                                                },
                                                children: "First EMI Date"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 282,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    formatDate(firstEmiDate)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 283,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 281,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold'
                                                },
                                                children: "Purpose"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 286,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    purpose || 'Personal Loan'
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 287,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 285,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                lineNumber: 248,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 247,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                    lineNumber: 232,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        marginBottom: '3mm',
                        padding: '2mm',
                        backgroundColor: '#fefce8',
                        border: '1px solid #ca8a04'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            style: {
                                fontWeight: 'bold'
                            },
                            children: "Amount in Words: "
                        }, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 300,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            style: {
                                fontStyle: 'italic'
                            },
                            children: [
                                numberToWords(loanAmount),
                                " Rupees Only"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 301,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                    lineNumber: 294,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        border: '1px solid #1e40af',
                        padding: '3mm',
                        marginBottom: '3mm',
                        backgroundColor: '#f8fafc'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                fontWeight: 'bold',
                                fontSize: '11pt',
                                marginBottom: '2mm',
                                color: '#1e40af'
                            },
                            children: "BANK DETAILS (For EMI Payment)"
                        }, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 313,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                            style: {
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '10pt'
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold',
                                                    width: '30%'
                                                },
                                                children: "Bank Name"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 325,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    bankName || 'N/A'
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 326,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 324,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold'
                                                },
                                                children: "Account Number"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 329,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    bankAccountNo || 'N/A'
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 330,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 328,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold'
                                                },
                                                children: "IFSC Code"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 333,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    bankIfsc || 'N/A'
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 334,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 332,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                lineNumber: 323,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 322,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                    lineNumber: 307,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        border: '1px solid #ccc',
                        padding: '3mm',
                        marginBottom: '3mm'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                fontWeight: 'bold',
                                fontSize: '11pt',
                                marginBottom: '2mm'
                            },
                            children: "WITNESS DETAILS"
                        }, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 346,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                            style: {
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '10pt'
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold',
                                                    width: '30%'
                                                },
                                                children: "Witness Name"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 357,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    witnessName || 'N/A'
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 358,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 356,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm',
                                                    fontWeight: 'bold'
                                                },
                                                children: "Witness Phone"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 361,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                style: {
                                                    padding: '1mm'
                                                },
                                                children: [
                                                    ": ",
                                                    witnessPhone || 'N/A'
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                                lineNumber: 362,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 360,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                lineNumber: 355,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 354,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                    lineNumber: 341,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        marginBottom: '3mm',
                        padding: '3mm',
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #ccc',
                        fontSize: '9pt'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                fontWeight: 'bold',
                                marginBottom: '2mm'
                            },
                            children: "TERMS & CONDITIONS:"
                        }, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 376,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ol", {
                            style: {
                                paddingLeft: '5mm',
                                margin: 0
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                    children: "The borrower agrees to repay the loan as per the EMI schedule."
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                    lineNumber: 378,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                    children: "Late payment will attract penalty charges as per company policy."
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                    lineNumber: 379,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                    children: "The company reserves the right to take legal action for default."
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                    lineNumber: 380,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                    children: "All disputes are subject to the jurisdiction of the local court."
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                    lineNumber: 381,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 377,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                    lineNumber: 369,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: '8mm',
                        paddingTop: '3mm'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                textAlign: 'center',
                                width: '30%'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '12mm'
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                    lineNumber: 394,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        borderTop: '1px solid #000',
                                        paddingTop: '2mm'
                                    },
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            fontWeight: 'bold'
                                        },
                                        children: "Borrower Signature"
                                    }, void 0, false, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 396,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                    lineNumber: 395,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 393,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                textAlign: 'center',
                                width: '30%'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '12mm'
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                    lineNumber: 402,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        borderTop: '1px solid #000',
                                        paddingTop: '2mm'
                                    },
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            fontWeight: 'bold'
                                        },
                                        children: "Witness Signature"
                                    }, void 0, false, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 404,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                    lineNumber: 403,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 401,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                textAlign: 'center',
                                width: '30%'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        border: '1px dashed #1e40af',
                                        borderRadius: '50%',
                                        width: '20mm',
                                        height: '20mm',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 2mm',
                                        color: '#1e40af',
                                        fontSize: '7pt'
                                    },
                                    children: [
                                        "COMPANY",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                            lineNumber: 422,
                                            columnNumber: 22
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        "STAMP"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                    lineNumber: 410,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        borderTop: '1px solid #000',
                                        paddingTop: '2mm'
                                    },
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            fontWeight: 'bold',
                                            color: '#1e40af'
                                        },
                                        children: "Authorized Signatory"
                                    }, void 0, false, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                        lineNumber: 425,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                                    lineNumber: 424,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 409,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                    lineNumber: 386,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        marginTop: '5mm',
                        textAlign: 'center',
                        fontSize: '8pt',
                        color: '#666',
                        borderTop: '1px solid #ccc',
                        paddingTop: '2mm'
                    },
                    children: [
                        "This is a computer generated receipt. No signature required.",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                            lineNumber: 440,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        "For any queries, please contact us at: ",
                        companyPhone,
                        " | ",
                        companyEmail
                    ]
                }, void 0, true, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
                    lineNumber: 431,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
            lineNumber: 125,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx",
        lineNumber: 114,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
});
_c1 = LoanReceipt;
LoanReceipt.displayName = 'LoanReceipt';
const __TURBOPACK__default__export__ = LoanReceipt;
var _c, _c1;
__turbopack_context__.k.register(_c, "LoanReceipt$forwardRef");
__turbopack_context__.k.register(_c1, "LoanReceipt");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/components/receipt/LoanReceiptDialog.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>LoanReceiptDialog
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/ui/dialog.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/download.js [app-client] (ecmascript) <export default as Download>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$printer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Printer$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/printer.js [app-client] (ecmascript) <export default as Printer>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/file-text.js [app-client] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$receipt$2f$LoanReceipt$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/receipt/LoanReceipt.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
function LoanReceiptDialog({ open, onOpenChange, receiptData }) {
    _s();
    const receiptRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [downloading, setDownloading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleDownloadPDF = async ()=>{
        if (!receiptRef.current || !receiptData) return;
        setDownloading(true);
        try {
            const html2pdf = (await __turbopack_context__.A("[project]/Desktop/reallll/node_modules/html2pdf.js/dist/html2pdf.js [app-client] (ecmascript, async loader)")).default;
            const opt = {
                margin: 0,
                filename: `Loan_Receipt_${receiptData.receiptNo.replace(/\//g, '-')}.pdf`,
                image: {
                    type: 'jpeg',
                    quality: 0.98
                },
                html2canvas: {
                    scale: 2,
                    useCORS: true
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait'
                }
            };
            await html2pdf().set(opt).from(receiptRef.current).save();
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally{
            setDownloading(false);
        }
    };
    const handlePrint = ()=>{
        if (!receiptRef.current) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
      <html>
        <head>
          <title>Loan Disbursement Receipt</title>
          <style>
            @page { margin: 0; }
            body { margin: 0; padding: 0; }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${receiptRef.current.outerHTML}
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };
    if (!receiptData) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Dialog"], {
        open: open,
        onOpenChange: onOpenChange,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogContent"], {
            className: "max-w-4xl max-h-[95vh] overflow-hidden flex flex-col",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogHeader"], {
                    className: "flex-shrink-0",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogTitle"], {
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                                className: "h-5 w-5 text-blue-600"
                            }, void 0, false, {
                                fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceiptDialog.tsx",
                                lineNumber: 111,
                                columnNumber: 13
                            }, this),
                            "Loan Disbursement Receipt - ",
                            receiptData.receiptNo
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceiptDialog.tsx",
                        lineNumber: 110,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceiptDialog.tsx",
                    lineNumber: 109,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex gap-2 flex-shrink-0 pb-2 border-b",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                            onClick: handleDownloadPDF,
                            disabled: downloading,
                            className: "bg-blue-600 hover:bg-blue-700",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__["Download"], {
                                    className: "h-4 w-4 mr-2"
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceiptDialog.tsx",
                                    lineNumber: 123,
                                    columnNumber: 13
                                }, this),
                                downloading ? 'Generating...' : 'Download PDF'
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceiptDialog.tsx",
                            lineNumber: 118,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                            onClick: handlePrint,
                            variant: "outline",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$printer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Printer$3e$__["Printer"], {
                                    className: "h-4 w-4 mr-2"
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceiptDialog.tsx",
                                    lineNumber: 130,
                                    columnNumber: 13
                                }, this),
                                "Print"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceiptDialog.tsx",
                            lineNumber: 126,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceiptDialog.tsx",
                    lineNumber: 117,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex-1 overflow-auto bg-gray-100 p-4",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white shadow-lg mx-auto",
                        style: {
                            width: '210mm',
                            minHeight: '297mm'
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$receipt$2f$LoanReceipt$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            ref: receiptRef,
                            ...receiptData
                        }, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceiptDialog.tsx",
                            lineNumber: 138,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceiptDialog.tsx",
                        lineNumber: 137,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceiptDialog.tsx",
                    lineNumber: 136,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceiptDialog.tsx",
            lineNumber: 108,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/Desktop/reallll/src/components/receipt/LoanReceiptDialog.tsx",
        lineNumber: 107,
        columnNumber: 5
    }, this);
}
_s(LoanReceiptDialog, "ikQSyzgNkFPSZMXsPVPTjb0UIrM=");
_c = LoanReceiptDialog;
var _c;
__turbopack_context__.k.register(_c, "LoanReceiptDialog");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ReceiptSection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/ui/card.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/file-text.js [app-client] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/download.js [app-client] (ecmascript) <export default as Download>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/eye.js [app-client] (ecmascript) <export default as Eye>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileDown$3e$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/lucide-react/dist/esm/icons/file-down.js [app-client] (ecmascript) <export default as FileDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$utils$2f$helpers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/utils/helpers.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$receipt$2f$LoanReceiptDialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/receipt/LoanReceiptDialog.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$receipt$2f$ReceiptDialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/components/receipt/ReceiptDialog.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$generate$2d$receipts$2d$pdf$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/lib/generate-receipts-pdf.ts [app-client] (ecmascript)");
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
function ReceiptSection({ loanDetails, emiSchedules }) {
    _s();
    const [showLoanReceipt, setShowLoanReceipt] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showEmiReceipt, setShowEmiReceipt] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [loanReceiptData, setLoanReceiptData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [emiReceiptData, setEmiReceiptData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [loadingEmiId, setLoadingEmiId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [downloadingAll, setDownloadingAll] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Generate loan receipt data
    const generateLoanReceipt = async ()=>{
        if (!loanDetails) return;
        setLoading(true);
        try {
            // Generate receipt number
            const companyCode = loanDetails.company?.code || 'MM';
            const receiptNo = `LR-${companyCode}-${loanDetails.applicationNo || Date.now()}`;
            const sessionForm = loanDetails.sessionForm || {};
            const company = loanDetails.company || {};
            const customer = loanDetails.customer || {};
            // FIX: correct field name is approvedAmount (not loanAmount)
            const loanAmount = sessionForm.approvedAmount || loanDetails.disbursedAmount || loanDetails.requestedAmount || 0;
            const interestRate = sessionForm.interestRate || loanDetails.interestRate || 0;
            const tenure = sessionForm.tenure || loanDetails.tenure || 0;
            const interestType = sessionForm.interestType || 'FLAT';
            // EMI + totals — prefer schedule data for accuracy
            let emiAmount = sessionForm.emiAmount || 0;
            let totalInterest = sessionForm.totalInterest || 0;
            let totalAmount = sessionForm.totalAmount || 0;
            if (emiSchedules.length > 0 && emiAmount === 0) {
                // Derive from schedule (totalAmount field on each EMI row)
                emiAmount = emiSchedules[0].emiAmount || emiSchedules[0].totalAmount || 0;
                totalAmount = emiSchedules.reduce((sum, e)=>sum + (e.emiAmount || e.totalAmount || 0), 0);
                totalInterest = Math.max(0, totalAmount - loanAmount);
            }
            // Customer details — prefer application-level fields, fallback to customer profile
            const custName = [
                loanDetails.title,
                loanDetails.firstName,
                loanDetails.middleName,
                loanDetails.lastName
            ].filter(Boolean).join(' ') || customer.name || '';
            const custAddress = [
                loanDetails.address || customer.address,
                loanDetails.city || customer.city,
                loanDetails.state || customer.state,
                loanDetails.pincode || customer.pincode
            ].filter(Boolean).join(', ');
            // Bank details — from customer profile
            const custBank = customer.bankName || loanDetails.bankName || '';
            const custBankAcc = customer.bankAccountNumber || loanDetails.bankAccountNumber || '';
            const custBankIfsc = customer.bankIfsc || loanDetails.bankIfsc || '';
            const receiptData = {
                receiptNo,
                date: new Date().toISOString(),
                companyName: company.name || 'Money Mitra Financial Services',
                companyCode: company.code || 'MM',
                companyAddress: [
                    company.address,
                    company.city,
                    company.state
                ].filter(Boolean).join(', ') || 'India',
                companyPhone: company.contactPhone || '',
                companyEmail: company.contactEmail || '',
                customerName: custName,
                fatherName: loanDetails.fatherName || '',
                customerPhone: loanDetails.phone || customer.phone || '',
                customerAddress: custAddress,
                customerAadhaar: loanDetails.aadhaarNumber || customer.aadhaarNumber || '',
                customerPan: loanDetails.panNumber || customer.panNumber || '',
                loanAccountNo: loanDetails.applicationNo || '',
                loanAmount,
                interestRate,
                interestType,
                tenure,
                emiAmount,
                totalInterest,
                totalAmount,
                disbursementDate: loanDetails.disbursedAt || new Date().toISOString(),
                firstEmiDate: emiSchedules[0]?.dueDate || new Date().toISOString(),
                bankName: custBank,
                bankAccountNo: custBankAcc,
                bankIfsc: custBankIfsc,
                purpose: loanDetails.purpose || sessionForm.purpose || 'Personal Loan',
                witnessName: loanDetails.reference1Name || '',
                witnessPhone: loanDetails.reference1Phone || ''
            };
            setLoanReceiptData(receiptData);
            setShowLoanReceipt(true);
        } catch (error) {
            console.error('Error generating loan receipt:', error);
        } finally{
            setLoading(false);
        }
    };
    // Fetch EMI receipt
    const fetchEmiReceipt = async (emiScheduleId)=>{
        setLoadingEmiId(emiScheduleId);
        try {
            const response = await fetch(`/api/receipt?emiScheduleId=${emiScheduleId}`);
            const data = await response.json();
            if (data.success && data.receiptData) {
                setEmiReceiptData(data.receiptData);
                setShowEmiReceipt(true);
            }
        } catch (error) {
            console.error('Error fetching EMI receipt:', error);
        } finally{
            setLoadingEmiId(null);
        }
    };
    // Download all receipts as PDF
    const downloadAllReceipts = async ()=>{
        if (!loanDetails || paidEmis.length === 0) return;
        setDownloadingAll(true);
        try {
            const loanId = loanDetails.id || loanDetails.loanId;
            const isOffline = loanDetails.isOffline || false;
            const response = await fetch(`/api/receipt/download-all?loanId=${loanId}&isOffline=${isOffline}`);
            const data = await response.json();
            if (data.success && data.receipts && data.receipts.length > 0) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$generate$2d$receipts$2d$pdf$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["generateAllReceiptsPDF"])(data.receipts, `EMI Receipts - ${loanDetails.applicationNo || loanDetails.loanNumber}`);
            } else {
                alert('No paid EMI receipts found to download');
            }
        } catch (error) {
            console.error('Error downloading all receipts:', error);
            alert('Failed to download receipts');
        } finally{
            setDownloadingAll(false);
        }
    };
    // Filter paid EMIs — support both field naming conventions (online vs offline)
    const paidEmis = emiSchedules.filter((emi)=>emi.paymentStatus === 'PAID' || emi.paymentStatus === 'INTEREST_ONLY_PAID' || emi.status === 'PAID' || emi.status === 'INTEREST_ONLY_PAID');
    if (!loanDetails) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-center py-8 text-gray-500",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                    className: "h-10 w-10 mx-auto mb-2 text-gray-300"
                }, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                    lineNumber: 230,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: "No loan details available"
                }, void 0, false, {
                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                    lineNumber: 231,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
            lineNumber: 229,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                className: "border-0 shadow-sm",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                                className: "text-base flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                                        className: "h-4 w-4 text-blue-600"
                                    }, void 0, false, {
                                        fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                        lineNumber: 242,
                                        columnNumber: 13
                                    }, this),
                                    "Loan Disbursement Receipt"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                lineNumber: 241,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardDescription"], {
                                children: "Generate receipt for the full loan disbursement"
                            }, void 0, false, {
                                fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                lineNumber: 245,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                        lineNumber: 240,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "font-semibold text-blue-800",
                                            children: [
                                                "Loan Account: ",
                                                loanDetails.applicationNo
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                            lineNumber: 252,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm text-blue-600",
                                            children: [
                                                "Amount: ₹",
                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$utils$2f$helpers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(loanDetails.sessionForm?.approvedAmount || loanDetails.disbursedAmount || loanDetails.requestedAmount || 0)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                            lineNumber: 253,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                    lineNumber: 251,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    onClick: generateLoanReceipt,
                                    disabled: loading,
                                    className: "bg-blue-600 hover:bg-blue-700",
                                    children: [
                                        loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                            className: "h-4 w-4 mr-2 animate-spin"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                            lineNumber: 263,
                                            columnNumber: 17
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"], {
                                            className: "h-4 w-4 mr-2"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                            lineNumber: 265,
                                            columnNumber: 17
                                        }, this),
                                        loading ? 'Generating...' : 'View Receipt'
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                    lineNumber: 257,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                            lineNumber: 250,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                        lineNumber: 249,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                lineNumber: 239,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                className: "border-0 shadow-sm",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                                            className: "text-base flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__["Download"], {
                                                    className: "h-4 w-4 text-green-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                                    lineNumber: 279,
                                                    columnNumber: 17
                                                }, this),
                                                "Monthly EMI Receipts"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                            lineNumber: 278,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardDescription"], {
                                            children: [
                                                paidEmis.length,
                                                " paid EMI(s) with receipts available"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                            lineNumber: 282,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                    lineNumber: 277,
                                    columnNumber: 13
                                }, this),
                                paidEmis.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    onClick: downloadAllReceipts,
                                    disabled: downloadingAll,
                                    className: "bg-green-600 hover:bg-green-700 text-white",
                                    children: [
                                        downloadingAll ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                            className: "h-4 w-4 mr-2 animate-spin"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                            lineNumber: 293,
                                            columnNumber: 19
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileDown$3e$__["FileDown"], {
                                            className: "h-4 w-4 mr-2"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                            lineNumber: 295,
                                            columnNumber: 19
                                        }, this),
                                        downloadingAll ? 'Downloading...' : 'Download All Receipts'
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                    lineNumber: 287,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                            lineNumber: 276,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                        lineNumber: 275,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                        children: paidEmis.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-center py-6 text-gray-500",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                                    className: "h-8 w-8 mx-auto mb-2 text-gray-300"
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                    lineNumber: 305,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm",
                                    children: "No paid EMIs yet. Receipts will appear here after EMI payments."
                                }, void 0, false, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                    lineNumber: 306,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                            lineNumber: 304,
                            columnNumber: 13
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-2 max-h-96 overflow-y-auto",
                            children: paidEmis.map((emi)=>{
                                const isPaid = emi.paymentStatus === 'PAID' || emi.status === 'PAID';
                                const isInterestOnly = emi.paymentStatus === 'INTEREST_ONLY_PAID' || emi.status === 'INTEREST_ONLY_PAID';
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: `w-8 h-8 rounded-full flex items-center justify-center ${isPaid ? 'bg-green-200' : 'bg-blue-200'}`,
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                                                        className: `h-4 w-4 ${isPaid ? 'text-green-600' : 'text-blue-600'}`
                                                    }, void 0, false, {
                                                        fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                                        lineNumber: 322,
                                                        columnNumber: 23
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                                    lineNumber: 319,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "font-medium",
                                                            children: [
                                                                "EMI #",
                                                                emi.emiNumber || emi.installmentNumber,
                                                                isInterestOnly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-xs text-blue-600 ml-2",
                                                                    children: "(Interest Only)"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                                                    lineNumber: 330,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                                            lineNumber: 327,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm text-gray-500",
                                                            children: [
                                                                "Paid: ",
                                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$utils$2f$helpers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatDate"])(emi.paidDate),
                                                                " | ₹",
                                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$utils$2f$helpers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(emi.paidAmount || emi.emiAmount || emi.totalAmount || 0)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                                            lineNumber: 333,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                                    lineNumber: 326,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                            lineNumber: 318,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                            variant: "outline",
                                            size: "sm",
                                            onClick: ()=>fetchEmiReceipt(emi.id),
                                            disabled: loadingEmiId === emi.id,
                                            className: "border-green-300 text-green-600 hover:bg-green-100",
                                            children: loadingEmiId === emi.id ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                className: "h-4 w-4 animate-spin"
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                                lineNumber: 346,
                                                columnNumber: 23
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"], {
                                                        className: "h-4 w-4 mr-1"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                                        lineNumber: 349,
                                                        columnNumber: 25
                                                    }, this),
                                                    "Receipt"
                                                ]
                                            }, void 0, true)
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                            lineNumber: 338,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, emi.id, true, {
                                    fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                                    lineNumber: 314,
                                    columnNumber: 17
                                }, this);
                            })
                        }, void 0, false, {
                            fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                            lineNumber: 309,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                        lineNumber: 302,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                lineNumber: 274,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$receipt$2f$LoanReceiptDialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                open: showLoanReceipt,
                onOpenChange: setShowLoanReceipt,
                receiptData: loanReceiptData
            }, void 0, false, {
                fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                lineNumber: 362,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$components$2f$receipt$2f$ReceiptDialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                open: showEmiReceipt,
                onOpenChange: setShowEmiReceipt,
                receiptData: emiReceiptData
            }, void 0, false, {
                fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
                lineNumber: 369,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Desktop/reallll/src/components/receipt/ReceiptSection.tsx",
        lineNumber: 237,
        columnNumber: 5
    }, this);
}
_s(ReceiptSection, "VQTsIqv9LYXdo4E9p6qiO/FXtTw=");
_c = ReceiptSection;
var _c;
__turbopack_context__.k.register(_c, "ReceiptSection");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=Desktop_reallll_src_components_receipt_40520c2a._.js.map