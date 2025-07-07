import type { BaseResource } from '@/types/service.ts'
import { ref, watch } from 'vue'

const loadInitialData = (): BaseResource[] => {
  const savedData = localStorage.getItem('service-list-data')
  try {
    return savedData ? JSON.parse(savedData) : []
  } catch (error) {
    console.error('Failed to parse data from localStorage', error)
    return []
  }
}

const services = ref<BaseResource[]>(loadInitialData())

watch(
  services,
  newVpcList => {
    localStorage.setItem('service-list-data', JSON.stringify(newVpcList))
  },
  { deep: true },
)

export const useServiceList = () => {
  return {
    services,
  }
}
