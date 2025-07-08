import type { AzName, VpcResource } from '@/types/service.ts'
import { ref, watch } from 'vue'
import { ICONS } from '@/icons'
import { isDatabaseService, isMultiSubnetService, isSingleSubnetService } from '@/types/service.ts'

const loadInitialData = (): VpcResource[] => {
  const savedData = localStorage.getItem('vpc-list-data')
  try {
    const data = savedData ? JSON.parse(savedData) : []
    // 既存データのマイグレーション（AZ情報がない場合の対応）
    return data.map((vpc: any) => migrateVpcData(vpc))
  } catch (error) {
    console.error('Failed to parse data from localStorage', error)
    return []
  }
}

// 既存VPCデータのマイグレーション処理
const migrateVpcData = (vpc: any): VpcResource => {
  // AZ情報がない場合はデフォルトAZを作成
  if (!vpc.availabilityZones || vpc.availabilityZones.length === 0) {
    const defaultAzId = crypto.randomUUID()

    vpc.availabilityZones = [{
      id: defaultAzId,
      name: 'Availability Zone A',
      type: 'az',
      vpcId: vpc.vpcId,
      azName: 'a' as AzName,
    }]

    // 既存サブネットにazIdを追加
    vpc.subnets = vpc.subnets?.map((subnet: any) => ({
      ...subnet,
      azId: subnet.azId || defaultAzId,
    })) || []
  }

  return vpc as VpcResource
}

const vpcList = ref<VpcResource[]>(loadInitialData())

watch(
  vpcList,
  newVpcList => {
    localStorage.setItem('vpc-list-data', JSON.stringify(newVpcList))
    console.log(JSON.stringify(newVpcList, null, 2))
  },
  { deep: true },
)

