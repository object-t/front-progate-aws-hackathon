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
  // 機能要件システム
  attachedFeatures?: string[] // 付与された機能IDの配列
  // LoadBalancer設定
  loadBalancer?: {
    targetResources?: string[] // ターゲットリソースのIDリスト（EC2、ECSタスク等）
    healthCheck?: {
      path?: string // ヘルスチェックパス
      protocol?: 'HTTP' | 'HTTPS' | 'TCP' // プロトコル
      port?: number // ポート番号
      interval?: number // チェック間隔（秒）
    }
    listeners?: Array<{
      port: number // リスナーポート
      protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'TLS' // プロトコル
      sslCertificateArn?: string // SSL証明書ARN
    }>
  }
  // Fargate設定（中級者向け）
  fargate?: {
    tasks?: FargateTask[] // タスク一覧
  }
}

// Fargateタスク（中級者向け）
export interface FargateTask {
  id: string
  name: string
  container: FargateContainer // 1タスクに1コンテナ
}

// Fargateコンテナ（中級者向け）
export interface FargateContainer {
  id: string
  attachedFeatures?: string[] // 割り当てられた機能（1つのみだが配列形式）
}

export interface DatabaseResource extends BaseResource {
  vpcId: string
  subnetIds: string[]
  type: DatabaseServiceType
  order?: number
  // 機能要件システム
  allowedConnections?: string[] // 接続許可されたリソースIDの配列
  // RDSレプリケーション設定
  replication?: {
    isReadReplica: boolean // リードレプリカかどうか
    masterInstanceId?: string // マスターインスタンスのID（リードレプリカの場合）
    readReplicas?: string[] // リードレプリカのIDリスト（マスターの場合）
    multiAz?: boolean // マルチAZ配置
    backupRetentionPeriod?: number // バックアップ保持期間（日数）
  }
}

// CloudFront専用インターフェース
export interface CloudFrontResource extends BaseResource {
  type: 'cloudfront'
  origins?: string[] // オリジンとなるリソースのIDリスト（API Gateway等）
  defaultCacheBehavior?: {
    targetOriginId?: string // デフォルトキャッシュビヘイビアのターゲットオリジン
    viewerProtocolPolicy?: 'allow-all' | 'redirect-to-https' | 'https-only'
    allowedMethods?: string[] // 許可されたHTTPメソッド
  }
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

// 機能要件システムの型定義
export interface FeatureRequirement {
  id: string
  type: 'compute' | 'database' | 'storage' | 'domain'
  feature: string
  required: string[]
}

export interface ValidationResult {
  featureId: string
  isValid: boolean
  missingRequirements: string[]
  warnings: string[]
  details: {
    compute?: ComputeValidation
    database?: DatabaseValidation
    storage?: StorageValidation
    domain?: DomainValidation
  }
}

export interface ComputeValidation {
  hasComputeResource: boolean
  featureAttached: boolean
  resourceId?: string
  resourceType?: string
}

export interface DatabaseValidation {
  hasDatabaseResource: boolean
  hasConnection: boolean
  connectionType?: 'rds' | 'dynamodb-endpoint'
  databaseId?: string
}

export interface StorageValidation {
  hasS3Resource: boolean
  hasAccessPath: boolean
  accessMethod?: 'direct' | 'vpc-endpoint'
}

export interface DomainValidation {
  hasRoute53: boolean
  domainConfigured: boolean
  hasRoutingPath: boolean
  routingPath?: string[]
  domainName?: string
  computeRequirementsSatisfied?: boolean
  endpointComputeResourceIds?: string[]
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
