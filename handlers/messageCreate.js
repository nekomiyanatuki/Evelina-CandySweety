const path = require('path');
const { ndnDice } = require('../commands/utils/dice.js');

module.exports = async(message) => {

  if (message.content.match(/port:3000|ポート:3000|BotURL|Botリンク/)) {
    await message.reply(`[https://local_front_end:3000.com](http://localhost:3000/)`);
  }

  if (message.content.match(/ぽてと|ポテト|じゃがいも|ジャガイモ|🥔|🍟/)) {
    await message.react("🥔");
  }
  
  if (message.content.match(/^\d+d\d+$/)) {
    await message.reply(ndnDice(message.content));
  }

  if (message.content.match(/にゃん|にゃーん|にゃ～ん/)) {
    await message.reply("にゃ...にゃ～ん///");
  }
  
  if (message.content.match(/lol|草/)) {
    await message.reply("くっさぁ❤///");
  }
  
  if (message.content.match(/ざ～こ|雑魚|クソザコ|ざこざこ/)) {
    await message.reply("ざっこぉ❤///");
  }
  
  if (message.content.match(/おはよう|おはよ/)) {
    await message.reply("おはよ～調査官！");
  }

  if (message.content.match(/こんにちは|こんにちわ|こんちゃ/)) {
    await message.reply("こんにちはだよ～調査官❤");
  }
  
  if (message.content.match(/こんばんは|こんばんわ|こんこん/)) {
    await message.reply("こんばんわだよ～調査官❤");
  }
  
  if (message.content.match(/おやすみ|おやす/)) {
    await message.reply("おやすみ～調査官！");
  } //キミ、もう寝るの？え、なにを気にしてるのかって？も、もう💕わ、わかってるくせに///
  
  if (message.content.match(/何を|なにを/)) {
    await message.reply("ね～");
  }
  
  if (message.content.match(/イブちゃま|イブち/)) {
    await message.reply("なになに～？くそざこ調査官、お姉ちゃんのこと呼んだ～？❤///");
  }

  // 古のﾈｯﾄﾐｰﾑパッチ
  if (message.content.match(/ぬるぽ/)) {
    await message.reply(`\`\`\`
  （・∀・）　　　|　|　ｶﾞｯ
  と　　　　）　　 |　|
  　Ｙ　/ ノ　　 人
  　 /　）　　 〈　〉__Λ∩
  ＿/し'　／／.　Ｖ｀Д´）/ ←>>1
  （＿フ彡　　　　　 　　/
  \`\`\``);
  }
  

  // ﾜﾙﾁｬ民パッチ
  if (message.content.match(/ラブカ/)) {
    await message.reply("か弱界い門アカ網クロ目Love科詐欺族海鮮属亜種");
  } // か弱いアカの黒ラブカ 界門網目科族属種(族は無くてもよい)
}; 