export const useVpcList = () => {
  const addResource = (vpcId: string, service: string) => {
    const vpc = vpcList.value.find(vpc => vpc.vpcId === vpcId)
    if (!vpc) {
      return
    }

    const iconType = ICONS[`${service}`].type.toLowerCase()
    console.log(iconType)

    if (isMultiSubnetService(service) || isSingleSubnetService(service)) {
      vpc.computes.push({
        id: crypto.randomUUID(),
        name: service,
        type: service,
        vpcId,
        subnetIds: [vpc.subnets.find(s => s.isDefault)?.id ?? ''],
      })
    } else if (isDatabaseService(service)) {
      vpc.databases.push({
        id: crypto.randomUUID(),
        name: service,
        type: service,
        vpcId,
        subnetIds: [vpc.subnets.find(s => s.isDefault)?.id ?? ''],
      })
    } else {
      switch (iconType) {
        case 'networking': {
          const newNetwork = {
            id: crypto.randomUUID(),
            name: service,
            type: service,
            vpcId,
          } as any

          // NAT Gatewayの場合は追加プロパティを初期化
          if (service === 'nat_gateway') {
            newNetwork.subnetId = undefined
            newNetwork.elasticIpId = undefined
          }

          vpc.networks.push(newNetwork)
          break
        }
        case 'subnet': {
          // デフォルトAZまたは最初のAZにサブネットを作成
          const defaultAz = vpc.availabilityZones.find(az => az.azName === 'a') || vpc.availabilityZones[0]
          if (!defaultAz) {
            console.warn(`No AZ available for subnet creation in VPC ${vpcId}`)
            return
          }

          vpc.subnets.push({
            id: crypto.randomUUID(),
            name: `${service}_${crypto.randomUUID().replace('-', '').slice(0, 10)}`,
            type: service,
            vpcId,
            azId: defaultAz.id,
            isDefault: false,
          })
          break
        }
        default: {
          break
        }
      }
    }
  }

  const deleteVpc = (vpcId: string) => {
    vpcList.value.splice(vpcList.value.findIndex(v => v.vpcId === vpcId), 1)
  }

  const newVpc = () => {
    const vpcId = crypto.randomUUID()
    const azId = crypto.randomUUID()
    const subnetId = crypto.randomUUID()

    vpcList.value.push({
      vpcId,
      vpc: {
        id: vpcId,
        name: `vpc_${crypto.randomUUID().replace('-', '').slice(0, 10)}`,
        type: 'vpc',
      },
      availabilityZones: [
        {
          id: azId,
          name: 'Availability Zone A',
          type: 'az',
          vpcId,
          azName: 'a',
        },
      ],
      subnets: [
        {
          id: subnetId,
          name: `default_subnet_${crypto.randomUUID().replace('-', '').slice(0, 10)}`,
          vpcId,
          azId, // AZに関連付け
          isDefault: true,
          type: 'private_subnet',
        },
      ],
      networks: [],
      computes: [],
      databases: [],
    })
  }

  // AZ管理機能
  const addAvailabilityZone = (vpcId: string, azName: AzName) => {
    const vpc = vpcList.value.find(vpc => vpc.vpcId === vpcId)
    if (!vpc) {
      return
    }

    // 既に同じAZ名が存在するかチェック
    if (vpc.availabilityZones.some(az => az.azName === azName)) {
      console.warn(`AZ ${azName} already exists in VPC ${vpcId}`)
      return
    }

    const azId = crypto.randomUUID()
    vpc.availabilityZones.push({
      id: azId,
      name: `Availability Zone ${azName.toUpperCase()}`,
      type: 'az',
      vpcId,
      azName,
    })

    return azId
  }

  const deleteAvailabilityZone = (vpcId: string, azId: string) => {
    const vpc = vpcList.value.find(vpc => vpc.vpcId === vpcId)
    if (!vpc) {
      return
    }

    // AZ内にサブネットがある場合は削除を拒否
    const subnetsInAz = vpc.subnets.filter(subnet => subnet.azId === azId)
    if (subnetsInAz.length > 0) {
      console.warn(`Cannot delete AZ ${azId}: ${subnetsInAz.length} subnets exist`)
      return false
    }

    const azIndex = vpc.availabilityZones.findIndex(az => az.id === azId)
    if (azIndex !== -1) {
      vpc.availabilityZones.splice(azIndex, 1)
      return true
    }
    return false
  }

  const updateComputeSubnet = (computeId: string, subnetId: string) => {
    for (const vpc of vpcList.value) {
      const compute = vpc.computes.find(c => c.id === computeId)
      if (compute) {
        compute.subnetIds = [subnetId]
        return
      }

      const database = vpc.databases.find(d => d.id === computeId)
      if (database) {
        database.subnetIds = [subnetId]
        return
      }
    }
  }

  const updateComputeSubnets = (computeId: string, subnetIds: string[]) => {
    for (const vpc of vpcList.value) {
      const compute = vpc.computes.find(c => c.id === computeId)
      if (compute) {
        compute.subnetIds = [...subnetIds]
        return
      }

      const database = vpc.databases.find(d => d.id === computeId)
      if (database) {
        database.subnetIds = [...subnetIds]
        return
      }
    }
  }

  const updateSubnetSettings = (subnetId: string, settings: { azId?: string, hasNatGateway?: boolean, order?: number }) => {
    for (const vpc of vpcList.value) {
      const subnet = vpc.subnets.find(s => s.id === subnetId)
      if (subnet) {
        if (settings.azId) {
          subnet.azId = settings.azId
        }

        if (settings.hasNatGateway !== undefined && subnet.type === 'public_subnet') {
          const existingNat = vpc.networks.find(n => n.type === 'nat_gateway')

          if (settings.hasNatGateway && !existingNat) {
            // NAT Gateway を追加
            vpc.networks.push({
              id: crypto.randomUUID(),
              name: 'NAT Gateway',
              type: 'nat_gateway',
              vpcId: vpc.vpcId,
            })
          } else if (!settings.hasNatGateway && existingNat) {
            // NAT Gateway を削除
            const natIndex = vpc.networks.findIndex(n => n.type === 'nat_gateway')
            if (natIndex !== -1) {
              vpc.networks.splice(natIndex, 1)
            }
          }
        }
        
        if (settings.order !== undefined) {
          subnet.order = settings.order
        }
        return
      }
    }
  }

  const updateSubnetOrder = (vpcId: string, azId: string, subnetIds: string[]) => {
    const vpc = vpcList.value.find(v => v.vpcId === vpcId)
    if (!vpc) return

    // 指定されたAZ内のサブネットの順序を更新
    subnetIds.forEach((subnetId, index) => {
      const subnet = vpc.subnets.find(s => s.id === subnetId && s.azId === azId)
      if (subnet) {
        subnet.order = index
      }
    })
  }

  const updateResourceOrder = (vpcId: string, subnetId: string, resourceIds: string[]) => {
    const vpc = vpcList.value.find(v => v.vpcId === vpcId)
    if (!vpc) return

    // サブネット内のリソースの順序を更新
    resourceIds.forEach((resourceId, index) => {
      const compute = vpc.computes.find(c => c.id === resourceId && c.subnetIds.includes(subnetId))
      const database = vpc.databases.find(d => d.id === resourceId && d.subnetIds.includes(subnetId))
      
      if (compute) {
        compute.order = index
      } else if (database) {
        database.order = index
      }
    })
  }

  const updateNetworkOrder = (vpcId: string, networkIds: string[]) => {
    const vpc = vpcList.value.find(v => v.vpcId === vpcId)
    if (!vpc) return

    // VPC内のネットワークリソースの順序を更新
    networkIds.forEach((networkId, index) => {
      const network = vpc.networks.find(n => n.id === networkId)
      if (network) {
        network.order = index
      }
    })
  }

  const updateGlobalServiceOrder = (serviceIds: string[]) => {
    // グローバルサービスの順序を更新（useServiceListで実装が必要）
    // ここでは関数のみ定義
  }

  const updateNetworkSettings = (networkId: string, settings: { serviceEndpoint?: string }) => {
    for (const vpc of vpcList.value) {
      const network = vpc.networks.find(n => n.id === networkId)
      if (network) {
        if (settings.serviceEndpoint !== undefined) {
          network.serviceEndpoint = settings.serviceEndpoint
        }
        return
      }
    }
  }

  const updateResourceName = (id: string, name: string) => {
    if (name === '') {
      return
    }
    for (const vpc of vpcList.value) {
      if (vpc.vpc.id === id) {
        vpc.vpc.name = name
        return
      }

      const network = vpc.networks.find(n => n.id === id)
      if (network) {
        network.name = name
        return
      }

      const subnet = vpc.subnets.find(s => s.id === id)
      if (subnet) {
        subnet.name = name
        return
      }

      const compute = vpc.computes.find(c => c.id === id)
      if (compute) {
        compute.name = name
        return
      }

      const database = vpc.databases.find(d => d.id === id)
      if (database) {
        database.name = name
        return
      }
    }
  }

  const validateResourceDeletion = (resourceId: string): { canDelete: boolean, reason?: string } => {
    for (const vpc of vpcList.value) {
      // AZ削除のバリデーション
      const az = vpc.availabilityZones.find(az => az.id === resourceId)
      if (az) {
        const subnetsInAz = vpc.subnets.filter(s => s.azId === az.id)
        if (subnetsInAz.length > 0) {
          return { canDelete: false, reason: `${subnetsInAz.length}個のサブネットがこのAZに存在します` }
        }
        return { canDelete: true }
      }

      // サブネット削除のバリデーション
      const subnet = vpc.subnets.find(s => s.id === resourceId)
      if (subnet) {
        const computesInSubnet = vpc.computes.filter(c => c.subnetIds.includes(subnet.id))
        const databasesInSubnet = vpc.databases.filter(d => d.subnetIds.includes(subnet.id))
        const natGatewaysInSubnet = vpc.networks.filter(n => n.type === 'nat_gateway' && n.subnetId === subnet.id)

        const totalResources = computesInSubnet.length + databasesInSubnet.length + natGatewaysInSubnet.length
        if (totalResources > 0) {
          return { canDelete: false, reason: `${totalResources}個のリソースがこのサブネットに存在します` }
        }
        return { canDelete: true }
      }

      // NAT Gateway削除のバリデーション
      const natGateway = vpc.networks.find(n => n.id === resourceId && n.type === 'nat_gateway')
      if (natGateway && natGateway.elasticIpId) {
        return { canDelete: false, reason: 'Elastic IPがアタッチされています。先にElastic IPを解除してください' }
      }

      // Compute削除のバリデーション
      const compute = vpc.computes.find(c => c.id === resourceId)
      if (compute) {
        // 特別な依存関係チェック（必要に応じて追加）
        return { canDelete: true }
      }

      // Database削除のバリデーション
      const database = vpc.databases.find(d => d.id === resourceId)
      if (database) {
        // 特別な依存関係チェック（必要に応じて追加）
        return { canDelete: true }
      }

      // Network削除のバリデーション
      const network = vpc.networks.find(n => n.id === resourceId)
      if (network) {
        if (network.type === 'internet_gateway') {
          const publicSubnets = vpc.subnets.filter(s => s.type === 'public_subnet')
          if (publicSubnets.length > 0) {
            return { canDelete: false, reason: 'パブリックサブネットが存在します。先にパブリックサブネットを削除してください' }
          }
        }
        return { canDelete: true }
      }
    }

    return { canDelete: true }
  }

  const deleteResource = (resourceId: string): { success: boolean, reason?: string } => {
    const validation = validateResourceDeletion(resourceId)
    if (!validation.canDelete) {
      return { success: false, reason: validation.reason }
    }

    for (const vpc of vpcList.value) {
      // AZ削除
      const azIndex = vpc.availabilityZones.findIndex(az => az.id === resourceId)
      if (azIndex !== -1) {
        vpc.availabilityZones.splice(azIndex, 1)
        return { success: true }
      }

      // サブネット削除
      const subnetIndex = vpc.subnets.findIndex(s => s.id === resourceId)
      if (subnetIndex !== -1) {
        vpc.subnets.splice(subnetIndex, 1)
        return { success: true }
      }

      // ネットワークリソース削除
      const networkIndex = vpc.networks.findIndex(n => n.id === resourceId)
      if (networkIndex !== -1) {
        vpc.networks.splice(networkIndex, 1)
        return { success: true }
      }

      // コンピュートリソース削除
      const computeIndex = vpc.computes.findIndex(c => c.id === resourceId)
      if (computeIndex !== -1) {
        vpc.computes.splice(computeIndex, 1)
        return { success: true }
      }

      // データベースリソース削除
      const databaseIndex = vpc.databases.findIndex(d => d.id === resourceId)
      if (databaseIndex !== -1) {
        vpc.databases.splice(databaseIndex, 1)
        return { success: true }
      }
    }

    return { success: false, reason: 'リソースが見つかりません' }
  }

  return {
    vpcList,
    addResource,
    deleteVpc,
    newVpc,
    addAvailabilityZone,
    deleteAvailabilityZone,
    updateComputeSubnet,
    updateComputeSubnets,
    updateSubnetSettings,
    updateSubnetOrder,
    updateResourceOrder,
    updateNetworkOrder,
    updateGlobalServiceOrder,
    updateNetworkSettings,
    updateResourceName,
    validateResourceDeletion,
    deleteResource,
  }
}
