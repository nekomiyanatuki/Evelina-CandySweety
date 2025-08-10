const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { PermissionManager } = require('../../models/permissionManager.js');

const data = new SlashCommandBuilder()
  .setName('admin-st')
  .setDescription('管理者用コマンドだぞ❤')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommandGroup(group =>
    group
    // システム管理
      .setName('system')
      .setDescription('システムの管理')

    .addSubcommand(subcommand =>
      subcommand
        .setName('ping')
        .setDescription('管理用pingコマンドだぞ～❤')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('auditlog')
        .setDescription('監査ログを確認するぞ❤')
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('表示する件数')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(20)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('webhook')
        .setDescription('Webhook情報とテストを行うぞ❤')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('実行するアクション')
            .setRequired(true)
            .addChoices(
              { name: 'エンドポイント情報表示', value: 'info' },
              { name: 'Webhookテスト', value: 'test' },
              { name: 'Webhook作成', value: 'create' },
              { name: 'Webhook削除', value: 'delete' },
              { name: 'Webhook名前変更', value: 'rename' },
              { name: 'Webhook URL表示', value: 'url' }
            )
        )
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Webhookの名前（作成・名前変更時）')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('webhook_id')
            .setDescription('WebhookのID（削除・名前変更・URL表示時）')
            .setRequired(false)
        )
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName('reload')
        .setDescription('コマンドをリロードするぞ❤')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('shutdown')
        .setDescription('ボットをシャットダウンするぞ❤')
    )
  )

// 権限チェック関数
async function checkAdminPermission(member) {
  // 管理者権限のチェック
  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  // 権限付与のチェック
  const permission = await PermissionManager.findByPk(member.id);
  return !!permission;
}

