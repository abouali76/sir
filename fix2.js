const fs = require('fs');
let f = './src/modules/transactions/transaction.service.ts';
let content = fs.readFileSync(f, 'utf8');

content = content.replace(/Prisma\.Decimal/g, 'number');
content = content.replace(/new number\(([^)]+)\)\.plus\(([^)]+)\)/g, '(Number() + Number())');
content = content.replace(/new number\(([^)]+)\)\.minus\(([^)]+)\)/g, '(Number() - Number())');

fs.writeFileSync(f, content, 'utf8');
console.log('Fixed');
