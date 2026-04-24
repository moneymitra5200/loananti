"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const db = new client_1.PrismaClient();
async function run() { const req = await db.paymentRequest.findFirst({ orderBy: { createdAt: "desc" } }); console.log("Length:", req?.proofUrl?.length); console.log("Start:", req?.proofUrl?.substring(0, 100)); }
run().finally(() => db.$disconnect());
