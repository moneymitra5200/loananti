const { Prisma } = require('@prisma/client');
console.log("User fields:", Object.keys(Prisma.dmmf.datamodel.models.find(m => m.name === 'User')?.fields || {}).map(f => {
  const field = Prisma.dmmf.datamodel.models.find(m => m.name === 'User').fields[f];
  return `${field.name}: ${field.type}`;
}));
