<template>
  <div :class="`tab ${hidden ? 'close': 'open'}`">
    <v-icon class="icon" :icon="`chevron_${hidden ? 'left' : 'right'}`" @click="hidden = !hidden" />
    <div v-if="setting" class="tab-content">
      <BaseSetting :setting="setting" />
      <v-divider class="my-7" />
      <VpcSetting v-if="setting?.type === 'vpc'" :setting="setting as Vpc" />
      <AzSetting v-if="setting?.type === 'az'" />
      <SubnetSetting v-if="isSubnetResource(setting)" />
      <NatGatewaySetting v-if="setting?.type === 'nat_gateway'" />
      <EndpointSetting v-if="setting?.type === 'endpoint'" />
      <ElasticIpSetting v-if="setting?.type === 'elastic_ip'" />
      <CloudFrontSetting v-if="setting?.type === 'cloudfront'" />
      <ApiGatewaySetting v-if="setting?.type === 'api_gateway'" />
      <Route53Setting v-if="setting?.type === 'route53'" />
      <RdsSetting v-if="setting?.type === 'rds'" />
      <LoadBalancerSetting v-if="setting?.type && ['alb', 'nlb'].includes(setting.type)" />
      <FargateSetting v-if="setting?.type === 'fargate'" />
      <ComputeSetting v-if="isComputeResource(setting) && !['alb', 'nlb', 'fargate'].includes(setting.type)" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { BaseResource, ComputeResource, Vpc, Subnet } from '@/types/service.ts'
  import BaseSetting from '@/components/info/BaseSetting.vue'
  import { useInfo } from '@/composables/useInfo.ts'
  import AzSetting from './AzSetting.vue'
  import ComputeSetting from './ComputeSetting.vue'
  import ElasticIpSetting from './ElasticIpSetting.vue'
  import EndpointSetting from './EndpointSetting.vue'
  import NatGatewaySetting from './NatGatewaySetting.vue'
  import SubnetSetting from './SubnetSetting.vue'
  import VpcSetting from './VpcSetting.vue'
  import CloudFrontSetting from './CloudFrontSetting.vue'
  import ApiGatewaySetting from './ApiGatewaySetting.vue'
  import Route53Setting from './Route53Setting.vue'
  import RdsSetting from './RdsSetting.vue'
  import LoadBalancerSetting from './LoadBalancerSetting.vue'
  import FargateSetting from './FargateSetting.vue'

  const { hidden, setting } = useInfo()

  const isComputeResource = (resource: BaseResource): resource is ComputeResource => {
    return 'subnetIds' in resource
  }

  const isSubnetResource = (resource: BaseResource): resource is Subnet => {
    return 'azId' in resource && (resource.type === 'public_subnet' || resource.type === 'private_subnet')
  }
</script>

<style scoped>
.icon {
  color: grey;
  font-size: 42px;
  cursor: pointer;
}

.tab {
  width: 600px;
  height: 100vh;
  border-bottom-left-radius: 12px;
  border-top-left-radius: 12px;
  box-shadow: 0 4px 12px #b8b8b828;
  transition: transform 0.3s ease;
}

.close {
  transform: translateX(0px);
}

.open {
  transform: translateX(-532px);
}

.tab-content {
  padding-left: 68px;
  padding-right: 24px;
}
</style>
