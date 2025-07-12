# AWS Architecture Diagram Tool - 実装済み機能一覧

## プロジェクト概要

中級者向けのAWS構成図学習ツールです。ドラッグ&ドロップでAWSリソースを配置し、各リソースの設定を通じてAWSアーキテクチャの理解を深めることができます。

## 技術スタック

- **Frontend**: Vue 3 + TypeScript + Composition API
- **UI Framework**: Vuetify 3.8.1
- **Build Tool**: Vite 6.2.2
- **スタイリング**: SCSS
- **状態管理**: Composables (useServiceList, useVpcList, useInfo)
- **データ永続化**: localStorage

## 実装済みリソースと設定項目

### 1. グローバル・リージョナルサービス

#### CloudFront
**設定可能項目:**
- 基本情報（名前、ID、タイプ）
- 配信対象：グローバル（全世界）
- 説明：AWSのグローバルなコンテンツ配信ネットワーク（CDN）サービス

#### API Gateway
**設定可能項目:**
- 基本情報（名前、ID、タイプ）
- 配信スコープ：リージョナル
- **宛先リソース設定**（複数選択可能）：
  - Lambda関数
  - ALB（Application Load Balancer）
  - NLB（Network Load Balancer）  
  - EC2インスタンス
- 宛先リソースの追加・削除機能

#### Route 53
**設定可能項目:**
- 基本情報（名前、ID、タイプ）
- 配信スコープ：グローバル（DNS）
- **ドメイン名設定**：例）example.com
- **Aレコード設定**（複数設定可能）：
  - レコード名（www、api等）
  - 宛先リソース選択：
    - CloudFront
    - Elastic IP
    - ALB/NLB
- Aレコードの追加・削除機能

#### その他グローバルサービス
- **S3**: ストレージサービス
- **DynamoDB**: NoSQLデータベース
- **ECR**: Elastic Container Registry
- **Elastic IP**: 静的IPアドレス（アタッチ状態管理）

### 2. VPCリソース

#### VPC (Virtual Private Cloud)
**設定可能項目:**
- 基本情報（名前、ID）
- 階層構造：VPC > Availability Zone > Subnet > Resources

#### Availability Zone
**設定可能項目:**
- AZ名選択（a、c、d）
- 表示名：Availability Zone A/C/D

#### Subnet
**設定可能項目:**
- サブネットタイプ：
  - Public Subnet（パブリックサブネット）
  - Private Subnet（プライベートサブネット）
- AZ内での配置
- リソースの配置先

#### ネットワークリソース

##### Internet Gateway
- VPCレベルでの配置
- インターネット接続ゲートウェイ

##### NAT Gateway
- パブリックサブネットへの配置
- Elastic IPのアタッチ機能

##### VPC Endpoint
**設定可能項目:**
- サービスエンドポイント設定
- プライベート接続の実現

### 3. コンピュートリソース

#### EC2
**設定可能項目:**
- 基本情報（名前、ID、タイプ）
- サブネット配置（単一サブネット）

#### Lambda
**設定可能項目:**
- 基本情報（名前、ID、タイプ）
- サブネット配置（複数サブネット対応）

#### ECS
**設定可能項目:**
- 基本情報（名前、ID、タイプ）
- サブネット配置（複数サブネット対応）

#### Fargate
**設定可能項目:**
- 基本情報（名前、ID、タイプ）
- **キャパシティ設定**：
  - 希望するタスク数
  - 最小キャパシティ
  - 最大キャパシティ
- **リソース設定**：
  - CPU（0.25～4 vCPU）
  - メモリ（512MB～30GB、CPUに応じた制限）
- **ECR設定**：
  - ECRリポジトリ選択
  - ECRエンドポイント選択（プライベートサブネット用）
- **オートスケーリング設定**：
  - オートスケーリング有効/無効
  - ターゲットCPU使用率
  - スケールアップ/ダウンクールダウン（秒）

#### Load Balancer (ALB/NLB)
**設定可能項目:**
- 基本情報（名前、ID、タイプ）
- **ターゲットリソース設定**（複数選択可能）：
  - EC2インスタンス
  - ECSタスク
  - Fargateタスク
- **ヘルスチェック設定**：
  - ヘルスチェックパス
  - プロトコル（HTTP/HTTPS/TCP）
  - ポート番号
  - チェック間隔（秒）
- **リスナー設定**（複数設定可能）：
  - ポート番号
  - プロトコル（HTTP/HTTPS/TCP/TLS）
  - SSL証明書ARN（HTTPS/TLS用）

### 4. データベースリソース

#### RDS
**設定可能項目:**
- 基本情報（名前、ID、タイプ）
- サブネット配置（複数サブネット対応）
- **レプリケーション設定**：
  - リードレプリカ設定（マスター/リードレプリカ選択）
  - マスターインスタンス選択
  - リードレプリカ一覧表示・削除
  - マルチAZ配置（高可用性）
  - バックアップ保持期間（0-35日）
- **高可用性機能**：
  - リードレプリカによる読み取り性能向上
  - マルチAZによる障害回復

