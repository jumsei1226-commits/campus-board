# Campus Board

大学生向けの「時間割 + 課題管理 + 通知判定」MVPです。Next.js、TypeScript、Tailwind CSS、Supabase Auth/Database、Vercelデプロイを前提にしています。

## フォルダ構成

```txt
src/
  app/
    assignments/     課題管理ページ
    dashboard/       ダッシュボード
    login/           ログイン/新規登録
    settings/        設定ページ
    timetable/       時間割ページ
    globals.css
    layout.tsx
    page.tsx
  components/
    app-shell.tsx    認証ガード付き共通レイアウト
    ui.tsx           ボタン/入力などの共通UI
  lib/
    date.ts          締切・通知予定・曜日ロジック
    supabase.ts      Supabaseクライアント
    types.ts         DB型定義
supabase/
  schema.sql         テーブル、RLS、トリガー
```

## セットアップ手順

1. 依存関係をインストールします。

```bash
npm install
```

2. Supabaseで新規プロジェクトを作成します。
3. Supabase SQL Editorで `supabase/schema.sql` を実行します。
4. Authentication > Providers で Email と Google を有効化します。
5. `.env.local.example` を参考に `.env.local` を作成します。

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

6. 開発サーバーを起動します。

```bash
npm run dev
```

## SupabaseのSQL

SQLは [supabase/schema.sql](./supabase/schema.sql) にあります。含まれる内容は以下です。

- `profiles`
- `classes`
- `assignments`
- `updated_at` 更新トリガー
- 新規ユーザー作成時のプロフィール自動作成
- RLS有効化
- ユーザーごとに自分のデータだけ参照/追加/更新/削除できるポリシー

## .env.localに必要な環境変数

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` は Supabase の Project Settings > API から取得します。

## Vercelデプロイ手順

1. GitHubにこのリポジトリをpushします。
2. VercelでNew Projectからリポジトリを選択します。
3. Environment Variablesに以下を追加します。

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

4. Supabase Authentication > URL Configurationで、VercelのURLをSite URLに設定します。
5. Googleログインを使う場合は、Google Cloud Console側のOAuthリダイレクトURIに Supabase のコールバックURLを登録します。
6. VercelでDeployします。

## 実装済み機能

- Supabase Authによるメール/パスワード登録・ログイン
- Googleログイン
- 未ログインユーザーの利用制限
- 時間割の登録・編集・削除
- 時間割の週表示
- 課題の登録・編集・削除
- 課題の完了/未完了切り替え
- 締切が近い順の課題表示
- 締切3日前、前日、当日、期限切れの強調表示
- 今日の授業、直近の課題、未完了課題数のダッシュボード
- 通知予定課題の判定ロジック
- スマホ対応レイアウト

## 今後追加すべき機能案

- ブラウザ通知とプッシュ通知
- 課題の繰り返し登録
- 時間割の学期切り替え
- カレンダー表示
- 課題に添付ファイルやURLを保存
- 授業ごとの課題一覧
- PWA対応
- 通知時刻の個別設定
- 学食、バイト、SNSなどの追加は利用頻度を検証してから段階的に実装
