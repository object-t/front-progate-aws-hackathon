/**
 * router/index.ts
 *
 * Automatic routes for `./src/pages/*.vue`
 */

// Composables
import { createRouter, createWebHistory } from 'vue-router/auto'
import { routes } from 'vue-router/auto-routes'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// // 認証ガード
// router.beforeEach(async (to, from, next) => {
//   const authStore = useAuthStore()
  
//   // ログインページの場合は認証チェックをスキップ
//   if (to.path === '/login') {
//     next()
//     return
//   }
  
//   try {
//     // 認証状態をチェック
//     const isAuthenticated = await authStore.checkAuthStatus()
    
//     if (!isAuthenticated) {
//       // 認証されていない場合はログインページにリダイレクト
//       next('/login')
//     } else {
//       // 認証済みの場合は通常処理
//       next()
//     }
//   } catch (error) {
//     console.error('Auth guard error:', error)
//     // エラーの場合もログインページにリダイレクト
//     next('/login')
//   }
// })

// Workaround for https://github.com/vitejs/vite/issues/11804
router.onError((err, to) => {
  if (err?.message?.includes?.('Failed to fetch dynamically imported module')) {
    if (localStorage.getItem('vuetify:dynamic-reload')) {
      console.error('Dynamic import error, reloading page did not fix it', err)
    } else {
      console.log('Reloading page to fix dynamic import error')
      localStorage.setItem('vuetify:dynamic-reload', 'true')
      location.assign(to.fullPath)
    }
  } else {
    console.error(err)
  }
})

router.isReady().then(() => {
  localStorage.removeItem('vuetify:dynamic-reload')
})

export default router
