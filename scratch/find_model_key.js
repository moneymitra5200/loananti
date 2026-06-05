const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const keys = Object.keys(db).filter(k => !k.startsWith('_'));
console.log("Keys containing 'borrow' or 'custom' or 'user':");
console.log(keys.filter(k => k.toLowerCase().includes('borrow') || k.toLowerCase().includes('custom') || k.toLowerCase().includes('user')));
db.$disconnect();
