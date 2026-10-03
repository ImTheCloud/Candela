const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src/app.html');
let html = fs.readFileSync(appPath, 'utf-8');

html = html.replace('html,body{min-height:100%;overflow-x:hidden}', 'html,body{min-height:100%;overflow-x:clip}');

fs.writeFileSync(appPath, html, 'utf-8');
console.log('overflow-x changed to clip');
