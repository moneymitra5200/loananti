const { Prisma } = require('@prisma/client');
for (const modelName of ['EMISchedule', 'OfflineLoanEMI']) {
  const model = Prisma.dmmf.datamodel.models.find(m => m.name === modelName);
  if (model) {
    console.log(`Fields for ${modelName}:`);
    for (const f of model.fields) {
      console.log(` - ${f.name}: ${f.type}`);
    }
  } else {
    console.log(`Model ${modelName} not found`);
  }
}
