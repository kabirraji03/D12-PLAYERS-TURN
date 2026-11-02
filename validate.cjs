const fs=require('fs');const s=fs.readFileSync('supabase/functions/d12-player-insights-v163/index.ts','utf8');
for(const f of fs.readdirSync('.').filter(f=>f.endsWith('.js')))new (require('vm').Script)(fs.readFileSync(f,'utf8'),{filename:f});
new (require('vm').Script)(require('module').stripTypeScriptTypes(s).replace(/^import .*;$/gm,'').replace('export default','const handler ='));
console.log('All JS and backend syntax PASS');
for(const f of fs.readdirSync('.').filter(f=>f.endsWith('.css'))){const css=fs.readFileSync(f,'utf8');if((css.match(/{/g)||[]).length!==(css.match(/}/g)||[]).length)throw Error(f)}console.log('All CSS braces PASS');
for(const pattern of [/setInterval\s*\(/g,/\bfetch\s*\(/g,/\brefresh\s*\(/g,/\bbootstrap\s*\(/g,/last_seen_at/g]){if(pattern.test(fs.readFileSync('patch-v1-7-14.js','utf8')))throw Error(pattern);console.log(pattern+' = 0')}
try{console.log(require.resolve('playwright'))}catch{console.log('No local Playwright')}
