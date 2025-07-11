const fs = require('fs');
const path = require('path');

const srcBase = path.join(__dirname, '..', 'public', 'AppIcon', 'android');
const destBase = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const mipmapDirs = ['mipmap-hdpi', 'mipmap-mdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'];

function copyIcons() {
  mipmapDirs.forEach(dir => {
    const src = path.join(srcBase, dir, 'ic_launcher.png');
    const destDir = path.join(destBase, dir);
    const dest = path.join(destDir, 'ic_launcher.png');
    if (fs.existsSync(src) && fs.existsSync(destDir)) {
      fs.copyFileSync(src, dest);
    }
  });
  console.log(`Copied Android icons from ${srcBase} to ${destBase}`);
}

if (require.main === module) {
  copyIcons();
}

module.exports = copyIcons;
