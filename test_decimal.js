
const Decimal = require('decimal.js');

const totalAmount = new Decimal(200);
const creditBase = 0 + 200 + 0;

const rounding = Math.round((totalAmount - creditBase) * 100) / 100;
console.log("Rounding:", rounding);

const adjustedInterest = Math.max(0, 200 + rounding);
console.log("adjustedInterest:", adjustedInterest);
