# 🐾 Pet Spirit Canvas

**ペット幻想合成画像メーカー** — ペットの写真を風景に幻想的に合成してSNSで共有できるWebアプリ

👉 **[アプリを使う](https://pet-spirit-canvas.pages.dev)**

---

## 機能

- 🌄 風景画像のアップロード（1枚）
- 🐱 ペット画像のアップロード（最大3枚）
- ✂️ ブラウザ内での背景自動除去
- 🖼 キャンバス上でのドラッグ・サイズ・透明度・回転調整
- 📐 レイヤー順の変更
- ⬇️ PNG形式でのダウンロード
- 𝕏 Xへの投稿導線

## 技術スタック

| | |
|---|---|
| フロントエンド | Vue 3 + TypeScript + Vite |
| キャンバス | Konva.js |
| 背景除去 | @imgly/background-removal (ONNX Runtime Web) |
| 状態管理 | Pinia |
| ホスティング | Cloudflare Pages |

## ローカル開発

```bash
cd app
npm install
npm run dev
```

## ビルド

```bash
cd app
npm run build
```

## CI/CD（GitHub Actions → Cloudflare Pages）

mainブランチへのpushで自動デプロイが走ります。

初回セットアップ時は以下の GitHub Secrets が必要です：

| Secret | 内容 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) → "Edit Cloudflare Workers" テンプレートで作成（Pages:Edit権限追加） |
| `CLOUDFLARE_ACCOUNT_ID` | `3c0a53b8900a8ffc94c3e5386ea99736`（設定済み） |

## 設計方針

- バックエンドなし・完全クライアントサイド処理
- ユーザー画像はサーバー保存しない
- 静的サイトとしてCloudflare Pagesで公開
