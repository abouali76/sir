const fs = require('fs');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    // The previous replace changed `authorize(RoleName.ADMIN)` to `authorize("ADMIN)` which is broken.
    // Also some became `"ADMIN"` but without closing bracket `)` if they were something else.
    // Let's just fix the specific syntax errors one by one using simple JS.
    
    // Fix `authorize("ADMIN)` -> `authorize("ADMIN")`
    content = content.replace(/authorize\("ADMIN\)/g, 'authorize("ADMIN")');
    content = content.replace(/authorize\("EMPLOYEE\)/g, 'authorize("EMPLOYEE")');
    
    // Fix missing closing quotes in cases where it was `RoleName.ADMIN, ...` -> `"ADMIN, ...`
    // Actually, I can just use a regex to find any `"ADMIN` not followed by a quote and add it.
    content = content.replace(/"ADMIN([^\"])/g, '"ADMIN"$1');
    content = content.replace(/"EMPLOYEE([^\"])/g, '"EMPLOYEE"$1');
    content = content.replace(/"LOGIN([^\"])/g, '"LOGIN"$1');
    content = content.replace(/"LOGOUT([^\"])/g, '"LOGOUT"$1');
    content = content.replace(/"LOGIN_FAILED([^\"])/g, '"LOGIN_FAILED"$1');
    content = content.replace(/"PRICE_UPDATE([^\"])/g, '"PRICE_UPDATE"$1');
    content = content.replace(/"TRANSACTION_CREATE([^\"])/g, '"TRANSACTION_CREATE"$1');
    content = content.replace(/"TRANSACTION_UPDATE([^\"])/g, '"TRANSACTION_UPDATE"$1');
    content = content.replace(/"TRANSACTION_DELETE([^\"])/g, '"TRANSACTION_DELETE"$1');
    content = content.replace(/"USER_CREATE([^\"])/g, '"USER_CREATE"$1');
    content = content.replace(/"USER_UPDATE([^\"])/g, '"USER_UPDATE"$1');
    content = content.replace(/"USER_DELETE([^\"])/g, '"USER_DELETE"$1');
    content = content.replace(/"SETTINGS_UPDATE([^\"])/g, '"SETTINGS_UPDATE"$1');
    content = content.replace(/"BUY([^\"])/g, '"BUY"$1');
    content = content.replace(/"SELL([^\"])/g, '"SELL"$1');
    
    // Cleanup double quotes if any: `"ADMIN""` -> `"ADMIN"`
    content = content.replace(/"ADMIN""/g, '"ADMIN"');
    content = content.replace(/"EMPLOYEE""/g, '"EMPLOYEE"');
    content = content.replace(/"LOGIN""/g, '"LOGIN"');
    // ...

    // Fix `import { PrismaClient } from '@prisma/client'` missing `User` etc.
    if (!content.includes('import { User }') && !content.includes('import { User,')) {
      if (content.includes('User')) {
        content = content.replace(/import \{ PrismaClient \} from '@prisma\/client';/, "import { PrismaClient, User } from '@prisma/client';");
      }
    }
    
    fs.writeFileSync(f, content, 'utf8');
});
console.log('Done');
