# Cloudflare D1 + R2 セットアップガイド

このガイドでは、Cloudflare D1（データベース）とR2（画像ストレージ）をセットアップする方法を説明します。

## 前提条件

- Cloudflareアカウント
- Node.js 18以上
- wranglerがインストールされていること

```bash
npm install -g wrangler
```

## 1. Cloudflareにログイン

```bash
wrangler login
```

## 2. D1データベースの作成

```bash
# データベースを作成
wrangler d1 create shooting-master-db

# 出力されたdatabase_idをwrangler.tomlにコピー
```

`wrangler.toml`の`database_id`を更新:

```toml
[[d1_databases]]
binding = "DB"
database_name = "shooting-master-db"
database_id = "ここに出力されたIDを入力"
```

## 3. データベーススキーマの適用

```bash
# ローカル環境
wrangler d1 execute shooting-master-db --local --file=schema.sql

# 本番環境
wrangler d1 execute shooting-master-db --remote --file=schema.sql
```

## 4. R2バケットの作成

```bash
wrangler r2 bucket create shooting-master-images
```

## 5. ローカル開発

```bash
# Viteの開発サーバーを起動
npm run dev

# 別ターミナルでWranglerを起動（APIのみ）
wrangler pages dev dist --d1=DB=shooting-master-db --r2=IMAGES=shooting-master-images
```

## 6. デプロイ

```bash
# ビルド
npm run build

# Cloudflare Pagesにデプロイ
wrangler pages deploy dist
```

## 7. 本番環境でのバインディング設定

Cloudflareダッシュボードで:

1. Pages > プロジェクト > Settings > Functions
2. D1 database bindings: `DB` → `shooting-master-db`
3. R2 bucket bindings: `IMAGES` → `shooting-master-images`

## 使い方

1. アプリの「設定」画面を開く
2. 「クラウド同期」セクションで「クラウドにアップロード」をクリック
3. 別のデバイスで「クラウドからダウンロード」をクリックしてデータを同期

## トラブルシューティング

### API呼び出しが401エラーを返す
- ユーザーIDがanonymousになっている可能性があります
- Firebase認証でログインするか、設定でユーザー情報を入力してください

### データベース接続エラー
- wrangler.tomlのdatabase_idが正しいか確認
- スキーマが適用されているか確認

```bash
wrangler d1 execute shooting-master-db --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
```
