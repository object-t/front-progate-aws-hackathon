import type { BaseResource } from '@/types/service.ts'
import { ref, watch } from 'vue'

const services = ref<BaseResource[]>([])

export const useServiceList = () => {
  const validateServiceDeletion = (serviceId: string): { canDelete: boolean, reason?: string } => {
    const service = services.value.find(s => s.id === serviceId)
    if (!service) {
      return { canDelete: false, reason: 'サービスが見つかりません' }
    }

    // Elastic IPの削除バリデーション
    if (service.type === 'elastic_ip' && service.isAttached) {
      return { canDelete: false, reason: 'Elastic IPが他のリソースにアタッチされています。先にアタッチを解除してください' }
    }

    return { canDelete: true }
  }

  const deleteService = (serviceId: string): { success: boolean, reason?: string } => {
    const validation = validateServiceDeletion(serviceId)
    if (!validation.canDelete) {
      return { success: false, reason: validation.reason }
    }

    const serviceIndex = services.value.findIndex(s => s.id === serviceId)
    if (serviceIndex !== -1) {
      services.value.splice(serviceIndex, 1)
      return { success: true }
    }

    return { success: false, reason: 'サービスが見つかりません' }
  }

  const updateServiceOrder = (serviceIds: string[]) => {
    serviceIds.forEach((serviceId, index) => {
      const service = services.value.find(s => s.id === serviceId)
      if (service) {
        service.order = index
      }
    })
  }

  const setServices = (newServices: BaseResource[]) => {
    services.value = newServices
  }

  return {
    services,
    validateServiceDeletion,
    deleteService,
    updateServiceOrder,
    setServices,
  }
}