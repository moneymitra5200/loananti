module.exports=[856038,e=>{"use strict";var t=e.i(726534),n=e.i(28149),a=e.i(244392),o=e.i(578023),r=e.i(711707),s=e.i(630741),i=e.i(528620),l=e.i(581393),u=e.i(974764),d=e.i(838949),c=e.i(735500),p=e.i(838508),h=e.i(213713),y=e.i(975771),m=e.i(817436),g=e.i(193695);e.i(535244);var E=e.i(679192),I=e.i(616766),f=e.i(803134);async function N(e){try{let t=await f.db.loanApplication.findMany({where:{customerId:e,status:{in:["DISBURSED","ACTIVE","ACTIVE_INTEREST_ONLY"]}},include:{emiSchedules:{orderBy:{installmentNumber:"asc"}},payments:{orderBy:{createdAt:"desc"},take:5},company:{select:{name:!0}}},take:5}),n=await f.db.loanApplication.findMany({where:{customerId:e},select:{id:!0,applicationNo:!0,status:!0,loanAmount:!0,disbursedAt:!0},orderBy:{createdAt:"desc"},take:10}),a=await f.db.user.findUnique({where:{id:e},select:{name:!0,phone:!0,email:!0}}),o=t.map(e=>{let t=e.emiSchedules||[],n=t.filter(e=>"PENDING"===e.paymentStatus),a=t.filter(e=>"OVERDUE"===e.paymentStatus),o=t.filter(e=>"PAID"===e.paymentStatus||"INTEREST_ONLY_PAID"===e.paymentStatus),r=n.sort((e,t)=>new Date(e.dueDate).getTime()-new Date(t.dueDate).getTime())[0],s=a.reduce((e,t)=>e+Number(t.totalAmount||0),0),i=o.reduce((e,t)=>e+Number(t.paidAmount||0),0),l=t.find(e=>"PAID"!==e.paymentStatus)?.outstandingPrincipal||0;return{applicationNo:e.applicationNo,loanAmount:Number(e.loanAmount),company:e.company?.name||"MoneyMitra",status:e.status,totalEMIs:t.length,paidEMIs:o.length,pendingEMIs:n.length,overdueEMIs:a.length,overdueAmount:s,paidAmount:i,outstandingPrincipal:Number(l),nextEmi:r?{installmentNumber:r.installmentNumber,dueDate:new Date(r.dueDate).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}),amount:Number(r.totalAmount),status:r.paymentStatus}:null,recentPayments:(e.payments||[]).map(e=>({amount:Number(e.amount),date:new Date(e.createdAt).toLocaleDateString("en-IN"),mode:e.paymentMode}))}});return{customerName:a?.name||"",loanContexts:o,allLoans:n}}catch(e){return console.error("[AI Chat] Failed to fetch customer context:",e),{customer:null,loanContexts:[],allLoans:[]}}}async function A(e){try{let t,{customerId:n,sessionId:a,message:o,customerName:r}=await e.json();if(!n||!a||!o)return I.NextResponse.json({error:"Missing required fields"},{status:400});let s=await N(n),i=r||s.customerName||"",{response:l,intent:u}=function(e,t,n){let a=e.toLowerCase(),o=n.loanContexts,r=t||"there";if(/^(hi|hello|hey|namaste|hii|helo)\b/.test(a)){let e=o.length>0,t=o.some(e=>e.overdueEMIs>0),n=`👋 Hello ${r}! I'm **MitraBot**, your personal AI Loan Assistant.

`;return e?(t&&(n+=`⚠️ You have **overdue EMIs** on your loan. Please check the details below.

`),n+=`You have **${o.length} active loan(s)**. I can help you with:
`):n+=`I can help you with:
`,{response:n+=`📅 EMI due dates & payment status
💰 Outstanding balance & penalties
🏦 Loan details & history
📝 New loan eligibility & suggestions
📞 Support & escalation

What would you like to know? 😊`,intent:"GREETING"}}if(a.includes("emi")||a.includes("due")||a.includes("next payment")||a.includes("installment")){if(0===o.length)return{response:`📅 You don't have any active loans with pending EMIs right now.

If you'd like to apply for a new loan, I can guide you! Just ask "How do I apply for a loan?" 😊`,intent:"EMI_STATUS"};let e=`📅 **Your EMI Status:**

`;return o.forEach((t,n)=>{if(e+=`**Loan ${n+1}: ${t.applicationNo}** (${t.company})
• Loan Amount: ₹${t.loanAmount.toLocaleString("en-IN")}
• Progress: ${t.paidEMIs}/${t.totalEMIs} EMIs paid
`,t.nextEmi){let n="OVERDUE"===t.nextEmi.status;e+=`• ${n?"⚠️ **OVERDUE**":"📅 Next EMI"}: ₹${t.nextEmi.amount.toLocaleString("en-IN")} due on **${t.nextEmi.dueDate}**
`}else t.paidEMIs===t.totalEMIs&&(e+=`• ✅ All EMIs paid — Loan closed!
`);t.overdueEMIs>0&&(e+=`• ⚠️ ${t.overdueEMIs} overdue EMI(s) — Total overdue: ₹${t.overdueAmount.toLocaleString("en-IN")}
`),e+="\n"}),{response:e+=`💡 Please pay on time to avoid late fees. Contact your branch or cashier to make a payment.`,intent:"EMI_STATUS"}}if(a.includes("balance")||a.includes("outstanding")||a.includes("remaining")||a.includes("kitna bacha")||a.includes("how much left")){if(0===o.length)return{response:`💰 You don't have any active loans right now.

Would you like to apply for a new loan? I can help with that! 😊`,intent:"LOAN_BALANCE"};let e=`💰 **Your Outstanding Balance:**

`,t=0;return o.forEach((n,a)=>{e+=`**${n.applicationNo}** — Outstanding: ₹${n.outstandingPrincipal.toLocaleString("en-IN")}
  • Paid so far: ₹${n.paidAmount.toLocaleString("en-IN")}
  • ${n.pendingEMIs} EMI(s) remaining

`,t+=n.outstandingPrincipal}),o.length>1&&(e+=`**Total Outstanding (all loans): ₹${t.toLocaleString("en-IN")}**

`),{response:e+=`💡 You can close your loan early by paying the outstanding amount. Ask me about "loan foreclosure" for details!`,intent:"LOAN_BALANCE"}}if(a.includes("overdue")||a.includes("penalty")||a.includes("late")||a.includes("fine")||a.includes("default")){let e=o.filter(e=>e.overdueEMIs>0);if(0===e.length)return{response:`✅ Great news, ${r}! You have **no overdue EMIs** on any of your loans.

Keep up the good work! Timely payments help maintain your credit score. 🌟`,intent:"PENALTY_INFO"};let t=`⚠️ **Overdue EMI Alert:**

`;return e.forEach(e=>{t+=`**${e.applicationNo}**
• Overdue EMIs: ${e.overdueEMIs}
• Total Overdue Amount: ₹${e.overdueAmount.toLocaleString("en-IN")}

`}),{response:t+=`**Important:** Late payments attract penalty charges. Please contact your branch or cashier immediately to clear overdue EMIs and avoid further charges.

📞 Need help? Ask me to "connect with support".`,intent:"PENALTY_INFO"}}if(a.includes("payment history")||a.includes("paid")||a.includes("receipt")||a.includes("transaction")){if(0===o.length)return{response:`📄 No payment history found. You don't have any active loans.

Would you like to apply for a loan? 😊`,intent:"PAYMENT_HISTORY"};let e=`📄 **Recent Payment History:**

`;return o.forEach(t=>{t.recentPayments.length>0&&(e+=`**${t.applicationNo}:**
`,t.recentPayments.forEach(t=>{e+=`  • ₹${t.amount.toLocaleString("en-IN")} on ${t.date} via ${t.mode}
`}),e+="\n")}),e+=`📊 **Summary:**
`,o.forEach(t=>{e+=`• ${t.applicationNo}: ${t.paidEMIs}/${t.totalEMIs} EMIs paid (₹${t.paidAmount.toLocaleString("en-IN")} total paid)
`}),{response:e,intent:"PAYMENT_HISTORY"}}if(a.includes("loan status")||a.includes("my loan")||a.includes("loan detail")||a.includes("application")){if(0===n.allLoans.length)return{response:`📋 You don't have any loan applications yet.

Would you like to apply for a loan? Just ask "How do I apply?" and I'll guide you step by step! 🚀`,intent:"LOAN_STATUS"};let e=`📋 **Your Loan Summary:**

`;return n.allLoans.forEach(t=>{e+=`${({DISBURSED:"✅",ACTIVE:"🟢",CLOSED:"🏁",OVERDUE:"⚠️",PENDING:"⏳",APPROVED:"👍",REJECTED_BY_SA:"❌",FINAL_APPROVED:"✅"})[t.status]||"📄"} **${t.applicationNo}** — ₹${Number(t.loanAmount).toLocaleString("en-IN")} — **${t.status}**
`}),{response:e,intent:"LOAN_STATUS"}}if(a.includes("foreclose")||a.includes("close loan")||a.includes("prepay")||a.includes("full payment")||a.includes("close my loan")){if(0===o.length)return{response:`You don't have any active loans to foreclose.

Would you like to apply for a new loan? 😊`,intent:"FORECLOSURE"};let e=`🏁 **Loan Foreclosure Information:**

You can close your loan early by paying the outstanding balance.

`;return o.forEach(t=>{e+=`**${t.applicationNo}:**
• Outstanding Principal: ₹${t.outstandingPrincipal.toLocaleString("en-IN")}
• Remaining EMIs: ${t.pendingEMIs}

`}),{response:e+=`**How to Foreclose:**
1. Visit your branch or contact your cashier
2. Request foreclosure statement
3. Pay the outstanding amount
4. Receive a No Dues Certificate

💡 Foreclosure saves you on future interest payments!`,intent:"FORECLOSURE"}}if(a.includes("apply")||a.includes("new loan")||a.includes("loan lena")||a.includes("suggest")||a.includes("eligib")||a.includes("qualify")){let e=o.every(e=>0===e.overdueEMIs),t=`📝 **Loan Suggestions for You:**

`;return e&&o.length>0?t+=`✅ Based on your **good repayment history**, you may be eligible for:

`:t+=`Here are the loan products available:

`,{response:t+=`💼 **Personal Loan**
• Amount: ₹50,000 – ₹10,00,000
• Rate: 14% – 24% p.a.
• Tenure: 6 – 60 months
• Purpose: Medical, education, travel, etc.

🏠 **Business Loan**
• Amount: ₹1,00,000 – ₹50,00,000
• Rate: 12% – 20% p.a.
• Tenure: 12 – 84 months
• Purpose: Business expansion, working capital

🥇 **Gold Loan**
• Amount: Up to 75% of gold value
• Rate: 8% – 16% p.a.
• Instant approval!

**Documents Required:**
• PAN Card + Aadhaar Card
• Income proof (salary slip / ITR)
• Bank statement (6 months)
• Address proof

**How to Apply:**
1. Contact your MoneyMitra agent
2. Or visit our branch with documents
3. Get approval in 24-48 hours! 🚀

Want me to tell you more about any specific loan type?`,intent:"LOAN_SUGGESTION"}}return a.includes("support")||a.includes("help")||a.includes("contact")||a.includes("human")||a.includes("agent")||a.includes("problem")?{response:`📞 **Need Help?**

I can assist with most queries, but if you need to speak with our team:

🎫 **Create a Support Ticket:**
Go to "Support" in your dashboard → "New Ticket"

📱 **Call Us:**
Contact your assigned agent or visit your nearest branch.

💬 **For urgent issues:**
• Visit your branch in person
• Call during business hours (9 AM – 6 PM)

I'm also here 24/7! What else can I help you with? 😊`,intent:"SUPPORT"}:a.includes("how to pay")||a.includes("payment mode")||a.includes("pay online")||a.includes("pay emi")||a.includes("kaise pay")?{response:`💳 **How to Pay Your EMI:**

**Via App/Dashboard:**
1. Login → Go to "My Loans"
2. Select your loan
3. Click "Pay EMI"
4. Choose payment mode & pay!

**Payment Modes Accepted:**
• 💵 Cash (at branch)
• 📱 UPI (Google Pay, PhonePe, Paytm)
• 🏦 Net Banking / Bank Transfer
• 💳 Debit/Credit Card
• 📝 Cheque

**Via Cashier:**
Visit your nearest branch with cash or cheque. Your cashier will record the payment immediately.

⚡ Payment reflects instantly in your account!`,intent:"PAYMENT_HELP"}:a.includes("interest")||a.includes("rate")||a.includes("byaj")||a.includes("percent")?{response:`📊 **Interest Rates at MoneyMitra:**

| Loan Type | Rate (p.a.) |
|-----------|-------------|
| Personal Loan | 14% – 24% |
| Business Loan | 12% – 20% |
| Gold Loan | 8% – 16% |
| Vehicle Loan | 10% – 18% |
| Home Loan | 9% – 14% |

**Your rate depends on:**
• Credit score
• Loan amount & tenure
• Income & repayment history

💡 Customers with **good repayment history** (like you!) may qualify for **lower rates** on their next loan!

Want to know your exact rate? Talk to our agent. 😊`,intent:"INTEREST_RATES"}:/thank|thanks|shukriya|dhanyavad|great|helpful/.test(a)?{response:`You're welcome, ${r}! 😊 I'm glad I could help!

Feel free to ask me anything anytime — I'm available 24/7. Have a great day! 🌟`,intent:"THANKS"}:{response:`I understand you're asking about: *"${e}"*

I can help you with:
📅 **EMI status & due dates**
💰 **Outstanding balance & penalties**
📋 **Loan details & history**
💳 **How to make payments**
📝 **New loan suggestions & eligibility**
🏁 **Loan foreclosure**
📞 **Support & escalation**

Try asking:
• "When is my next EMI due?"
• "What is my outstanding balance?"
• "Do I have any overdue payments?"
• "Suggest a loan for me"

Or type your question and I'll do my best to help! 🤖`,intent:"GENERAL"}}(o,i,s);try{t=(await f.db.aIChatHistory.create({data:{customerId:n,sessionId:a,userMessage:o,aiResponse:l,intent:u}})).id}catch(e){console.log("[AI Chat] Could not save history:",e)}return I.NextResponse.json({success:!0,response:l,intent:u,chatId:t})}catch(e){return console.error("[AI Chat] Error:",e),I.NextResponse.json({error:"Failed to process your message. Please try again.",details:e instanceof Error?e.message:"Unknown error"},{status:500})}}async function R(e){try{let{searchParams:t}=new URL(e.url),n=t.get("customerId"),a=t.get("sessionId");if(!n)return I.NextResponse.json({error:"customerId is required"},{status:400});try{let e=await f.db.aIChatHistory.findMany({where:{customerId:n,...a?{sessionId:a}:{}},orderBy:{createdAt:"asc"},take:a?void 0:50});return I.NextResponse.json({success:!0,history:e})}catch{return I.NextResponse.json({success:!0,history:[]})}}catch(e){return console.error("[AI Chat] History fetch error:",e),I.NextResponse.json({error:"Failed to fetch chat history"},{status:500})}}e.s(["GET",()=>R,"POST",()=>A],125731);var v=e.i(125731);let w=new t.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/ai/chat/route",pathname:"/api/ai/chat",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/Desktop/reallll/src/app/api/ai/chat/route.ts",nextConfigOutput:"",userland:v}),{workAsyncStorage:S,workUnitAsyncStorage:b,serverHooks:P}=w;function C(){return(0,a.patchFetch)({workAsyncStorage:S,workUnitAsyncStorage:b})}async function M(e,t,a){w.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let I="/api/ai/chat/route";I=I.replace(/\/index$/,"")||"/";let f=await w.prepare(e,t,{srcPage:I,multiZoneDraftMode:!1});if(!f)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:N,params:A,nextConfig:R,parsedUrl:v,isDraftMode:S,prerenderManifest:b,routerServerContext:P,isOnDemandRevalidate:C,revalidateOnlyGenerated:M,resolvedPathname:T,clientReferenceManifest:L,serverActionsManifest:O}=f,k=(0,i.normalizeAppPath)(I),x=!!(b.dynamicRoutes[k]||b.routes[T]),$=async()=>((null==P?void 0:P.render404)?await P.render404(e,t,v,!1):t.end("This page could not be found"),null);if(x&&!S){let e=!!b.routes[T],t=b.dynamicRoutes[k];if(t&&!1===t.fallback&&!e){if(R.experimental.adapterPath)return await $();throw new g.NoFallbackError}}let D=null;!x||w.isDev||S||(D="/index"===(D=T)?"/":D);let _=!0===w.isDev||!x,H=x&&!_;O&&L&&(0,s.setManifestsSingleton)({page:I,clientReferenceManifest:L,serverActionsManifest:O});let U=e.method||"GET",Y=(0,r.getTracer)(),q=Y.getActiveScopeSpan(),B={params:A,prerenderManifest:b,renderOpts:{experimental:{authInterrupts:!!R.experimental.authInterrupts},cacheComponents:!!R.cacheComponents,supportsDynamicResponse:_,incrementalCache:(0,o.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:R.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,n,a,o)=>w.onRequestError(e,t,a,o,P)},sharedContext:{buildId:N}},F=new l.NodeNextRequest(e),G=new l.NodeNextResponse(t),V=u.NextRequestAdapter.fromNodeNextRequest(F,(0,u.signalFromNodeResponse)(t));try{let s=async e=>w.handle(V,B).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let n=Y.getRootSpanAttributes();if(!n)return;if(n.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${n.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=n.get("next.route");if(a){let t=`${U} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${U} ${I}`)}),i=!!(0,o.getRequestMeta)(e,"minimalMode"),l=async o=>{var r,l;let u=async({previousCacheEntry:n})=>{try{if(!i&&C&&M&&!n)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let r=await s(o);e.fetchMetrics=B.renderOpts.fetchMetrics;let l=B.renderOpts.pendingWaitUntil;l&&a.waitUntil&&(a.waitUntil(l),l=void 0);let u=B.renderOpts.collectedTags;if(!x)return await (0,p.sendResponse)(F,G,r,B.renderOpts.pendingWaitUntil),null;{let e=await r.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(r.headers);u&&(t[m.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let n=void 0!==B.renderOpts.collectedRevalidate&&!(B.renderOpts.collectedRevalidate>=m.INFINITE_CACHE)&&B.renderOpts.collectedRevalidate,a=void 0===B.renderOpts.collectedExpire||B.renderOpts.collectedExpire>=m.INFINITE_CACHE?void 0:B.renderOpts.collectedExpire;return{value:{kind:E.CachedRouteKind.APP_ROUTE,status:r.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:n,expire:a}}}}catch(t){throw(null==n?void 0:n.isStale)&&await w.onRequestError(e,t,{routerKind:"App Router",routePath:I,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:C})},!1,P),t}},d=await w.handleResponse({req:e,nextConfig:R,cacheKey:D,routeKind:n.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:b,isRoutePPREnabled:!1,isOnDemandRevalidate:C,revalidateOnlyGenerated:M,responseGenerator:u,waitUntil:a.waitUntil,isMinimalMode:i});if(!x)return null;if((null==d||null==(r=d.value)?void 0:r.kind)!==E.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(l=d.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});i||t.setHeader("x-nextjs-cache",C?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),S&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let g=(0,h.fromNodeOutgoingHttpHeaders)(d.value.headers);return i&&x||g.delete(m.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||g.get("Cache-Control")||g.set("Cache-Control",(0,y.getCacheControlHeader)(d.cacheControl)),await (0,p.sendResponse)(F,G,new Response(d.value.body,{headers:g,status:d.value.status||200})),null};q?await l(q):await Y.withPropagatedContext(e.headers,()=>Y.trace(d.BaseServerSpan.handleRequest,{spanName:`${U} ${I}`,kind:r.SpanKind.SERVER,attributes:{"http.method":U,"http.target":e.url}},l))}catch(t){if(t instanceof g.NoFallbackError||await w.onRequestError(e,t,{routerKind:"App Router",routePath:k,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:C})},!1,P),x)throw t;return await (0,p.sendResponse)(F,G,new Response(null,{status:500})),null}}e.s(["handler",()=>M,"patchFetch",()=>C,"routeModule",()=>w,"serverHooks",()=>P,"workAsyncStorage",()=>S,"workUnitAsyncStorage",()=>b],856038)}];

//# sourceMappingURL=d0a8e_next_dist_esm_build_templates_app-route_7f1eaaee.js.map