const fs = require('fs');
const files = ['Auth.tsx', 'StudentFeatures.tsx', 'TPOFeatures.tsx'];
for (const f of files) {
    let content = fs.readFileSync('src/components/' + f, 'utf8');
    content = content.replace(/\\`/g, '`');
    content = content.replace(/\\\$/g, '$');
    fs.writeFileSync('src/components/' + f, content);
}
