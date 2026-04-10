const fs = require('fs');
const file = 'c:/Users/bscom/Desktop/reallll/src/components/admin/modules/ActiveLoansSection.tsx';
let c = fs.readFileSync(file, 'utf8');
// Remove the extra </div> that appears between </div> and </motion.div>
// The pattern is: close Tabs div, then extra div, then motion.div
c = c.replace(
  `                           </div>\n                         </div>\n                       </motion.div>`,
  `                           </div>\n                       </motion.div>`
);
fs.writeFileSync(file, c);
console.log('Fixed extra div');
