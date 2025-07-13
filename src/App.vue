<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
  //
</script>

<style>
/* グローバルv-iconの位置修正 */
.v-icon {
  vertical-align: middle !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* ボタン内のv-iconの調整 */
.v-btn .v-icon {
  margin: 0 !important;
}

/* テキストと並ぶv-iconの調整 */
.v-icon.mr-1,
.v-icon.mr-2,
.v-icon.ml-1,
.v-icon.ml-2 {
  display: inline-flex !important;
  vertical-align: middle !important;
}

/* ダイアログタイトル内のアイコン */
.v-card-title .v-icon {
  vertical-align: middle !important;
  line-height: 1 !important;
}

/* 小さなアイコンの調整 */
.v-icon[size="16"],
.v-icon[size="small"] {
  font-size: 16px !important;
  width: 16px !important;
  height: 16px !important;
}

/* 大きなアイコンの調整 */
.v-icon[size="32"] {
  font-size: 32px !important;
  width: 32px !important;
  height: 32px !important;
}

.v-icon[size="48"] {
  font-size: 48px !important;
  width: 48px !important;
  height: 48px !important;
}

.v-icon[size="64"] {
  font-size: 64px !important;
  width: 64px !important;
  height: 64px !important;
}
</style>
