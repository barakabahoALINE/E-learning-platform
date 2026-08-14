const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'src', 'app', 'pages', 'CourseBuilder.tsx');
const text = fs.readFileSync(filePath, 'utf8');
const lines = text.split('\n');
let paren = 0, brace = 0, bracket = 0;
let maxParen = {count:0,line:0,col:0};
for (let i=0;i<lines.length;i++){
  const line = lines[i];
  for (let j=0;j<line.length;j++){
    const ch = line[j];
    if (ch==='(') paren++;
    else if (ch===')') paren--;
    else if (ch==='{') brace++;
    else if (ch==='}') brace--;
    else if (ch==='[') bracket++;
    else if (ch===']') bracket--;
    if (paren>maxParen.count){ maxParen={count:paren,line:i+1,col:j+1}; }
  }
}
console.log('max paren count',maxParen);
console.log('final counts', {paren, brace, bracket});
