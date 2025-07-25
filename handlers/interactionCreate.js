const fs = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');
const { sendTemplateList } = require('../commands/admin/message.js');
require('dotenv').config();

const htmlRequestPath = path.join(__dirname, '../data/openHtmlRequest.json');

function logCommand(interaction, optionsText = '', errorText = '') {
  const now = new Date();
  const timestamp = now.toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }) + `.${now.getMilliseconds().toString().padStart(3, '0')}秒`;

  const username = interaction.user.globalName || interaction.user.username;
  const userId = `@${interaction.user.username}`;
  const channel = interaction.channel ? `#${interaction.channel.name}` : '不明';
  const command = `/${interaction.commandName} ${interaction.options.getSubcommandGroup(false) || ''} ${interaction.options.getSubcommand(false) || ''}`.trim();
  const content = interaction.options.data.map(opt => `${opt.name}: ${opt.value}`).join(', ') || '（引数なし）';
  const error = errorText || 'なし';

  const logLine = `"${timestamp}","${username}","${userId}","${channel}","${command}","${content}","${error}"\n`;

  const logsDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }

  const logFile = path.join(logsDir, 'command_log.csv');
  if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, '"実行日時","ユーザー名","ユーザーID","使用チャンネル","使用コマンド","内容","エラー原因"\n');
  }
  fs.appendFileSync(logFile, logLine, 'utf8');
}

module.exports = async (interaction) => {
  // ▼ テンプレートリストのページングボタン
  if (interaction.isButton()) {
    const match = interaction.customId.match(/^template_(prev|next)_(\d+)$/);
    if (match) {
      const direction = match[1];
      const currentPage = parseInt(match[2]);
      await sendTemplateList(interaction, newPage = direction === 'prev' ? currentPage - 1 : currentPage + 1);
      return;
    }
  }

  // ▼ openHtmlコマンド：セレクトメニュー対応
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'open-html-select') {
      const selected = interaction.values[0];

      // Markdownテンプレート (.md)
      const mdTemplates = {
        'template-info': 'Info.md',
        'template-readme': 'README.md',
        'template-credit': 'Credit.md',
        'template-policy': 'policy.md',
        'template-simple_policy': 'simple_policy',
        'template-license': 'LICENSE.md'
      };
      if (mdTemplates[selected]) {
        const templateName = mdTemplates[selected];
        const url = `${process.env.SERVER_URL}/info?template=${encodeURIComponent(templateName)}`;
        await interaction.update({
          content: `🔗 [${templateName}](${url}) を開くよ❤`,
          components: []
        });
        return;
      }

      // HTMLファイル (ローカルviews or rules配下)
      const fileMap = {
        info: 'views/Info.html',
        readme: 'views/README.html',
        credit: 'views/Credit.html',
        policy: 'views/policy.html',
        simple: 'views/simple_policy.html',
        license: 'views/LICENSE.html'
      };

      const filename = fileMap[selected];
      if (!filename) {
        await interaction.reply({
          content: '❌ 選択が無効だよ❤',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const request = {
        filename,
        timestamp: Date.now()
      };
      fs.writeFileSync(htmlRequestPath, JSON.stringify(request, null, 2), 'utf8');

      await interaction.update({
        content: `✅ 「${selected.toUpperCase()}」を開くリクエストを送信したよ❤`,
        components: []
      });
      return;
    }
  }

  // ▼ 通常のスラッシュコマンド実行
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`「${interaction.commandName}」コマンドは見つかりませんでした。`);
    return;
  }

  let errorText = '';
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    errorText = error.message || '不明なエラー';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'コマンド実行中にエラーが発生しました。',
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.reply({
        content: 'コマンド実行中にエラーが発生しました。',
        flags: MessageFlags.Ephemeral
      });
    }
  } finally {
    const optionsText = interaction.options.data.map(opt => `${opt.name}: ${opt.value}`).join(', ');
    logCommand(interaction, optionsText, errorText);
  }
};
