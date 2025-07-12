<template>
  <v-dialog v-model="dialogOpen" persistent max-width="500">
    <v-card class="month-end-card">
      <v-card-title class="text-center pa-6 bg-primary text-white">
        <div class="title-content">
          <v-icon size="32" class="mb-2">mdi-calendar-check</v-icon>
          <h2 class="text-h5 font-weight-bold">{{ completedMonth }} 月末結果</h2>
        </div>
      </v-card-title>

      <v-card-text class="pa-6">
        <!-- 月間サマリー -->
        <div class="month-summary mb-6">
          <v-row>
            <v-col cols="6">
              <div class="stat-item">
                <v-icon color="success" class="mb-2">mdi-currency-usd</v-icon>
                <div class="stat-label">収益</div>
                <div class="stat-value text-success">+${{ monthlyRevenue.toLocaleString() }}</div>
              </div>
            </v-col>
            <v-col cols="6">
              <div class="stat-item">
                <v-icon color="error" class="mb-2">mdi-trending-down</v-icon>
                <div class="stat-label">支出</div>
                <div class="stat-value text-error">-${{ monthlyCosts.toLocaleString() }}</div>
              </div>
            </v-col>
          </v-row>
          
          <v-divider class="my-4" />
          
          <div class="net-result">
            <v-icon :color="netProfit >= 0 ? 'success' : 'error'" class="mr-2">
              {{ netProfit >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}
            </v-icon>
            <span class="text-h6 font-weight-bold" :class="netProfit >= 0 ? 'text-success' : 'text-error'">
              純利益: {{ netProfit >= 0 ? '+' : '' }}${{ netProfit.toLocaleString() }}
            </span>
          </div>
        </div>

        <!-- 詳細情報 -->
        <v-expansion-panels v-if="details.length > 0" variant="accordion">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon class="mr-2">mdi-information</v-icon>
              詳細情報
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <ul class="details-list">
                <li v-for="(detail, index) in details" :key="index" class="mb-2">
                  <v-icon size="16" :color="detail.type === 'success' ? 'success' : detail.type === 'warning' ? 'warning' : 'info'" class="mr-2">
                    {{ getDetailIcon(detail.type) }}
                  </v-icon>
                  {{ detail.message }}
                </li>
              </ul>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <!-- アドバイス -->
        <v-alert
          v-if="advice"
          :type="netProfit >= 0 ? 'success' : 'warning'"
          variant="tonal"
          class="mt-4"
        >
          <v-icon slot="prepend">mdi-lightbulb</v-icon>
          {{ advice }}
        </v-alert>
      </v-card-text>

      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          size="large"
          @click="closeDialog"
          block
        >
          次の月へ進む
          <v-icon end>mdi-arrow-right</v-icon>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface MonthEndDetail {
  type: 'success' | 'warning' | 'info' | 'error'
  message: string
}

interface Props {
  modelValue: boolean
  completedMonth: string
  monthlyRevenue: number
  monthlyCosts: number
  details?: MonthEndDetail[]
  advice?: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'continue'): void
}

const props = withDefaults(defineProps<Props>(), {
  details: () => [],
  advice: ''
})

const emit = defineEmits<Emits>()

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const netProfit = computed(() => props.monthlyRevenue - props.monthlyCosts)

const getDetailIcon = (type: string) => {
  switch (type) {
    case 'success': return 'mdi-check-circle'
    case 'warning': return 'mdi-alert-circle'
    case 'error': return 'mdi-close-circle'
    default: return 'mdi-information'
  }
}

const closeDialog = () => {
  emit('update:modelValue', false)
  emit('continue')
}
</script>

<style lang="scss" scoped>
.month-end-card {
  border-radius: 16px !important;
}

.title-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.month-summary {
  .stat-item {
    text-align: center;
    
    .stat-label {
      font-size: 0.875rem;
      color: #666;
      margin-bottom: 4px;
    }
    
    .stat-value {
      font-size: 1.25rem;
      font-weight: bold;
    }
  }
  
  .net-result {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background-color: #f8f9fa;
    border-radius: 8px;
  }
}

.details-list {
  list-style: none;
  padding: 0;
  margin: 0;
  
  li {
    display: flex;
    align-items: center;
    padding: 4px 0;
  }
}

// アニメーション
.month-end-card {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>