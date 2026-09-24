const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('from "@/lib/subscription"') || content.includes("from '@/lib/subscription'")) {
        content = content.replace(/from ["']@\/lib\/subscription["']/g, 'from "@/lib/subscription-guard"');
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated:', entry.name);
      }
    }
  }
}

processDir(path.resolve('src/app/api'));
console.log('Finished updating API routes.');
