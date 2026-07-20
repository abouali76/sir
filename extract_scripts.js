const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Match inline script that is NOT src="..."
      const scriptRegex = /<script>([\s\S]*?)<\/script>/gi;
      let match;
      let counter = 1;
      let hasChanges = false;
      
      while ((match = scriptRegex.exec(content)) !== null) {
        const scriptBody = match[1];
        if (scriptBody.trim().length > 0) {
          const jsFileName = `${path.basename(file, '.html')}_inline_${counter}.js`;
          const jsFilePath = path.join(path.dirname(fullPath), jsFileName);
          
          fs.writeFileSync(jsFilePath, scriptBody.trim());
          console.log(`Extracted to ${jsFileName}`);
          
          // Replace inline script with external script reference
          const relativeJsPath = `./${jsFileName}`;
          content = content.replace(match[0], `<script src="${relativeJsPath}"></script>`);
          hasChanges = true;
          counter++;
        }
      }
      
      if (hasChanges) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'public'));
console.log('Done!');
