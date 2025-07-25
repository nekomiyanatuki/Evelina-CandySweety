const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const axios = require('axios');

/**
 * 背景 + サーバーロゴ + 丸型ユーザーアイコン + テキスト（縁取り付き）を合成する
 * 
 * @param {string} username - ユーザー表示名
 * @param {string} avatarUrl - ユーザーアイコンURL
 * @returns {Promise<Buffer>} - 合成済みPNG画像のバッファ
 */
async function generateWelcomeImage(username, avatarUrl) {
  const width = 1366;
  const height = 713;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 背景画像
  const background = await loadImage(path.join(__dirname, '../assets/back-img/lovechoco_tellmind.png'));
  ctx.drawImage(background, 0, 0, width, height);

  // サーバーロゴ画像（上部中央）
  const logo = await loadImage(path.join(__dirname, '../assets/head-img/nc_in_ver6_0.png'));
  const logoWidth = 500;
  const logoHeight = 133; // 縦横比維持で縮小
  const logoX = (width - logoWidth) / 2;
  const logoY = 40;
  ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);

  // ユーザーアイコン（中央）
  const avatarResponse = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
  const avatar = await loadImage(Buffer.from(avatarResponse.data, 'binary'));
  const avatarSize = 192;
  const avatarX = (width - avatarSize) / 2;
  const avatarY = logoY + logoHeight + 40;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  ctx.restore();

  // テキスト（ユーザー名）: 縁取り白 + 本体ペールブルー
  const text = ` ${username} `;
  const textY = avatarY + avatarSize + 60;

  ctx.font = '36px "Arial", sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffffff'; // 白の縁取り
  ctx.strokeText(text, width / 2, textY);

  ctx.fillStyle = '#cceeff'; // 本体色：ペールブルー
  ctx.fillText(text, width / 2, textY);

  return canvas.toBuffer('image/png');
}

module.exports = {
  generateWelcomeImage
};
