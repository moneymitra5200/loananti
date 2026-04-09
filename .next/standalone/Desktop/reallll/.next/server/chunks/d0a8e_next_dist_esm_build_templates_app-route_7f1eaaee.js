module.exports=[56038,e=>{"use strict";var t=e.i(26534),a=e.i(28149),n=e.i(44392),o=e.i(78023),r=e.i(11707),s=e.i(30741),i=e.i(82258),l=e.i(81393),u=e.i(74764),c=e.i(38949),d=e.i(35500),p=e.i(38508),h=e.i(13713),y=e.i(75771),m=e.i(17436),g=e.i(93695);e.i(35244);var I=e.i(79192),C=e.i(16766),f=e.i(3134);async function E(e){try{let t,a,{customerId:n,sessionId:o,message:r,customerName:s}=await e.json();if(!n||!o||!r)return C.NextResponse.json({error:"Missing required fields"},{status:400});let{response:i,intent:l}=(a=r.toLowerCase()).includes("emi")&&(a.includes("status")||a.includes("check")||a.includes("due"))?{response:`📅 **EMI Status Check**

To check your EMI status, please follow these steps:

1. Go to your **Dashboard** home page
2. Look for the **"Next EMI Due"** card
3. Click on **"My Loans"** tab to see all your active loans
4. Select a loan to view detailed EMI schedule

**What you'll see:**
- Next EMI amount and due date
- Payment status (Pending/Paid/Overdue)
- Complete EMI schedule with all installments

💡 **Tip:** Set up EMI reminders to never miss a payment!

Need help with anything else?`,intent:"EMI_STATUS"}:a.includes("emi")&&(a.includes("pay")||a.includes("payment")||a.includes("make"))?{response:`💳 **How to Pay Your EMI**

You have multiple payment options:

**Online Payment:**
1. Go to **My Loans** → Select your loan
2. Click **"Pay Now"** on the EMI due
3. Choose payment mode (UPI, Net Banking, Card)
4. Complete the payment

**Payment Modes Available:**
- UPI (Google Pay, PhonePe, Paytm)
- Net Banking
- Debit/Credit Card
- Cash (visit our branch)

**Payment will be credited instantly!**

Need help with payment issues?`,intent:"EMI_PAYMENT"}:a.includes("eligib")||a.includes("qualify")||a.includes("can i get")||a.includes("eligible")?{response:`✅ **Loan Eligibility Criteria**

**Basic Requirements:**
- Age: 21-65 years
- Indian resident with valid ID proof
- Regular income source

**Documents Required:**
- PAN Card
- Aadhaar Card
- Income Proof (Salary Slip/ITR)
- Bank Statement (last 6 months)
- Address Proof

**Factors Affecting Eligibility:**
- Credit Score (600+ preferred)
- Monthly Income
- Existing Loans
- Employment Stability

**Loan Amount You May Get:**
- Personal Loan: Up to ₹50 Lakhs
- Gold Loan: Up to 75% of gold value
- Vehicle Loan: Up to 90% of vehicle value
- Business Loan: Up to ₹1 Crore

Want to check your eligibility? Apply now and get instant approval!`,intent:"LOAN_ELIGIBILITY"}:a.includes("interest")||a.includes("rate")?{response:`📊 **Interest Rates**

Here are our competitive interest rates:

| Loan Type | Interest Rate (p.a.) |
|-----------|---------------------|
| Personal Loan | 10% - 24% |
| Gold Loan | 8% - 18% |
| Vehicle Loan | 10% - 20% |
| Business Loan | 12% - 24% |
| Home Loan | 8% - 14% |

**What Determines Your Rate?**
- Credit Score
- Loan Amount
- Tenure
- Income Level
- Relationship with us

💡 **Lower your rate by:**
- Maintaining good credit score
- Choosing shorter tenure
- Applying with co-applicant

Want to know your personalized rate? Apply now!`,intent:"INTEREST_RATES"}:a.includes("apply")||a.includes("application")||a.includes("new loan")?{response:`📝 **How to Apply for a Loan**

**Step-by-Step Process:**

1. **Apply Online**
   - Click "Apply" on your dashboard
   - Select loan type and amount
   - Fill in basic details

2. **Verification**
   - Our agent will contact you
   - Document verification at your doorstep

3. **Approval**
   - Quick approval within 24-48 hours
   - Sanction letter generation

4. **Disbursement**
   - Accept the sanction letter
   - Amount credited to your bank account

**Documents Needed:**
- PAN Card ✓
- Aadhaar Card ✓
- Income Proof ✓
- Photo ✓

**Quick Tips:**
- Keep documents ready
- Provide accurate information
- Be available for verification

Ready to apply? Click the "Apply" button now! 🚀`,intent:"LOAN_APPLICATION"}:a.includes("document")||a.includes("paper")||a.includes("required")?{response:`📄 **Documents Required**

**For Salaried Employees:**
- PAN Card
- Aadhaar Card
- Salary Slips (last 3 months)
- Bank Statement (last 6 months)
- Employment Proof/ID Card
- Address Proof

**For Self-Employed:**
- PAN Card
- Aadhaar Card
- Business Registration
- ITR (last 2 years)
- Bank Statement (last 12 months)
- Business Address Proof

**For Gold Loan:**
- PAN Card
- Aadhaar Card
- Gold Valuation Certificate

**For Vehicle Loan:**
- PAN Card
- Aadhaar Card
- Income Proof
- Vehicle Quotation/Invoice

📸 Documents can be uploaded directly through the app!

Need clarification on any document?`,intent:"DOCUMENTATION"}:a.includes("support")||a.includes("help")||a.includes("contact")?{response:`📞 **Contact Support**

We're here to help you!

**Support Channels:**

🎫 **Support Tickets:**
- Go to "Support" tab in your dashboard
- Create a new ticket
- Get response within 24 hours

📧 **Email:**
- support@loanservice.com

📱 **Customer Care:**
- 1800-XXX-XXXX (Toll Free)
- Available: 9 AM - 8 PM (Mon-Sat)

💬 **Live Chat:**
- Chat with us right here!

**For Urgent Issues:**
- Visit your nearest branch
- Call our toll-free number

How can we assist you today?`,intent:"SUPPORT"}:a.includes("foreclose")||a.includes("close")||a.includes("prepay")?{response:`🏠 **Loan Foreclosure/Prepayment**

**What is Foreclosure?**
Closing your loan before the original tenure by paying the outstanding amount.

**Benefits:**
- Save on future interest
- Become debt-free sooner
- Improve credit score

**How to Apply:**
1. Go to **My Loans** → Select your loan
2. Click on **EMI** tab
3. Click **"Close Loan"** button
4. View foreclosure amount breakdown
5. Make payment

**Foreclosure Calculation:**
- Current month EMI: Principal + Interest
- Future EMIs: Principal only (Interest saved!)

**Example:**
If you have 4 EMIs remaining, you pay:
- This month: Full EMI
- Remaining 3 EMIs: Only principal (no interest!)

💡 **No prepayment charges for loans after 6 months!**

Want to close your loan? Check your dashboard for the exact amount.`,intent:"FORECLOSURE"}:a.includes("balance")||a.includes("outstanding")||a.includes("remaining")?{response:`💰 **Check Your Loan Balance**

**How to View:**

1. Go to **My Loans** tab
2. Select your active loan
3. View **"Outstanding Balance"** section

**You'll See:**
- Total Outstanding Amount
- Principal Remaining
- Interest Paid
- EMIs Remaining
- Next EMI Due Date

**Quick Balance Check:**
Your dashboard shows:
- Active Loan Amount
- Total Paid So Far
- Remaining Balance

💡 **Tip:** Pay extra towards principal to reduce your loan faster!

Need detailed breakdown?`,intent:"LOAN_BALANCE"}:a.includes("hello")||a.includes("hi")||a.includes("hey")?{response:`Hello${s?` ${s}`:""}! 👋

Welcome to our Loan Assistant! I'm here to help you with:

📅 **EMI Status & Payments**
✅ **Loan Eligibility Check**
📊 **Interest Rate Information**
📝 **Loan Applications**
📄 **Document Requirements**
🏠 **Loan Foreclosure**
💰 **Balance Enquiries**

Just type your question, or try these quick options:
- "What are the interest rates?"
- "How do I pay my EMI?"
- "Am I eligible for a loan?"
- "How to close my loan?"

How can I assist you today? 😊`,intent:"GREETING"}:a.includes("thank")||a.includes("thanks")?{response:`You're welcome${s?` ${s}`:""}! 😊

I'm glad I could help! If you have any more questions about:
- EMI payments
- Loan applications
- Interest rates
- Or anything else...

Feel free to ask anytime! 

Have a great day! 🌟`,intent:"THANKS"}:{response:`I understand you're asking about: "${r}"

I can help you with:

📅 **EMI Related**
- Check EMI status
- Make EMI payment
- Change EMI date

💰 **Loan Information**
- Interest rates
- Loan eligibility
- Outstanding balance

📝 **Services**
- Apply for new loan
- Loan foreclosure
- Document requirements

**Try asking:**
- "Check my EMI status"
- "What are the interest rates?"
- "How to apply for a loan?"
- "Documents required"

Or create a support ticket for personalized assistance! 🎫`,intent:"GENERAL"};try{t=(await f.db.aIChatHistory.create({data:{customerId:n,sessionId:o,userMessage:r,aiResponse:i,intent:l}})).id}catch(e){console.log("Could not save chat history:",e)}return C.NextResponse.json({success:!0,response:i,intent:l,chatId:t})}catch(e){return console.error("AI Chat error:",e),C.NextResponse.json({error:"Failed to process your message. Please try again.",details:e instanceof Error?e.message:"Unknown error"},{status:500})}}async function R(e){try{let{searchParams:t}=new URL(e.url),a=t.get("customerId"),n=t.get("sessionId");if(!a)return C.NextResponse.json({error:"customerId is required"},{status:400});if(n)try{let e=await f.db.aIChatHistory.findMany({where:{customerId:a,sessionId:n},orderBy:{createdAt:"asc"}});return C.NextResponse.json({success:!0,history:e})}catch(e){return C.NextResponse.json({success:!0,history:[]})}try{let e=(await f.db.aIChatHistory.findMany({where:{customerId:a},orderBy:{createdAt:"desc"},take:50})).reduce((e,t)=>(e[t.sessionId]||(e[t.sessionId]={sessionId:t.sessionId,createdAt:t.createdAt,messages:[]}),e[t.sessionId].messages.push(t),e),{});return C.NextResponse.json({success:!0,sessions:Object.values(e).sort((e,t)=>new Date(t.createdAt).getTime()-new Date(e.createdAt).getTime())})}catch(e){return C.NextResponse.json({success:!0,sessions:[]})}}catch(e){return console.error("Chat history fetch error:",e),C.NextResponse.json({error:"Failed to fetch chat history"},{status:500})}}e.s(["GET",()=>R,"POST",()=>E],25731);var w=e.i(25731);let A=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/ai/chat/route",pathname:"/api/ai/chat",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/Desktop/reallll/src/app/api/ai/chat/route.ts",nextConfigOutput:"standalone",userland:w}),{workAsyncStorage:v,workUnitAsyncStorage:b,serverHooks:P}=A;function N(){return(0,n.patchFetch)({workAsyncStorage:v,workUnitAsyncStorage:b})}async function S(e,t,n){A.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let C="/api/ai/chat/route";C=C.replace(/\/index$/,"")||"/";let f=await A.prepare(e,t,{srcPage:C,multiZoneDraftMode:!1});if(!f)return t.statusCode=400,t.end("Bad Request"),null==n.waitUntil||n.waitUntil.call(n,Promise.resolve()),null;let{buildId:E,params:R,nextConfig:w,parsedUrl:v,isDraftMode:b,prerenderManifest:P,routerServerContext:N,isOnDemandRevalidate:S,revalidateOnlyGenerated:k,resolvedPathname:M,clientReferenceManifest:T,serverActionsManifest:L}=f,x=(0,i.normalizeAppPath)(C),O=!!(P.dynamicRoutes[x]||P.routes[M]),D=async()=>((null==N?void 0:N.render404)?await N.render404(e,t,v,!1):t.end("This page could not be found"),null);if(O&&!b){let e=!!P.routes[M],t=P.dynamicRoutes[x];if(t&&!1===t.fallback&&!e){if(w.experimental.adapterPath)return await D();throw new g.NoFallbackError}}let H=null;!O||A.isDev||b||(H="/index"===(H=M)?"/":H);let U=!0===A.isDev||!O,q=O&&!U;L&&T&&(0,s.setManifestsSingleton)({page:C,clientReferenceManifest:T,serverActionsManifest:L});let B=e.method||"GET",F=(0,r.getTracer)(),_=F.getActiveScopeSpan(),G={params:R,prerenderManifest:P,renderOpts:{experimental:{authInterrupts:!!w.experimental.authInterrupts},cacheComponents:!!w.cacheComponents,supportsDynamicResponse:U,incrementalCache:(0,o.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:w.cacheLife,waitUntil:n.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,n,o)=>A.onRequestError(e,t,n,o,N)},sharedContext:{buildId:E}},j=new l.NodeNextRequest(e),$=new l.NodeNextResponse(t),V=u.NextRequestAdapter.fromNodeNextRequest(j,(0,u.signalFromNodeResponse)(t));try{let s=async e=>A.handle(V,G).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=F.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=a.get("next.route");if(n){let t=`${B} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t)}else e.updateName(`${B} ${C}`)}),i=!!(0,o.getRequestMeta)(e,"minimalMode"),l=async o=>{var r,l;let u=async({previousCacheEntry:a})=>{try{if(!i&&S&&k&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let r=await s(o);e.fetchMetrics=G.renderOpts.fetchMetrics;let l=G.renderOpts.pendingWaitUntil;l&&n.waitUntil&&(n.waitUntil(l),l=void 0);let u=G.renderOpts.collectedTags;if(!O)return await (0,p.sendResponse)(j,$,r,G.renderOpts.pendingWaitUntil),null;{let e=await r.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(r.headers);u&&(t[m.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==G.renderOpts.collectedRevalidate&&!(G.renderOpts.collectedRevalidate>=m.INFINITE_CACHE)&&G.renderOpts.collectedRevalidate,n=void 0===G.renderOpts.collectedExpire||G.renderOpts.collectedExpire>=m.INFINITE_CACHE?void 0:G.renderOpts.collectedExpire;return{value:{kind:I.CachedRouteKind.APP_ROUTE,status:r.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:n}}}}catch(t){throw(null==a?void 0:a.isStale)&&await A.onRequestError(e,t,{routerKind:"App Router",routePath:C,routeType:"route",revalidateReason:(0,d.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:S})},!1,N),t}},c=await A.handleResponse({req:e,nextConfig:w,cacheKey:H,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:P,isRoutePPREnabled:!1,isOnDemandRevalidate:S,revalidateOnlyGenerated:k,responseGenerator:u,waitUntil:n.waitUntil,isMinimalMode:i});if(!O)return null;if((null==c||null==(r=c.value)?void 0:r.kind)!==I.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==c||null==(l=c.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});i||t.setHeader("x-nextjs-cache",S?"REVALIDATED":c.isMiss?"MISS":c.isStale?"STALE":"HIT"),b&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let g=(0,h.fromNodeOutgoingHttpHeaders)(c.value.headers);return i&&O||g.delete(m.NEXT_CACHE_TAGS_HEADER),!c.cacheControl||t.getHeader("Cache-Control")||g.get("Cache-Control")||g.set("Cache-Control",(0,y.getCacheControlHeader)(c.cacheControl)),await (0,p.sendResponse)(j,$,new Response(c.value.body,{headers:g,status:c.value.status||200})),null};_?await l(_):await F.withPropagatedContext(e.headers,()=>F.trace(c.BaseServerSpan.handleRequest,{spanName:`${B} ${C}`,kind:r.SpanKind.SERVER,attributes:{"http.method":B,"http.target":e.url}},l))}catch(t){if(t instanceof g.NoFallbackError||await A.onRequestError(e,t,{routerKind:"App Router",routePath:x,routeType:"route",revalidateReason:(0,d.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:S})},!1,N),O)throw t;return await (0,p.sendResponse)(j,$,new Response(null,{status:500})),null}}e.s(["handler",()=>S,"patchFetch",()=>N,"routeModule",()=>A,"serverHooks",()=>P,"workAsyncStorage",()=>v,"workUnitAsyncStorage",()=>b],56038)}];

//# sourceMappingURL=d0a8e_next_dist_esm_build_templates_app-route_7f1eaaee.js.map