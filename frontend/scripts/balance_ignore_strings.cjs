const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'src', 'app', 'pages', 'CourseBuilder.tsx');
const text = fs.readFileSync(filePath, 'utf8');
const lines = text.split('\n');
let paren=0, brace=0, bracket=0;
let inSingle=false, inDouble=false, inBack=false;
for (let i=0;i<lines.length;i++){
  const line = lines[i];
  for (let j=0;j<line.length;j++){
    const ch = line[j];
    const prev = line[j-1];
    if (ch==="'" && prev!=='\\' && !inDouble && !inBack) inSingle = !inSingle;
    else if (ch==='"' && prev!=='\\' && !inSingle && !inBack) inDouble = !inDouble;
    else if (ch==='`' && prev!=='\\' && !inSingle && !inDouble) inBack = !inBack;
    if (inSingle || inDouble || inBack) continue;
    if (ch==='(') paren++;
    else if (ch===')') paren--;
    else if (ch==='{') brace++;
    else if (ch==='}') brace--;
    else if (ch==='[') bracket++;
    else if (ch===']') bracket--;
  }
  if (i>=1110 && i<=1160) console.log(i+1, 'p',paren,'b',brace,'B',bracket, lines[i]);
}
console.log('final', {paren, brace, bracket});