async function execute(interaction) {
  try {
    // 権限チェック
    if (!await checkAdminPermission(interaction.member)) {
      await interaction.reply({
        content: 'このコマンドは管理者または権限が付与されたユーザーのみ使用できるよ❤',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const group = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    switch (group) {
      case 'system': {
        switch (subcommand) {
          case 'ping': {
            const ping = Math.round(interaction.client.ws.ping);
            await interaction.reply({
              embeds: [{
                color: 0x0099ff,
                title: '💚 AdminPing',
                fields: [
                  { name: 'レイテンシ', value: `${ping}ms`, inline: true },
                  { name: 'ステータス', value: ping < 100 ? '良好 ✅' : ping < 200 ? '普通 ⚠️' : '遅延 ❌', inline: true }
                ],
                timestamp: new Date().toISOString()
              }]
            });
            break;
          }
          case 'auditlog': {
            const limit = interaction.options.getInteger('limit') || 10;
            const auditLogs = await interaction.guild.fetchAuditLogs({ limit });
            const logEntries = auditLogs.entries.map(entry => 
              `${entry.action} by ${entry.executor.tag} at ${entry.createdAt.toLocaleString()}`
            ).join('\n');
            
            await interaction.reply({
              content: `監査ログ（最新${limit}件）:\n${logEntries}`,
              flags: MessageFlags.Ephemeral
            });
            break;
          }
          case 'webhook': {
            const action = interaction.options.getString('action');
            try {
              if (action === 'info') {
                // Webhook情報の表示
                const webhooks = await interaction.channel.fetchWebhooks();
                if (webhooks.size === 0) {
                  await interaction.reply({
                    embeds: [{
                      color: 0xff0000,
                      title: '❌ Webhook情報',
                      description: 'このチャンネルにはWebhookが設定されていません。',
                      timestamp: new Date().toISOString()
                    }],
                    flags: MessageFlags.Ephemeral
                  });
                  return;
                }

                const webhookList = webhooks.map(webhook => {
                  const owner = webhook.owner ? webhook.owner.tag : '不明';
                  return `**名前**: ${webhook.name}\n**ID**: ${webhook.id}\n**作成者**: ${owner}\n**URL**: ${webhook.url ? '設定済み' : '未設定'}`;
                }).join('\n\n');

                await interaction.reply({
                  embeds: [{
                    color: 0x0099ff,
                    title: '💚 Webhook情報',
                    description: webhookList,
                    timestamp: new Date().toISOString()
                  }],
                  flags: MessageFlags.Ephemeral
                });
              } else if (action === 'test') {
                // Webhookテスト
                const webhooks = await interaction.channel.fetchWebhooks();
                if (webhooks.size === 0) {
                  await interaction.reply({
                    embeds: [{
                      color: 0xff0000,
                      title: '❌ Webhookテスト',
                      description: 'このチャンネルにはWebhookが設定されていません。',
                      timestamp: new Date().toISOString()
                    }],
                    flags: MessageFlags.Ephemeral
                  });
                  return;
                }

                const webhook = webhooks.first();
                if (!webhook.url) {
                  await interaction.reply({
                    embeds: [{
                      color: 0xff0000,
                      title: '❌ Webhookテスト',
                      description: 'WebhookのURLが設定されていません。',
                      timestamp: new Date().toISOString()
                    }],
                    flags: MessageFlags.Ephemeral
                  });
                  return;
                }

                try {
                  await webhook.send({
                    embeds: [{
                      color: 0x0099ff,
                      title: '💚 Webhookテスト',
                      description: 'Webhookのテストメッセージです。',
                      fields: [
                        { name: 'Webhook名', value: webhook.name, inline: true },
                        { name: 'Webhook ID', value: webhook.id, inline: true },
                        { name: '作成者', value: webhook.owner ? webhook.owner.tag : '不明', inline: true }
                      ],
                      timestamp: new Date().toISOString()
                    }]
                  });

                  await interaction.reply({
                    embeds: [{
                      color: 0x00ff00,
                      title: '✅ Webhookテスト',
                      description: 'Webhookテストを実行しました。',
                      timestamp: new Date().toISOString()
                    }],
                    flags: MessageFlags.Ephemeral
                  });
                } catch (error) {
                  console.error('Webhookテストエラー:', error);
                  await interaction.reply({
                    embeds: [{
                      color: 0xff0000,
                      title: '❌ Webhookテスト',
                      description: `Webhookテストの実行中にエラーが発生しました。\nエラー: ${error.message}`,
                      timestamp: new Date().toISOString()
                    }],
                    flags: MessageFlags.Ephemeral
                  });
                }
              } else if (action === 'create') {
                // Webhook作成
                const name = interaction.options.getString('name') || 'Evelina Webhook';
                try {
                  const webhook = await interaction.channel.createWebhook({
                    name: name,
                    avatar: interaction.client.user.displayAvatarURL()
                  });

                  await interaction.reply({
                    embeds: [{
                      color: 0x00ff00,
                      title: '✅ Webhook作成',
                      description: `Webhookを作成しました。\n**名前**: ${webhook.name}\n**ID**: ${webhook.id}\n**URL**: ${webhook.url}`,
                      timestamp: new Date().toISOString()
                    }],
                    flags: MessageFlags.Ephemeral
                  });
                } catch (error) {
                  console.error('Webhook作成エラー:', error);
                  await interaction.reply({
                    embeds: [{
                      color: 0xff0000,
                      title: '❌ Webhook作成',
                      description: `Webhookの作成中にエラーが発生しました。\nエラー: ${error.message}`,
                      timestamp: new Date().toISOString()
                    }],
                    flags: MessageFlags.Ephemeral
                  });
                }
              } else if (action === 'delete') {
                // Webhook削除
                const webhookId = interaction.options.getString('webhook_id');
                if (!webhookId) {
                  await interaction.reply({
                    embeds: [{
                      color: 0xff0000,
                      title: '❌ Webhook削除',
                      description: 'WebhookのIDを指定してください。',
                      timestamp: new Date().toISOString()
                    }],
                    flags: MessageFlags.Ephemeral
                  });
                  return;
                }

                try {
                  const webhooks = await interaction.channel.fetchWebhooks();
                  const webhook = webhooks.find(w => w.id === webhookId);
                  
                  if (!webhook) {
                    await interaction.reply({
                      embeds: [{
                        color: 0xff0000,
                        title: '❌ Webhook削除',
                        description: '指定されたIDのWebhookが見つかりません。',
                        timestamp: new Date().toISOString()
                      }],
                      flags: MessageFlags.Ephemeral
                    });
                    return;
                  }

                  await webhook.delete();
                  await interaction.reply({
                    embeds: [{
                      color: 0x00ff00,
                      title: '✅ Webhook削除',
                      description: `Webhookを削除しました。\n**名前**: ${webhook.name}\n**ID**: ${webhook.id}`,
                      timestamp: new Date().toISOString()
                    }],
                    flags: MessageFlags.Ephemeral
                  });
                } catch (error) {
                  console.error('Webhook削除エラー:', error);
                  await interaction.reply({
                    embeds: [{
                      color: 0xff0000,
                      title: '❌ Webhook削除',
                      description: `Webhookの削除中にエラーが発生しました。\nエラー: ${error.message}`,
                      timestamp: new Date().toISOString()
                    }],
                    flags: MessageFlags.Ephemeral
                  });
                }
              } else if (action === 'rename') {
                // Webhook名前変更
                const webhookId = interaction.options.getString('webhook_id');
                const newName = interaction.options.getString('name');

                if (!webhookId || !newName) {
                  await interaction.reply({
                    embeds: [{
                      color: 0xff0000,
                      title: '❌ Webhook名前変更',
                      description: 'WebhookのIDと新しい名前を指定してください。',
                      timestamp: new Date().toISOString()
                    }],
                    flags: MessageFlags.Ephemeral
                  });
                  return;
                }

                try {
                  const webhooks = await interaction.channel.fetchWebhooks();
                  const webhook = webhooks.find(w => w.id === webhookId);
                  
                  if (!webhook) {
                    await interaction.reply({
                      embeds: [{
                        color: 0xff0000,
                        title: '❌ Webhook名前変更',
                        description: '指定されたIDのWebhookが見つかりません。',
                        timestamp: new Date().toISOString()
                      }],
                      flags: MessageFlags.Ephemeral
                    });
                    return;
                  }

                  await webhook.edit({ name: newName });
                  await interaction.reply({
                    embeds: [{
                      color: 0x00ff00,
                      title: '✅ Webhook名前変更',
                      description: `Webhookの名前を変更しました。\n**新しい名前**: ${newName}\n**ID**: ${webhook.id}`,
                      timestamp: new Date().toISOString()
                    }],
                    flags: MessageFlags.Ephemeral
                  });
                } catch (error) {
                  console.error('Webhook名前変更エラー:', error);
                  await interaction.reply({
                    embeds: [{
                      color: 0xff0000,
                      title: '❌ Webhook名前変更',
                      description: `Webhookの名前変更中にエラーが発生しました。\nエラー: ${error.message}`,
                      timestamp: new Date().toISOString()
                    }],
                    flags: MessageFlags.Ephemeral
                  });
                }
              } else if (action === 'url') {
                // Webhook URL表示
                const webhookId = interaction.options.getString('webhook_id');
                if (!webhookId) {
                  await interaction.reply({
                    embeds: [{
                      color: 0xff0000,
                      title: '❌ Webhook URL表示',
                      description: 'WebhookのIDを指定してください。',
                      timestamp: new Date().toISOString()
                    }],
                    flags: MessageFlags.Ephemeral
                  });
                  return;
                }

                try {
                  const webhooks = await interaction.channel.fetchWebhooks();
                  const webhook = webhooks.find(w => w.id === webhookId);
                  
                  if (!webhook) {
                    await interaction.reply({
                      embeds: [{
                        color: 0xff0000,
                        title: '❌ Webhook URL表示',
                        description: '指定されたIDのWebhookが見つかりません。',
                        timestamp: new Date().toISOString()
                      }],
                      flags: MessageFlags.Ephemeral
                    });
                    return;
                  }

                  if (!webhook.url) {
                    await interaction.reply({
                      embeds: [{
                        color: 0xff0000,
                        title: '❌ Webhook URL表示',
                        description: 'このWebhookにはURLが設定されていません。',
                        timestamp: new Date().toISOString()
                      }],
                      flags: MessageFlags.Ephemeral
                    });
                    return;
                  }

                  await interaction.reply({
                    embeds: [{
                      color: 0x0099ff,
                      title: '💚 Webhook URL',
                      description: `**名前**: ${webhook.name}\n**ID**: ${webhook.id}\n**URL**: ${webhook.url}`,
                      timestamp: new Date().toISOString()
                    }],
                    flags: MessageFlags.Ephemeral
                  });
                } catch (error) {
                  console.error('Webhook URL表示エラー:', error);
                  await interaction.reply({
                    embeds: [{
                      color: 0xff0000,
                      title: '❌ Webhook URL表示',
                      description: `WebhookのURL表示中にエラーが発生しました。\nエラー: ${error.message}`,
                      timestamp: new Date().toISOString()
                    }],
                    flags: MessageFlags.Ephemeral
                  });
                }
              }
            } catch (error) {
              console.error('Webhookコマンドエラー:', error);
              await interaction.reply({
                embeds: [{
                  color: 0xff0000,
                  title: '❌ エラー',
                  description: `コマンドの実行中にエラーが発生しました。\nエラー: ${error.message}`,
                  timestamp: new Date().toISOString()
                }],
                flags: MessageFlags.Ephemeral
              });
            }
            break;
          }
          case 'reload': {
            // コマンドのリロード
            await interaction.reply({
              content: 'コマンドをリロード中...❤',
              flags: MessageFlags.Ephemeral
            });
            break;
          }
          case 'shutdown': {
            // ボットのシャットダウン
            await interaction.reply({
              content: 'ボットをシャットダウンします...❤',
              flags: MessageFlags.Ephemeral
            });
            break;
          }
        }
        break;
      }
    }
  } catch (error) {
    await interaction.reply({
      content: error.message || 'エラーが発生したよ❤',
      flags: MessageFlags.Ephemeral
    });
  }
}

module.exports = {
  data,
  execute
}; 