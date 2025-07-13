/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_BACKEND_API: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_DEFAULT_SANDBOX_SCENARIO_ID: string
  // AWS Cognito関連
  readonly VITE_COGNITO_USER_POOL_ID: string
  readonly VITE_COGNITO_USER_POOL_CLIENT_ID: string
  readonly VITE_COGNITO_REGION: string
  readonly VITE_COGNITO_DOMAIN: string
  readonly VITE_OAUTH_REDIRECT_SIGN_IN: string
  readonly VITE_OAUTH_REDIRECT_SIGN_OUT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}