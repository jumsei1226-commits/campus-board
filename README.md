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
    service-worker-register.tsx PWA用Service Worker登録
    ui.tsx           ボタン/入力などの共通UI
  lib/
    date.ts          締切・通知予定・曜日ロジック
    supabase.ts      Supabaseクライアント
    types.ts         DB型定義
supabase/
  schema.sql         テーブル、RLS、トリガー
public/
  manifest.json      PWA manifest
  sw.js              オフライン表示用Service Worker
  offline.html       オフライン時の最低限画面
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
- API操作用のauthenticated権限付与
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
- ダッシュボードへの通知予定課題表示
- PWA manifest、アイコン、standalone表示、オフライン画面
- 保存中、読み込み中、成功、エラー表示
- スマホ対応レイアウト

## 手動テストチェックリスト

- [ ] Googleログインできる
- [ ] 未ログイン状態で `/dashboard` にアクセスするとログイン画面へ移動する
- [ ] 時間割ページで授業を追加でき、追加後に「授業を追加しました」と表示される
- [ ] 追加した授業が週表示とスマホ用カードに表示される
- [ ] 時間割を編集できる
- [ ] 時間割を削除できる
- [ ] 課題を追加できる
- [ ] 課題を完了にできる
- [ ] 締切3日前、前日、当日の課題が目立つ表示になる
- [ ] ダッシュボードに通知予定の課題が表示される
- [ ] 別ユーザーでログインしたとき、他人の時間割や課題が見えない
- [ ] スマホ幅でログイン、ダッシュボード、時間割、課題管理、設定の表示が崩れていない
- [ ] スマホのホーム画面に追加したとき、Campus Boardとしてstandalone表示される
- [ ] オフライン時に最低限のオフライン画面が表示される

## 今後追加すべき機能案

- ブラウザ通知とプッシュ通知
- 課題の繰り返し登録
- 時間割の学期切り替え
- カレンダー表示
- 課題に添付ファイルやURLを保存
- 授業ごとの課題一覧
- 通知時刻の個別設定
- 学食、バイト、SNSなどの追加は利用頻度を検証してから段階的に実装
