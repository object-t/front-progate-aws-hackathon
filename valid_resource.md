# AWS構成図 機能要件判定仕様

## 概要
バックエンドから送信される機能要件（features）に対して、現在の AWS 構成図が要件を満たしているかを判定するシステム。

## 機能要件の構造
```json
{
  "id": "機能ID",
  "type": "機能タイプ（compute/database/storage/domain）",
  "feature": "機能名",
  "required": ["必要なリソースタイプの配列"]
}
```

## 判定ルール

### 1. compute要件
- **要件**: `"compute"` がrequired配列に含まれる
- **判定条件**: 以下のいずれかのcomputeリソースが存在し、該当機能が付与されている
  - Lambda
  - EC2
  - Fargate

### 2. database要件
- **要件**: `"database"` がrequired配列に含まれる
- **判定条件**: 以下のいずれかが満たされる

#### RDSの場合
- RDSインスタンスが存在
- RDS設定で接続許可リストに対象のcomputeリソースが登録されている
- computeリソースとRDSが同一VPC内または適切なネットワーク経路が存在
- **注意**: RDSには機能が付与されません。機能が付与されたcomputeリソースがRDSに接続できれば要件満足

#### DynamoDBの場合
- DynamoDBテーブルが存在
- VPC Endpointが設定されている
- computeリソースからVPC Endpoint経由でアクセス可能

### 3. storage要件
- **要件**: `"storage"` がrequired配列に含まれる
- **判定条件**: 
  - S3バケットが存在
  - 機能が付与されたcomputeリソースと同じVPCにS3用のVPCエンドポイントが存在
  - **注意**: NAT Gateway経由のアクセスは非対応（セキュリティベストプラクティス）

### 4. domain要件
- **要件**: ドメイン名（例: `"www.example.com"`）がrequired配列に含まれる
- **判定条件**: 以下のルーティングパスのいずれかが確立されている

#### 直接ルーティング
- Route53 → EC2（Elastic IP経由）
- Route53 → API Gateway → Compute

#### ロードバランサー経由
- Route53 → ALB/NLB → EC2/Fargate
- Route53 → CloudFront → ALB/NLB → EC2/Fargate

#### CDN経由
- Route53 → CloudFront → API Gateway → Compute
- Route53 → CloudFront → Compute

**注意**: ドメイン要件では、Route53からComputeリソースへの有効なルーティングパスが存在し、かつルーティングパスの終端にあるComputeリソース群が何らかのcompute機能を持っている必要があります。

## アクセス可能性の判定

### ネットワークレベル
1. **同一VPC内**: 同じVPC内のリソース間は基本的にアクセス可能
2. **サブネット間**: 同一VPC内の異なるサブネット間はルートテーブルで制御
3. **クロスVPC**: VPC Peeringまたは Transit Gateway（今回は対象外）

### サービスレベル
1. **RDS接続**: RDS設定の接続許可リストで明示的に許可されたリソースのみ（RDS自体に機能付与は不要）
2. **DynamoDB**: VPC Endpoint経由でのアクセス
3. **S3**: VPC Endpoint経由のみ（セキュリティベストプラクティス）

## 機能要件チェックの仕様

### 複数Computeリソースでの機能分散
- 1つの機能要件に対して、複数のComputeリソースが存在する場合でも、いずれかのComputeリソースに該当機能が付与されていれば合格
- 例: EC2-A、EC2-B、Lambda-Cがある場合、いずれか1つでも「corp-web-001」機能が付与されていればcompute要件は満たされる

### ドメイン要件の特別ルール  
- ルーティングパスの確立: Route53からComputeリソースへの有効な経路が存在
- **終端Computeリソースのcompute要件**: ルーティングパスの終端にあるComputeリソース群が何らかのcompute機能を持っている必要がある（ドメイン機能自体ではない）
- 複数のComputeリソースがある場合は、いずれかが機能を持っていれば合格

## 実装仕様

### 1. 機能付与システム
- InfoTab.vue に機能選択・付与UIを追加
- computeリソース（Lambda/EC2/Fargate）に対して機能を関連付け
- 機能は複数選択可能

### 2. 接続設定
#### RDS接続許可設定
- RDS設定画面に「接続許可リソース」セクションを追加
- 同一VPC内のcompute リソースを選択可能
- 複数リソースの選択をサポート

#### VPC Endpoint設定
- DynamoDB用のVPC Endpointリソースタイプを追加
- Endpoint設定でサービス（DynamoDB）を指定

### 3. 判定エンジン
#### 判定関数の構造
```typescript
interface ValidationResult {
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
```

#### 判定フロー
1. 各機能要件に対して個別判定
2. 必要なリソースタイプの存在確認
3. アクセス経路の確認
4. 設定の整合性チェック
5. 結果の統合とレポート生成

### 4. UI表示
- utils エリアに「機能要件チェック」ボタンを追加
- ダイアログで判定結果を表示
- 機能ごとの合格/不合格状態
- 不足している要件の詳細表示
- 改善提案の表示

## データ構造拡張

### ComputeResource拡張
```typescript
interface ComputeResource {
  // 既存プロパティ...
  attachedFeatures?: string[] // 付与された機能IDの配列
}
```

### DatabaseResource拡張
```typescript
interface DatabaseResource {
  // 既存プロパティ...
  allowedConnections?: string[] // 接続許可されたリソースIDの配列
}
```

### NetworkResource拡張
```typescript
interface VpcEndpoint extends NetworkResource {
  type: 'vpc_endpoint'
  serviceName: 'dynamodb' | 's3' | 'ec2' // 対象サービス
}
```

## 判定例

### 例1: Webサイト機能
```json
{
  "id": "corp-web-001",
  "type": "compute",
  "feature": "Webサイト",
  "required": ["compute", "storage"]
}
```

**判定条件:**
- EC2/Lambda/Fargate のいずれかに "corp-web-001" 機能が付与されている
- S3 バケットが存在
- compute → S3 へのアクセス経路が存在

### 例2: ブログ機能
```json
{
  "id": "corp-db-001", 
  "type": "compute",
  "feature": "ブログ",
  "required": ["compute", "database", "storage"]
}
```

**判定条件:**
- computeリソースに "corp-db-001" 機能が付与
- RDS または DynamoDB が存在し、適切な接続設定
- S3 バケットが存在し、アクセス可能

### 例3: 企業ドメイン
```json
{
  "id": "corp-domain-001",
  "type": "domain", 
  "feature": "企業ドメイン",
  "required": ["www.example.com"]
}
```

**判定条件:**
- Route53 に "www.example.com" ドメインが設定
- ドメインから compute リソースへの有効なルーティングパスが存在
- ルーティングパスの終端のComputeリソース群が何らかのcompute機能（Webサイト、API等）を持っている