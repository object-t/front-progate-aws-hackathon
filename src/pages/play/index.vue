<template>
  <Header
    :money="money"
  />
  <div class="container">
    <LayerTab
      class="layer-tab"
      @set-setting="setSetting"
    />
    <div class="frame" />
    <div>
      <div class="info-tab">
        <InfoTab
          :hidden="hidden"
          :setting="setting"
          @set-hidden="setHidden"
        />
      </div>
      <div class="tools">
        <component
          :is="ICONS.bedrock.component"
          v-tooltip:start="'メンズコーチにレビューをもらえます'"
        />
        <component
          :is="ICONS.cost_explorer.component"
          v-tooltip:start="'コストを確認できます'"
        />
      </div>
    </div>

  </div>
</template>

<script lang="ts" setup>
  import type { VpcService } from '@/types/service.ts'
  import { ref } from 'vue'
  import Header from '@/components/Header.vue'
  import InfoTab from '@/components/info/InfoTab.vue'
  import LayerTab from '@/components/layer/LayerTab.vue'
  import { ICONS } from '@/icons'

  const hidden = ref(true)
  const money = ref(0)
  const setting = ref<VpcService | null>(null)

  const setHidden = (value: boolean) => hidden.value = value
  const setSetting = (service: VpcService) => setting.value = service
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: row;
}

.frame {
  width: 100vw;
  height: 100vh;
  z-index: 0;
}

.info-tab {
  position: fixed;
  right: 0;
}

.layer-tab {
  position: fixed;
  left: 0;
  height: 100%;
}

.info-tab, .layer-tab {
  z-index: 100;
}

.tools {
  position: fixed;
  right: 12px;
  bottom: 12px;
  width: 42px;
  z-index: 101;

  > * {
    width: 42px;
    height: 42px;
    box-shadow: 0 4px 12px rgb(165, 165, 165);
    cursor: pointer;
    transition: transform 0.3s ease;
    margin: 4px 0;

    &:hover {
      transform: translateY(-4px);
    }
  }
}
</style>
