export interface BaseResource {
  id: string
  name: string
  type: string
  isAttached?: boolean // Elastic IPのアタッチ状態（elastic_ipの場合のみ）
  attachedResourceId?: string // アタッチ先のリソースID（elastic_ipの場合のみ）
}

export interface Vpc extends BaseResource {
  type: 'vpc'
}

export type AzName = 'a' | 'c' | 'd'

export interface AvailabilityZone extends BaseResource {
  vpcId: string
  azName: AzName
  type: 'az'
}

export interface Subnet extends BaseResource {
  vpcId: string
  azId: string
  isDefault: boolean
  type: string
}

export interface NetworkResource extends BaseResource {
  vpcId: string
  type: string
  subnetId?: string // NAT Gatewayが配置されるサブネット（NAT Gatewayの場合のみ）
  elasticIpId?: string // アタッチされたElastic IPのID（NAT Gatewayの場合のみ）
  serviceEndpoint?: string // VPCエンドポイントの接続先サービス（endpointの場合のみ）
}

export type SingleSubnetServiceType = 'ec2'
export type MultiSubnetServiceType = 'lambda' | 'ecs' | 'fargate' | 'alb' | 'nlb'
export type DatabaseServiceType = 'rds' | 'elasticache'

export interface ComputeResource extends BaseResource {
  vpcId: string
  subnetIds: string[]
  type: SingleSubnetServiceType | MultiSubnetServiceType
}

export interface DatabaseResource extends BaseResource {
  vpcId: string
  subnetIds: string[]
  type: DatabaseServiceType
}

export type SingleSubnetResource = ComputeResource & { type: SingleSubnetServiceType }
export type MultiSubnetResource = ComputeResource & { type: MultiSubnetServiceType }

export const isMultiSubnetService = (type: string): type is MultiSubnetServiceType => {
  return ['lambda', 'ecs', 'fargate', 'alb', 'nlb'].includes(type)
}

export const isSingleSubnetService = (type: string): type is SingleSubnetServiceType => {
  return ['ec2'].includes(type)
}

export const isDatabaseService = (type: string): type is DatabaseServiceType => {
  return ['rds', 'elasticache'].includes(type)
}

export interface VpcResource {
  vpcId: string
  vpc: Vpc
  availabilityZones: AvailabilityZone[]
  subnets: Subnet[]
  networks: NetworkResource[]
  computes: ComputeResource[]
  databases: DatabaseResource[]
}

export const getAvailableAzNames = (): AzName[] => ['a', 'c', 'd']

export const getAzDisplayName = (azName: AzName): string => {
  const azMap: Record<AzName, string> = {
    a: 'Availability Zone A',
    c: 'Availability Zone C',
    d: 'Availability Zone D',
  }
  return azMap[azName]
}
