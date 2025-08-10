# Evelina-CandySweety Discord Bot

本リポジトリは Discord Bot「Evelina-CandySweety」のソースコードを公開したものです。

## 概要
- 開発者: nekomiyanatuki
- 所属: 猫宮の街（NMC）
- 関連作品: FUNDOLL Japan Inc.「#CatFantasy」
- [開発紹介](./Info.md): Discord・SNS

## 利用規約・免責事項
利用に際しては [利用規約・免責事項（詳細）](./policy.md) もしくは [利用規約・免責事項（簡易版）](./
simple_policy.md)を必ずご確認ください。

## ライセンス
このリポジトリのコードは [MIT License](./LICENSE.md) に従って利用できます。
ただし、商用利用を希望する場合は別途 [当社への連絡] もしくは [商用ライセンス条項] の追加をご相談くださ
い。

## その他
- このBotは Discord のAPIポリシーに従って運用されています。

猫宮の街 Discord Bot プロジェクト

## 🆕 新機能：X（旧Twitter）投稿監視

指定されたXアカウントの新規投稿を自動でDiscordチャンネルに投稿する機能を追加しました。

### 🚀 セットアップ手順

#### 1. 必要なパッケージのインストール
```bash
npm install twitter-api-v2 node-cron
```

#### 2. 環境変数の設定
`.env`ファイルに以下の設定を追加してください：

```env
# X（旧Twitter）API設定
# Twitter Developer Portal (https://developer.twitter.com/) で取得
TWITTER_API_KEY=your_twitter_api_key_here
TWITTER_API_SECRET=your_twitter_api_secret_here
TWITTER_ACCESS_TOKEN=your_twitter_access_token_here
TWITTER_ACCESS_SECRET=your_twitter_access_secret_here
TWITTER_BEARER_TOKEN=your_twitter_bearer_token_here

# 監視対象アカウント設定
TARGET_TWITTER_USERNAME=example_user
TARGET_DISPLAY_NAME=Example User
TARGET_DISCORD_CHANNEL_ID=1234567890123456789

# 監視設定
TWITTER_CHECK_INTERVAL=300000
EMBED_COLOR=#1DA1F2
EMBED_FOOTER=🐦 X投稿監視Bot

# 除外設定
EXCLUDE_RETWEETS=false
EXCLUDE_REPLIES=false
EXCLUDE_QUOTES=false
```

#### 3. Twitter Developer Portalでの設定
1. [Twitter Developer Portal](https://developer.twitter.com/) にアクセス
2. アプリケーションを作成
3. API Key、API Secret、Access Token、Access Secretを取得
4. Bearer Tokenを取得（読み取り専用の場合）

### 📱 使用方法

#### Discordコマンド
- `/twitter start` - Twitter投稿監視を開始
- `/twitter stop` - Twitter投稿監視を停止
- `/twitter status` - 監視状態を表示
- `/twitter check` - 手動でツイート確認を実行
- `/twitter config` - 設定を表示

#### 自動投稿の特徴
- 🎨 美しいEmbed形式で投稿
- 📊 いいね数、リツイート数、返信数を表示
- 🔗 ツイートへの直接リンク
- 🖼️ メディア添付対応
- ⏰ 投稿時刻の表示
- 🏷️ ハッシュタグとメンションの装飾

### ⚙️ カスタマイズ

`config/twitter.js`ファイルで以下の設定を変更できます：
- 監視間隔
- 埋め込み色
- 除外する投稿タイプ
- 監視対象アカウント

### 🔧 トラブルシューティング

#### よくある問題
1. **API認証エラー**: 環境変数が正しく設定されているか確認
2. **チャンネルが見つからない**: DiscordチャンネルIDが正しいか確認
3. **投稿が表示されない**: 監視が開始されているか確認

#### ログの確認
コンソールで以下のログを確認してください：
- ✅ Twitter API クライアントが初期化されました
- 🔄 Twitter投稿監視を開始しました
- 📝 ツイートをDiscordに投稿しました

### 📝 注意事項

- Twitter APIの利用制限に注意してください
- 監視間隔は5分以上に設定することを推奨します
- 管理者権限を持つユーザーのみがコマンドを実行できます

---

## 🎯 既存機能

- Discord Bot機能
- MCPサーバー
- Webサーバー
- データベース管理
- コマンドシステム
