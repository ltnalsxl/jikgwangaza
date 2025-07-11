const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'public', 'AppIcon', 'Assets.xcassets', 'AppIcon.appiconset');
const destDir = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');

function copyIcons() {
  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log(`Copied iOS icons from ${srcDir} to ${destDir}`);
}

if (require.main === module) {
  copyIcons();
}

module.exports = copyIcons;
