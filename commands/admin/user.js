const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');
const { PermissionManager } = require('../../models/permissionManager.js');

const data = new SlashCommandBuilder()
  .setName('admin-ur')
  .setDescription('管理者用コマンドだぞ❤')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommandGroup(group =>
    group
    // ユーザー管理
      .setName('user')
      .setDescription('ユーザーの管理')

    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('ユーザー情報を表示する')
        .addUserOption(option =>
          option.setName('target')
            .setDescription('情報を表示するユーザー')
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
      case 'user': {
        switch (subcommand) {
          case 'info': {
            const targetUser = interaction.options.getUser('target');
            const member = await interaction.guild.members.fetch(targetUser.id);
            
            await interaction.reply({
              content: `ユーザー名: ${targetUser.username}\n参加日: ${member.joinedAt.toLocaleDateString()}\nロール数: ${member.roles.cache.size}`,
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