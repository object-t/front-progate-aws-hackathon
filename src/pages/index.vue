<template>
  <div class="home-container">
    <v-container class="py-16">
      <!-- ヒーローセクション -->
      <v-row class="mb-12">
        <v-col cols="12" class="text-center">
          <h1 class="text-h3 font-weight-bold mb-4 text-primary">
            AWS アーキテクチャビルダー
          </h1>
          <p class="text-h6 text-medium-emphasis mb-8">
            ドラッグ&ドロップでAWSアーキテクチャ図を作成しよう
          </p>
        </v-col>
      </v-row>

      <!-- メインアクションボタン -->
      <v-row justify="center" class="mb-16">
        <v-col cols="12" sm="6" md="4" class="d-flex">
          <v-card
            class="flex-grow-1 action-card"
            elevation="4"
            hover
            @click="startGame"
          >
            <v-card-text class="text-center pa-8">
              <v-icon
                size="64"
                color="primary"
                class="mb-4"
              >
                mdi-play-circle
              </v-icon>
              <h3 class="text-h5 font-weight-bold mb-2">
                ゲームを開始
              </h3>
              <p class="text-body-1 text-medium-emphasis">
                新しいアーキテクチャ図を作成する
              </p>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6" md="4" class="d-flex">
          <v-card
            class="flex-grow-1 action-card"
            elevation="4"
            hover
            @click="viewDiagrams"
          >
            <v-card-text class="text-center pa-8">
              <v-icon
                size="64"
                color="secondary"
                class="mb-4"
              >
                mdi-file-document-multiple
              </v-icon>
              <h3 class="text-h5 font-weight-bold mb-2">
                構成図一覧
              </h3>
              <p class="text-body-1 text-medium-emphasis">
                保存された構成図を確認・編集
              </p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

// ゲーム開始
const startGame = () => {
  router.push('/play')
}

// 構成図一覧表示
const viewDiagrams = () => {
  router.push('/diagrams')
}
</script>

<style lang="scss" scoped>
.home-container {
  min-height: calc(100vh - 60px);
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.action-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 16px !important;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
  }
}

.feature-card {
  border-radius: 12px !important;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1) !important;
  }
}

// レスポンシブ対応
@media (max-width: 600px) {
  .home-container {
    .v-container {
      padding: 16px;
    }
    
    .text-h3 {
      font-size: 2rem !important;
    }
    
    .text-h6 {
      font-size: 1.2rem !important;
    }
  }
}
</style>