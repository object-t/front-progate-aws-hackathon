<template>
  <Header
    class="header"
    :money="money"
  />
  <div class="container">
    <LayerTab
      class="layer-tab"
      @set-setting="setSetting"
    />
    <PlayBoard />
    <div>
      <div>
        <InfoTab
          class="info-tab"
          @set-hidden="setHidden"
          @update:compute-subnet="updateComputeSubnet"
        />
      </div>
      <div class="tools">
        <div
          class="validation-button"
          v-tooltip:start="'機能要件をチェックできます'"
          @click="openFeatureValidationDialog"
        >
          ✓
        </div>
        <component
          :is="ICONS.bedrock.component"
          v-tooltip:start="'メンズコーチにレビューをもらえます'"
          @click="openMensCoachDialog"
        />
        <component
          :is="ICONS.cost_explorer.component"
          v-tooltip:start="'コストを確認できます'"
          @click="openCostDialog"
        />
      </div>
    </div>

    <!-- ダイアログコンポーネント -->
    <CostExplorerDialog v-model="costDialogOpen" />
    <MensCoachDialog v-model="mensCoachDialogOpen" />
    <FeatureValidationDialog v-model="featureValidationDialogOpen" />
  </div>
</template>

<script lang="ts" setup>
  import type { BaseResource } from '@/types/service.ts'
  import { ref } from 'vue'
  import Header from '@/components/Header.vue'
  import InfoTab from '@/components/info/InfoTab.vue'
  import LayerTab from '@/components/layer/LayerTab.vue'
  import PlayBoard from '@/components/board/PlayBoard.vue'
  import CostExplorerDialog from '@/components/utils/CostExplorerDialog.vue'
  import MensCoachDialog from '@/components/utils/MensCoachDialog.vue'
  import FeatureValidationDialog from '@/components/utils/FeatureValidationDialog.vue'
  import { useVpcList } from '@/composables/useVpcList'
  import { ICONS } from '@/icons'

  const hidden = ref(true)
  const money = ref(0)
  const setting = ref<BaseResource | null>(null)
  const costDialogOpen = ref(false)
  const mensCoachDialogOpen = ref(false)
  const featureValidationDialogOpen = ref(false)

  const { updateComputeSubnet } = useVpcList()

  const setHidden = (value: boolean) => hidden.value = value
  const setSetting = (service: BaseResource) => setting.value = service

  const openCostDialog = () => {
    costDialogOpen.value = true
  }

  const openMensCoachDialog = () => {
    mensCoachDialogOpen.value = true
  }

  const openFeatureValidationDialog = () => {
    featureValidationDialogOpen.value = true
  }
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

.header {
  position: fixed;
  z-index: 101;
  background: #f3f3f3;
}

.info-tab {
  position: fixed;
  right: -532px;
}

.layer-tab {
  position: fixed;
  left: 0;
  height: 100vh;
}

.info-tab, .layer-tab {
  padding-top: 60px;
  background: #f3f3f3;
  z-index: 100;
  overflow-y: auto;
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

  .validation-button {
    background: linear-gradient(135deg, #2e7d32, #66bb6a);
    color: white;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
  }
}
</style>
