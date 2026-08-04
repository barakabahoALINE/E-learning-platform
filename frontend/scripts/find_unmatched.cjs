const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'src', 'app', 'pages', 'CourseBuilder.tsx');
const text = fs.readFileSync(filePath, 'utf8');
const lines = text.split('\n');
const parenStack = [];
const braceStack = [];
const bracketStack = [];
for (let i=0;i<lines.length;i++){
  const line = lines[i];
  for (let j=0;j<line.length;j++){
    const ch = line[j];
    if (ch==='(') parenStack.push({line:i+1,col:j+1});
    else if (ch===')') parenStack.pop();
    else if (ch==='{') braceStack.push({line:i+1,col:j+1});
    else if (ch==='}') braceStack.pop();
    else if (ch==='[') bracketStack.push({line:i+1,col:j+1});
    else if (ch===']') bracketStack.pop();
  }
}
console.log('Unclosed parens:', parenStack.length);
console.log(parenStack.slice(-5));
console.log('Unclosed braces:', braceStack.length);
console.log(braceStack.slice(-5));
console.log('Unclosed brackets:', bracketStack.length);
console.log(bracketStack.slice(-5));
