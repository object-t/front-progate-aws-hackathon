<script setup lang="ts">
  import type { DatabaseResource } from '@/types/service.ts'
  import { computed, ref, watch } from 'vue'
  import { useInfo } from '@/composables/useInfo.ts'
  import { useVpcList } from '@/composables/useVpcList.ts'

  const { setting } = useInfo()
  const { vpcList } = useVpcList()

  const currentRds = computed(() => {
    return setting.value && setting.value.type === 'rds' ? setting.value as DatabaseResource : null
  })

  // レプリケーション設定のローカル状態
  const isReadReplica = ref(currentRds.value?.replication?.isReadReplica || false)
  const multiAz = ref(currentRds.value?.replication?.multiAz || false)
  const backupRetentionPeriod = ref(currentRds.value?.replication?.backupRetentionPeriod || 7)
  const masterInstanceId = ref(currentRds.value?.replication?.masterInstanceId || '')

  // 同じVPC内の他のRDSインスタンスを取得
  const availableMasterInstances = computed(() => {
    if (!currentRds.value) return []
    
    const currentVpc = vpcList.value.find(vpc => vpc.vpcId === currentRds.value!.vpcId)
    if (!currentVpc) return []
    
    return currentVpc.databases
      .filter(db => 
        db.type === 'rds' && 
        db.id !== currentRds.value!.id &&
        !db.replication?.isReadReplica // マスターインスタンスのみ
      )
      .map(db => ({
        id: db.id,
        name: db.name
      }))
  })

  // 現在のRDSがマスターの場合、リードレプリカのリストを取得
  const readReplicas = computed(() => {
    if (!currentRds.value || isReadReplica.value) return []
    
    const currentVpc = vpcList.value.find(vpc => vpc.vpcId === currentRds.value!.vpcId)
    if (!currentVpc) return []
    
    return currentVpc.databases
      .filter(db => 
        db.type === 'rds' && 
        db.replication?.masterInstanceId === currentRds.value!.id
      )
      .map(db => ({
        id: db.id,
        name: db.name
      }))
  })

  // 設定を更新する関数
  const updateReplicationSettings = () => {
    if (!currentRds.value) return
    
    if (!currentRds.value.replication) {
      currentRds.value.replication = {
        isReadReplica: false,
        multiAz: false,
        backupRetentionPeriod: 7
      }
    }
    
    currentRds.value.replication.isReadReplica = isReadReplica.value
    currentRds.value.replication.multiAz = multiAz.value
    currentRds.value.replication.backupRetentionPeriod = backupRetentionPeriod.value
    
    if (isReadReplica.value && masterInstanceId.value) {
      currentRds.value.replication.masterInstanceId = masterInstanceId.value
      // マスターインスタンスのリードレプリカリストを更新
      updateMasterInstanceReplicas()
    } else {
      currentRds.value.replication.masterInstanceId = undefined
    }
  }

  // マスターインスタンスのリードレプリカリストを更新
  const updateMasterInstanceReplicas = () => {
    if (!currentRds.value || !isReadReplica.value || !masterInstanceId.value) return
    
    const currentVpc = vpcList.value.find(vpc => vpc.vpcId === currentRds.value!.vpcId)
    if (!currentVpc) return
    
    const masterInstance = currentVpc.databases.find(db => db.id === masterInstanceId.value) as DatabaseResource
    if (masterInstance) {
      if (!masterInstance.replication) {
        masterInstance.replication = {
          isReadReplica: false,
          readReplicas: []
        }
      }
      if (!masterInstance.replication.readReplicas) {
        masterInstance.replication.readReplicas = []
      }
      if (!masterInstance.replication.readReplicas.includes(currentRds.value!.id)) {
        masterInstance.replication.readReplicas.push(currentRds.value!.id)
      }
    }
  }

  // リソース変更時にローカル状態をリセット
  watch(currentRds, (newRds) => {
    if (newRds && newRds.replication) {
      isReadReplica.value = newRds.replication.isReadReplica || false
      multiAz.value = newRds.replication.multiAz || false
      backupRetentionPeriod.value = newRds.replication.backupRetentionPeriod || 7
      masterInstanceId.value = newRds.replication.masterInstanceId || ''
    } else {
      isReadReplica.value = false
      multiAz.value = false
      backupRetentionPeriod.value = 7
      masterInstanceId.value = ''
    }
  }, { immediate: true })

  // リードレプリカ設定が変更された時の処理
  watch([isReadReplica, multiAz, backupRetentionPeriod, masterInstanceId], updateReplicationSettings)

  // リードレプリカを削除する関数
  const removeReadReplica = (replicaId: string) => {
    if (!currentRds.value || !currentRds.value.replication) return
    
    const currentVpc = vpcList.value.find(vpc => vpc.vpcId === currentRds.value!.vpcId)
    if (!currentVpc) return
    
    // リードレプリカの設定をリセット
    const replica = currentVpc.databases.find(db => db.id === replicaId) as DatabaseResource
    if (replica && replica.replication) {
      replica.replication.isReadReplica = false
      replica.replication.masterInstanceId = undefined
    }
    
    // マスターのリードレプリカリストから削除
    if (currentRds.value.replication.readReplicas) {
      const index = currentRds.value.replication.readReplicas.indexOf(replicaId)
      if (index > -1) {
        currentRds.value.replication.readReplicas.splice(index, 1)
      }
    }
  }
