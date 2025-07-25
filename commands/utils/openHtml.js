const {
  SlashCommandBuilder,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// HTMLファイルマッピング（views 以下）
const fileMap = {
  info: 'views/Info.html',
  readme: 'views/README.html',
  credit: 'views/Credit.html',
  policy: 'views/policy.html',
  simple: 'views/simple_policy.html',
  license: 'views/LICENSE.html'
};

// Markdownテンプレート用（/info?template=...）
const mdTemplateMap = {
  'Info': 'Info.md',
  'README': 'README.md',
  'Credit': 'Credit.md',
  'policy': 'policy.md',
  'simple_policy': 'simple_policy.md',
  'LICeNSE': 'LICENSE.md'
};

const htmlRequestPath = path.join(__dirname, '../../data/openHtmlRequest.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('openhtml')
    .setDescription('HTMLまたはテンプレートを選んでブラウザで開く'),

  async execute(interaction) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('open-html-select')
      .setPlaceholder('開くページを選択')
      .addOptions([
        { label: 'INFO', value: 'Info' },
        { label: 'README', value: 'README' },
        { label: 'Credit', value: 'Credit' },
        { label: 'POLICY', value: 'policy' },
        { label: 'SIMPLE_POLICY', value: 'simple_policy' },
        { label: 'LICENSE', value: 'LICENSE' }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      content: 'どのHTML/テンプレートを開きますか？',
      components: [row],
      flags: MessageFlags.Ephemeral
    });
  },

  cli: function () {
    const target = process.argv[2]?.toLowerCase();
    if (!target) {
      console.error('❌ 対象を指定してください。');
      process.exit(1);
    }

    if (fileMap[target]) {
      const filePath = path.join(__dirname, '..', '..', fileMap[target]);
      const openCommand =
        process.platform === 'win32'
          ? `start "" "${filePath}"`
          : process.platform === 'darwin'
            ? `open "${filePath}"`
            : `xdg-open "${filePath}"`;

      exec(openCommand, (err) => {
        if (err) {
          console.error(`❌ ファイルを開く際にエラーが発生しました: ${err.message}`);
        } else {
          console.log(`✅ ${filePath} をブラウザで開きました`);
        }
      });
    } else if (mdTemplateMap[target]) {
      const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
      const templateUrl = `${serverUrl}/info?template=${mdTemplateMap[target]}`;
      console.log(`🔗 ${templateUrl}`);
      const openCommand =
        process.platform === 'win32'
          ? `start "" "${templateUrl}"`
          : process.platform === 'darwin'
            ? `open "${templateUrl}"`
            : `xdg-open "${templateUrl}"`;

      exec(openCommand, (err) => {
        if (err) {
          console.error(`❌ テンプレートを開く際にエラーが発生しました: ${err.message}`);
        } else {
          console.log(`✅ ${templateUrl} をブラウザで開きました`);
        }
      });
    } else {
      console.error('❌ 指定が不正です。有効な値: Info, README, Credit, policy, simple_policy, LICENSE ');
      process.exit(1);
    }
  }
};

if (require.main === module) {
  module.exports.cli();
}
