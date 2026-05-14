const fs = require('fs');
const path = require('path');

function replaceMojibake(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  content = content.replace(/â†’/g, '→');
  content = content.replace(/âœ…/g, '✅');
  content = content.replace(/â‚¹/g, '₹');
  content = content.replace(/â€¢/g, '•');
  content = content.replace(/â”€/g, '-');
  content = content.replace(/â€”/g, '—');
  content = content.replace(/â ³/g, '⏳');
  content = content.replace(/â Œ/g, '❌');
  content = content.replace(/âš ï¸ /g, '⚠️');
  content = content.replace(/âš /g, '⚠️');
  content = content.replace(/â†³/g, '↳');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed ' + filePath);
  }
}

function walk(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      walk(file);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      replaceMojibake(file);
    }
  });
}

walk('./src');
console.log('Done');
