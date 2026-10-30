const fs = require('fs');
const path = 'app/(protected)/admin/analytics/page.tsx';
const s = fs.readFileSync(path, 'utf8');
const idx = s.indexOf('Per-business breakdown');
if(idx === -1) { console.log('not found'); process.exit(0); }
const end = s.indexOf('</SectionCard>', idx);
console.log(s.substring(idx-50, end+20));
