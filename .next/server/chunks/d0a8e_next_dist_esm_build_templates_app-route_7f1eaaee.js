module.exports=[856038,e=>{"use strict";var t=e.i(726534),a=e.i(28149),n=e.i(244392),o=e.i(578023),s=e.i(711707),r=e.i(630741),i=e.i(528620),l=e.i(581393),u=e.i(974764),d=e.i(838949),p=e.i(735500),c=e.i(838508),h=e.i(213713),y=e.i(975771),m=e.i(817436),g=e.i(193695);e.i(535244);var E=e.i(679192),f=e.i(616766),I=e.i(803134);async function N(e){let t=(e,t=4e3)=>Promise.race([e,new Promise(e=>setTimeout(()=>e(null),t))]);try{let a=await t(I.db.user.findUnique({where:{id:e},select:{name:!0,phone:!0,email:!0}})),n=await t(I.db.loanApplication.findMany({where:{customerId:e,status:{in:["DISBURSED","ACTIVE","ACTIVE_INTEREST_ONLY"]}},include:{emiSchedules:{orderBy:{installmentNumber:"asc"}},payments:{orderBy:{createdAt:"desc"},take:5},company:{select:{name:!0}}},take:5}))??[],o=await t(I.db.loanApplication.findMany({where:{customerId:e},select:{id:!0,applicationNo:!0,status:!0,loanAmount:!0,disbursedAt:!0,loanType:!0},orderBy:{createdAt:"desc"},take:10}))??[],s=n.map(e=>{let t=e.emiSchedules||[],a=t.filter(e=>"PENDING"===e.paymentStatus),n=t.filter(e=>"OVERDUE"===e.paymentStatus),o=t.filter(e=>["PAID","INTEREST_ONLY_PAID"].includes(e.paymentStatus)),s=[...a].sort((e,t)=>new Date(e.dueDate).getTime()-new Date(t.dueDate).getTime())[0],r=n.reduce((e,t)=>e+Number(t.totalAmount||0),0),i=o.reduce((e,t)=>e+Number(t.paidAmount||0),0),l=t.find(e=>"PAID"!==e.paymentStatus)?.outstandingPrincipal||0,u=s?Math.ceil((new Date(s.dueDate).getTime()-Date.now())/864e5):null;return{applicationNo:e.applicationNo,loanAmount:Number(e.loanAmount),company:e.company?.name||"MoneyMitra",status:e.status,loanType:e.loanType||"PERSONAL",totalEMIs:t.length,paidEMIs:o.length,pendingEMIs:a.length,overdueEMIs:n.length,overdueAmount:r,paidAmount:i,outstandingPrincipal:Number(l),daysUntilNextEmi:u,nextEmi:s?{installmentNumber:s.installmentNumber,dueDate:new Date(s.dueDate).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}),amount:Number(s.totalAmount),status:s.paymentStatus}:null,recentPayments:(e.payments||[]).map(e=>({amount:Number(e.amount),date:new Date(e.createdAt).toLocaleDateString("en-IN"),mode:e.paymentMode}))}});return{customerName:a?.name||"",customerPhone:a?.phone||"",loanContexts:s,allLoans:o}}catch{return{customerName:"",customerPhone:"",loanContexts:[],allLoans:[]}}}async function v(e){try{let{customerId:t,sessionId:a,message:n,customerName:o}=await e.json();if(!t||!a||!n)return f.NextResponse.json({error:"Missing required fields"},{status:400});let s=await N(t),r=o||s.customerName||"",{response:i,intent:l,suggestions:u}=function(e,t,a){let n=e.toLowerCase().trim(),o=a.loanContexts,s=t.split(" ")[0]||"there",r=e=>`₹${e.toLocaleString("en-IN")}`,i=function(e){let t=[];if(!e||0===e.length)return t.push("📝 How do I apply for a loan?"),t.push("💼 What loan products are available?"),t.push("📋 What documents do I need?"),t;let a=e.some(e=>e.overdueEMIs>0),n=e.some(e=>null!==e.daysUntilNextEmi&&e.daysUntilNextEmi>=0&&e.daysUntilNextEmi<=7),o=e.some(e=>e.paidEMIs>0&&e.pendingEMIs<=3);return a&&t.push("⚠️ How to clear my overdue EMIs?"),n&&t.push("📅 When is my next EMI due?"),o&&t.push("🏁 How to close my loan early?"),t.push("💰 What is my outstanding balance?"),t.push("📄 Show my payment history"),e.every(e=>0===e.overdueEMIs)&&t.push("📈 Can I get a top-up or new loan?"),t.slice(0,4)}(o);if(/^(hi|hello|hey|namaste|hii|helo|good morning|good evening|good afternoon|hy)\b/.test(n)){let e=o.some(e=>e.overdueEMIs>0),t=o.find(e=>null!==e.daysUntilNextEmi&&e.daysUntilNextEmi>=0),a=`Hello ${s}! 😊 Welcome to MoneyMitra — I'm **Mitra**, your personal loan assistant.

`;return e?a+=`⚠️ **Heads up!** You have overdue EMIs that need attention. Let's sort that out quickly.

`:t&&null!==t.daysUntilNextEmi&&t.daysUntilNextEmi<=5?a+=`📅 **Reminder:** Your next EMI of ${r(t.nextEmi?.amount||0)} is due in **${t.daysUntilNextEmi} day(s)**.

`:o.length>0&&(a+=`✅ You have **${o.length} active loan(s)** and everything looks good!

`),{response:a+=`How can I help you today? Here are some things I can do:
• Check your EMI status & dues
• Show outstanding balance
• Guide you on payments
• Suggest loans you qualify for
• Help with foreclosure & top-ups

Just ask me anything! 🙏`,intent:"GREETING",suggestions:i}}if(/emi|due|next pay|installment|kab hai|payment date|kab bharna|kitni emi/.test(n)){if(0===o.length)return{response:`You don't have any active loans right now, ${s}! 😊

If you'd like to apply for a loan, I can guide you through the process. Want to know what you might be eligible for?`,intent:"EMI_STATUS",suggestions:i};let e=`📅 **Your EMI Status, ${s}:**

`;return o.forEach((t,a)=>{if(e+=`**Loan ${a+1} — ${t.applicationNo}** (${t.company})
• Loan Amount: ${r(t.loanAmount)}
• Progress: ${t.paidEMIs} of ${t.totalEMIs} EMIs paid (${Math.round(t.paidEMIs/t.totalEMIs*100)}% complete)
`,t.nextEmi){let a="OVERDUE"===t.nextEmi.status,n=null!==t.daysUntilNextEmi?t.daysUntilNextEmi<0?`**${Math.abs(t.daysUntilNextEmi)} days overdue**`:`in ${t.daysUntilNextEmi} day(s)`:"";e+=`• ${a?"🔴 OVERDUE":"📅 Next EMI"}: ${r(t.nextEmi.amount)} on **${t.nextEmi.dueDate}** ${n}
`}else t.paidEMIs===t.totalEMIs&&(e+=`• ✅ All EMIs completed — Loan fully paid off!
`);t.overdueEMIs>0&&(e+=`• ⚠️ ${t.overdueEMIs} overdue EMI(s) — Total: ${r(t.overdueAmount)}
  → Please clear ASAP to avoid penalty charges.
`),e+="\n"}),{response:e+=`💡 **Tip:** Pay a few days early to avoid last-minute issues and keep your credit record clean!`,intent:"EMI_STATUS",suggestions:i}}if(/balance|outstanding|remaining|kitna bacha|how much left|total due|baki/.test(n)){if(0===o.length)return{response:`You have no active loans right now, ${s}. Your slate is clean! 😊

Want to explore new loan options?`,intent:"LOAN_BALANCE",suggestions:i};let e=`💰 **Your Outstanding Balance, ${s}:**

`,t=0;return o.forEach((a,n)=>{e+=`**${n+1}. ${a.applicationNo}**
• Outstanding Principal: **${r(a.outstandingPrincipal)}**
• Total Paid So Far: ${r(a.paidAmount)}
• Remaining EMIs: ${a.pendingEMIs}

`,t+=a.outstandingPrincipal}),o.length>1&&(e+=`**📊 Grand Total Outstanding: ${r(t)}**

`),{response:e+=`💡 **Hint:** You can save on interest by paying extra towards principal. Ask me about "loan foreclosure" to see how much you'd save!`,intent:"LOAN_BALANCE",suggestions:i}}if(/overdue|penalty|late|fine|default|penal|charge/.test(n)){let e=o.filter(e=>e.overdueEMIs>0);if(0===e.length)return{response:`✅ Great news, ${s}! You have **no overdue EMIs** at all.

You're a responsible borrower — this reflects positively on your credit profile. Keep it up! 🌟

💡 **Hint:** Good repayment history makes you eligible for **higher loan amounts** and **lower interest rates** in the future!`,intent:"PENALTY_INFO",suggestions:i};let t=`⚠️ **Overdue Alert for ${s}:**

`;return e.forEach(e=>{t+=`📌 **${e.applicationNo}**
• Overdue EMIs: ${e.overdueEMIs}
• Overdue Amount: **${r(e.overdueAmount)}**

`}),{response:t+=`⚡ **What to do now:**
1. Contact your cashier or branch immediately
2. Make the payment in cash, UPI, or bank transfer
3. Penalties increase every day — act today!

📞 Ask me to "raise a support ticket" if you need help.`,intent:"PENALTY_INFO",suggestions:i}}if(/payment history|paid|receipt|transaction|history|purana payment/.test(n)){if(0===o.length)return{response:`No payment history yet, ${s}. You don't have any active loans.

Would you like to apply for one? I can tell you what you might qualify for! 😊`,intent:"PAYMENT_HISTORY",suggestions:i};let e=`📄 **Recent Payments, ${s}:**

`,t=!1;return o.forEach(a=>{a.recentPayments.length>0&&(t=!0,e+=`**${a.applicationNo}** (${a.paidEMIs}/${a.totalEMIs} EMIs done):
`,a.recentPayments.forEach(t=>{e+=`  ✅ ${r(t.amount)} — ${t.date} via ${t.mode}
`}),e+="\n")}),t||(e+=`No recent payments recorded yet.
`),e+=`📊 **Summary:**
`,o.forEach(t=>{e+=`• ${t.applicationNo}: ${r(t.paidAmount)} paid (${t.paidEMIs} EMIs)
`}),{response:e,intent:"PAYMENT_HISTORY",suggestions:i}}if(/loan status|my loan|application|loan detail|sanction|approved|rejected/.test(n)){if(0===a.allLoans.length)return{response:`You don't have any loan applications yet, ${s}.

🚀 Ready to apply? I can guide you through the entire process — documents needed, eligibility, and more. Just ask!`,intent:"LOAN_STATUS",suggestions:i};let e={DISBURSED:"✅",ACTIVE:"🟢",CLOSED:"🏁",OVERDUE:"🔴",PENDING:"⏳",SUBMITTED:"📤",APPROVED:"👍",REJECTED_BY_SA:"❌",FINAL_APPROVED:"✅",CUSTOMER_SESSION_APPROVED:"🔄"},t=`📋 **Your Loan Applications, ${s}:**

`;return a.allLoans.forEach(a=>{t+=`${e[a.status]||"📄"} **${a.applicationNo}** — ${r(Number(a.loanAmount))} — **${a.status.replace(/_/g," ")}**
`}),{response:t+=`
💡 **Hint:** Ask me about any specific loan for detailed EMI schedule, payment options, or foreclosure quote!`,intent:"LOAN_STATUS",suggestions:i}}if(/foreclose|close loan|prepay|full payment|close my loan|banda karna/.test(n)){if(0===o.length)return{response:`You don't have any active loans to foreclose right now, ${s}. 😊

Want to apply for a new loan instead?`,intent:"FORECLOSURE",suggestions:i};let e=`🏁 **Loan Foreclosure Guide, ${s}:**

Closing your loan early saves you interest! Here's what you owe:

`;return o.forEach(t=>{let a=Math.round(t.pendingEMIs*(t.nextEmi?.amount||0)-t.outstandingPrincipal);e+=`**${t.applicationNo}**
• Outstanding: **${r(t.outstandingPrincipal)}**
• Remaining EMIs: ${t.pendingEMIs}
`,a>0&&(e+=`• 💡 You'd save approx. **${r(a)}** in interest by closing now!
`),e+="\n"}),{response:e+=`**Steps to foreclose:**
1. Visit your branch or contact your cashier
2. Ask for the foreclosure statement
3. Pay the outstanding principal
4. Get your **No Dues Certificate** 🎉

⚠️ Some loans may have a foreclosure fee — ask your cashier.`,intent:"FORECLOSURE",suggestions:i}}if(/apply|new loan|loan lena|suggest|eligib|qualify|top.?up|top up|loan chahiye|loan milega/.test(n)){let e=o.length>0&&o.every(e=>0===e.overdueEMIs),t=`📝 **Loan Options for You, ${s}:**

`;if(e&&(t+=`🌟 Based on your **excellent repayment record**, you're likely eligible for **preferential rates!**

`),t+=`💼 **Personal Loan** — ₹50K to ₹10L | 14–24% p.a. | 6–60 months
   Best for: medical emergencies, travel, education, weddings

🏢 **Business Loan** — ₹1L to ₹50L | 12–20% p.a. | 12–84 months
   Best for: working capital, expansion, equipment

🥇 **Gold Loan** — Up to 75% of gold value | 8–16% p.a. | Instant!
   Best for: quick cash needs with gold as collateral

🚗 **Vehicle Loan** — ₹50K to ₹20L | 10–18% p.a. | 12–60 months

`,o.length>0){let e=o[0];e.paidEMIs>=Math.floor(e.totalEMIs/2)&&(t+=`✨ **Top-Up Loan:** Since you've paid over 50% of your loan, you may qualify for a **top-up on ${e.applicationNo}**! Ask your agent.

`)}return{response:t+=`**Documents Needed:**
• PAN + Aadhaar
• Income proof (salary slip / ITR)
• 6-month bank statement
• Address proof

**How to Apply:** Contact your MoneyMitra agent or visit the branch. Approval in 24–48 hours! 🚀`,intent:"LOAN_SUGGESTION",suggestions:i}}if(/how to pay|payment mode|pay online|pay emi|kaise pay|payment karna|upi|online pay/.test(n))return{response:`💳 **How to Pay Your EMI, ${s}:**

**Through the App/Dashboard:**
1. Go to "My Loans"
2. Select your loan → "Pay EMI"
3. Choose payment mode → Done! ✅

**Payment Modes Accepted:**
• 💵 Cash (at branch)
• 📱 UPI — Google Pay, PhonePe, Paytm
• 🏦 Net Banking / NEFT / RTGS
• 💳 Debit/Credit Card
• 📝 Cheque

**At Branch:**
Walk in with cash or cheque — your cashier will record it instantly.

💡 **Tip:** Always save your payment receipt for reference!`,intent:"PAYMENT_HELP",suggestions:i};if(/interest|rate|byaj|percent|sood|emi amount|how much emi/.test(n)){let e=o.length>0&&o.every(e=>0===e.overdueEMIs),t=`📊 **Interest Rates at MoneyMitra, ${s}:**

`;return t+=`| Loan Type | Rate (p.a.) |
|-----------|-------------|
| Personal Loan | 14% – 24% |
| Business Loan | 12% – 20% |
| Gold Loan | 8% – 16% |
| Vehicle Loan | 10% – 18% |

**Your rate depends on:** credit history, loan amount, tenure & income.

`,e&&(t+=`🌟 **Great news!** Your clean repayment record puts you in line for **lower rates** on your next loan!

`),{response:t+=`💡 Use our EMI calculator to estimate your monthly payment before applying.`,intent:"INTEREST_RATES",suggestions:i}}if(/support|help|contact|human|agent|problem|complaint|issue|manager|escalate/.test(n))return{response:`📞 **I'm here, ${s}! Let me connect you:**

🎫 **Raise a Support Ticket:**
Dashboard → Support → New Ticket
Our team responds within 2–4 hours.

📱 **Talk to your Agent:**
Contact your assigned MoneyMitra agent directly.

🏢 **Branch Visit:**
Visit during business hours: **9 AM – 6 PM, Mon–Sat**

💬 **I'm available 24/7** for instant answers!

What's the issue? Tell me and I'll either solve it or get the right person involved. 🙏`,intent:"SUPPORT",suggestions:i};if(/thank|thanks|shukriya|dhanyavad|great|helpful|good|nice|perfect|bahut acha/.test(n))return{response:`You're very welcome, ${s}! 😊🙏

It's my pleasure to assist you. I'm here anytime you need — whether it's checking your EMI, understanding your loan, or just a question.

Have a wonderful day! Take care. 🌟`,intent:"THANKS",suggestions:i};let l=o.length>0,u=`I'm Mitra, your MoneyMitra assistant! 😊 Let me help you with that.

`;if(l){let e=o.find(e=>null!==e.daysUntilNextEmi&&e.daysUntilNextEmi>=0&&e.daysUntilNextEmi<=5),t=o.find(e=>e.overdueEMIs>0);t?u+=`⚠️ **Quick Note:** You have overdue EMIs on ${t.applicationNo} — clear them soon to avoid penalties!

`:e&&(u+=`📅 **Reminder:** EMI of ${r(e.nextEmi?.amount||0)} due in ${e.daysUntilNextEmi} day(s).

`)}return{response:u+=`Here's what I can help with:
📅 EMI status & due dates
💰 Outstanding balance
📄 Payment history
📝 New loan eligibility
🏁 Loan foreclosure
💳 Payment methods
📞 Support & escalation

Try asking: *"When is my next EMI?"* or *"What is my balance?"* 😊`,intent:"GENERAL",suggestions:i}}(n,r,s);return setImmediate(()=>{I.db.aIChatHistory.create({data:{customerId:t,sessionId:a,userMessage:n,aiResponse:i,intent:l}}).catch(()=>{})}),f.NextResponse.json({success:!0,response:i,intent:l,suggestions:u})}catch(e){return f.NextResponse.json({success:!0,response:"Hello! I'm Mitra, your MoneyMitra assistant. I can help with your EMI status, loan balance, payment history, and more. What would you like to know? 😊",intent:"GREETING",suggestions:["📅 EMI Due Dates","💰 Outstanding Balance","📄 Payment History","📞 Contact Support"]})}}async function M(e){try{let{searchParams:t}=new URL(e.url),a=t.get("customerId"),n=t.get("sessionId");if(!a)return f.NextResponse.json({error:"customerId is required"},{status:400});try{let e=await I.db.aIChatHistory.findMany({where:{customerId:a,...n?{sessionId:n}:{}},orderBy:{createdAt:"asc"},take:n?void 0:50});return f.NextResponse.json({success:!0,history:e})}catch{return f.NextResponse.json({success:!0,history:[]})}}catch(e){return f.NextResponse.json({error:"Failed to fetch chat history"},{status:500})}}e.s(["GET",()=>M,"POST",()=>v],125731);var w=e.i(125731);let A=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/ai/chat/route",pathname:"/api/ai/chat",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/Desktop/reallll/src/app/api/ai/chat/route.ts",nextConfigOutput:"",userland:w}),{workAsyncStorage:R,workUnitAsyncStorage:T,serverHooks:P}=A;function b(){return(0,n.patchFetch)({workAsyncStorage:R,workUnitAsyncStorage:T})}async function S(e,t,n){A.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let f="/api/ai/chat/route";f=f.replace(/\/index$/,"")||"/";let I=await A.prepare(e,t,{srcPage:f,multiZoneDraftMode:!1});if(!I)return t.statusCode=400,t.end("Bad Request"),null==n.waitUntil||n.waitUntil.call(n,Promise.resolve()),null;let{buildId:N,params:v,nextConfig:M,parsedUrl:w,isDraftMode:R,prerenderManifest:T,routerServerContext:P,isOnDemandRevalidate:b,revalidateOnlyGenerated:S,resolvedPathname:$,clientReferenceManifest:x,serverActionsManifest:k}=I,C=(0,i.normalizeAppPath)(f),O=!!(T.dynamicRoutes[C]||T.routes[$]),L=async()=>((null==P?void 0:P.render404)?await P.render404(e,t,w,!1):t.end("This page could not be found"),null);if(O&&!R){let e=!!T.routes[$],t=T.dynamicRoutes[C];if(t&&!1===t.fallback&&!e){if(M.experimental.adapterPath)return await L();throw new g.NoFallbackError}}let D=null;!O||A.isDev||R||(D="/index"===(D=$)?"/":D);let U=!0===A.isDev||!O,_=O&&!U;k&&x&&(0,r.setManifestsSingleton)({page:f,clientReferenceManifest:x,serverActionsManifest:k});let H=e.method||"GET",Y=(0,s.getTracer)(),q=Y.getActiveScopeSpan(),B={params:v,prerenderManifest:T,renderOpts:{experimental:{authInterrupts:!!M.experimental.authInterrupts},cacheComponents:!!M.cacheComponents,supportsDynamicResponse:U,incrementalCache:(0,o.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:M.cacheLife,waitUntil:n.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,n,o)=>A.onRequestError(e,t,n,o,P)},sharedContext:{buildId:N}},G=new l.NodeNextRequest(e),j=new l.NodeNextResponse(t),V=u.NextRequestAdapter.fromNodeNextRequest(G,(0,u.signalFromNodeResponse)(t));try{let r=async e=>A.handle(V,B).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=Y.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=a.get("next.route");if(n){let t=`${H} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t)}else e.updateName(`${H} ${f}`)}),i=!!(0,o.getRequestMeta)(e,"minimalMode"),l=async o=>{var s,l;let u=async({previousCacheEntry:a})=>{try{if(!i&&b&&S&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=await r(o);e.fetchMetrics=B.renderOpts.fetchMetrics;let l=B.renderOpts.pendingWaitUntil;l&&n.waitUntil&&(n.waitUntil(l),l=void 0);let u=B.renderOpts.collectedTags;if(!O)return await (0,c.sendResponse)(G,j,s,B.renderOpts.pendingWaitUntil),null;{let e=await s.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(s.headers);u&&(t[m.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==B.renderOpts.collectedRevalidate&&!(B.renderOpts.collectedRevalidate>=m.INFINITE_CACHE)&&B.renderOpts.collectedRevalidate,n=void 0===B.renderOpts.collectedExpire||B.renderOpts.collectedExpire>=m.INFINITE_CACHE?void 0:B.renderOpts.collectedExpire;return{value:{kind:E.CachedRouteKind.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:n}}}}catch(t){throw(null==a?void 0:a.isStale)&&await A.onRequestError(e,t,{routerKind:"App Router",routePath:f,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:_,isOnDemandRevalidate:b})},!1,P),t}},d=await A.handleResponse({req:e,nextConfig:M,cacheKey:D,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:T,isRoutePPREnabled:!1,isOnDemandRevalidate:b,revalidateOnlyGenerated:S,responseGenerator:u,waitUntil:n.waitUntil,isMinimalMode:i});if(!O)return null;if((null==d||null==(s=d.value)?void 0:s.kind)!==E.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(l=d.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});i||t.setHeader("x-nextjs-cache",b?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),R&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let g=(0,h.fromNodeOutgoingHttpHeaders)(d.value.headers);return i&&O||g.delete(m.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||g.get("Cache-Control")||g.set("Cache-Control",(0,y.getCacheControlHeader)(d.cacheControl)),await (0,c.sendResponse)(G,j,new Response(d.value.body,{headers:g,status:d.value.status||200})),null};q?await l(q):await Y.withPropagatedContext(e.headers,()=>Y.trace(d.BaseServerSpan.handleRequest,{spanName:`${H} ${f}`,kind:s.SpanKind.SERVER,attributes:{"http.method":H,"http.target":e.url}},l))}catch(t){if(t instanceof g.NoFallbackError||await A.onRequestError(e,t,{routerKind:"App Router",routePath:C,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:_,isOnDemandRevalidate:b})},!1,P),O)throw t;return await (0,c.sendResponse)(G,j,new Response(null,{status:500})),null}}e.s(["handler",()=>S,"patchFetch",()=>b,"routeModule",()=>A,"serverHooks",()=>P,"workAsyncStorage",()=>R,"workUnitAsyncStorage",()=>T],856038)}];

//# sourceMappingURL=d0a8e_next_dist_esm_build_templates_app-route_7f1eaaee.js.map