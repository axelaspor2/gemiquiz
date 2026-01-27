# GemiQuiz

Google Gemini AI を使用して GCP 認定試験の学習クイズを自動生成し、Discord に投稿するツールです。

## 特徴

- **自動クイズ生成**: Google Gemini API を使用して、GCP 認定試験に基づいたクイズを自動生成
- **Discord 連携**: Webhook 経由でクイズを Discord チャンネルに投稿
- **トピックローテーション**: 試験ドメインを網羅的にカバーする自動トピック選択
- **難易度調整**: 曜日に応じた難易度設定（月〜水: Easy、木〜金: Medium、週末: Hard）
- **投票統計**: Discord のリアクションを集計し、正答率を表示

## 対応試験

- **PMLE**: Professional Machine Learning Engineer
- **PDE**: Professional Data Engineer
