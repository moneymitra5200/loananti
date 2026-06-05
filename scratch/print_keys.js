const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
console.log(Object.keys(db).filter(k => !k.startsWith('_')));
db.$disconnect();
