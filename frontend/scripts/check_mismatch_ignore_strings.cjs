const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'src', 'app', 'pages', 'CourseBuilder.tsx');
const text = fs.readFileSync(filePath, 'utf8');
const lines = text.split('\n');
const stack = [];
let inSingle=false, inDouble=false, inBack=false;
for (let i=0;i<lines.length;i++){
  const line = lines[i];
  for (let j=0;j<line.length;j++){
    const ch = line[j];
    const prev = line[j-1];
    if (ch==="'" && prev!=='\\' && !inDouble && !inBack) { inSingle = !inSingle; continue; }
    if (ch==='"' && prev!=='\\' && !inSingle && !inBack) { inDouble = !inDouble; continue; }
    if (ch==='`' && prev!=='\\' && !inSingle && !inDouble) { inBack = !inBack; continue; }
    if (inSingle || inDouble || inBack) continue;
    if (ch==='(' || ch==='{' || ch==='[') stack.push({ch,line:i+1,col:j+1});
    else if (ch===')' || ch==='}' || ch===']'){
      const last = stack.pop();
      const match = (last && ((last.ch==='(' && ch===')') || (last.ch==='{' && ch==='}') || (last.ch==='[' && ch===']')));
      if (!match){
        console.log('Mismatch at line',i+1,'col',j+1,'found',ch,'expected matching for', last? last.ch : 'NONE');
        console.log('Context line:', line);
        process.exit(0);
      }
    }
  }
}
if (stack.length>0){
  console.log('Unclosed tokens at end:');
  console.log(stack.slice(-20));
} else console.log('All matched');
