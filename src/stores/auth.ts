import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { signInWithRedirect, signOut, getCurrentUser, fetchAuthSession } from '@aws-amplify/auth'

export interface CognitoUser {
  username: string
  email: string
  email_verified: boolean
  sub: string
  name?: string
  picture?: string
}

export const useAuthStore = defineStore('auth', () => {
  // State (セキュリティのためトークンはメモリ上のみ)
  const user = ref<CognitoUser | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!user.value)
  const userName = computed(() => user.value?.name || user.value?.email || '')
  const userEmail = computed(() => user.value?.email || '')

  // Actions
  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  const setError = (errorMessage: string | null) => {
    error.value = errorMessage
  }

  const setUser = (userData: CognitoUser | null) => {
    user.value = userData
    // セキュリティのためユーザー情報もlocalStorageに保存しない
    console.log(userData ? '✅ ユーザー情報をメモリに設定' : '🗑️ ユーザー情報をクリア')
  }

  // Google認証でサインイン
  const loginWithGoogle = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Starting Google OAuth with current location:', window.location.href)
      console.log('Expected redirect URL:', window.location.origin)
      
      // 既存のセッションがある場合は強制的にサインアウト（アカウント選択を表示するため）
      try {
        await signOut()
        console.log('Existing session cleared for account selection')
      } catch (signOutError) {
        console.log('No existing session to clear:', signOutError)
      }
      
      // OAuth経由でGoogle認証を開始（リダイレクト方式）
      // 毎回アカウント選択画面を表示
      await signInWithRedirect({
        provider: 'Google'
      })
      
      // 認証後のリダイレクトはCognitoが自動で処理
    } catch (err: any) {
      console.error('Google login error:', err)
      setError(err.message || 'ログインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // サインアウト
  const logout = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 ログアウト処理開始')
      await signOut()
      setUser(null)
      console.log('✅ Amplifyセッションをクリア')
      
      // ログイン画面にリダイレクト
      window.location.href = '/login'
    } catch (err: any) {
      console.error('Logout error:', err)
      setError(err.message || 'ログアウトに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 現在のユーザー情報を取得
  const fetchCurrentUser = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 ユーザー情報取得開始')
      const currentUser = await getCurrentUser()
      const session = await fetchAuthSession()
      
      if (currentUser && session.tokens?.idToken) {
        console.log('✅ Amplifyセッション有効')
        const payload = session.tokens.idToken.payload
        
        const userData: CognitoUser = {
          username: currentUser.username,
          email: payload.email as string,
          email_verified: payload.email_verified as boolean,
          sub: payload.sub as string,
          name: payload.name as string,
          picture: payload.picture as string
        }
        
        setUser(userData)
        console.log('✅ ユーザー情報をメモリに設定完了')
        return userData
      }
    } catch (err: any) {
      console.error('Fetch user error:', err)
      setUser(null)
      
      // 認証エラーの場合はログイン画面にリダイレクト
      if (err.name === 'UserUnAuthenticatedException' || err.name === 'NotAuthorizedException') {
        console.log('❌ 認証エラー: ログイン画面にリダイレクト')
        window.location.href = '/login'
      }
    } finally {
      setLoading(false)
    }
    
    return null
  }

  // セッションの有効性をチェック
  const checkAuthStatus = async () => {
    try {
      const session = await fetchAuthSession()
      
      if (session.tokens?.accessToken) {
        // セッションが有効な場合、ユーザー情報を取得
        await fetchCurrentUser()
        return true
      } else {
        setUser(null)
        return false
      }
    } catch (err) {
      console.error('Auth status check error:', err)
      setUser(null)
      return false
    }
  }

  // エラーをクリア
  const clearError = () => {
    setError(null)
  }

  // アクセストークンを取得（Amplifyセッションから直接取得）
  const getAccessToken = async (): Promise<string | null> => {
    try {
      console.log('🔄 アクセストークン取得開始')
      const session = await fetchAuthSession()
      
      if (session.tokens?.idToken) {
        console.log('✅ Amplifyからアクセストークン取得成功')
        return session.tokens.idToken.toString()
      } else {
        console.log('❌ Amplifyセッションにトークンがありません')
        return null
      }
    } catch (err) {
      console.error('Failed to get access token:', err)
      return null
    }
  }

  // トークンの詳細情報を取得（デバッグ用）
  const getTokenInfo = async () => {
    try {
      const session = await fetchAuthSession()
      const accessToken = session.tokens?.accessToken
      const idToken = session.tokens?.idToken
      
      if (!accessToken || !idToken) {
        return null
      }

      return {
        accessToken: {
          token: accessToken.toString(),
          payload: accessToken.payload
        },
        idToken: {
          token: idToken.toString(),
          payload: idToken.payload
        },
        expiresAt: accessToken.payload.exp ? new Date(accessToken.payload.exp * 1000) : null
      }
    } catch (err) {
      console.error('Failed to get token info:', err)
      return null
    }
  }

  return {
    // State
    user,
    isLoading,
    error,
    
    // Getters
    isAuthenticated,
    userName,
    userEmail,
    
    // Actions
    loginWithGoogle,
    logout,
    fetchCurrentUser,
    checkAuthStatus,
    clearError,
    setLoading,
    setError,
    setUser,
    getAccessToken,
    getTokenInfo
  }
})