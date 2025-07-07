import type { VpcResource } from '@/types/service.ts'
import { ref, watch } from 'vue'
import { ICONS } from '@/icons'

const loadInitialData = (): VpcResource[] => {
  const savedData = localStorage.getItem('vpc-list-data')
  try {
    return savedData ? JSON.parse(savedData) : []
  } catch (error) {
    console.error('Failed to parse data from localStorage', error)
    return []
  }
}

const vpcList = ref<VpcResource[]>(loadInitialData())

watch(
  vpcList,
  newVpcList => {
    localStorage.setItem('vpc-list-data', JSON.stringify(newVpcList))
  },
  { deep: true },
)

export const useVpcList = () => {
  const addResource = (vpcId: string, service: string) => {
    const vpc = vpcList.value.find(vpc => vpc.vpcId === vpcId)
    if (!vpc) {
      return
    }

    const type = ICONS[`${service}`].type.toLowerCase()
    console.log(type)
    switch (type) {
      case 'compute': {
        vpc.computes.push({
          id: crypto.randomUUID(),
          name: service,
          type: service,
          vpcId,
          subnetId: vpc.subnets.find(s => s.isDefault)?.id ?? '',
        })
        break
      }
      case 'database': {
        vpc.databases.push({
          id: crypto.randomUUID(),
          name: service,
          type: service,
          vpcId,
          subnetId: vpc.subnets.find(s => s.isDefault)?.id ?? '',
        })
        break
      }
      case 'networking': {
        vpc.networks.push({
          id: crypto.randomUUID(),
          name: service,
          type: service,
          vpcId,
        })
        break
      }
      case 'subnet': {
        vpc.subnets.push({
          id: crypto.randomUUID(),
          name: `${service}_${crypto.randomUUID().replace('-', '').slice(0, 10)}`,
          type: service,
          vpcId,
          isDefault: false,
        })
        break
      }
      default: {
        break
      }
    }
  }

  const deleteVpc = (vpcId: string) => {
    vpcList.value.splice(vpcList.value.findIndex(v => v.vpcId === vpcId), 1)
  }

  const newVpc = () => {
    const vpcId = crypto.randomUUID()
    const subnetId = crypto.randomUUID()

    vpcList.value.push({
      vpcId,
      vpc: {
        id: vpcId,
        name: `vpc_${crypto.randomUUID().replace('-', '').slice(0, 10)}`,
        type: 'vpc',
      },
      subnets: [
        {
          id: subnetId,
          name: `default_subnet_${crypto.randomUUID().replace('-', '').slice(0, 10)}`,
          vpcId,
          isDefault: true,
          type: 'private_subnet',
        },
      ],
      networks: [],
      computes: [],
      databases: [],
    })
  }

  const updateComputeSubnet = (computeId: string, subnetId: string) => {
    for (const vpc of vpcList.value) {
      const compute = vpc.computes.find(c => c.id === computeId)
      if (compute) {
        compute.subnetId = subnetId
        return
      }

      const database = vpc.databases.find(d => d.id === computeId)
      if (database) {
        database.subnetId = subnetId
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

  return {
    vpcList,
    addResource,
    deleteVpc,
    newVpc,
    updateComputeSubnet,
    updateResourceName,
  }
}
