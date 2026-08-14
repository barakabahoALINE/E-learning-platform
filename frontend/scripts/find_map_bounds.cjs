const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'src', 'app', 'pages', 'CourseBuilder.tsx');
const text = fs.readFileSync(filePath, 'utf8');
const idx = text.indexOf('course.modules.map((module, mIndex) =>');
console.log('map idx', idx);
const before = text.slice(0, idx);
const startBrace = before.lastIndexOf('{');
console.log('startBrace pos', startBrace);
const snippet = text.slice(startBrace, startBrace+8000);
console.log('snippet start lines:\n', snippet.split('\n').slice(0,80).map((l,i)=>`${i+1}:${l}`).join('\n'));
// Now simulate stack from startBrace to find matching closing '}' that closes the initial '{'
let stack = [];
let inSingle=false,inDouble=false,inBack=false;
for (let i=startBrace;i<text.length;i++){
  const ch = text[i];
  const prev = text[i-1];
  if (ch==="'" && prev!=='\\' && !inDouble && !inBack) { inSingle=!inSingle; }
  else if (ch==='"' && prev!=='\\' && !inSingle && !inBack) { inDouble=!inDouble; }
  else if (ch==='`' && prev!=='\\' && !inSingle && !inDouble) { inBack=!inBack; }
  if (inSingle||inDouble||inBack) continue;
  if (ch==='('||ch==='{'||ch==='[') stack.push({ch,pos:i});
  else if (ch===')'||ch==='}'||ch===']'){
    const last = stack.pop();
    if (!last) { console.log('pop with empty at', i); break; }
    const match = (last.ch==='('&&ch===')') || (last.ch==='{'&&ch==='}') || (last.ch==='['&&ch===']');
    if (!match) { console.log('mismatch at',i, 'found', ch, 'expected match for', last.ch); break; }
    if (stack.length===0){
      console.log('stack emptied at', i);
      const {line: sline} = text.slice(0,i).split('\n').reduce((acc,ln,idx)=>({line:idx+1}),{});
      console.log('closing char index', i);
      break;
    }
  }
}
console.log('done');
