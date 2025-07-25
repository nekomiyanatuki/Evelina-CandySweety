const { EmbedBuilder } = require("discord.js");
const Notification = require("../models/notification.js");

module.exports = async (oldState, newState) => {
  if (oldState.channelId === null && newState.channel?.members.size == 1){
    const notifications = await Notification.findAll({
      where: {
        guildId: newState.guild.id,
        voiceChannelId: newState.channel.id,
      },
    });
    
    const mainChannelId = [1314672866410889226];

    // 招待リンクの生成（1時間有効）
    if (newState.channelId === "1314672866410889226") {
      const invite = await newState.channel.createInvite({ maxAge: 3600 });
      const channel = await newState.guild.channels.fetch(1314672866410889226);
      await channel.send(`<@${newState.member.id}> が通話を開始したみたいだぞ❤\n${invite.url}`);
    }

    const embed = new EmbedBuilder()
      .setColor(0x5cb85c)
      .setAuthor({ name: newState.member.displayName, iconURL: newState.member.displayAvatarURL()})
      .setTitle(`<#${newState.channel.id}> で通話が開始したぞ❤`)
      .setTimestamp();
    
    await Promise.all(
      notifications.map(async n => {
        const channel = await newState.guild.channels.fetch(1314672866410889226);
        await channel.send({ embeds: [embed] });
      })
    );
  }
};

/*createInvite({ maxAge: 0 }); 時間表（秒単位）
1時間: 3600 | 1時間30分: 5400 | 2時間: 7200 | 2時間30分: 9000
3時間: 10800 | 3時間30分: 12600 | 4時間: 14400 | 4時間30分: 16200
5時間: 18000 | 5時間30分: 19800 | 6時間: 21600 | 6時間30分: 23400
7時間: 25200 | 7時間30分: 27000 | 8時間: 28800 | 8時間30分: 30600
9時間: 32400 | 9時間30分: 34200 | 10時間: 36000 | 10時間30分: 37800
11時間: 39600 | 11時間30分: 41400 | 12時間: 43200 | 12時間30分: 45000
無期限: 0 | 30分: 1800 */

/*時間単位換算表
Second(秒): 1
Minute(分): 60
Hour(時間): 3600
Day(日): 86400
Week(週): 604800
Month(月): 2592000
Year(年): 31536000 */

/*干支周期表（秒単位）
子(ね)鼠: 31536000 | 丑(うし)牛: 63072000 | 寅(とら)虎: 94608000 | 卯(う)兎: 126144000
辰(たつ)龍: 157680000 | 巳(み)蛇: 189216000 | 午(うま)馬: 220752000 | 未(ひつじ)羊: 252288000
申(さる)猿: 283824000 | 酉(とり)鳥: 315360000 | 戌(いぬ)犬: 346896000 | 亥(い)猪: 378432000 */ 