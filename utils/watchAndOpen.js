const fs = require('fs');
const path = require('path');
const open = require('open');

const filePath = path.join(__dirname, 'data/openHtmlRequest.json');

console.log('👀 HTMLファイル監視を開始しています…');

let lastContent = null;

setInterval(() => {
  if (!fs.existsSync(filePath)) return;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content === lastContent) return; // 前回と同じならスキップ
    lastContent = content;

    const data = JSON.parse(content);
    const target = data.target;

    const allowed = [
      'Info.html',
      'README.html',
      'Credit.html',
      'policy.html',
      'simple_policy.html',
      'LICENSE.html'
    ];
    if (!allowed.includes(target)) {
      console.log(`❌ 不明なファイル指定: ${target}`);
      return;
    }

    const targetPath = path.join(__dirname, target);

    if (fs.existsSync(targetPath)) {
      console.log(`🌐 ブラウザで開きます: ${target}`);
      open(targetPath);
    } else {
      console.log(`⚠️ 指定されたファイルが存在しません: ${targetPath}`);
    }

  } catch (err) {
    console.error('❌ JSONの読み取りまたは解析に失敗:', err);
  }
}, 3000); // 3秒間隔で監視
