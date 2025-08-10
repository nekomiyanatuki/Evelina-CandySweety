const { DataTypes } = require('sequelize');
const sequelize = require('../config/database.js');
const { PermissionFlagsBits, MessageFlags } = require('discord.js');

const InviteLimit = sequelize.define('InviteLimit', {
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true
  },
  dailyCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastReset: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  lastInvite: {
    type: DataTypes.DATE,
    defaultValue: null
  },
  cooldown: {
    type: DataTypes.INTEGER,
    defaultValue: 300 // デフォルト5分（秒単位）
  }
});

// 権限管理用のモデル
const PermissionManager = sequelize.define('PermissionManager', {
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true
  },
  grantedBy: {
    type: DataTypes.STRING,
    allowNull: false
  },
  grantedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// 日次リセットのチェック
async function checkDailyReset(userId) {
  const user = await InviteLimit.findByPk(userId);
  if (!user) {
    return await InviteLimit.create({ userId });
  }

  const now = new Date();
  const lastReset = new Date(user.lastReset);
  
  // 日付が変わっている場合、カウントをリセット
  if (now.getDate() !== lastReset.getDate() || 
      now.getMonth() !== lastReset.getMonth() || 
      now.getFullYear() !== lastReset.getFullYear()) {
    user.dailyCount = 0;
    user.lastReset = now;
    await user.save();
  }
  
  return user;
}

// 権限チェック
async function checkPermission(userId, member) {
  // 管理者権限のチェック
  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  // 権限付与のチェック
  const permission = await PermissionManager.findByPk(userId);
  return !!permission;
}

// 権限の付与
async function grantPermission(userId, grantedBy) {
  if (!await PermissionManager.findByPk(userId)) {
    await PermissionManager.create({
      userId,
      grantedBy
    });
  }
}

// 権限の剥奪
async function revokePermission(userId) {
  await PermissionManager.destroy({
    where: { userId }
  });
}

// 招待URLの作成制限チェックと自動応答
async function checkInviteLimit(userId, channel) {
  const user = await checkDailyReset(userId);
  const now = new Date();

  // クールダウンチェック
  if (user.lastInvite) {
    const timeSinceLastInvite = (now - new Date(user.lastInvite)) / 1000;
    if (timeSinceLastInvite < user.cooldown) {
      const message = `もう少し待ってね❤\nあと${Math.ceil(user.cooldown - timeSinceLastInvite) / 60}分待ってね～`;
      await channel.send({
        content: `<@${userId}> ${message}`,
        flags: MessageFlags.Ephemeral
      });
      return {
        allowed: false,
        reason: 'cooldown',
        remainingTime: Math.ceil(user.cooldown - timeSinceLastInvite)
      };
    }
  }

  // 1日の制限チェック（デフォルト10回）
  if (user.dailyCount >= 5) {
    const message = `今日の招待URL作成回数が上限に達したよ❤\nまた明日ね～`;
    await channel.send({
      content: `<@${userId}> ${message}`,
      flags: MessageFlags.Ephemeral
    });
    return {
      allowed: false,
      reason: 'daily_limit',
      remainingTime: 86400 - ((now - new Date(user.lastReset)) / 1000)
    };
  }

  // 制限を更新
  user.dailyCount += 1;
  user.lastInvite = now;
  await user.save();

  return {
    allowed: true,
    remainingCount: 10 - user.dailyCount
  };
}

// クールダウン時間の設定
async function setCooldown(userId, seconds, member) {
  // 権限チェック
  if (!await checkPermission(userId, member)) {
    throw new Error('この操作は管理者または権限が付与されたユーザーのみ実行できます');
  }

  const user = await InviteLimit.findByPk(userId);
  if (user) {
    user.cooldown = seconds;
    await user.save();
  }
}

module.exports = {
  InviteLimit,
  PermissionManager,
  checkInviteLimit,
  setCooldown,
  grantPermission,
  revokePermission
}; 