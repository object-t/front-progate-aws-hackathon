import type { BaseResource } from '@/types/service.ts'
import { ref } from 'vue'

const hidden = ref<boolean>(false)
const setting = ref<BaseResource | null>(null)

export const useInfo = () => {
  return {
    hidden,
    setting,
  }
}
