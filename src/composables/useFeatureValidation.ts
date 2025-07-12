import type { 
  FeatureRequirement, 
  ValidationResult, 
  ComputeValidation, 
  DatabaseValidation, 
  StorageValidation, 
  DomainValidation,
  ComputeResource,
  DatabaseResource,
  Route53Resource,
  CloudFrontResource,
  ApiGatewayResource
} from '@/types/service'
import { useServiceList } from './useServiceList'
import { useVpcList } from './useVpcList'
import { isRoute53Resource } from '@/types/service'

export const useFeatureValidation = () => {
  const { services } = useServiceList()
  const { vpcList } = useVpcList()

  /**
   * 機能要件を検証する
   */
  const validateFeatureRequirements = async (features: FeatureRequirement[]): Promise<ValidationResult[]> => {
    console.log(`[Feature Validation] 検証開始 - 機能数: ${features.length}`)
    console.log(`[Feature Validation] グローバルサービス:`, services.value)
    console.log(`[Feature Validation] VPCリスト:`, vpcList.value)
    
    const results: ValidationResult[] = []

    for (const feature of features) {
      console.log(`[Feature Validation] 機能検証中: ${feature.id}`)
      const result = await validateSingleFeature(feature)
      results.push(result)
    }

    return results
  }

  /**
   * 単一の機能要件を検証する
   */
  const validateSingleFeature = async (feature: FeatureRequirement): Promise<ValidationResult> => {
    const result: ValidationResult = {
      featureId: feature.id,
      isValid: true,
      missingRequirements: [],
      warnings: [],
      details: {}
    }

    // 各要件をチェック
    for (const requirement of feature.required) {
      if (requirement === 'compute') {
        result.details.compute = validateComputeRequirement(feature.id)
        if (!result.details.compute.hasComputeResource || !result.details.compute.featureAttached) {
          result.isValid = false
          if (!result.details.compute.hasComputeResource) {
            result.missingRequirements.push('Computeリソース')
          }
          if (!result.details.compute.featureAttached) {
            result.missingRequirements.push('機能付与')
          }
        }
      } else if (requirement === 'database') {
        result.details.database = await validateDatabaseRequirement(feature.id)
        if (!result.details.database.hasDatabaseResource || !result.details.database.hasConnection) {
          result.isValid = false
          if (!result.details.database.hasDatabaseResource) {
            result.missingRequirements.push('Databaseリソース')
          }
          if (!result.details.database.hasConnection) {
            result.missingRequirements.push('Database接続設定')
          }
        }
      } else if (requirement === 'storage') {
        result.details.storage = validateStorageRequirement(feature.id)
        if (!result.details.storage.hasS3Resource || !result.details.storage.hasAccessPath) {
          result.isValid = false
          if (!result.details.storage.hasS3Resource) {
            result.missingRequirements.push('S3リソース')
          }
          if (!result.details.storage.hasAccessPath) {
            result.missingRequirements.push('Storage接続経路')
          }
        }
      } else if (requirement.includes('.')) {
        // ドメイン要件（www.example.com等）
        result.details.domain = validateDomainRequirement(requirement, feature.id)
        if (!result.details.domain.hasRoute53 || !result.details.domain.hasRoutingPath || !result.details.domain.computeRequirementsSatisfied) {
          result.isValid = false
          if (!result.details.domain.hasRoute53) {
            result.missingRequirements.push('Route53設定')
          }
          if (!result.details.domain.hasRoutingPath) {
            result.missingRequirements.push('ドメインルーティング')
          }
          if (!result.details.domain.computeRequirementsSatisfied) {
            result.missingRequirements.push('終端Compute機能付与')
          }
        }
      }
    }

    return result
  }

  /**
   * Compute要件を検証
   */
  const validateComputeRequirement = (featureId: string): ComputeValidation => {
    let hasComputeResource = false
    let featureAttached = false
    let resourceId: string | undefined
    let resourceType: string | undefined

    console.log(`[Compute Validation] 検証開始: ${featureId}`)

    // グローバルサービスをチェック（実際にはcompute系サービスは少ないが）
    for (const service of services.value) {
      if (['lambda'].includes(service.type)) {
        hasComputeResource = true
        console.log(`[Compute Validation] グローバルComputeリソース発見: ${service.type} ${service.id}`)
        console.log(`[Compute Validation] 付与機能:`, (service as ComputeResource).attachedFeatures)
        
        if ((service as ComputeResource).attachedFeatures?.includes(featureId)) {
          featureAttached = true
          resourceId = service.id
          resourceType = service.type
          console.log(`[Compute Validation] 機能付与確認: ${service.type}`)
          break
        }
      }
    }

    // VPC内のcomputeリソースをチェック
    if (!featureAttached) {
      for (const vpc of vpcList.value) {
        for (const compute of vpc.computes) {
          hasComputeResource = true
          console.log(`[Compute Validation] VPC Computeリソース発見: ${compute.type} ${compute.id}`)
          console.log(`[Compute Validation] 付与機能:`, compute.attachedFeatures)
          
          if (compute.attachedFeatures?.includes(featureId)) {
            featureAttached = true
            resourceId = compute.id
            resourceType = compute.type
            console.log(`[Compute Validation] 機能付与確認: ${compute.type}`)
            break
          }
        }
        if (featureAttached) break
      }
    }

    const result = {
      hasComputeResource,
      featureAttached,
      resourceId,
      resourceType
    }
    
    console.log(`[Compute Validation] 検証結果:`, result)
    return result
  }

  /**
   * Database要件を検証
   */
  const validateDatabaseRequirement = async (featureId: string): Promise<DatabaseValidation> => {
    let hasDatabaseResource = false
    let hasConnection = false
    let connectionType: 'rds' | 'dynamodb-endpoint' | undefined
    let databaseId: string | undefined

    console.log(`[Database Validation] 検証開始: ${featureId}`)

    // 該当機能が付与されたcomputeリソースを取得
    const attachedCompute = findComputeResourceWithFeature(featureId)
    if (!attachedCompute) {
      console.log(`[Database Validation] 機能付与されたComputeリソースが見つかりません`)
      return {
        hasDatabaseResource: false,
        hasConnection: false
      }
    }

    console.log(`[Database Validation] 機能付与されたCompute:`, attachedCompute)

    // VPC内のdatabaseリソースをチェック
    for (const vpc of vpcList.value) {
      // RDSをチェック
      for (const database of vpc.databases) {
        if (database.type === 'rds') {
          hasDatabaseResource = true
          databaseId = database.id
          console.log(`[Database Validation] RDSリソース発見: ${database.id}`)
          
          // 任意のcomputeリソースがRDSに接続可能かチェック
          if (database.allowedConnections?.includes(attachedCompute.id)) {
            hasConnection = true
            connectionType = 'rds'
            console.log(`[Database Validation] RDS接続確認: ${attachedCompute.id} → ${database.id}`)
            return {
              hasDatabaseResource,
              hasConnection,
              connectionType,
              databaseId
            }
          } else {
            console.log(`[Database Validation] RDS接続なし: ${attachedCompute.id} は ${database.id} の接続許可リストにありません`)
          }
        }
      }

      // DynamoDBエンドポイントをチェック
      const dynamoEndpoint = vpc.networks.find(n => 
        n.type === 'endpoint' && n.serviceEndpoint === 'dynamodb'
      )
      
      if (dynamoEndpoint) {
        console.log(`[Database Validation] DynamoDBエンドポイント発見: ${dynamoEndpoint.id}`)
        // グローバルサービスにDynamoDBがあるかチェック
        const dynamoDb = services.value.find(s => s.type === 'dynamo_db')
        if (dynamoDb) {
          hasDatabaseResource = true
          databaseId = dynamoDb.id
          console.log(`[Database Validation] DynamoDBリソース発見: ${dynamoDb.id}`)
          
          // computeリソースがエンドポイントと同じVPCにあるかチェック
          if (attachedCompute.vpcId === vpc.vpcId) {
            hasConnection = true
            connectionType = 'dynamodb-endpoint'
            console.log(`[Database Validation] DynamoDB VPCエンドポイント経由接続確認`)
            return {
              hasDatabaseResource,
              hasConnection,
              connectionType,
              databaseId
            }
          } else {
            console.log(`[Database Validation] DynamoDB VPCエンドポイント: 異なるVPC ${attachedCompute.vpcId} vs ${vpc.vpcId}`)
          }
        }
      }
    }

    const result = {
      hasDatabaseResource,
      hasConnection,
      connectionType,
      databaseId
    }
    
    console.log(`[Database Validation] 検証結果:`, result)
    return result
  }

  /**
   * Storage要件を検証
   */
  const validateStorageRequirement = (featureId: string): StorageValidation => {
    let hasS3Resource = false
    let hasAccessPath = false
    let accessMethod: 'direct' | 'vpc-endpoint' | undefined

    console.log(`[Storage Validation] 検証開始: ${featureId}`)

    // S3リソースの存在をチェック
    const s3Resource = services.value.find(s => s.type === 's3')
    if (s3Resource) {
      hasS3Resource = true
      console.log(`[Storage Validation] S3リソース発見: ${s3Resource.id}`)
    } else {
      console.log(`[Storage Validation] S3リソースが存在しません`)
    }

    // 該当機能が付与されたcomputeリソースを取得
    const attachedCompute = findComputeResourceWithFeature(featureId)
    console.log(`[Storage Validation] 機能付与されたCompute:`, attachedCompute)
    
    if (!attachedCompute) {
      console.log(`[Storage Validation] 機能付与されたComputeリソースが見つかりません`)
      return {
        hasS3Resource,
        hasAccessPath: false
      }
    }

    // S3への接続経路をチェック
    if (hasS3Resource && attachedCompute) {
      const vpc = vpcList.value.find(v => v.vpcId === attachedCompute.vpcId)
      console.log(`[Storage Validation] 対象VPC:`, vpc)
      
      if (vpc) {
        // VPC Endpointによるアクセスをチェック（S3の場合は必須）
        const s3Endpoint = vpc.networks.find(n => 
          n.type === 'endpoint' && n.serviceEndpoint === 's3'
        )
        console.log(`[Storage Validation] S3エンドポイント:`, s3Endpoint)
        
        if (s3Endpoint) {
          hasAccessPath = true
          accessMethod = 'vpc-endpoint'
          console.log(`[Storage Validation] S3 VPCエンドポイント経由でアクセス可能`)
        } else {
          console.log(`[Storage Validation] S3 VPCエンドポイントが見つかりません`)
          // S3へのアクセスはVPCエンドポイントが必須
          hasAccessPath = false
          console.log(`[Storage Validation] S3 VPCエンドポイントが必要です`)
        }
      } else {
        console.log(`[Storage Validation] ComputeリソースのVPCが見つかりません`)
      }
    }

    const result = {
      hasS3Resource,
      hasAccessPath,
      accessMethod
    }
    
    console.log(`[Storage Validation] 検証結果:`, result)
    return result
  }

  /**
   * Domain要件を検証（厳密なドメイン名マッチング）
   */
  const validateDomainRequirement = (requiredDomain: string, featureId: string): DomainValidation => {
    let hasRoute53 = false
    let domainConfigured = false
    let hasRoutingPath = false
    const routingPath: string[] = []
    const endpointComputeResourceIds: string[] = [] // ルーティング終端のComputeリソースIDを収集

    console.log(`[Domain Validation] 検証開始: ${requiredDomain}, 機能ID: ${featureId}`)

    // Route53リソースを検索
    const route53Resource = services.value.find(s => isRoute53Resource(s)) as Route53Resource | undefined
    
    if (route53Resource) {
      hasRoute53 = true
      console.log(`[Domain Validation] Route53リソース発見: ${route53Resource.id}`)
      console.log(`[Domain Validation] Route53ドメイン名: ${route53Resource.domainName}`)
      
      // 厳密なドメイン名マッチング
      const requiredDomainParts = requiredDomain.split('.')
      const baseDomain = requiredDomainParts.slice(-2).join('.') // example.com
      const subdomain = requiredDomainParts.slice(0, -2).join('.') // www
      
      console.log(`[Domain Validation] 必要ドメイン分析 - ベース: ${baseDomain}, サブ: ${subdomain}`)
      
      if (route53Resource.domainName === baseDomain) {
        domainConfigured = true
        console.log(`[Domain Validation] ドメイン設定確認済み`)
        
        // 厳密なAレコードマッチング
        console.log(`[Domain Validation] Aレコード検索中:`, route53Resource.aRecords)
        const targetRecord = route53Resource.aRecords?.find(record => {
          const fullDomain = `${record.name}.${route53Resource.domainName}`
          console.log(`[Domain Validation] レコードチェック: ${record.name} -> ${fullDomain} vs ${requiredDomain}`)
          return record.name === subdomain && fullDomain === requiredDomain
        })
        
        if (targetRecord) {
          console.log(`[Domain Validation] 対象レコード発見:`, targetRecord)
          routingPath.push('Route53')
          
          // ターゲットリソースを確認
          const targetResource = findResourceById(targetRecord.targetResourceId)
          console.log(`[Domain Validation] ターゲットリソース:`, targetResource)
          
          if (targetResource) {
            routingPath.push(targetResource.type.toUpperCase())
            
            // CloudFrontの場合のルーティング
            if (targetResource.type === 'cloudfront') {
              console.log(`[Domain Validation] CloudFrontルーティング開始`)
              const cloudfrontTargets = (targetResource as CloudFrontResource).origins || []
              console.log(`[Domain Validation] CloudFrontオリジン:`, cloudfrontTargets)
              
              for (const originId of cloudfrontTargets) {
                const originResource = findResourceById(originId)
                console.log(`[Domain Validation] オリジンリソース:`, originResource)
                
                if (originResource) {
                  routingPath.push(originResource.type.toUpperCase())
                  
                  // API Gatewayの場合は更にターゲットを追跡
                  if (originResource.type === 'api_gateway') {
                    console.log(`[Domain Validation] API Gatewayターゲット追跡`)
                    const apiTargets = (originResource as ApiGatewayResource).targetResources || []
                    console.log(`[Domain Validation] API Gatewayターゲット:`, apiTargets)
                    
                    for (const targetId of apiTargets) {
                      const finalTarget = findResourceById(targetId)
                      console.log(`[Domain Validation] 最終ターゲット:`, finalTarget)
                      
                      if (finalTarget && ['lambda', 'ec2', 'fargate', 'ecs'].includes(finalTarget.type)) {
                        routingPath.push(finalTarget.type.toUpperCase())
                        endpointComputeResourceIds.push(finalTarget.id) // 終端Computeリソースを記録
                        hasRoutingPath = true
                        console.log(`[Domain Validation] CloudFront→API Gateway→Computeルーティングパス確立!`)
                        break
                      }
                    }
                  } else if (['lambda', 'ec2', 'fargate', 'ecs'].includes(originResource.type)) {
                    endpointComputeResourceIds.push(originResource.id) // 終端Computeリソースを記録
                    hasRoutingPath = true
                    console.log(`[Domain Validation] CloudFront→Computeルーティングパス確立!`)
                    break
                  }
                }
              }
            }
            // API Gateway直接接続の場合
            else if (targetResource.type === 'api_gateway') {
              console.log(`[Domain Validation] API Gateway直接ルーティング開始`)
              const apiTargets = (targetResource as ApiGatewayResource).targetResources || []
              console.log(`[Domain Validation] API Gatewayターゲット:`, apiTargets)
              
              for (const targetId of apiTargets) {
                const finalTarget = findResourceById(targetId)
                console.log(`[Domain Validation] API Gateway最終ターゲット:`, finalTarget)
                
                if (finalTarget && ['lambda', 'ec2', 'fargate', 'ecs'].includes(finalTarget.type)) {
                  routingPath.push(finalTarget.type.toUpperCase())
                  endpointComputeResourceIds.push(finalTarget.id) // 終端Computeリソースを記録
                  hasRoutingPath = true
                  console.log(`[Domain Validation] Route53→API Gateway→Computeルーティングパス確立!`)
                  break
                }
              }
            }
            // Load Balancerの場合
            else if (['alb', 'nlb'].includes(targetResource.type)) {
              console.log(`[Domain Validation] Load Balancerルーティング開始`)
              const lbTargets = (targetResource as ComputeResource).loadBalancer?.targetResources || []
              console.log(`[Domain Validation] LBターゲット:`, lbTargets)
              
              for (const targetId of lbTargets) {
                const finalTarget = findResourceById(targetId)
                console.log(`[Domain Validation] LB最終ターゲット:`, finalTarget)
                
                if (finalTarget && ['lambda', 'ec2', 'fargate', 'ecs'].includes(finalTarget.type)) {
                  routingPath.push(finalTarget.type.toUpperCase())
                  endpointComputeResourceIds.push(finalTarget.id) // 終端Computeリソースを記録
                  hasRoutingPath = true
                  console.log(`[Domain Validation] Route53→LB→Computeルーティングパス確立!`)
                  break
                }
              }
            }
            // 直接接続の場合（ComputeリソースやElastic IP）
            else if (['lambda', 'ec2', 'fargate', 'ecs'].includes(targetResource.type)) {
              endpointComputeResourceIds.push(targetResource.id) // 終端Computeリソースを記録
              hasRoutingPath = true
              console.log(`[Domain Validation] Route53→Compute直接ルーティングパス確立!`)
            }
            // Elastic IP経由の場合
            else if (targetResource.type === 'elastic_ip') {
              // Elastic IPがアタッチされたリソースを確認
              if (targetResource.isAttached && targetResource.attachedResourceId) {
                const attachedResource = findResourceById(targetResource.attachedResourceId)
                if (attachedResource && ['lambda', 'ec2', 'fargate', 'ecs'].includes(attachedResource.type)) {
                  routingPath.push(attachedResource.type.toUpperCase())
                  endpointComputeResourceIds.push(attachedResource.id) // 終端Computeリソースを記録
                  hasRoutingPath = true
                  console.log(`[Domain Validation] Route53→Elastic IP→Computeルーティングパス確立!`)
                }
              }
            }
          }
        } else {
          console.log(`[Domain Validation] 対象レコードが見つかりません`)
        }
      } else {
        console.log(`[Domain Validation] ドメイン設定不一致: ${route53Resource.domainName} vs ${baseDomain}`)
      }
    } else {
      console.log(`[Domain Validation] Route53リソースが見つかりません`)
    }

    // ルーティング終端のComputeリソース群がcompute要件を満たしているかをチェック
    // 注意：ここでは該当ドメイン機能ではなく、任意のcompute機能を持っているかを確認
    let computeRequirementsSatisfied = false
    if (hasRoutingPath && endpointComputeResourceIds.length > 0) {
      console.log(`[Domain Validation] 終端Computeリソース群のcompute要件チェック開始:`, endpointComputeResourceIds)
      
      // 終端Computeリソースのいずれかがcompute機能を持っているかをチェック
      for (const computeId of endpointComputeResourceIds) {
        let targetCompute: ComputeResource | null = null
        
        // グローバルサービスから検索
        for (const service of services.value) {
          if (service.id === computeId && ['lambda'].includes(service.type)) {
            targetCompute = service as ComputeResource
            break
          }
        }
        
        // VPC内のComputeリソースから検索
        if (!targetCompute) {
          for (const vpc of vpcList.value) {
            for (const compute of vpc.computes) {
              if (compute.id === computeId) {
                targetCompute = compute
                break
              }
            }
            if (targetCompute) break
          }
        }
        
        if (targetCompute) {
          console.log(`[Domain Validation] 終端Compute検査: ${targetCompute.type} ${targetCompute.id}`)
          console.log(`[Domain Validation] 付与機能:`, targetCompute.attachedFeatures)
          
          // 何らかのcompute機能を持っているかチェック（ドメイン機能ではない）
          if (targetCompute.attachedFeatures && targetCompute.attachedFeatures.length > 0) {
            computeRequirementsSatisfied = true
            console.log(`[Domain Validation] compute要件満足: ${targetCompute.type} にcompute機能が付与されています:`, targetCompute.attachedFeatures)
            break
          }
        }
      }
      
      if (!computeRequirementsSatisfied) {
        console.log(`[Domain Validation] compute要件不満足: 終端Computeリソース群にcompute機能が付与されていません`)
      }
    }

    const result = {
      hasRoute53,
      domainConfigured,
      hasRoutingPath,
      routingPath: routingPath.length > 0 ? routingPath : undefined,
      domainName: requiredDomain,
      computeRequirementsSatisfied,
      endpointComputeResourceIds
    }
    
    console.log(`[Domain Validation] 検証結果:`, result)
    return result
  }


  /**
   * 指定した機能が付与されたcomputeリソースを検索
   */
  const findComputeResourceWithFeature = (featureId: string): ComputeResource | null => {
    // グローバルサービスをチェック
    for (const service of services.value) {
      if (['lambda'].includes(service.type)) {
        if ((service as ComputeResource).attachedFeatures?.includes(featureId)) {
          return service as ComputeResource
        }
      }
    }

    // VPC内のcomputeリソースをチェック
    for (const vpc of vpcList.value) {
      for (const compute of vpc.computes) {
        if (compute.attachedFeatures?.includes(featureId)) {
          return compute
        }
      }
    }

    return null
  }

  /**
   * IDでリソースを検索
   */
  const findResourceById = (resourceId: string): any => {
    // グローバルサービスから検索
    const globalService = services.value.find(s => s.id === resourceId)
    if (globalService) {
      return globalService
    }

    // VPCリソースから検索
    for (const vpc of vpcList.value) {
      const compute = vpc.computes.find(c => c.id === resourceId)
      if (compute) return compute

      const database = vpc.databases.find(d => d.id === resourceId)
      if (database) return database

      const network = vpc.networks.find(n => n.id === resourceId)
      if (network) return network
    }

    return null
  }

  return {
    validateFeatureRequirements,
    validateSingleFeature
  }
}