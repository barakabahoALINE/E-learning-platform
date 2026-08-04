const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'src', 'app', 'pages', 'CourseBuilder.tsx');
const text = fs.readFileSync(filePath, 'utf8');
console.log('typescript keys:', Object.keys(ts).slice(0,40));
const ScriptTarget = ts.ScriptTarget || (ts.default && ts.default.ScriptTarget) || { Latest: 99 };
const ScriptKind = ts.ScriptKind || (ts.default && ts.default.ScriptKind) || { TSX: 99 };
const sourceFile = ts.createSourceFile('CourseBuilder.tsx', text, ScriptTarget.Latest, true, ScriptKind.TSX);
let found = null;
function find(node){
  if (!found && node.getText().includes('course.modules.map')) {
    found = node;
    console.log('Found node kind', ts.SyntaxKind[node.kind]);
    console.log('Start', node.getStart(), 'End', node.getEnd());
    const { line: sline } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const { line: eline } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    console.log('Lines', sline+1, '-', eline+1);
  }
  ts.forEachChild(node, find);
}
find(sourceFile);
console.log('parseDiagnostics:', sourceFile.parseDiagnostics.length);
sourceFile.parseDiagnostics.forEach(d=>{
  const {line,character} = sourceFile.getLineAndCharacterOfPosition(d.start);
  console.log('diag', line+1, character+1, d.messageText);
});
