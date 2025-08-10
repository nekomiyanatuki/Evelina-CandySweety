const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('twitter')
    .setDescription('X（旧Twitter）投稿監視の制御')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Twitter投稿監視を開始')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stop')
        .setDescription('Twitter投稿監視を停止')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Twitter投稿監視の状態を表示')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('check')
        .setDescription('手動でツイート確認を実行')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('Twitter監視の設定を表示')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reload')
        .setDescription('Twitter監視設定を再読み込み')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('新しいTwitter監視設定を追加')
        .addStringOption(option =>
          option
            .setName('username')
            .setDescription('監視対象のTwitterユーザー名（@なし）')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('display_name')
            .setDescription('表示名')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('投稿先のDiscordチャンネル')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('edit')
        .setDescription('既存のTwitter監視設定を編集')
        .addStringOption(option =>
          option
            .setName('username')
            .setDescription('編集する設定のTwitterユーザー名')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Twitter監視設定を削除')
        .addStringOption(option =>
          option
            .setName('username')
            .setDescription('削除する設定のTwitterユーザー名')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('現在のTwitter監視設定一覧を表示')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Twitter監視設定の有効/無効を切り替え')
        .addStringOption(option =>
          option
            .setName('username')
            .setDescription('切り替える設定のTwitterユーザー名')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('bulk')
        .setDescription('複数のTwitter監視設定を一括操作')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('実行する操作')
            .setRequired(true)
            .addChoices(
              { name: '有効化', value: 'enable' },
              { name: '無効化', value: 'disable' },
              { name: '削除', value: 'delete' }
            )
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    // TwitterMonitorのインスタンスを取得
    const twitterMonitor = interaction.client.twitterMonitor;
    
    if (!twitterMonitor) {
      return interaction.reply({
        content: '❌ Twitter監視機能が初期化されていません',
        ephemeral: true
      });
    }

    try {
      switch (subcommand) {
        case 'start':
          await this.handleStart(interaction, twitterMonitor);
          break;
        case 'stop':
          await this.handleStop(interaction, twitterMonitor);
          break;
        case 'status':
          await this.handleStatus(interaction, twitterMonitor);
          break;
        case 'check':
          await this.handleCheck(interaction, twitterMonitor);
          break;
        case 'config':
          await this.handleConfig(interaction);
          break;
        case 'reload':
          await this.handleReload(interaction, twitterMonitor);
          break;
        case 'add':
          await this.handleAdd(interaction);
          break;
        case 'edit':
          await this.handleEdit(interaction);
          break;
        case 'remove':
          await this.handleRemove(interaction);
          break;
        case 'list':
          await this.handleList(interaction);
          break;
        case 'toggle':
          await this.handleToggle(interaction);
          break;
        case 'bulk':
          await this.handleBulk(interaction);
          break;
        default:
          await interaction.reply({
            content: '❌ 不明なサブコマンドです',
            ephemeral: true
          });
      }
    } catch (error) {
      console.error('Twitterコマンド実行中にエラーが発生しました:', error);
      await interaction.reply({
        content: '❌ コマンドの実行中にエラーが発生しました',
        ephemeral: true
      });
    }
  },

  async handleStart(interaction, twitterMonitor) {
    if (twitterMonitor.isRunning) {
      return interaction.reply({
        content: '⚠️ Twitter投稿監視は既に実行中です',
        ephemeral: true
      });
    }

    twitterMonitor.start();
    
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🔄 Twitter投稿監視を開始しました')
      .setDescription('指定されたアカウントの新規投稿を監視し、Discordに自動投稿します')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async handleStop(interaction, twitterMonitor) {
    if (!twitterMonitor.isRunning) {
      return interaction.reply({
        content: '⚠️ Twitter投稿監視は実行されていません',
        ephemeral: true
      });
    }

    twitterMonitor.stop();
    
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🛑 Twitter投稿監視を停止しました')
      .setDescription('投稿監視が停止されました')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async handleStatus(interaction, twitterMonitor) {
    const status = twitterMonitor.isRunning ? '🟢 実行中' : '🔴 停止中';
    const lastCheck = twitterMonitor.lastCheckTime ? 
      new Date(twitterMonitor.lastCheckTime).toLocaleString('ja-JP') : '未実行';
    
    const embed = new EmbedBuilder()
      .setColor(twitterMonitor.isRunning ? '#00FF00' : '#FF0000')
      .setTitle('📊 Twitter投稿監視の状態')
      .addFields(
        { name: '状態', value: status, inline: true },
        { name: '最後の確認', value: lastCheck, inline: true },
        { name: '監視アカウント数', value: twitterMonitor.lastTweetIds.size.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async handleCheck(interaction, twitterMonitor) {
    await interaction.deferReply();
    
    try {
      await twitterMonitor.manualCheck();
      
      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('🔍 手動ツイート確認完了')
        .setDescription('新規ツイートの確認が完了しました')
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('手動ツイート確認中にエラーが発生しました:', error);
      await interaction.editReply({
        content: '❌ ツイート確認中にエラーが発生しました',
        ephemeral: true
      });
    }
  },

  async handleConfig(interaction) {
    const twitterConfig = require('../../config/twitter.js');
    
    const accountsList = twitterConfig.targetAccounts.map(acc => 
      `• **${acc.displayName}** (@${acc.username}) → <#${acc.channelId}>`
    ).join('\n');
    
    const embed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('⚙️ Twitter監視設定')
      .addFields(
        { name: '監視間隔', value: `${Math.floor(twitterConfig.checkInterval / 60000)}分`, inline: true },
        { name: '埋め込み色', value: twitterConfig.embedColor, inline: true },
        { name: 'リツイート除外', value: twitterConfig.excludeRetweets ? 'はい' : 'いいえ', inline: true },
        { name: '返信除外', value: twitterConfig.excludeReplies ? 'はい' : 'いいえ', inline: true },
        { name: '引用除外', value: twitterConfig.excludeQuotes ? 'はい' : 'いいえ', inline: true },
        { name: '監視アカウント', value: accountsList || '設定されていません' }
      )
      .setFooter({ text: twitterConfig.embedFooter })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async handleReload(interaction, twitterMonitor) {
    await interaction.deferReply();
    
    try {
      await twitterMonitor.reloadConfigs();
      
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🔄 Twitter監視設定を再読み込みしました')
        .setDescription('設定の変更が反映されました')
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('設定再読み込み中にエラーが発生しました:', error);
      await interaction.editReply({
        content: `❌ 設定の再読み込みに失敗しました: ${error.message}`,
        ephemeral: true
      });
    }
  },

  async handleAdd(interaction) {
    const username = interaction.options.getString('username');
    const displayName = interaction.options.getString('display_name');
    const channel = interaction.options.getChannel('channel');

    try {
      const { TwitterConfig } = require('../../models/index.js');
      
      // 既存の設定があるかチェック
      const existingConfig = await TwitterConfig.findOne({
        where: {
          guildId: interaction.guild.id,
          targetUsername: username
        }
      });

      if (existingConfig) {
        return interaction.reply({
          content: `❌ @${username} の監視設定は既に存在します`,
          ephemeral: true
        });
      }

      // 新しい設定を作成
      await TwitterConfig.create({
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        targetUsername: username,
        targetDisplayName: displayName,
        channelId: channel.id,
        channelName: channel.name,
        createdBy: interaction.user.id,
        updatedBy: interaction.user.id
      });

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Twitter監視設定を追加しました')
        .addFields(
          { name: '監視対象', value: `@${username}`, inline: true },
          { name: '表示名', value: displayName, inline: true },
          { name: '投稿先チャンネル', value: `#${channel.name}`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Twitter設定追加エラー:', error);
      await interaction.reply({
        content: `❌ 設定の追加に失敗しました: ${error.message}`,
        ephemeral: true
      });
    }
  },

  async handleEdit(interaction) {
    const username = interaction.options.getString('username');

    try {
      const { TwitterConfig } = require('../../models/index.js');
      const config = await TwitterConfig.findOne({
        where: {
          guildId: interaction.guild.id,
          targetUsername: username
        }
      });

      if (!config) {
        return interaction.reply({
          content: `❌ @${username} の監視設定が見つかりません`,
          ephemeral: true
        });
      }

      // 編集用モーダルを作成
      const modal = new ModalBuilder()
        .setCustomId(`twitter_edit_${config.id}`)
        .setTitle('Twitter監視設定の編集');

      const displayNameInput = new TextInputBuilder()
        .setCustomId('display_name')
        .setLabel('表示名')
        .setStyle(TextInputStyle.Short)
        .setValue(config.targetDisplayName)
        .setRequired(true);

      const channelIdInput = new TextInputBuilder()
        .setCustomId('channel_id')
        .setLabel('チャンネルID')
        .setStyle(TextInputStyle.Short)
        .setValue(config.channelId)
        .setRequired(true);

      const checkIntervalInput = new TextInputBuilder()
        .setCustomId('check_interval')
        .setLabel('監視間隔（秒）')
        .setStyle(TextInputStyle.Short)
        .setValue((config.checkInterval / 1000).toString())
        .setRequired(true);

      const embedColorInput = new TextInputBuilder()
        .setCustomId('embed_color')
        .setLabel('Embed色（16進数）')
        .setStyle(TextInputStyle.Short)
        .setValue(config.embedColor || '#1DA1F2')
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(displayNameInput);
      const secondActionRow = new ActionRowBuilder().addComponents(channelIdInput);
      const thirdActionRow = new ActionRowBuilder().addComponents(checkIntervalInput);
      const fourthActionRow = new ActionRowBuilder().addComponents(embedColorInput);

      modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);

      await interaction.showModal(modal);
    } catch (error) {
      console.error('Twitter設定編集モーダル表示エラー:', error);
      await interaction.reply({
        content: `❌ 編集モーダルの表示に失敗しました: ${error.message}`,
        ephemeral: true
      });
    }
  },

  async handleRemove(interaction) {
    const username = interaction.options.getString('username');

    try {
      const { TwitterConfig } = require('../../models/index.js');
      const config = await TwitterConfig.findOne({
        where: {
          guildId: interaction.guild.id,
          targetUsername: username
        }
      });

      if (!config) {
        return interaction.reply({
          content: `❌ @${username} の監視設定が見つかりません`,
          ephemeral: true
        });
      }

      // 削除確認用のボタンを作成
      const confirmButton = new ButtonBuilder()
        .setCustomId(`twitter_remove_confirm_${config.id}`)
        .setLabel('削除を確認')
        .setStyle(ButtonStyle.Danger);

      const cancelButton = new ButtonBuilder()
        .setCustomId(`twitter_remove_cancel_${config.id}`)
        .setLabel('キャンセル')
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder()
        .addComponents(confirmButton, cancelButton);

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🗑️ Twitter監視設定の削除確認')
        .setDescription(`@${username} の監視設定を削除しますか？`)
        .addFields(
          { name: '監視対象', value: `@${username}`, inline: true },
          { name: '表示名', value: config.targetDisplayName, inline: true },
          { name: '投稿先チャンネル', value: `#${config.channelName}`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
    } catch (error) {
      console.error('Twitter設定削除確認エラー:', error);
      await interaction.reply({
        content: `❌ 削除確認の表示に失敗しました: ${error.message}`,
        ephemeral: true
      });
    }
  },

  async handleList(interaction) {
    try {
      const { TwitterConfig } = require('../../models/index.js');
      const configs = await TwitterConfig.findAll({
        where: { guildId: interaction.guild.id }
      });

      if (configs.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#808080')
          .setTitle('📋 Twitter監視設定一覧')
          .setDescription('このサーバーにはTwitter監視設定がありません')
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        return;
      }

      const configList = configs.map(config => {
        const status = config.isActive ? '🟢 有効' : '🔴 無効';
        return `**${status}** | @${config.targetUsername} (${config.targetDisplayName}) → <#${config.channelId}>`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('📋 Twitter監視設定一覧')
        .setDescription(configList)
        .setFooter({ text: `合計: ${configs.length}件` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Twitter設定一覧表示エラー:', error);
      await interaction.reply({
        content: `❌ 設定一覧の表示に失敗しました: ${error.message}`,
        ephemeral: true
      });
    }
  },

  async handleToggle(interaction) {
    const username = interaction.options.getString('username');

    try {
      const { TwitterConfig } = require('../../models/index.js');
      const config = await TwitterConfig.findOne({
        where: {
          guildId: interaction.guild.id,
          targetUsername: username
        }
      });

      if (!config) {
        return interaction.reply({
          content: `❌ @${username} の監視設定が見つかりません`,
          ephemeral: true
        });
      }

      // 有効/無効を切り替え
      const newStatus = !config.isActive;
      await config.update({
        isActive: newStatus,
        updatedBy: interaction.user.id
      });

      const statusText = newStatus ? '🟢 有効化' : '🔴 無効化';
      const embed = new EmbedBuilder()
        .setColor(newStatus ? '#00FF00' : '#FF0000')
        .setTitle(`✅ Twitter監視設定を${statusText}しました`)
        .addFields(
          { name: '監視対象', value: `@${username}`, inline: true },
          { name: '新しい状態', value: newStatus ? '有効' : '無効', inline: true },
          { name: '投稿先チャンネル', value: `#${config.channelName}`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Twitter設定切り替えエラー:', error);
      await interaction.reply({
        content: `❌ 設定の切り替えに失敗しました: ${error.message}`,
        ephemeral: true
      });
    }
  },

  async handleBulk(interaction) {
    const action = interaction.options.getString('action');
    
    try {
      const { TwitterConfig } = require('../../models/index.js');
      const configs = await TwitterConfig.findAll({ 
        where: { guildId: interaction.guild.id } 
      });

      if (configs.length === 0) {
        return interaction.reply({
          content: '❌ このサーバーにはTwitter監視設定がありません',
          ephemeral: true
        });
      }

      let updatedCount = 0;
      let deletedCount = 0;

      switch (action) {
        case 'enable':
          for (const config of configs) {
            await config.update({ isActive: true });
            updatedCount++;
          }
          break;
        case 'disable':
          for (const config of configs) {
            await config.update({ isActive: false });
            updatedCount++;
          }
          break;
        case 'delete':
          for (const config of configs) {
            await config.destroy();
            deletedCount++;
          }
          break;
      }

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`🔄 一括操作完了: ${action}`)
        .setDescription(
          action === 'delete' 
            ? `${deletedCount}件の設定を削除しました`
            : `${updatedCount}件の設定を${action === 'enable' ? '有効化' : '無効化'}しました`
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('一括操作中にエラーが発生しました:', error);
      await interaction.reply({
        content: `❌ 一括操作に失敗しました: ${error.message}`,
        ephemeral: true
      });
    }
  }
};
