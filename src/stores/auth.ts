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
  // State
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
  }

  // Google認証でサインイン
  const loginWithGoogle = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Starting Google OAuth with current location:', window.location.href)
      console.log('Expected redirect URL:', window.location.origin)
      
      // OAuth経由でGoogle認証を開始（リダイレクト方式）
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
      
      await signOut()
      setUser(null)
      
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
      
      const currentUser = await getCurrentUser()
      const session = await fetchAuthSession()
      
      if (currentUser && session.tokens?.idToken) {
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
        return userData
      }
    } catch (err: any) {
      console.error('Fetch user error:', err)
      setUser(null)
      
      // 認証エラーの場合はログイン画面にリダイレクト
      if (err.name === 'UserUnAuthenticatedException' || err.name === 'NotAuthorizedException') {
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

  // アクセストークンを取得
  const getAccessToken = async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession()
      return session.tokens?.accessToken?.toString() || null
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
          payload: accessToken.payload,
          header: accessToken.header
        },
        idToken: {
          token: idToken.toString(),
          payload: idToken.payload,
          header: idToken.header
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