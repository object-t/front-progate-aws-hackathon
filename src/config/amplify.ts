import { Amplify } from 'aws-amplify'

// 環境変数からCognito設定を取得
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID || '',
      region: import.meta.env.VITE_COGNITO_REGION || 'ap-northeast-1',
      
      // OAuth設定（Google認証用）
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_COGNITO_DOMAIN || '',
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: import.meta.env.VITE_OAUTH_REDIRECT_SIGN_IN || `${window.location.origin}/`,
          redirectSignOut: import.meta.env.VITE_OAUTH_REDIRECT_SIGN_OUT || `${window.location.origin}/login`,
          responseType: 'code' as const,
          providers: [{
            custom: 'Google'
          }]
        }
      }
    }
  }
}

// Amplifyを初期化
export const configureAmplify = () => {
  try {
    Amplify.configure(amplifyConfig)
    console.log('Amplify configured successfully')
  } catch (error) {
    console.error('Error configuring Amplify:', error)
  }
}

// 設定の検証
export const validateAmplifyConfig = () => {
  const requiredEnvVars = [
    'VITE_COGNITO_USER_POOL_ID',
    'VITE_COGNITO_USER_POOL_CLIENT_ID',
    'VITE_COGNITO_DOMAIN'
  ]
  
  const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName])
  
  if (missingVars.length > 0) {
    console.warn('Missing required environment variables:', missingVars)
    return false
  }
  
  return true
}