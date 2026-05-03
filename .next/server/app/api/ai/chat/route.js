(()=>{var a={};a.id=1337,a.ids=[1337],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},20903:(a,b,c)=>{"use strict";c.d(b,{db:()=>f,x:()=>g});var d=c(96330);let e=globalThis,f=e.prisma??new d.PrismaClient({log:[{level:"error",emit:"stdout"}],datasources:{db:{url:(()=>{let a=process.env.DB_HOST,b=process.env.DB_USER,c=process.env.DB_PASS,d=process.env.DB_NAME,e=process.env.DB_PORT||"3306";if(a&&b&&c&&d){let f=encodeURIComponent(c);return`mysql://${b}:${f}@${a}:${e}/${d}?connection_limit=1&connect_timeout=30&pool_timeout=30`}let f=process.env.DATABASE_URL||"";if(f.includes("connection_limit"))return f;let g=f.includes("?")?"&":"?";return`${f}${g}connection_limit=1&connect_timeout=10&pool_timeout=10`})()}}});async function g(a,b=3,c=800){for(let d=1;d<=b;d++)try{return await a()}catch(e){let a=e?.message||"";if(e?.name==="PrismaClientRustPanicError"||a.includes("PANIC")||a.includes("timer has gone away"))throw e;if((e?.code==="P1001"||e?.code==="P1017"||e?.code==="P2024"||a.includes("Can't reach database")||a.includes("Too many connections")||a.includes("max_connections_per_hour")||a.includes("ECONNRESET")||a.includes("ETIMEDOUT")||a.includes("ECONNREFUSED")||a.includes("connection")||a.includes("socket"))&&d<b){let a=c*d;console.warn(`[DB Retry] Attempt ${d}/${b} failed (${e?.code||"connection"}). Retrying in ${a}ms...`),await new Promise(b=>setTimeout(b,a));continue}throw e}throw Error("dbWithRetry: max retries exceeded")}e.prisma=f,process.on("beforeExit",async()=>{await f.$disconnect()})},24095:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>F,patchFetch:()=>E,routeModule:()=>A,serverHooks:()=>D,workAsyncStorage:()=>B,workUnitAsyncStorage:()=>C});var d={};c.r(d),c.d(d,{GET:()=>z,POST:()=>y});var e=c(19225),f=c(84006),g=c(8317),h=c(99373),i=c(34775),j=c(24235),k=c(261),l=c(54365),m=c(90771),n=c(73461),o=c(67798),p=c(92280),q=c(62018),r=c(45696),s=c(47929),t=c(86439),u=c(37527),v=c(45592),w=c(20903);async function x(a){try{let b=await w.db.loanApplication.findMany({where:{customerId:a,status:{in:["DISBURSED","ACTIVE","ACTIVE_INTEREST_ONLY"]}},include:{emiSchedules:{orderBy:{installmentNumber:"asc"}},payments:{orderBy:{createdAt:"desc"},take:5},company:{select:{name:!0}}},take:5}),c=await w.db.loanApplication.findMany({where:{customerId:a},select:{id:!0,applicationNo:!0,status:!0,loanAmount:!0,disbursedAt:!0},orderBy:{createdAt:"desc"},take:10}),d=await w.db.user.findUnique({where:{id:a},select:{name:!0,phone:!0,email:!0}}),e=b.map(a=>{let b=a.emiSchedules||[],c=b.filter(a=>"PENDING"===a.paymentStatus),d=b.filter(a=>"OVERDUE"===a.paymentStatus),e=b.filter(a=>"PAID"===a.paymentStatus||"INTEREST_ONLY_PAID"===a.paymentStatus),f=c.sort((a,b)=>new Date(a.dueDate).getTime()-new Date(b.dueDate).getTime())[0],g=d.reduce((a,b)=>a+Number(b.totalAmount||0),0),h=e.reduce((a,b)=>a+Number(b.paidAmount||0),0),i=b.find(a=>"PAID"!==a.paymentStatus)?.outstandingPrincipal||0;return{applicationNo:a.applicationNo,loanAmount:Number(a.loanAmount),company:a.company?.name||"MoneyMitra",status:a.status,totalEMIs:b.length,paidEMIs:e.length,pendingEMIs:c.length,overdueEMIs:d.length,overdueAmount:g,paidAmount:h,outstandingPrincipal:Number(i),nextEmi:f?{installmentNumber:f.installmentNumber,dueDate:new Date(f.dueDate).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}),amount:Number(f.totalAmount),status:f.paymentStatus}:null,recentPayments:(a.payments||[]).map(a=>({amount:Number(a.amount),date:new Date(a.createdAt).toLocaleDateString("en-IN"),mode:a.paymentMode}))}});return{customerName:d?.name||"",loanContexts:e,allLoans:c}}catch(a){return console.error("[AI Chat] Failed to fetch customer context:",a),{customer:null,loanContexts:[],allLoans:[]}}}async function y(a){try{let b,{customerId:c,sessionId:d,message:e,customerName:f}=await a.json();if(!c||!d||!e)return v.NextResponse.json({error:"Missing required fields"},{status:400});let g=await x(c),h=f||g.customerName||"",{response:i,intent:j}=function(a,b,c){let d=a.toLowerCase(),e=c.loanContexts,f=b||"there";if(/^(hi|hello|hey|namaste|hii|helo)\b/.test(d)){let a=e.length>0,b=e.some(a=>a.overdueEMIs>0),c=`👋 Hello ${f}! I'm **MitraBot**, your personal AI Loan Assistant.

`;return a?(b&&(c+=`⚠️ You have **overdue EMIs** on your loan. Please check the details below.

`),c+=`You have **${e.length} active loan(s)**. I can help you with:
`):c+=`I can help you with:
`,{response:c+=`📅 EMI due dates & payment status
💰 Outstanding balance & penalties
🏦 Loan details & history
📝 New loan eligibility & suggestions
📞 Support & escalation

What would you like to know? 😊`,intent:"GREETING"}}if(d.includes("emi")||d.includes("due")||d.includes("next payment")||d.includes("installment")){if(0===e.length)return{response:`📅 You don't have any active loans with pending EMIs right now.

If you'd like to apply for a new loan, I can guide you! Just ask "How do I apply for a loan?" 😊`,intent:"EMI_STATUS"};let a=`📅 **Your EMI Status:**

`;return e.forEach((b,c)=>{if(a+=`**Loan ${c+1}: ${b.applicationNo}** (${b.company})
• Loan Amount: ₹${b.loanAmount.toLocaleString("en-IN")}
• Progress: ${b.paidEMIs}/${b.totalEMIs} EMIs paid
`,b.nextEmi){let c="OVERDUE"===b.nextEmi.status;a+=`• ${c?"⚠️ **OVERDUE**":"\uD83D\uDCC5 Next EMI"}: ₹${b.nextEmi.amount.toLocaleString("en-IN")} due on **${b.nextEmi.dueDate}**
`}else b.paidEMIs===b.totalEMIs&&(a+=`• ✅ All EMIs paid — Loan closed!
`);b.overdueEMIs>0&&(a+=`• ⚠️ ${b.overdueEMIs} overdue EMI(s) — Total overdue: ₹${b.overdueAmount.toLocaleString("en-IN")}
`),a+="\n"}),{response:a+=`💡 Please pay on time to avoid late fees. Contact your branch or cashier to make a payment.`,intent:"EMI_STATUS"}}if(d.includes("balance")||d.includes("outstanding")||d.includes("remaining")||d.includes("kitna bacha")||d.includes("how much left")){if(0===e.length)return{response:`💰 You don't have any active loans right now.

Would you like to apply for a new loan? I can help with that! 😊`,intent:"LOAN_BALANCE"};let a=`💰 **Your Outstanding Balance:**

`,b=0;return e.forEach((c,d)=>{a+=`**${c.applicationNo}** — Outstanding: ₹${c.outstandingPrincipal.toLocaleString("en-IN")}
  • Paid so far: ₹${c.paidAmount.toLocaleString("en-IN")}
  • ${c.pendingEMIs} EMI(s) remaining

`,b+=c.outstandingPrincipal}),e.length>1&&(a+=`**Total Outstanding (all loans): ₹${b.toLocaleString("en-IN")}**

`),{response:a+=`💡 You can close your loan early by paying the outstanding amount. Ask me about "loan foreclosure" for details!`,intent:"LOAN_BALANCE"}}if(d.includes("overdue")||d.includes("penalty")||d.includes("late")||d.includes("fine")||d.includes("default")){let a=e.filter(a=>a.overdueEMIs>0);if(0===a.length)return{response:`✅ Great news, ${f}! You have **no overdue EMIs** on any of your loans.

Keep up the good work! Timely payments help maintain your credit score. 🌟`,intent:"PENALTY_INFO"};let b=`⚠️ **Overdue EMI Alert:**

`;return a.forEach(a=>{b+=`**${a.applicationNo}**
• Overdue EMIs: ${a.overdueEMIs}
• Total Overdue Amount: ₹${a.overdueAmount.toLocaleString("en-IN")}

`}),{response:b+=`**Important:** Late payments attract penalty charges. Please contact your branch or cashier immediately to clear overdue EMIs and avoid further charges.

📞 Need help? Ask me to "connect with support".`,intent:"PENALTY_INFO"}}if(d.includes("payment history")||d.includes("paid")||d.includes("receipt")||d.includes("transaction")){if(0===e.length)return{response:`📄 No payment history found. You don't have any active loans.

Would you like to apply for a loan? 😊`,intent:"PAYMENT_HISTORY"};let a=`📄 **Recent Payment History:**

`;return e.forEach(b=>{b.recentPayments.length>0&&(a+=`**${b.applicationNo}:**
`,b.recentPayments.forEach(b=>{a+=`  • ₹${b.amount.toLocaleString("en-IN")} on ${b.date} via ${b.mode}
`}),a+="\n")}),a+=`📊 **Summary:**
`,e.forEach(b=>{a+=`• ${b.applicationNo}: ${b.paidEMIs}/${b.totalEMIs} EMIs paid (₹${b.paidAmount.toLocaleString("en-IN")} total paid)
`}),{response:a,intent:"PAYMENT_HISTORY"}}if(d.includes("loan status")||d.includes("my loan")||d.includes("loan detail")||d.includes("application")){if(0===c.allLoans.length)return{response:`📋 You don't have any loan applications yet.

Would you like to apply for a loan? Just ask "How do I apply?" and I'll guide you step by step! 🚀`,intent:"LOAN_STATUS"};let a=`📋 **Your Loan Summary:**

`;return c.allLoans.forEach(b=>{a+=`${({DISBURSED:"✅",ACTIVE:"\uD83D\uDFE2",CLOSED:"\uD83C\uDFC1",OVERDUE:"⚠️",PENDING:"⏳",APPROVED:"\uD83D\uDC4D",REJECTED_BY_SA:"❌",FINAL_APPROVED:"✅"})[b.status]||"\uD83D\uDCC4"} **${b.applicationNo}** — ₹${Number(b.loanAmount).toLocaleString("en-IN")} — **${b.status}**
`}),{response:a,intent:"LOAN_STATUS"}}if(d.includes("foreclose")||d.includes("close loan")||d.includes("prepay")||d.includes("full payment")||d.includes("close my loan")){if(0===e.length)return{response:`You don't have any active loans to foreclose.

Would you like to apply for a new loan? 😊`,intent:"FORECLOSURE"};let a=`🏁 **Loan Foreclosure Information:**

You can close your loan early by paying the outstanding balance.

`;return e.forEach(b=>{a+=`**${b.applicationNo}:**
• Outstanding Principal: ₹${b.outstandingPrincipal.toLocaleString("en-IN")}
• Remaining EMIs: ${b.pendingEMIs}

`}),{response:a+=`**How to Foreclose:**
1. Visit your branch or contact your cashier
2. Request foreclosure statement
3. Pay the outstanding amount
4. Receive a No Dues Certificate

💡 Foreclosure saves you on future interest payments!`,intent:"FORECLOSURE"}}if(d.includes("apply")||d.includes("new loan")||d.includes("loan lena")||d.includes("suggest")||d.includes("eligib")||d.includes("qualify")){let a=e.every(a=>0===a.overdueEMIs),b=`📝 **Loan Suggestions for You:**

`;return a&&e.length>0?b+=`✅ Based on your **good repayment history**, you may be eligible for:

`:b+=`Here are the loan products available:

`,{response:b+=`💼 **Personal Loan**
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

Want me to tell you more about any specific loan type?`,intent:"LOAN_SUGGESTION"}}return d.includes("support")||d.includes("help")||d.includes("contact")||d.includes("human")||d.includes("agent")||d.includes("problem")?{response:`📞 **Need Help?**

I can assist with most queries, but if you need to speak with our team:

🎫 **Create a Support Ticket:**
Go to "Support" in your dashboard → "New Ticket"

📱 **Call Us:**
Contact your assigned agent or visit your nearest branch.

💬 **For urgent issues:**
• Visit your branch in person
• Call during business hours (9 AM – 6 PM)

I'm also here 24/7! What else can I help you with? 😊`,intent:"SUPPORT"}:d.includes("how to pay")||d.includes("payment mode")||d.includes("pay online")||d.includes("pay emi")||d.includes("kaise pay")?{response:`💳 **How to Pay Your EMI:**

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

⚡ Payment reflects instantly in your account!`,intent:"PAYMENT_HELP"}:d.includes("interest")||d.includes("rate")||d.includes("byaj")||d.includes("percent")?{response:`📊 **Interest Rates at MoneyMitra:**

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

Want to know your exact rate? Talk to our agent. 😊`,intent:"INTEREST_RATES"}:/thank|thanks|shukriya|dhanyavad|great|helpful/.test(d)?{response:`You're welcome, ${f}! 😊 I'm glad I could help!

Feel free to ask me anything anytime — I'm available 24/7. Have a great day! 🌟`,intent:"THANKS"}:{response:`I understand you're asking about: *"${a}"*

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

Or type your question and I'll do my best to help! 🤖`,intent:"GENERAL"}}(e,h,g);try{b=(await w.db.aIChatHistory.create({data:{customerId:c,sessionId:d,userMessage:e,aiResponse:i,intent:j}})).id}catch(a){console.log("[AI Chat] Could not save history:",a)}return v.NextResponse.json({success:!0,response:i,intent:j,chatId:b})}catch(a){return console.error("[AI Chat] Error:",a),v.NextResponse.json({error:"Failed to process your message. Please try again.",details:a instanceof Error?a.message:"Unknown error"},{status:500})}}async function z(a){try{let{searchParams:b}=new URL(a.url),c=b.get("customerId"),d=b.get("sessionId");if(!c)return v.NextResponse.json({error:"customerId is required"},{status:400});try{let a=await w.db.aIChatHistory.findMany({where:{customerId:c,...d?{sessionId:d}:{}},orderBy:{createdAt:"asc"},take:d?void 0:50});return v.NextResponse.json({success:!0,history:a})}catch{return v.NextResponse.json({success:!0,history:[]})}}catch(a){return console.error("[AI Chat] History fetch error:",a),v.NextResponse.json({error:"Failed to fetch chat history"},{status:500})}}let A=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/ai/chat/route",pathname:"/api/ai/chat",filename:"route",bundlePath:"app/api/ai/chat/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"C:\\Users\\bscom\\Desktop\\reallll\\src\\app\\api\\ai\\chat\\route.ts",nextConfigOutput:"",userland:d}),{workAsyncStorage:B,workUnitAsyncStorage:C,serverHooks:D}=A;function E(){return(0,g.patchFetch)({workAsyncStorage:B,workUnitAsyncStorage:C})}async function F(a,b,c){A.isDev&&(0,h.addRequestMeta)(a,"devRequestTimingInternalsEnd",process.hrtime.bigint());let d="/api/ai/chat/route";"/index"===d&&(d="/");let e=await A.prepare(a,b,{srcPage:d,multiZoneDraftMode:!1});if(!e)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:g,params:v,nextConfig:w,parsedUrl:x,isDraftMode:y,prerenderManifest:z,routerServerContext:B,isOnDemandRevalidate:C,revalidateOnlyGenerated:D,resolvedPathname:E,clientReferenceManifest:F,serverActionsManifest:G}=e,H=(0,k.normalizeAppPath)(d),I=!!(z.dynamicRoutes[H]||z.routes[E]),J=async()=>((null==B?void 0:B.render404)?await B.render404(a,b,x,!1):b.end("This page could not be found"),null);if(I&&!y){let a=!!z.routes[E],b=z.dynamicRoutes[H];if(b&&!1===b.fallback&&!a){if(w.experimental.adapterPath)return await J();throw new t.NoFallbackError}}let K=null;!I||A.isDev||y||(K="/index"===(K=E)?"/":K);let L=!0===A.isDev||!I,M=I&&!L;G&&F&&(0,j.setManifestsSingleton)({page:d,clientReferenceManifest:F,serverActionsManifest:G});let N=a.method||"GET",O=(0,i.getTracer)(),P=O.getActiveScopeSpan(),Q={params:v,prerenderManifest:z,renderOpts:{experimental:{authInterrupts:!!w.experimental.authInterrupts},cacheComponents:!!w.cacheComponents,supportsDynamicResponse:L,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:w.cacheLife,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d,e)=>A.onRequestError(a,b,d,e,B)},sharedContext:{buildId:g}},R=new l.NodeNextRequest(a),S=new l.NodeNextResponse(b),T=m.NextRequestAdapter.fromNodeNextRequest(R,(0,m.signalFromNodeResponse)(b));try{let e=async a=>A.handle(T,Q).finally(()=>{if(!a)return;a.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let c=O.getRootSpanAttributes();if(!c)return;if(c.get("next.span_type")!==n.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${c.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=c.get("next.route");if(e){let b=`${N} ${e}`;a.setAttributes({"next.route":e,"http.route":e,"next.span_name":b}),a.updateName(b)}else a.updateName(`${N} ${d}`)}),g=!!(0,h.getRequestMeta)(a,"minimalMode"),j=async h=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!g&&C&&D&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let d=await e(h);a.fetchMetrics=Q.renderOpts.fetchMetrics;let i=Q.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=Q.renderOpts.collectedTags;if(!I)return await (0,p.I)(R,S,d,Q.renderOpts.pendingWaitUntil),null;{let a=await d.blob(),b=(0,q.toNodeOutgoingHttpHeaders)(d.headers);j&&(b[s.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==Q.renderOpts.collectedRevalidate&&!(Q.renderOpts.collectedRevalidate>=s.INFINITE_CACHE)&&Q.renderOpts.collectedRevalidate,e=void 0===Q.renderOpts.collectedExpire||Q.renderOpts.collectedExpire>=s.INFINITE_CACHE?void 0:Q.renderOpts.collectedExpire;return{value:{kind:u.CachedRouteKind.APP_ROUTE,status:d.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:e}}}}catch(b){throw(null==f?void 0:f.isStale)&&await A.onRequestError(a,b,{routerKind:"App Router",routePath:d,routeType:"route",revalidateReason:(0,o.c)({isStaticGeneration:M,isOnDemandRevalidate:C})},!1,B),b}},l=await A.handleResponse({req:a,nextConfig:w,cacheKey:K,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:z,isRoutePPREnabled:!1,isOnDemandRevalidate:C,revalidateOnlyGenerated:D,responseGenerator:k,waitUntil:c.waitUntil,isMinimalMode:g});if(!I)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==u.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});g||b.setHeader("x-nextjs-cache",C?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),y&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,q.fromNodeOutgoingHttpHeaders)(l.value.headers);return g&&I||m.delete(s.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,r.getCacheControlHeader)(l.cacheControl)),await (0,p.I)(R,S,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};P?await j(P):await O.withPropagatedContext(a.headers,()=>O.trace(n.BaseServerSpan.handleRequest,{spanName:`${N} ${d}`,kind:i.SpanKind.SERVER,attributes:{"http.method":N,"http.target":a.url}},j))}catch(b){if(b instanceof t.NoFallbackError||await A.onRequestError(a,b,{routerKind:"App Router",routePath:H,routeType:"route",revalidateReason:(0,o.c)({isStaticGeneration:M,isOnDemandRevalidate:C})},!1,B),I)throw b;return await (0,p.I)(R,S,new Response(null,{status:500})),null}}},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},44870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},78335:()=>{},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},96330:a=>{"use strict";a.exports=require("@prisma/client")},96487:()=>{}};var b=require("../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[3445,1813],()=>b(b.s=24095));module.exports=c})();