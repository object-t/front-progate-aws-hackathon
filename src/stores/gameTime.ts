import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useGameTimeStore = defineStore('gameTime', () => {
  const startDate = ref(new Date())
  const monthsElapsed = ref(0)
  const isGameRunning = ref(false)
  const isPaused = ref(false)
  const timerId = ref<number | null>(null)
  const progressTimerId = ref<number | null>(null)
  const secondsInCurrentMonth = ref(0)
  const monthEndCallback = ref<(() => void) | null>(null)

  // 現在のゲーム内日付を計算
  const currentGameDate = computed(() => {
    const date = new Date(startDate.value)
    date.setMonth(date.getMonth() + monthsElapsed.value)
    return date
  })

  // フォーマットされた日付文字列 (yyyy/MM)
  const formattedDate = computed(() => {
    const date = currentGameDate.value
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${year}/${month}`
  })

  // プログレスバーの進行度（0-100%）
  const monthProgress = computed(() => {
    // 1ヶ月 = 60秒なので、現在の秒数 / 60 * 100
    return Math.min((secondsInCurrentMonth.value / 180) * 100, 100)
  })

  // ゲーム開始
  const startGame = () => {
    if (isGameRunning.value) return

    // 現在の日付でゲームを開始
    startDate.value = new Date()
    monthsElapsed.value = 0
    secondsInCurrentMonth.value = 0
    isGameRunning.value = true

    // 1秒ごとにプログレスバーを更新
    progressTimerId.value = window.setInterval(() => {
      // 一時停止中は進めない
      if (isPaused.value) return
      
      secondsInCurrentMonth.value++
      
      // 60秒経ったら月を進める
      if (secondsInCurrentMonth.value >= 180) {
        monthsElapsed.value++
        secondsInCurrentMonth.value = 0
        console.log('月が進みました:', formattedDate.value)
        
        // 月末コールバックを実行（一時停止）
        if (monthEndCallback.value) {
          pauseGame()
          monthEndCallback.value()
        }
      }
    }, 1000)

    console.log('ゲーム開始:', formattedDate.value)
  }

  // ゲーム停止
  const stopGame = () => {
    if (timerId.value) {
      clearInterval(timerId.value)
      timerId.value = null
    }
    if (progressTimerId.value) {
      clearInterval(progressTimerId.value)
      progressTimerId.value = null
    }
    isGameRunning.value = false
    isPaused.value = false
    console.log('ゲーム停止')
  }

  // ゲーム一時停止
  const pauseGame = () => {
    isPaused.value = true
    console.log('ゲーム一時停止')
  }

  // ゲーム再開
  const resumeGame = () => {
    isPaused.value = false
    console.log('ゲーム再開')
  }

  // ゲームリセット
  const resetGame = () => {
    stopGame()
    monthsElapsed.value = 0
    secondsInCurrentMonth.value = 0
    startDate.value = new Date()
  }

  // 月末コールバックを設定
  const setMonthEndCallback = (callback: () => void) => {
    monthEndCallback.value = callback
  }

  // 手動で月を進める（デバッグ用）
  const advanceMonth = () => {
    monthsElapsed.value++
    secondsInCurrentMonth.value = 0
  }

  return {
    monthsElapsed,
    isGameRunning,
    isPaused,
    currentGameDate,
    formattedDate,
    monthProgress,
    secondsInCurrentMonth,
    startGame,
    stopGame,
    pauseGame,
    resumeGame,
    resetGame,
    advanceMonth,
    setMonthEndCallback
  }
})