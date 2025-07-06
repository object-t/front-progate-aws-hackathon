<template>
  <div class="header">
    <div class="left">
    </div>
    <div class="right">
      <h1>資金: ${{ props.money }}</h1>
    </div>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  money: Number
}>();
</script>

<style scoped>
.header {
  width: 100vw;
  height: 60px;
  box-shadow: 0 4px 12px #b8b8b828;
  z-index: 100;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
}
</style>