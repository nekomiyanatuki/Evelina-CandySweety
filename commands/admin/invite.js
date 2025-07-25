const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { setCooldown, grantPermission, revokePermission } = require('../../models/inviteLimit.js');
const { PermissionManager } = require('../../models/permissionManager.js');

const data = new SlashCommandBuilder()
  .setName('admin-iv')
  .setDescription('管理者専用コマンドだぞ❤')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommandGroup(group =>
    group
    // 招待URL管理
      .setName('invite')
      .setDescription('招待URLの管理')
      .addSubcommand(subcommand =>
        subcommand
          .setName('cooldown')
          .setDescription('招待URLのクールダウン時間を設定する')
          .addIntegerOption(option =>
            option.setName('seconds')
              .setDescription('クールダウン時間（秒）')
              .setRequired(true)
              .setMinValue(0)
              .setMaxValue(43200)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('grant')
          .setDescription('設定権限を付与する')
          .addUserOption(option =>
            option.setName('user')
              .setDescription('権限を付与するユーザー')
              .setRequired(true)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('revoke')
          .setDescription('設定権限を剥奪する')
          .addUserOption(option =>
            option.setName('user')
              .setDescription('権限を剥奪するユーザー')
              .setRequired(true)
          )
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
      case 'invite': {
        switch (subcommand) {
          case 'cooldown': {
            const seconds = interaction.options.getInteger('seconds');
            await setCooldown(interaction.user.id, seconds, interaction.member);
          
            await interaction.reply({
              content: `クールダウン時間を${seconds}秒に設定したよ❤`,
              flags: MessageFlags.Ephemeral
            });
            break;
          }
          case 'grant': {
            // grantコマンドは管理者のみ使用可能
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
              await interaction.reply({
                content: '権限の付与は管理者のみ実行できるよ❤',
                flags: MessageFlags.Ephemeral
              });
              return;
            }

            const targetUser = interaction.options.getUser('user');
            await grantPermission(targetUser.id, interaction.user.id);
          
            await interaction.reply({
              content: `<@${targetUser.id}> に設定権限を付与したよ❤`,
              flags: MessageFlags.Ephemeral
            });
            break;
          }
          case 'revoke': {
            // revokeコマンドは管理者のみ使用可能
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
              await interaction.reply({
                content: '権限の剥奪は管理者のみ実行できるよ❤',
                flags: MessageFlags.Ephemeral
              });
              return;
            }

            const targetUser = interaction.options.getUser('user');
            await revokePermission(targetUser.id);
          
            await interaction.reply({
              content: `<@${targetUser.id}> の設定権限を剥奪したよ❤`,
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