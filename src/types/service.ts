export interface BaseResource {
  id: string
  name: string
  type: string
  isAttached?: boolean // Elastic IPのアタッチ状態（elastic_ipの場合のみ）
  attachedResourceId?: string // アタッチ先のリソースID（elastic_ipの場合のみ）
  order?: number
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
  order?: number
}

export interface NetworkResource extends BaseResource {
  vpcId: string
  type: string
  subnetId?: string // NAT Gatewayが配置されるサブネット（NAT Gatewayの場合のみ）
  elasticIpId?: string // アタッチされたElastic IPのID（NAT Gatewayの場合のみ）
  serviceEndpoint?: string // VPCエンドポイントの接続先サービス（endpointの場合のみ）
  order?: number
}

export type SingleSubnetServiceType = 'ec2'
export type MultiSubnetServiceType = 'lambda' | 'ecs' | 'fargate' | 'alb' | 'nlb'
export type DatabaseServiceType = 'rds' | 'elasticache'

export interface ComputeResource extends BaseResource {
  vpcId: string
  subnetIds: string[]
  type: SingleSubnetServiceType | MultiSubnetServiceType
  order?: number
}

export interface DatabaseResource extends BaseResource {
  vpcId: string
  subnetIds: string[]
  type: DatabaseServiceType
  order?: number
}

// CloudFront専用インターフェース
export interface CloudFrontResource extends BaseResource {
  type: 'cloudfront'
}

// API Gateway専用インターフェース
export interface ApiGatewayResource extends BaseResource {
  type: 'api_gateway'
  targetResources?: string[] // 宛先リソースのIDリスト
}

// Route53専用インターフェース
export interface Route53Resource extends BaseResource {
  type: 'route53'
  domainName?: string // ドメイン名（example.com等）
  aRecords?: Array<{
    name: string // レコード名（www、api等）
    targetResourceId: string // 宛先リソースのID
  }>
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

export const isCloudFrontResource = (resource: BaseResource): resource is CloudFrontResource => {
  return resource.type === 'cloudfront'
}

export const isApiGatewayResource = (resource: BaseResource): resource is ApiGatewayResource => {
  return resource.type === 'api_gateway'
}

export const isRoute53Resource = (resource: BaseResource): resource is Route53Resource => {
  return resource.type === 'route53'
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
