import crypto from 'crypto';

// 32バイト（256ビット）のランダムなトークンを生成
const token = crypto.randomBytes(32).toString('hex');

console.log('=== GAS認証トークン生成 ===');
console.log('以下のトークンを.envファイルのGAS_AUTH_TOKENに設定してください：');
console.log('\nGAS_AUTH_TOKEN=' + token + '\n');
console.log('注意：このトークンは一度しか表示されません。必ず安全な場所に保存してください。'); 