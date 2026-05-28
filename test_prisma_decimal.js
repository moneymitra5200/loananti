
const { Prisma } = require('@prisma/client');
const Decimal = Prisma.Decimal;

const totalAmount = new Decimal(200);
const principalComponent = 0;
const interestComponent = totalAmount; // Decimal
const penalty = 0;

// creditBase = 0 + Decimal(200) + 0
const creditBase = principalComponent + interestComponent + penalty;
console.log("creditBase:", creditBase, typeof creditBase);

const rounding = Math.round((totalAmount - creditBase) * 100) / 100;
console.log("rounding:", rounding, typeof rounding);

const adjustedInterest = Math.max(0, interestComponent + rounding);
console.log("adjustedInterest:", adjustedInterest, typeof adjustedInterest);
