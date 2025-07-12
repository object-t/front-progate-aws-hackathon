# AWS Cognito Google認証 セットアップガイド

このアプリケーションではAWS CognitoとGoogle認証を統合しています。以下の手順で設定を完了してください。

## 📋 必要な設定

### 1. 環境変数の設定

`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
# AWS Cognito設定
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
VITE_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_REGION=ap-northeast-1
VITE_COGNITO_DOMAIN=your-cognito-domain.auth.ap-northeast-1.amazoncognito.com

# OAuth リダイレクトURL
VITE_OAUTH_REDIRECT_SIGN_IN=http://localhost:3000/
VITE_OAUTH_REDIRECT_SIGN_OUT=http://localhost:3000/login
```

### 2. AWS Cognito設定

#### ユーザープール作成
1. AWS Consoleで**Amazon Cognito**サービスを開く
2. **ユーザープールを作成**をクリック
3. 以下の設定で進む：
   - **サインインエクスペリエンス**: Email
   - **セキュリティ要件**: デフォルト
   - **サインアップエクスペリエンス**: デフォルト
   - **必須属性**: email, name
   - **メッセージ配信**: Cognitoで送信
   - **統合**: アプリクライアントを作成

#### アプリクライアント設定
1. 作成したユーザープールのアプリ統合タブを開く
2. **アプリクライアント**セクションで設定：
   - **コールバックURL**: `http://localhost:3000/`, `https://your-domain.com/`
   - **サインアウトURL**: `http://localhost:3000/login`, `https://your-domain.com/login`
   - **OAuth フロー**: Authorization code grant
   - **OAuth スコープ**: email, openid, profile

#### Google Identity Provider設定
1. ユーザープールの**サインインエクスペリエンス**タブを開く
2. **フェデレーテッドアイデンティティプロバイダーサインイン**セクションで**追加**
3. **Google**を選択し、以下を設定：
   - **Google クライアントID**: Google Developer Consoleで取得
   - **Google クライアントシークレット**: Google Developer Consoleで取得
   - **承認スコープ**: email openid profile

#### Hosted UI設定
1. **アプリ統合**タブの**Hosted UI**セクションで設定
2. **Cognito ドメイン**を設定（例: `your-app-name`）
3. **カスタマイズ**で必要に応じてUIをカスタマイズ

### 3. Google Cloud Console設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. **APIs & Services** > **認証情報**を開く
3. **認証情報を作成** > **OAuth 2.0 クライアントID**
4. 以下を設定：
   - **アプリケーションの種類**: ウェブアプリケーション
   - **承認済みのリダイレクトURI**: 
     - `https://your-cognito-domain.auth.ap-northeast-1.amazoncognito.com/oauth2/idpresponse`

## 🚀 使用方法

### 認証フロー

1. **ログイン**: `/login`ページでGoogleボタンをクリック
2. **Google認証**: Googleの認証画面でログイン
3. **リダイレクト**: 認証成功後、メインページ（`/`）にリダイレクト
4. **ログアウト**: ヘッダーのメニューからログアウト

### 認証ガード

- `/login`以外のすべてのページで認証が必要
- 未認証ユーザーは自動的に`/login`にリダイレクト
- 認証状態はPiniaストアで管理

### 認証ストア使用例

```typescript
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// 認証状態をチェック
console.log(authStore.isAuthenticated)

// ユーザー情報を取得
console.log(authStore.user)

// ログアウト
await authStore.logout()
```

## 🔧 実装詳細

### ファイル構成

```
src/
├── stores/
│   └── auth.ts              # 認証ストア（Pinia）
├── config/
│   └── amplify.ts           # Amplify設定
├── pages/
│   └── login.vue            # ログインページ
├── components/
│   └── Header.vue           # ヘッダー（ログアウト機能）
└── router/
    └── index.ts             # ルーター（認証ガード）
```

### 主要機能

- ✅ **Google OAuth認証**: AWS Cognito経由
- ✅ **認証ガード**: 未認証時の自動リダイレクト  
- ✅ **ユーザー情報管理**: Piniaストアで状態管理
- ✅ **レスポンシブデザイン**: モバイル対応
- ✅ **エラーハンドリング**: 認証エラーの適切な処理

## 🐛 トラブルシューティング

### よくある問題

1. **環境変数が読み込まれない**
   - ファイル名が`.env`であることを確認
   - サーバーを再起動

2. **Cognitoドメインエラー**
   - CognitoドメインがAWS Consoleで正しく設定されているか確認
   - リダイレクトURLが正確に設定されているか確認

3. **Google認証エラー**
   - Google Cloud ConsoleでOAuth 2.0設定を確認
   - リダイレクトURIがCognitoのものと一致するか確認

4. **認証ループ**
   - ブラウザのキャッシュとCookieをクリア
   - Cognitoの設定を再確認

## 📝 注意事項

- 本番環境では必ずHTTPS URLを使用
- 環境変数ファイル（`.env`）をGitにコミットしない
- セキュリティのため定期的にクライアントシークレットをローテーション
- CORSエラーが発生した場合はCognito設定を確認