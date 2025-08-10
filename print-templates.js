// print-templates.js
const { MessageTemplate } = require('./models');
const sequelize = require('./config/database.js');

(async () => {
  try {
    await sequelize.authenticate();
    const templates = await MessageTemplate.findAll();
    if (templates.length === 0) {
      console.log('テンプレートはありません。');
    } else {
      templates.forEach(t => {
        console.log(`ID: ${t.id}, name: ${t.name}, content: ${t.content}`);
      });
    }
    process.exit(0);
  } catch (e) {
    console.error('エラー:', e);
    process.exit(1);
  }
})();