#### ElastiCache
**設定可能項目:**
- 基本情報（名前、ID、タイプ）
- サブネット配置（複数サブネット対応）

## アーキテクチャ設計

### 1. コンポーネント構造

```
src/
├── components/
│   ├── board/
│   │   └── PlayBoard.vue          # メイン構成図表示
│   ├── info/                      # 設定パネル
│   │   ├── InfoTab.vue           # 設定タブメイン
│   │   ├── BaseSetting.vue       # 共通設定ヘッダー
│   │   ├── CloudFrontSetting.vue
│   │   ├── ApiGatewaySetting.vue
│   │   ├── Route53Setting.vue
│   │   ├── RdsSetting.vue
│   │   ├── LoadBalancerSetting.vue
│   │   ├── FargateSetting.vue
│   │   ├── ElasticIpSetting.vue
│   │   ├── VpcSetting.vue
│   │   ├── SubnetSetting.vue
│   │   ├── NatGatewaySetting.vue
│   │   ├── EndpointSetting.vue
│   │   ├── AzSetting.vue
│   │   └── ComputeSetting.vue
│   └── layer/
│       ├── LayerTab.vue          # リソース一覧・追加
│       └── ServiceItem.vue      # リソース表示アイテム
├── composables/
│   ├── useServiceList.ts         # グローバルサービス管理
│   ├── useVpcList.ts            # VPCリソース管理
│   └── useInfo.ts               # 設定パネル管理
├── types/
│   └── service.ts               # 型定義
└── assets/icons/                # SVGアイコン
    ├── Compute/
    ├── Database/
    ├── Networking/
    ├── Storage/
    └── Subnet/
```

### 2. 型定義システム

#### 基本インターフェース
```typescript
export interface BaseResource {
  id: string
  name: string
  type: string
  order?: number
}
```

#### 専用インターフェース
- `CloudFrontResource`：CloudFront専用
- `ApiGatewayResource`：宛先リソース配列を含む
- `Route53Resource`：ドメイン名とAレコード配列を含む
- `ComputeResource`：LoadBalancer設定・Fargate設定を含む
- `DatabaseResource`：レプリケーション設定を含む
- `NetworkResource`：VPCネットワークリソース用

### 3. 状態管理

#### useServiceList
- グローバル・リージョナルサービスの管理
- localStorage自動保存
- ドラッグ&ドロップ順序管理

#### useVpcList  
- VPCリソースの階層管理
- VPC > AZ > Subnet > Resources
- localStorage自動保存
- 複雑なネストされたリソース関係の管理

#### useInfo
- 右パネル設定の表示/非表示制御
- 選択されたリソースの管理

### 4. 視覚化システム

#### レイアウト構造
```
[Global Services]  [Top Services (API Gateway, CloudFront, Route53)]
                  [VPC Group 1] [VPC Group 2] ... [Unattached Elastic IPs]
                  [Storage Services (S3, DynamoDB)]
```

#### SVGベースの描画
- 動的なサイズ計算
- パン・ズーム機能
- グリッドベースの配置
- 階層構造の視覚的表現

#### リソース配置ルール
- **グローバルサービス**: 左側に配置
- **トップサービス**: 上部中央に配置  
- **VPCサービス**: 中央メインエリア
- **ストレージサービス**: 下部中央に配置
- **未アタッチElastic IP**: 右側に配置

## 学習機能

### 1. ドラッグ&ドロップ操作
- リソースの直感的な配置
- サブネット間でのリソース移動
- 順序変更機能

### 2. 設定の可視化
- 各リソースの詳細設定
- リソース間の関係性表示
- 設定値のリアルタイム反映

### 3. 中級者向け設計
- 実用的な設定項目に絞り込み
- 複雑な詳細設定は省略
- AWS構成図の理解に重点

## データ永続化

### localStorage保存項目
- `service-list-data`: グローバルサービス一覧
- `vpc-list-data`: VPCリソース階層データ

### 自動保存機能
- 設定変更の即座反映
- ブラウザリロード時のデータ復元
- エラー時のデータ保護

## 今後の拡張予定

### 1. HTML/CSS構成図
- SVGからHTML/CSSベースへの移行
- より保守性の高い描画システム
- レスポンシブ対応

### 2. NatGateway改善
- 適切なリソース扱いでのデザイン統一
- 配置の最適化

### 3. 追加機能
- 構成図のエクスポート機能
- テンプレート機能
- バリデーション機能

## 開発・保守情報

### コマンド
- 開発サーバー: `npm run dev`
- ビルド: `npm run build`
- 型チェック: `npm run typecheck`（要設定確認）
- リント: `npm run lint`（要設定確認）

### 重要なファイル
- **型定義**: `src/types/service.ts`
- **メイン構成図**: `src/components/board/PlayBoard.vue`
- **設定統合**: `src/components/info/InfoTab.vue`
- **リソース管理**: `src/components/layer/LayerTab.vue`

このツールは、AWS中級者がアーキテクチャ設計を学習するための実践的な環境を提供します。実際のAWSコンソールに近い設定項目を通じて、クラウドアーキテクチャの理解を深めることができます。