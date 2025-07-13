import { Amplify } from 'aws-amplify'

// 環境変数からCognito設定を取得
const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || '',
      signUpVerificationMethod: 'code' as const,
      loginWith: {
        oauth: {
          domain: `${import.meta.env.VITE_COGNITO_DOMAIN || 'YOUR_COGNITO_DOMAIN'}.auth.ap-northeast-1.amazoncognito.com`,
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [import.meta.env.VITE_OAUTH_REDIRECT_SIGN_IN || 'http://localhost:3000/'],
          redirectSignOut: [import.meta.env.VITE_OAUTH_REDIRECT_SIGN_OUT || 'http://localhost:3000/login'],
          responseType: 'code' as const,
          providers: ['Google' as const]
        }
      }
    }
  }
}

// Amplifyを初期化
export const configureAmplify = () => {
  try {
    console.log('Configuring Amplify with:', {
      userPoolId: awsConfig.Auth.Cognito.userPoolId,
      userPoolClientId: awsConfig.Auth.Cognito.userPoolClientId,
      domain: awsConfig.Auth.Cognito.loginWith.oauth.domain,
      redirectSignIn: awsConfig.Auth.Cognito.loginWith.oauth.redirectSignIn,
      redirectSignOut: awsConfig.Auth.Cognito.loginWith.oauth.redirectSignOut,
      env_vars: {
        VITE_USER_POOL_ID: import.meta.env.VITE_USER_POOL_ID,
        VITE_USER_POOL_CLIENT_ID: import.meta.env.VITE_USER_POOL_CLIENT_ID,
        VITE_COGNITO_DOMAIN: import.meta.env.VITE_COGNITO_DOMAIN,
        VITE_OAUTH_REDIRECT_SIGN_IN: import.meta.env.VITE_OAUTH_REDIRECT_SIGN_IN,
        VITE_OAUTH_REDIRECT_SIGN_OUT: import.meta.env.VITE_OAUTH_REDIRECT_SIGN_OUT
      }
    })
    Amplify.configure(awsConfig)
    console.log('Amplify configured successfully')
  } catch (error) {
    console.error('Error configuring Amplify:', error)
  }
}

// 設定の検証
export const validateAmplifyConfig = () => {
  const requiredEnvVars = [
    'VITE_USER_POOL_ID',
    'VITE_USER_POOL_CLIENT_ID',
    'VITE_COGNITO_DOMAIN'
  ]
  
  const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName])
  
  if (missingVars.length > 0) {
    console.warn('Missing required environment variables:', missingVars)
    return false
  }
  
  return true
}
