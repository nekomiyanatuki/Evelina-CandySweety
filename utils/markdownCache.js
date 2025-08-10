const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const markdownDir = path.join(__dirname, '../data/templates');
const cache = new Map();

/**
 * Markdownファイルを読み込み、HTML変換＋キャッシュを行う
 */
function loadMarkdown(filename) {
  const filePath = path.join(markdownDir, filename);

  if (!fs.existsSync(filePath)) {
    return {
      html: `<p>ファイルが見つかりません: ${filename}</p>`,
      lastUpdated: new Date(),
      lastModified: 0
    };
  }

  const stats = fs.statSync(filePath);
  const lastModified = stats.mtimeMs;

  const cached = cache.get(filename);
  if (cached && cached.lastModified === lastModified) {
    return cached;
  }

  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''); // BOM除去
  const html = marked.parse(raw, {
    mangle: false,
    headerIds: false,
  });

  const result = {
    html,
    lastUpdated: new Date(stats.mtimeMs),
    lastModified
  };

  cache.set(filename, result);
  return result;
}

/**
 * テンプレートファイル一覧を取得（拡張子 .md）
 * → path を /README や /Credit のようなルート型に変更
 */
function getTemplateList() {
  const files = fs.readdirSync(markdownDir)
    .filter(file => file.endsWith('.md'));

  return files.map(file => {
    const name = file;
    const baseName = path.basename(file, '.md');
    return {
      name,
      path: `/${baseName}`
    };
  });
}

module.exports = { loadMarkdown, getTemplateList };
