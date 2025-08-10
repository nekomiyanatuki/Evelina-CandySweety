const fs = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');
const { sendTemplateList } = require('../commands/admin/message.js');
const { TwitterConfig } = require('../models/index.js');
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

  // ▼ Twitter設定関連のモーダル処理
  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('twitter_edit_')) {
      await this.handleTwitterEditModal(interaction);
      return;
    }
  }

  // ▼ Twitter設定関連のボタン処理
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('twitter_remove_confirm_')) {
      await this.handleTwitterRemoveConfirm(interaction);
      return;
    }
    if (interaction.customId.startsWith('twitter_remove_cancel_')) {
      await this.handleTwitterRemoveCancel(interaction);
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

// Twitter設定編集モーダルの処理
async function handleTwitterEditModal(interaction) {
  const configId = interaction.customId.replace('twitter_edit_', '');

  try {
    const config = await TwitterConfig.findByPk(configId);
    if (!config) {
      await interaction.reply({ content: '❌ 設定が見つかりません', ephemeral: true });
      return;
    }

    // 権限チェック
    if (config.guildId !== interaction.guild.id) {
      await interaction.reply({ content: '❌ この設定を編集する権限がありません', ephemeral: true });
      return;
    }

    const displayName = interaction.fields.getTextInputValue('display_name');
    const channelId = interaction.fields.getTextInputValue('channel_id');
    const checkInterval = parseInt(interaction.fields.getTextInputValue('check_interval')) * 1000;
    const embedColor = interaction.fields.getTextInputValue('embed_color');

    // チャンネルの存在確認
    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) {
      await interaction.reply({ content: '❌ 指定されたチャンネルが見つかりません', ephemeral: true });
      return;
    }

    // 設定を更新
    await config.update({
      targetDisplayName: displayName,
      channelId: channelId,
      channelName: channel.name,
      checkInterval: checkInterval,
      embedColor: embedColor,
      updatedBy: interaction.user.id
    });

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle('✅ Twitter監視設定を更新しました')
      .setColor('#00ff00')
      .addFields(
        { name: '監視対象', value: `@${config.targetUsername}`, inline: true },
        { name: '表示名', value: displayName, inline: true },
        { name: '投稿先チャンネル', value: `#${channel.name}`, inline: true },
        { name: '監視間隔', value: `${checkInterval / 1000}秒`, inline: true },
        { name: 'Embed色', value: embedColor, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Twitter設定編集エラー:', error);
    await interaction.reply({
      content: `❌ 設定の更新に失敗しました: ${error.message}`,
      ephemeral: true
    });
  }
}

// Twitter設定削除確認ボタンの処理
async function handleTwitterRemoveConfirm(interaction) {
  const configId = interaction.customId.replace('twitter_remove_confirm_', '');

  try {
    const config = await TwitterConfig.findByPk(configId);
    if (!config) {
      await interaction.reply({ content: '❌ 設定が見つかりません', ephemeral: true });
      return;
    }

    // 権限チェック
    if (config.guildId !== interaction.guild.id) {
      await interaction.reply({ content: '❌ この設定を削除する権限がありません', ephemeral: true });
      return;
    }

    // 設定を削除
    await config.destroy();

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle('🗑️ Twitter監視設定を削除しました')
      .setColor('#ff0000')
      .addFields(
        { name: '監視対象', value: `@${config.targetUsername}`, inline: true },
        { name: '投稿先チャンネル', value: `#${config.channelName}`, inline: true }
      )
      .setTimestamp();

    await interaction.update({
      embeds: [embed],
      components: []
    });
  } catch (error) {
    console.error('Twitter設定削除エラー:', error);
    await interaction.reply({
      content: `❌ 設定の削除に失敗しました: ${error.message}`,
      ephemeral: true
    });
  }
}

// Twitter設定削除キャンセルボタンの処理
async function handleTwitterRemoveCancel(interaction) {
  const configId = interaction.customId.replace('twitter_remove_cancel_', '');

  try {
    const config = await TwitterConfig.findByPk(configId);
    if (!config) {
      await interaction.reply({ content: '❌ 設定が見つかりません', ephemeral: true });
      return;
    }

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle('❌ 設定削除をキャンセルしました')
      .setColor('#808080')
      .addFields(
        { name: '監視対象', value: `@${config.targetUsername}`, inline: true },
        { name: '投稿先チャンネル', value: `#${config.channelName}`, inline: true }
      )
      .setTimestamp();

    await interaction.update({
      embeds: [embed],
      components: []
    });
  } catch (error) {
    console.error('Twitter設定削除キャンセルエラー:', error);
    await interaction.reply({
      content: `❌ キャンセル処理に失敗しました: ${error.message}`,
      ephemeral: true
    });
  }
}
