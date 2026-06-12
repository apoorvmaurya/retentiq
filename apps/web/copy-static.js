const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
    if (fs.lstatSync(path.join(from, element)).isDirectory()) {
      copyFolderSync(path.join(from, element), path.join(to, element));
    } else {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    }
  });
}

const webDir = __dirname;
const staticSrc = path.join(webDir, '.next', 'static');
const staticDst = path.join(webDir, '.next', 'standalone', 'apps', 'web', '.next', 'static');

const publicSrc = path.join(webDir, 'public');
const publicDst = path.join(webDir, '.next', 'standalone', 'apps', 'web', 'public');

console.log('Copying static assets to standalone directory...');
copyFolderSync(staticSrc, staticDst);
copyFolderSync(publicSrc, publicDst);
console.log('Static assets copied successfully!');
