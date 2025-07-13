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

  // 機能マッピング定義
  const FEATURE_MAPPINGS = {
    domain: {
      'corp-domain-001': 'corp-web-001'  // 企業ドメイン → Webサイト機能
    }
  }

  /**
   * 機能要件を検証する（シンプル版）
   */
  const validateFeatureRequirements = async (features: FeatureRequirement[]): Promise<ValidationResult[]> => {
    console.log(`[Feature Validation V3] 検証開始 - 機能数: ${features.length}`)
    
    const results: ValidationResult[] = []
    
    // 各機能を個別に検証（シンプルな方式）
    for (const feature of features) {
      console.log(`[Feature Validation V3] 機能検証: ${feature.id} (${feature.type})`)
      
      if (feature.type === 'domain') {
        const result = await validateDomainFeatureSimple(feature)
        results.push(result)
      } else if (feature.type === 'compute') {
        const result = await validateComputeFeatureSimple(feature)
        results.push(result)
      } else {
        results.push(createFailureResult(feature.id, [`未知の機能タイプ: ${feature.type}`]))
      }
    }

    return results
  }

  /**
   * 統合機能要件の検証（ドメイン+Compute）
   */
  const validateIntegratedFeatures = async (domainFeatures: FeatureRequirement[], computeFeatures: FeatureRequirement[]): Promise<ValidationResult[]> => {
    console.log(`[Integrated Validation] 統合検証開始`)
    console.log(`[Integrated Validation] ドメイン機能一覧:`, domainFeatures.map(f => f.id))
    console.log(`[Integrated Validation] Compute機能一覧:`, computeFeatures.map(f => f.id))
    
    const results: ValidationResult[] = []
    
    // 各ドメイン機能に対して検証
    for (const domainFeature of domainFeatures) {
      console.log(`[Integrated Validation] ドメイン機能処理: ${domainFeature.id}`)
      
      // 対応するcompute機能IDを取得
      const targetComputeFeature = FEATURE_MAPPINGS.domain[domainFeature.id as keyof typeof FEATURE_MAPPINGS.domain]
      if (!targetComputeFeature) {
        console.log(`[Integrated Validation] エラー: 対応compute機能が見つかりません`)
        const failureResult = createFailureResult(domainFeature.id, ['対応compute機能未定義'])
        results.push(failureResult)
        console.log(`[Integrated Validation] ドメイン機能失敗結果追加:`, failureResult.featureId)
        continue
      }
      
      console.log(`[Integrated Validation] 対応compute機能: ${targetComputeFeature}`)
      
      // 該当compute機能要件を検索
      const relatedComputeFeature = computeFeatures.find(f => f.id === targetComputeFeature)
      if (!relatedComputeFeature) {
        console.log(`[Integrated Validation] 警告: 対応するcompute機能要件が見つかりません - ドメイン単独検証`)
        // ドメイン機能のみの検証
        const domainResult = await validateDomainFeature(domainFeature)
        results.push(domainResult)
        console.log(`[Integrated Validation] ドメイン単独結果追加:`, domainResult.featureId)
        continue
      }
      
      console.log(`[Integrated Validation] 関連compute機能要件: ${relatedComputeFeature.id}`)
      
      // 統合検証実行 - ドメイン機能のIDで結果を生成
      const integratedResult = await validateDomainWithComputeIntegration(domainFeature, relatedComputeFeature)
      results.push(integratedResult)
      console.log(`[Integrated Validation] 統合結果追加:`, integratedResult.featureId)
      
      // 対応するcompute機能の結果も別途追加（個別表示用）
      const computeResult = createSuccessResult(relatedComputeFeature.id)
      computeResult.isValid = integratedResult.isValid
      computeResult.missingRequirements = integratedResult.missingRequirements.filter(req => 
        req.includes('Compute') || req.includes('Database') || req.includes('Storage')
      )
      computeResult.details = {
        compute: integratedResult.details.compute,
        database: integratedResult.details.database,
        storage: integratedResult.details.storage
      }
      results.push(computeResult)
      console.log(`[Integrated Validation] Compute結果追加:`, computeResult.featureId)
    }
    
    // ドメイン機能に関連しないcompute機能の個別検証
    for (const computeFeature of computeFeatures) {
      const isDomainRelated = Object.values(FEATURE_MAPPINGS.domain).includes(computeFeature.id)
      if (!isDomainRelated) {
        console.log(`[Integrated Validation] 独立compute機能: ${computeFeature.id}`)
        const result = await validateComputeFeature(computeFeature)
        results.push(result)
        console.log(`[Integrated Validation] 独立Compute結果追加:`, result.featureId)
      }
    }
    
    console.log(`[Integrated Validation] 最終結果配列:`, results.map(r => ({ id: r.featureId, valid: r.isValid })))
    return results
  }

  /**
   * ドメイン機能とCompute機能の統合検証
   */
  const validateDomainWithComputeIntegration = async (domainFeature: FeatureRequirement, computeFeature: FeatureRequirement): Promise<ValidationResult> => {
    console.log(`[Domain-Compute Integration] 統合検証: ${domainFeature.id} + ${computeFeature.id}`)
    
    const result = createSuccessResult(domainFeature.id)
    
    // Step 1: ドメインルーティング検証 + 終端Computeリソース特定
    const targetComputeFeature = FEATURE_MAPPINGS.domain[domainFeature.id as keyof typeof FEATURE_MAPPINGS.domain]!
    
    let endpointComputeResourceIds: string[] = []
    let routingValidation: any = null
    
    for (const requirement of domainFeature.required) {
      if (requirement.includes('.')) {
        routingValidation = validateDomainRouting(requirement, targetComputeFeature)
        result.details.domain = routingValidation
        endpointComputeResourceIds = routingValidation.endpointComputeResourceIds || []
        
        if (!routingValidation.hasRoute53 || !routingValidation.hasRoutingPath) {
          result.isValid = false
          if (!routingValidation.hasRoute53) {
            result.missingRequirements.push('Route53設定')
          }
          if (!routingValidation.hasRoutingPath) {
            result.missingRequirements.push('ルーティングパス')
          }
        }
        break
      }
    }
    
    if (endpointComputeResourceIds.length === 0) {
      console.log(`[Domain-Compute Integration] エラー: ルーティング終端Computeリソースが特定できません`)
      result.isValid = false
      result.missingRequirements.push('ルーティング終端リソース')
      return result
    }
    
    console.log(`[Domain-Compute Integration] ルーティング終端リソース: ${endpointComputeResourceIds}`)
    
    // Step 2: 終端ComputeリソースでCompute機能要件を検証
    let endpointComputeResource: ComputeResource | null = null
    
    for (const resourceId of endpointComputeResourceIds) {
      const computeResource = findComputeResourceById(resourceId)
      if (computeResource) {
        // 該当機能が付与されているかチェック
        const hasFeature = checkComputeResourceHasFeature(computeResource, computeFeature.id)
        if (hasFeature) {
          endpointComputeResource = computeResource
          console.log(`[Domain-Compute Integration] 終端リソースに機能確認: ${resourceId}`)
          break
        }
      }
    }
    
    if (!endpointComputeResource) {
      console.log(`[Domain-Compute Integration] エラー: 終端リソースに必要機能が付与されていません`)
      result.isValid = false
      result.missingRequirements.push('終端リソース機能付与')
      return result
    }
    
    // Step 3: 終端リソースでCompute機能の全要件をチェック
    console.log(`[Domain-Compute Integration] 終端リソースでのCompute要件検証: ${endpointComputeResource.id}`)
    
    for (const requirement of computeFeature.required) {
      console.log(`[Domain-Compute Integration] 要件チェック: ${requirement}`)
      
      if (requirement === 'compute') {
        // 機能付与は既に確認済み
        console.log(`[Domain-Compute Integration] ✅ Compute要件: 機能付与確認済み`)
        
      } else if (requirement === 'database') {
        const databaseValidation = await validateDatabaseConnectionForCompute(endpointComputeResource)
        result.details.database = databaseValidation
        
        if (!databaseValidation.hasDatabaseResource || !databaseValidation.hasConnection) {
          result.isValid = false
          if (!databaseValidation.hasDatabaseResource) {
            result.missingRequirements.push('終端リソース-Databaseリソース')
            console.log(`[Domain-Compute Integration] ❌ Database要件失敗: Databaseリソースなし`)
          }
          if (!databaseValidation.hasConnection) {
            result.missingRequirements.push('終端リソース-Database接続')
            console.log(`[Domain-Compute Integration] ❌ Database要件失敗: Database接続なし`)
          }
        } else {
          console.log(`[Domain-Compute Integration] ✅ Database要件成功`)
        }
        
      } else if (requirement === 'storage') {
        const storageValidation = validateStorageConnectionForCompute(endpointComputeResource)
        result.details.storage = storageValidation
        
        if (!storageValidation.hasS3Resource || !storageValidation.hasAccessPath) {
          result.isValid = false
          if (!storageValidation.hasS3Resource) {
            result.missingRequirements.push('終端リソース-S3リソース')
            console.log(`[Domain-Compute Integration] ❌ Storage要件失敗: S3リソースなし`)
          }
          if (!storageValidation.hasAccessPath) {
            result.missingRequirements.push('終端リソース-S3接続経路')
            console.log(`[Domain-Compute Integration] ❌ Storage要件失敗: S3接続経路なし`)
          }
        } else {
          console.log(`[Domain-Compute Integration] ✅ Storage要件成功`)
        }
      }
    }
    
    // Step 4: ドメインルーティングのcompute要件も再確認
    if (!routingValidation?.computeRequirementsSatisfied) {
      result.isValid = false
      result.missingRequirements.push('ドメインルーティング-終端機能')
      console.log(`[Domain-Compute Integration] ❌ ドメインルーティング終端機能不足`)
    }
    
    // 最終結果
    if (result.isValid) {
      console.log(`[Domain-Compute Integration] 🎉 統合検証成功: ${domainFeature.id} + ${computeFeature.id}`)
    } else {
      console.log(`[Domain-Compute Integration] ❌ 統合検証失敗: ${result.missingRequirements.join(', ')}`)
    }
    
    return result
  }

  /**
   * Computeリソースが指定機能を持っているかチェック
   */
  const checkComputeResourceHasFeature = (computeResource: ComputeResource, featureId: string): boolean => {
    // 通常の機能チェック
    if (computeResource.attachedFeatures?.includes(featureId)) {
      return true
    }
    
    // Fargateタスクの機能チェック
    if (computeResource.type === 'fargate' && computeResource.fargate?.tasks) {
      for (const task of computeResource.fargate.tasks) {
        if (task.container.attachedFeatures?.includes(featureId)) {
          return true
        }
      }
    }
    
    return false
  }

  /**
   * 単一機能要件の検証（機能タイプ別に分岐）
   */
  const validateSingleFeature = async (feature: FeatureRequirement): Promise<ValidationResult> => {
    console.log(`[Feature Validation V2] 機能: ${feature.id}, タイプ: ${feature.type}, 要件: ${feature.required}`)

    if (feature.type === 'domain') {
      return await validateDomainFeature(feature)
    } else if (feature.type === 'compute') {
      return await validateComputeFeature(feature)
    } else {
      return createFailureResult(feature.id, [`未知の機能タイプ: ${feature.type}`])
    }
  }

  /**
   * ドメイン機能の検証
   * ルーティングパス確立 + 終端機能確認
   */
  const validateDomainFeature = async (feature: FeatureRequirement): Promise<ValidationResult> => {
    console.log(`[Domain Feature] 検証開始: ${feature.id}`)
    console.log(`[Domain Feature] 必要要件: ${feature.required}`)
    
    const result = createSuccessResult(feature.id)
    
    // 対応するcompute機能を特定
    const targetComputeFeature = FEATURE_MAPPINGS.domain[feature.id as keyof typeof FEATURE_MAPPINGS.domain]
    if (!targetComputeFeature) {
      console.log(`[Domain Feature] エラー: 対応するcompute機能が見つかりません`)
      return createFailureResult(feature.id, ['対応compute機能未定義'])
    }
    
    console.log(`[Domain Feature] 対応compute機能: ${targetComputeFeature}`)

    // 各ドメイン要件を順次チェック（全て満たす必要がある）
    for (const requirement of feature.required) {
      console.log(`[Domain Feature] 要件チェック: ${requirement}`)
      
      if (requirement.includes('.')) { // ドメイン名
        const domainValidation = validateDomainRouting(requirement, targetComputeFeature)
        result.details.domain = domainValidation
        
        if (!domainValidation.hasRoute53 || 
            !domainValidation.hasRoutingPath || 
            !domainValidation.computeRequirementsSatisfied) {
          result.isValid = false
          
          if (!domainValidation.hasRoute53) {
            result.missingRequirements.push('Route53設定')
            console.log(`[Domain Feature] ❌ ドメイン要件失敗: Route53設定が見つかりません`)
          }
          if (!domainValidation.hasRoutingPath) {
            result.missingRequirements.push('ルーティングパス')
            console.log(`[Domain Feature] ❌ ドメイン要件失敗: ルーティングパスが確立されていません`)
          }
          if (!domainValidation.computeRequirementsSatisfied) {
            result.missingRequirements.push('終端compute機能')
            console.log(`[Domain Feature] ❌ ドメイン要件失敗: 終端compute機能が付与されていません`)
          }
        } else {
          console.log(`[Domain Feature] ✅ ドメイン要件成功: ${requirement}`)
        }
      } else {
        console.log(`[Domain Feature] ⚠️ 未知の要件: ${requirement}`)
        result.isValid = false
        result.missingRequirements.push(`未知の要件: ${requirement}`)
      }
    }

    // 最終結果
    if (result.isValid) {
      console.log(`[Domain Feature] 🎉 全ての要件が満たされました: ${feature.id}`)
    } else {
      console.log(`[Domain Feature] ❌ 要件不足: ${result.missingRequirements.join(', ')}`)
    }

    return result
  }

  /**
   * Compute機能の検証
   * リソース存在 + 接続性確認
   */
  const validateComputeFeature = async (feature: FeatureRequirement): Promise<ValidationResult> => {
    console.log(`[Compute Feature] 検証開始: ${feature.id}`)
    console.log(`[Compute Feature] 必要要件: ${feature.required}`)
    
    const result = createSuccessResult(feature.id)
    
    // 該当機能を持つComputeリソースを特定
    const computeResource = findComputeResourceWithFeature(feature.id)
    if (!computeResource) {
      console.log(`[Compute Feature] エラー: 機能を持つComputeリソースが見つかりません`)
      return createFailureResult(feature.id, ['機能付与Computeリソース'])
    }
    
    console.log(`[Compute Feature] 対象Computeリソース: ${computeResource.id}`)

    // 各要件を順次チェック（全て満たす必要がある）
    for (const requirement of feature.required) {
      console.log(`[Compute Feature] 要件チェック: ${requirement}`)
      
      if (requirement === 'compute') {
        const computeValidation = validateComputeRequirement(feature.id)
        result.details.compute = computeValidation
        
        if (!computeValidation.hasComputeResource || !computeValidation.featureAttached) {
          result.isValid = false
          if (!computeValidation.hasComputeResource) {
            result.missingRequirements.push('Computeリソース')
            console.log(`[Compute Feature] ❌ Compute要件失敗: Computeリソースが見つかりません`)
          }
          if (!computeValidation.featureAttached) {
            result.missingRequirements.push('機能付与')
            console.log(`[Compute Feature] ❌ Compute要件失敗: 機能が付与されていません`)
          }
        } else {
          console.log(`[Compute Feature] ✅ Compute要件成功`)
        }
        
      } else if (requirement === 'database') {
        const databaseValidation = await validateDatabaseConnectionForCompute(computeResource)
        result.details.database = databaseValidation
        
        if (!databaseValidation.hasDatabaseResource || !databaseValidation.hasConnection) {
          result.isValid = false
          if (!databaseValidation.hasDatabaseResource) {
            result.missingRequirements.push('Databaseリソース')
            console.log(`[Compute Feature] ❌ Database要件失敗: Databaseリソースが見つかりません`)
          }
          if (!databaseValidation.hasConnection) {
            result.missingRequirements.push('Database接続')
            console.log(`[Compute Feature] ❌ Database要件失敗: Database接続が確立されていません`)
          }
        } else {
          console.log(`[Compute Feature] ✅ Database要件成功`)
        }
        
      } else if (requirement === 'storage') {
        const storageValidation = validateStorageConnectionForCompute(computeResource)
        result.details.storage = storageValidation
        
        if (!storageValidation.hasS3Resource || !storageValidation.hasAccessPath) {
          result.isValid = false
          if (!storageValidation.hasS3Resource) {
            result.missingRequirements.push('S3リソース')
            console.log(`[Compute Feature] ❌ Storage要件失敗: S3リソースが見つかりません`)
          }
          if (!storageValidation.hasAccessPath) {
            result.missingRequirements.push('S3接続経路')
            console.log(`[Compute Feature] ❌ Storage要件失敗: S3接続経路が確立されていません`)
          }
        } else {
          console.log(`[Compute Feature] ✅ Storage要件成功`)
        }
      } else {
        console.log(`[Compute Feature] ⚠️ 未知の要件: ${requirement}`)
        result.isValid = false
        result.missingRequirements.push(`未知の要件: ${requirement}`)
      }
    }

    // 最終結果
    if (result.isValid) {
      console.log(`[Compute Feature] 🎉 全ての要件が満たされました: ${feature.id}`)
    } else {
      console.log(`[Compute Feature] ❌ 要件不足: ${result.missingRequirements.join(', ')}`)
    }

    return result
  }

  /**
   * ドメインルーティングの検証
   */
  const validateDomainRouting = (requiredDomain: string, targetComputeFeature: string): DomainValidation => {
    console.log(`[Domain Routing] ========== 開始 ==========`)
    console.log(`[Domain Routing] 検証: ${requiredDomain} → ${targetComputeFeature}`)
    
    let hasRoute53 = false
    let hasRoutingPath = false
    let computeRequirementsSatisfied = false
    const routingPath: string[] = []
    const endpointComputeResourceIds: string[] = []

    // Route53確認
    console.log(`[Domain Routing] グローバルサービス数: ${services.value.length}`)
    const route53Resource = services.value.find(s => isRoute53Resource(s)) as Route53Resource | undefined
    if (!route53Resource) {
      console.log(`[Domain Routing] ❌ Route53リソースが見つかりません`)
      return { hasRoute53, domainConfigured: false, hasRoutingPath, computeRequirementsSatisfied, routingPath, domainName: requiredDomain, endpointComputeResourceIds }
    }

    hasRoute53 = true
    console.log(`[Domain Routing] ✅ Route53発見: ${route53Resource.id}`)
    console.log(`[Domain Routing] Route53ドメイン: ${route53Resource.domainName}`)

    // ドメイン設定確認
    const domainParts = requiredDomain.split('.')
    const baseDomain = domainParts.slice(-2).join('.')
    const subdomain = domainParts.slice(0, -2).join('.')
    
    console.log(`[Domain Routing] 必要ドメイン分解: subdomain=${subdomain}, baseDomain=${baseDomain}`)

    if (route53Resource.domainName !== baseDomain) {
      console.log(`[Domain Routing] ❌ ドメイン不一致: ${route53Resource.domainName} vs ${baseDomain}`)
      return { hasRoute53, domainConfigured: false, hasRoutingPath, computeRequirementsSatisfied, routingPath, domainName: requiredDomain, endpointComputeResourceIds }
    }

    // Aレコード確認
    console.log(`[Domain Routing] Aレコード検索: ${JSON.stringify(route53Resource.aRecords)}`)
    const targetRecord = route53Resource.aRecords?.find(record => 
      record.name === subdomain && `${record.name}.${route53Resource.domainName}` === requiredDomain
    )

    if (!targetRecord) {
      console.log(`[Domain Routing] ❌ 対象Aレコードが見つかりません: ${subdomain}`)
      return { hasRoute53, domainConfigured: true, hasRoutingPath, computeRequirementsSatisfied, routingPath, domainName: requiredDomain, endpointComputeResourceIds }
    }

    console.log(`[Domain Routing] ✅ Aレコード発見: ${targetRecord.name} → ${targetRecord.targetResourceId}`)
    routingPath.push('Route53')

    // ルーティングパス追跡
    console.log(`[Domain Routing] ルーティング追跡開始: ${targetRecord.targetResourceId}`)
    
    // API Gatewayの場合はターゲット設定を事前確認
    const initialResource = findResourceById(targetRecord.targetResourceId)
    if (initialResource && initialResource.type === 'api_gateway') {
      console.log(`[Domain Routing] API Gateway詳細確認:`)
      console.log(`[Domain Routing] - ID: ${initialResource.id}`)
      console.log(`[Domain Routing] - targetResources: ${JSON.stringify(initialResource.targetResources)}`)
      if (initialResource.targetResources) {
        for (const targetId of initialResource.targetResources) {
          const targetResource = findResourceById(targetId)
          console.log(`[Domain Routing] - ターゲット ${targetId}: ${targetResource ? `${targetResource.type} 発見` : '未発見'}`)
        }
      }
    }
    
    const routingResult = traceRoutingPath(targetRecord.targetResourceId, routingPath, endpointComputeResourceIds)
    hasRoutingPath = routingResult.hasPath
    
    console.log(`[Domain Routing] ルーティング結果: hasPath=${hasRoutingPath}, path=${routingResult.path.join(' → ')}`)
    console.log(`[Domain Routing] 終端リソースID: ${endpointComputeResourceIds.join(', ')}`)

    // 終端compute機能確認
    if (hasRoutingPath && endpointComputeResourceIds.length > 0) {
      console.log(`[Domain Routing] 終端機能確認開始: ${targetComputeFeature}`)
      computeRequirementsSatisfied = checkEndpointComputeFeatures(endpointComputeResourceIds, targetComputeFeature)
      console.log(`[Domain Routing] 終端機能確認結果: ${computeRequirementsSatisfied}`)
    } else {
      console.log(`[Domain Routing] ❌ 終端機能確認スキップ: hasRoutingPath=${hasRoutingPath}, endpointCount=${endpointComputeResourceIds.length}`)
    }

    console.log(`[Domain Routing] ========== 完了 ==========`)
    return { 
      hasRoute53, 
      domainConfigured: true,
      hasRoutingPath, 
      computeRequirementsSatisfied, 
      routingPath: routingResult.path, 
      domainName: requiredDomain, 
      endpointComputeResourceIds 
    }
  }

  /**
   * ルーティングパスの追跡
   */
  const traceRoutingPath = (resourceId: string, currentPath: string[], endpointIds: string[]): { hasPath: boolean, path: string[] } => {
    console.log(`[Routing Trace] === 開始: ${resourceId} ===`)
    const resource = findResourceById(resourceId)
    if (!resource) {
      console.log(`[Routing Trace] ❌ リソースが見つかりません: ${resourceId}`)
      return { hasPath: false, path: currentPath }
    }

    const newPath = [...currentPath, resource.type.toUpperCase()]
    console.log(`[Routing Trace] ✅ リソース追跡: ${resource.type} ${resource.id}`)
    console.log(`[Routing Trace] 現在のパス: ${newPath.join(' → ')}`)

    // 終端Computeリソースの場合
    if (['lambda', 'ec2', 'fargate', 'ecs'].includes(resource.type)) {
      endpointIds.push(resource.id)
      console.log(`[Routing Trace] 🎯 終端Compute到達: ${resource.type} (${resource.id})`)
      console.log(`[Routing Trace] 終端リソースリスト: ${endpointIds.join(', ')}`)
      return { hasPath: true, path: newPath }
    }

    // 中継リソースの場合
    let nextTargets: string[] = []
    
    if (resource.type === 'cloudfront') {
      nextTargets = (resource as CloudFrontResource).origins || []
      console.log(`[Routing Trace] CloudFront origins: ${JSON.stringify(nextTargets)}`)
    } else if (resource.type === 'api_gateway') {
      nextTargets = (resource as ApiGatewayResource).targetResources || []
      console.log(`[Routing Trace] API Gateway targets: ${JSON.stringify(nextTargets)}`)
    } else if (['alb', 'nlb'].includes(resource.type)) {
      nextTargets = (resource as ComputeResource).loadBalancer?.targetResources || []
      console.log(`[Routing Trace] LoadBalancer targets: ${JSON.stringify(nextTargets)}`)
    }

    console.log(`[Routing Trace] 次のターゲット数: ${nextTargets.length}`)

    // 次のリソースを追跡（全ターゲットを調査して終端リソースを収集）
    let hasAnyPath = false
    let finalPath = newPath
    
    for (const targetId of nextTargets) {
      console.log(`[Routing Trace] 次のターゲットを追跡: ${targetId}`)
      const result = traceRoutingPath(targetId, newPath, endpointIds)
      if (result.hasPath) {
        console.log(`[Routing Trace] ✅ 成功パス発見: ${result.path.join(' → ')}`)
        hasAnyPath = true
        finalPath = result.path // 最後に成功したパスを保持
      }
    }

    if (hasAnyPath) {
      console.log(`[Routing Trace] 🎯 ${resource.type}から複数終端への全パス探索完了`)
      return { hasPath: true, path: finalPath }
    } else {
      console.log(`[Routing Trace] ❌ ${resource.type}からの有効なパスが見つかりません`)
      return { hasPath: false, path: newPath }
    }
  }

  /**
   * 終端Computeリソースの機能確認
   */
  const checkEndpointComputeFeatures = (endpointIds: string[], targetFeature: string): boolean => {
    console.log(`[Endpoint Check] ========== 複数終端リソース機能チェック開始 ==========`)
    console.log(`[Endpoint Check] 終端リソース数: ${endpointIds.length}`)
    console.log(`[Endpoint Check] 終端リソースID: ${endpointIds.join(', ')}`)
    console.log(`[Endpoint Check] 必要機能: ${targetFeature}`)
    
    // 全ての終端リソースの機能を収集
    const endpointFeatureMap = new Map<string, string[]>()
    let foundTargetFeature = false
    
    for (const computeId of endpointIds) {
      console.log(`[Endpoint Check] --- リソース ${computeId} 詳細調査 ---`)
      const computeResource = findComputeResourceById(computeId)
      
      if (!computeResource) {
        console.log(`[Endpoint Check] ❌ リソースが見つかりません: ${computeId}`)
        endpointFeatureMap.set(computeId, ['リソース未発見'])
        continue
      }

      console.log(`[Endpoint Check] ✅ リソース発見: ${computeResource.type} (${computeResource.id})`)
      
      // このリソースが持つ全機能を収集
      const resourceFeatures: string[] = []
      
      // 通常の機能チェック
      if (computeResource.attachedFeatures && computeResource.attachedFeatures.length > 0) {
        resourceFeatures.push(...computeResource.attachedFeatures)
        console.log(`[Endpoint Check] 通常機能: ${computeResource.attachedFeatures.join(', ')}`)
        
        if (computeResource.attachedFeatures.includes(targetFeature)) {
          console.log(`[Endpoint Check] 🎯 ターゲット機能発見: ${computeId} に ${targetFeature}`)
          foundTargetFeature = true
        }
      } else {
        console.log(`[Endpoint Check] 通常機能: なし`)
      }

      // Fargateタスクの機能チェック
      if (computeResource.type === 'fargate') {
        console.log(`[Endpoint Check] Fargateリソース詳細確認`)
        
        if (computeResource.fargate?.tasks && computeResource.fargate.tasks.length > 0) {
          console.log(`[Endpoint Check] Fargateタスク数: ${computeResource.fargate.tasks.length}`)
          
          for (const task of computeResource.fargate.tasks) {
            console.log(`[Endpoint Check] タスク: ${task.name} (${task.id})`)
            
            if (task.container.attachedFeatures && task.container.attachedFeatures.length > 0) {
              resourceFeatures.push(...task.container.attachedFeatures)
              console.log(`[Endpoint Check] タスク機能: ${task.container.attachedFeatures.join(', ')}`)
              
              if (task.container.attachedFeatures.includes(targetFeature)) {
                console.log(`[Endpoint Check] 🎯 ターゲット機能発見: タスク ${task.name} に ${targetFeature}`)
                foundTargetFeature = true
              }
            } else {
              console.log(`[Endpoint Check] タスク機能: なし`)
            }
          }
        } else {
          console.log(`[Endpoint Check] ❌ Fargateタスクが設定されていません`)
          resourceFeatures.push('Fargateタスクなし')
        }
      }
      
      // このリソースの機能をマップに記録
      endpointFeatureMap.set(computeId, resourceFeatures.length > 0 ? resourceFeatures : ['機能なし'])
    }

    // 全終端リソースの機能サマリー出力
    console.log(`[Endpoint Check] ========== 全終端リソース機能サマリー ==========`)
    for (const [resourceId, features] of endpointFeatureMap.entries()) {
      console.log(`[Endpoint Check] ${resourceId}: [${features.join(', ')}]`)
    }
    
    // 結果判定
    if (foundTargetFeature) {
      console.log(`[Endpoint Check] ✅ ターゲット機能 "${targetFeature}" が終端リソース群に存在します`)
      return true
    } else {
      console.log(`[Endpoint Check] ❌ ターゲット機能 "${targetFeature}" が終端リソース群に見つかりません`)
      
      // 全機能の統合リストを出力
      const allFeatures = Array.from(endpointFeatureMap.values()).flat()
      const uniqueFeatures = [...new Set(allFeatures)]
      console.log(`[Endpoint Check] 終端リソース群の全機能: [${uniqueFeatures.join(', ')}]`)
      
      return false
    }
  }

  // ====================== 共通ヘルパー関数 ======================

  const createSuccessResult = (featureId: string): ValidationResult => ({
    featureId,
    isValid: true,
    missingRequirements: [],
    warnings: [],
    details: {}
  })

  const createFailureResult = (featureId: string, missing: string[]): ValidationResult => ({
    featureId,
    isValid: false,
    missingRequirements: missing,
    warnings: [],
    details: {}
  })

  /**
   * 機能付与されたComputeリソースを検索
   */
  const findComputeResourceWithFeature = (featureId: string): ComputeResource | null => {
    console.log(`[Resource Search] 機能 "${featureId}" を持つリソースを検索中...`)
    
    // グローバルサービス
    for (const service of services.value) {
      if (['lambda'].includes(service.type) && (service as ComputeResource).attachedFeatures?.includes(featureId)) {
        console.log(`[Resource Search] ✅ グローバルサービスで発見: ${service.type} (${service.id})`)
        return service as ComputeResource
      }
    }

    // VPCリソース
    for (const vpc of vpcList.value) {
      console.log(`[Resource Search] VPC検索中: ${vpc.vpcId}`)
      
      for (const compute of vpc.computes) {
        // 通常のCompute機能
        if (compute.attachedFeatures?.includes(featureId)) {
          console.log(`[Resource Search] ✅ VPCリソースで発見: ${compute.type} (${compute.id}) 通常機能`)
          return compute
        }
        
        // Fargateタスク機能
        if (compute.type === 'fargate' && compute.fargate?.tasks) {
          for (const task of compute.fargate.tasks) {
            if (task.container.attachedFeatures?.includes(featureId)) {
              console.log(`[Resource Search] ✅ Fargateタスクで発見: ${compute.id} タスク ${task.name}`)
              return compute
            }
          }
        }
      }
    }

    console.log(`[Resource Search] ❌ 機能 "${featureId}" を持つリソースが見つかりません`)
    return null
  }

  // 複数リソース対応版（今後の拡張用）
  const findAllComputeResourcesWithFeature = (featureId: string): ComputeResource[] => {
    console.log(`[Multi Resource Search] 機能 "${featureId}" を持つ全リソースを検索中...`)
    const foundResources: ComputeResource[] = []
    
    // グローバルサービス
    for (const service of services.value) {
      if (['lambda'].includes(service.type) && (service as ComputeResource).attachedFeatures?.includes(featureId)) {
        console.log(`[Multi Resource Search] グローバルサービスで発見: ${service.type} (${service.id})`)
        foundResources.push(service as ComputeResource)
      }
    }

    // VPCリソース
    for (const vpc of vpcList.value) {
      for (const compute of vpc.computes) {
        // 通常のCompute機能
        if (compute.attachedFeatures?.includes(featureId)) {
          console.log(`[Multi Resource Search] VPCリソースで発見: ${compute.type} (${compute.id}) 通常機能`)
          foundResources.push(compute)
        }
        
        // Fargateタスク機能
        if (compute.type === 'fargate' && compute.fargate?.tasks) {
          for (const task of compute.fargate.tasks) {
            if (task.container.attachedFeatures?.includes(featureId)) {
              console.log(`[Multi Resource Search] Fargateタスクで発見: ${compute.id} タスク ${task.name}`)
              if (!foundResources.find(r => r.id === compute.id)) {
                foundResources.push(compute)
              }
              break // 同じFargateリソースは1回だけ追加
            }
          }
        }
      }
    }

    console.log(`[Multi Resource Search] 発見した全リソース数: ${foundResources.length}`)
    return foundResources
  }

  const findComputeResourceById = (resourceId: string): ComputeResource | null => {
    console.log(`[Find Compute Resource] ComputeリソースID検索: ${resourceId}`)
    
    // グローバルサービス
    console.log(`[Find Compute Resource] グローバルComputeサービス検索中...`)
    for (const service of services.value) {
      console.log(`[Find Compute Resource] グローバルサービス確認: ${service.type} (${service.id})`)
      if (service.id === resourceId && ['lambda'].includes(service.type)) {
        console.log(`[Find Compute Resource] ✅ グローバルComputeで発見: ${service.type} (${service.id})`)
        return service as ComputeResource
      }
    }

    // VPCリソース
    console.log(`[Find Compute Resource] VPC Computeリソース検索中...`)
    for (const vpc of vpcList.value) {
      console.log(`[Find Compute Resource] VPC検索: ${vpc.vpcId}`)
      for (const compute of vpc.computes) {
        console.log(`[Find Compute Resource] VPC Compute確認: ${compute.type} (${compute.id})`)
        if (compute.id === resourceId) {
          console.log(`[Find Compute Resource] ✅ VPC Computeで発見: ${compute.type} (${compute.id})`)
          return compute
        }
      }
    }

    console.log(`[Find Compute Resource] ❌ Computeリソースが見つかりません: ${resourceId}`)
    console.log(`[Find Compute Resource] 利用可能なグローバルComputeサービス:`, 
      services.value.filter(s => ['lambda'].includes(s.type)).map(s => `${s.type}(${s.id})`))
    return null
  }

  const findResourceById = (resourceId: string): any => {
    console.log(`[Find Resource] リソースID検索: ${resourceId}`)
    
    // グローバルサービス
    console.log(`[Find Resource] グローバルサービス検索中...`)
    const globalService = services.value.find(s => s.id === resourceId)
    if (globalService) {
      console.log(`[Find Resource] ✅ グローバルサービスで発見: ${globalService.type} (${globalService.id})`)
      return globalService
    }

    // VPCリソース
    console.log(`[Find Resource] VPCリソース検索中...`)
    for (const vpc of vpcList.value) {
      const compute = vpc.computes.find(c => c.id === resourceId)
      if (compute) {
        console.log(`[Find Resource] ✅ VPC Computeで発見: ${compute.type} (${compute.id})`)
        return compute
      }

      const database = vpc.databases.find(d => d.id === resourceId)
      if (database) {
        console.log(`[Find Resource] ✅ VPC Databaseで発見: ${database.type} (${database.id})`)
        return database
      }

      const network = vpc.networks.find(n => n.id === resourceId)
      if (network) {
        console.log(`[Find Resource] ✅ VPC Networkで発見: ${network.type} (${network.id})`)
        return network
      }
    }

    console.log(`[Find Resource] ❌ リソースが見つかりません: ${resourceId}`)
    console.log(`[Find Resource] 利用可能なグローバルサービス:`, services.value.map(s => `${s.type}(${s.id})`))
    return null
  }

  // ====================== レガシー関数（既存コードとの互換性） ======================

  const validateComputeRequirement = (featureId: string): ComputeValidation => {
    const computeResource = findComputeResourceWithFeature(featureId)
    return {
      hasComputeResource: !!computeResource,
      featureAttached: !!computeResource,
      resourceId: computeResource?.id,
      resourceType: computeResource?.type
    }
  }

  const validateDatabaseConnectionForCompute = async (computeResource: ComputeResource): Promise<DatabaseValidation> => {
    console.log(`[Database Connection] Computeリソース: ${computeResource.id}`)
    
    let hasDatabaseResource = false
    let hasConnection = false
    let connectionType: 'rds' | 'dynamodb-endpoint' | undefined
    let databaseId: string | undefined

    // VPC内のRDSをチェック
    for (const vpc of vpcList.value) {
      if (vpc.vpcId === computeResource.vpcId) {
        for (const database of vpc.databases) {
          if (database.type === 'rds') {
            hasDatabaseResource = true
            databaseId = database.id
            console.log(`[Database Connection] RDS発見: ${database.id}`)
            
            if (database.allowedConnections?.includes(computeResource.id)) {
              hasConnection = true
              connectionType = 'rds'
              console.log(`[Database Connection] RDS接続確認`)
              return { hasDatabaseResource, hasConnection, connectionType, databaseId }
            }
          }
        }

        // DynamoDBエンドポイントをチェック
        const dynamoEndpoint = vpc.networks.find(n => 
          n.type === 'endpoint' && n.serviceEndpoint === 'dynamodb'
        )
        
        if (dynamoEndpoint) {
          const dynamoDb = services.value.find(s => s.type === 'dynamo_db')
          if (dynamoDb) {
            hasDatabaseResource = true
            databaseId = dynamoDb.id
            hasConnection = true
            connectionType = 'dynamodb-endpoint'
            console.log(`[Database Connection] DynamoDB VPCエンドポイント接続確認`)
            return { hasDatabaseResource, hasConnection, connectionType, databaseId }
          }
        }
      }
    }

    console.log(`[Database Connection] 結果: DB=${hasDatabaseResource}, 接続=${hasConnection}`)
    return { hasDatabaseResource, hasConnection, connectionType, databaseId }
  }

  const validateStorageConnectionForCompute = (computeResource: ComputeResource): StorageValidation => {
    console.log(`[Storage Connection] Computeリソース: ${computeResource.id}`)
    
    let hasS3Resource = false
    let hasAccessPath = false
    let accessMethod: 'direct' | 'vpc-endpoint' | undefined

    // S3リソースの存在確認
    const s3Resource = services.value.find(s => s.type === 's3')
    if (s3Resource) {
      hasS3Resource = true
      console.log(`[Storage Connection] S3リソース発見: ${s3Resource.id}`)
    } else {
      console.log(`[Storage Connection] S3リソースが存在しません`)
      return { hasS3Resource, hasAccessPath }
    }

    // S3接続経路確認
    const vpc = vpcList.value.find(v => v.vpcId === computeResource.vpcId)
    if (vpc) {
      const s3Endpoint = vpc.networks.find(n => 
        n.type === 'endpoint' && n.serviceEndpoint === 's3'
      )
      
      if (s3Endpoint) {
        hasAccessPath = true
        accessMethod = 'vpc-endpoint'
        console.log(`[Storage Connection] S3 VPCエンドポイント経由でアクセス可能`)
      } else {
        console.log(`[Storage Connection] S3 VPCエンドポイントが見つかりません`)
      }
    }

    console.log(`[Storage Connection] 結果: S3=${hasS3Resource}, 接続=${hasAccessPath}`)
    return { hasS3Resource, hasAccessPath, accessMethod }
  }

  /**
   * ドメイン機能のシンプル検証
   * Route53終端リソースで全要件をチェック
   */
  const validateDomainFeatureSimple = async (feature: FeatureRequirement): Promise<ValidationResult> => {
    console.log(`[Domain Simple] 検証開始: ${feature.id}`)
    console.log(`[Domain Simple] 必要要件: ${feature.required}`)
    
    const result = createSuccessResult(feature.id)
    
    // 対応するcompute機能を特定
    const targetComputeFeature = FEATURE_MAPPINGS.domain[feature.id as keyof typeof FEATURE_MAPPINGS.domain]
    if (!targetComputeFeature) {
      console.log(`[Domain Simple] エラー: 対応するcompute機能が見つかりません`)
      return createFailureResult(feature.id, ['対応compute機能未定義'])
    }
    
    console.log(`[Domain Simple] 対応compute機能: ${targetComputeFeature}`)

    // Step 1: ドメインルーティング確立 + 終端リソース特定
    let endpointComputeResource: ComputeResource | null = null
    
    for (const requirement of feature.required) {
      if (requirement.includes('.')) { // ドメイン名
        console.log(`[Domain Simple] ドメイン要件チェック: ${requirement}`)
        
        const domainValidation = validateDomainRouting(requirement, targetComputeFeature)
        result.details.domain = domainValidation
        
        if (!domainValidation.hasRoute53 || !domainValidation.hasRoutingPath) {
          result.isValid = false
          if (!domainValidation.hasRoute53) {
            result.missingRequirements.push('Route53設定')
            console.log(`[Domain Simple] ❌ Route53設定なし`)
          }
          if (!domainValidation.hasRoutingPath) {
            result.missingRequirements.push('ルーティングパス')
            console.log(`[Domain Simple] ❌ ルーティングパス未確立`)
          }
          break // エラーがあれば終了
        }
        
        // 終端Computeリソースを特定
        if (domainValidation.endpointComputeResourceIds && domainValidation.endpointComputeResourceIds.length > 0) {
          const endpointId = domainValidation.endpointComputeResourceIds[0]
          endpointComputeResource = findComputeResourceById(endpointId)
          console.log(`[Domain Simple] Route53終端リソース: ${endpointId}`)
          
          if (!endpointComputeResource) {
            result.isValid = false
            result.missingRequirements.push('終端Computeリソース')
            console.log(`[Domain Simple] ❌ 終端Computeリソースが見つかりません`)
            break
          }
          
          console.log(`[Domain Simple] 終端リソース確認: ${endpointComputeResource.type} ${endpointComputeResource.id}`)
        } else {
          result.isValid = false
          result.missingRequirements.push('ルーティング終端')
          console.log(`[Domain Simple] ❌ ルーティング終端が特定できません`)
          break
        }
      }
    }
    
    // Step 2: 終端リソースが対応するcompute機能を持っているかチェック
    if (result.isValid && endpointComputeResource) {
      const hasTargetFeature = checkComputeResourceHasFeature(endpointComputeResource, targetComputeFeature)
      
      if (!hasTargetFeature) {
        result.isValid = false
        result.missingRequirements.push('終端リソース機能付与')
        console.log(`[Domain Simple] ❌ 終端リソースに必要機能がありません: ${targetComputeFeature}`)
      } else {
        console.log(`[Domain Simple] ✅ 終端リソースに必要機能確認: ${targetComputeFeature}`)
      }
    }

    // 最終結果
    if (result.isValid) {
      console.log(`[Domain Simple] 🎉 ドメイン機能検証成功: ${feature.id}`)
    } else {
      console.log(`[Domain Simple] ❌ ドメイン機能検証失敗: ${result.missingRequirements.join(', ')}`)
    }

    return result
  }

  /**
   * Compute機能のシンプル検証
   * Route53終端リソースで全要件をチェック
   */
  const validateComputeFeatureSimple = async (feature: FeatureRequirement): Promise<ValidationResult> => {
    console.log(`[Compute Simple] 検証開始: ${feature.id}`)
    console.log(`[Compute Simple] 必要要件: ${feature.required}`)
    
    const result = createSuccessResult(feature.id)
    
    // Step 1: Route53終端でこの機能を持つComputeリソースを探す
    let endpointComputeResource: ComputeResource | null = null
    
    // すべてのドメイン機能から、この機能に対応するドメインルーティングを検索
    const allFeatures = [
      { id: "corp-domain-001", type: "domain", required: ["www.example.com"] }
    ] // 実際にはmockFeaturesから取得すべき
    
    for (const domainFeature of allFeatures.filter(f => f.type === 'domain')) {
      const targetComputeFeature = FEATURE_MAPPINGS.domain[domainFeature.id as keyof typeof FEATURE_MAPPINGS.domain]
      if (targetComputeFeature === feature.id) {
        console.log(`[Compute Simple] 対応ドメイン機能発見: ${domainFeature.id}`)
        
        // このドメインのルーティング終端を確認
        for (const requirement of domainFeature.required) {
          if (requirement.includes('.')) {
            const domainValidation = validateDomainRouting(requirement, feature.id)
            
            if (domainValidation.hasRoute53 && domainValidation.hasRoutingPath && 
                domainValidation.endpointComputeResourceIds && domainValidation.endpointComputeResourceIds.length > 0) {
              
              const endpointId = domainValidation.endpointComputeResourceIds[0]
              endpointComputeResource = findComputeResourceById(endpointId)
              console.log(`[Compute Simple] Route53終端リソース特定: ${endpointId}`)
              break
            }
          }
        }
        break
      }
    }
    
    if (!endpointComputeResource) {
      console.log(`[Compute Simple] エラー: Route53終端でこの機能を持つリソースが見つかりません`)
      return createFailureResult(feature.id, ['Route53終端リソース未発見'])
    }
    
    console.log(`[Compute Simple] 検証対象リソース: ${endpointComputeResource.type} ${endpointComputeResource.id}`)
    
    // Step 2: 終端リソースで全要件をチェック
    for (const requirement of feature.required) {
      console.log(`[Compute Simple] 要件チェック: ${requirement}`)
      
      if (requirement === 'compute') {
        // 機能付与確認
        const hasFeature = checkComputeResourceHasFeature(endpointComputeResource, feature.id)
        
        if (!hasFeature) {
          result.isValid = false
          result.missingRequirements.push('機能付与')
          console.log(`[Compute Simple] ❌ Compute要件失敗: 機能が付与されていません`)
        } else {
          console.log(`[Compute Simple] ✅ Compute要件成功: 機能付与確認`)
        }
        
      } else if (requirement === 'database') {
        const databaseValidation = await validateDatabaseConnectionForCompute(endpointComputeResource)
        result.details.database = databaseValidation
        
        if (!databaseValidation.hasDatabaseResource || !databaseValidation.hasConnection) {
          result.isValid = false
          if (!databaseValidation.hasDatabaseResource) {
            result.missingRequirements.push('Databaseリソース')
            console.log(`[Compute Simple] ❌ Database要件失敗: Databaseリソースなし`)
          }
          if (!databaseValidation.hasConnection) {
            result.missingRequirements.push('Database接続')
            console.log(`[Compute Simple] ❌ Database要件失敗: Database接続なし`)
          }
        } else {
          console.log(`[Compute Simple] ✅ Database要件成功`)
        }
        
      } else if (requirement === 'storage') {
        const storageValidation = validateStorageConnectionForCompute(endpointComputeResource)
        result.details.storage = storageValidation
        
        if (!storageValidation.hasS3Resource || !storageValidation.hasAccessPath) {
          result.isValid = false
          if (!storageValidation.hasS3Resource) {
            result.missingRequirements.push('S3リソース')
            console.log(`[Compute Simple] ❌ Storage要件失敗: S3リソースなし`)
          }
          if (!storageValidation.hasAccessPath) {
            result.missingRequirements.push('S3接続経路')
            console.log(`[Compute Simple] ❌ Storage要件失敗: S3接続経路なし`)
          }
        } else {
          console.log(`[Compute Simple] ✅ Storage要件成功`)
        }
      } else {
        console.log(`[Compute Simple] ⚠️ 未知の要件: ${requirement}`)
        result.isValid = false
        result.missingRequirements.push(`未知の要件: ${requirement}`)
      }
    }

    // 最終結果
    if (result.isValid) {
      console.log(`[Compute Simple] 🎉 Compute機能検証成功: ${feature.id}`)
    } else {
      console.log(`[Compute Simple] ❌ Compute機能検証失敗: ${result.missingRequirements.join(', ')}`)
    }

    return result
  }

  return {
    validateFeatureRequirements,
    validateSingleFeature
  }
}