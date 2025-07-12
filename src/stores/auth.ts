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
    setUser
  }
})