</script>

<template>
  <div>
    <h2>RDS設定</h2>
    <div class="setting-section">
      <div class="info-item">
        <label>名前:</label>
        <span>{{ currentRds?.name }}</span>
      </div>
      
      <div class="info-item">
        <label>ID:</label>
        <span class="resource-id">{{ currentRds?.id }}</span>
      </div>
      
      <div class="info-item">
        <label>タイプ:</label>
        <span>{{ currentRds?.type?.toUpperCase() }}</span>
      </div>
      
      <div class="replication-section">
        <h3>レプリケーション設定</h3>
        
        <!-- リードレプリカ設定 -->
        <div class="config-item">
          <v-switch
            v-model="isReadReplica"
            label="リードレプリカとして設定"
            color="primary"
            density="compact"
          />
        </div>
        
        <!-- マスターインスタンス選択（リードレプリカの場合） -->
        <div v-if="isReadReplica" class="config-item">
          <v-select
            v-model="masterInstanceId"
            :items="availableMasterInstances"
            item-title="name"
            item-value="id"
            label="マスターインスタンス"
            variant="outlined"
            density="compact"
            :rules="[v => !!v || 'マスターインスタンスを選択してください']"
          />
        </div>
        
        <!-- リードレプリカ一覧（マスターの場合） -->
        <div v-if="!isReadReplica && readReplicas.length > 0" class="read-replicas-section">
          <h4>リードレプリカ</h4>
          <div class="replica-list">
            <div v-for="replica in readReplicas" :key="replica.id" class="replica-item">
              <div class="replica-info">
                <span class="replica-name">{{ replica.name }}</span>
                <span class="replica-id">{{ replica.id }}</span>
              </div>
              <v-btn
                size="small"
                color="error"
                variant="text"
                @click="removeReadReplica(replica.id)"
              >
                削除
              </v-btn>
            </div>
          </div>
        </div>
        
        <!-- マルチAZ設定 -->
        <div v-if="!isReadReplica" class="config-item">
          <v-switch
            v-model="multiAz"
            label="マルチAZ配置"
            color="primary"
            density="compact"
          />
          <div class="config-description">
            <v-icon size="small" color="#1976d2">info</v-icon>
            <span>マルチAZ配置により、異なるアベイラビリティゾーンにスタンバイインスタンスを作成して高可用性を実現します。</span>
          </div>
        </div>
        
        <!-- バックアップ保持期間 -->
        <div v-if="!isReadReplica" class="config-item">
          <v-text-field
            v-model.number="backupRetentionPeriod"
            label="バックアップ保持期間（日数）"
            type="number"
            variant="outlined"
            density="compact"
            :min="0"
            :max="35"
            suffix="日"
          />
          <div class="config-description">
            <v-icon size="small" color="#1976d2">info</v-icon>
            <span>自動バックアップの保持期間を設定します。0に設定すると自動バックアップが無効になります。</span>
          </div>
        </div>
      </div>
      
      <div class="info-note">
        <v-icon size="small" color="#1976d2">info</v-icon>
        <span>RDSのレプリケーション機能により、リードレプリカの作成やマルチAZ配置による高可用性を実現できます。リードレプリカは読み取り性能の向上に、マルチAZは障害回復に役立ちます。</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.setting-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin-top: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item label {
  font-weight: bold;
  color: #424242;
  font-size: 14px;
}

.info-item span {
  color: #666;
  font-size: 14px;
}

.resource-id {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  background-color: #e8e8e8;
  padding: 2px 6px;
  border-radius: 4px;
  word-break: break-all;
}

.replication-section {
  margin-top: 16px;
  padding: 16px;
  background-color: #fafafa;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.replication-section h3 {
  font-size: 16px;
  font-weight: bold;
  color: #424242;
  margin-bottom: 16px;
}

.config-item {
  margin-bottom: 16px;
}

.config-description {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 8px;
  padding: 8px;
  background-color: #e3f2fd;
  border-radius: 4px;
}

.config-description span {
  font-size: 12px;
  color: #1976d2;
  line-height: 1.4;
}

.read-replicas-section {
  margin-top: 16px;
}

.read-replicas-section h4 {
  font-size: 14px;
  font-weight: bold;
  color: #424242;
  margin-bottom: 12px;
}

.replica-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.replica-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.replica-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.replica-name {
  font-weight: bold;
  color: #424242;
}

.replica-id {
  font-size: 12px;
  color: #666;
  font-family: 'Courier New', monospace;
}

.info-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background-color: #e3f2fd;
  border-radius: 4px;
  border-left: 3px solid #1976d2;
  margin-top: 8px;
}

.info-note span {
  font-size: 13px;
  color: #1976d2;
  line-height: 1.4;
}
</style>