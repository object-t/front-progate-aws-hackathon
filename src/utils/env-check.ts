// 環境変数の設定確認用ユーティリティ

export const checkEnvVars = () => {
  const requiredVars = [
    'VITE_COGNITO_USER_POOL_ID',
    'VITE_COGNITO_USER_POOL_CLIENT_ID', 
    'VITE_COGNITO_REGION',
    'VITE_COGNITO_DOMAIN'
  ]

  console.log('🔍 環境変数チェック:')
  
  const missingVars: string[] = []
  const configuredVars: string[] = []

  requiredVars.forEach(varName => {
    const value = import.meta.env[varName]
    if (!value || value.includes('xxxxxxxxx') || value.includes('your-')) {
      missingVars.push(varName)
      console.log(`❌ ${varName}: 未設定または例の値`)
    } else {
      configuredVars.push(varName)
      console.log(`✅ ${varName}: 設定済み`)
    }
  })

  console.log('\n📋 設定状況:')
  console.log(`✅ 設定済み: ${configuredVars.length}/${requiredVars.length}`)
  console.log(`❌ 未設定: ${missingVars.length}/${requiredVars.length}`)

  if (missingVars.length > 0) {
    console.log('\n🚨 以下の環境変数を.envファイルで設定してください:')
    missingVars.forEach(varName => {
      console.log(`   ${varName}`)
    })
    return false
  }

  console.log('\n🎉 すべての環境変数が設定されています！')
  return true
}

// 現在の設定値を表示（デバッグ用）
export const showCurrentConfig = () => {
  console.log('\n🔧 現在のCognito設定:')
  console.log('User Pool ID:', import.meta.env.VITE_COGNITO_USER_POOL_ID)
  console.log('Client ID:', import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID)
  console.log('Region:', import.meta.env.VITE_COGNITO_REGION)
  console.log('Domain:', import.meta.env.VITE_COGNITO_DOMAIN)
  console.log('Redirect Sign In:', import.meta.env.VITE_OAUTH_REDIRECT_SIGN_IN)
  console.log('Redirect Sign Out:', import.meta.env.VITE_OAUTH_REDIRECT_SIGN_OUT)
}