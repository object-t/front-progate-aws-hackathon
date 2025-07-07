<script setup lang="ts">
  import type { BaseResource } from '@/types/service.ts'
  import { nextTick, ref, watch } from 'vue'
  import { useInfo } from '@/composables/useInfo.ts'
  import { ICONS } from '@/icons.ts'

  const { hidden, setting } = useInfo()

  const props = defineProps<{
    service: BaseResource
    editing: boolean
  }>()

  const emits = defineEmits<{
    'start:edit': [id: string]
    'finish:edit': [id: string]
    'update:name': [id: string, name: string]
  }>()

  const service = props.service
  const editInputRef = ref<HTMLInputElement>()

  watch(() => props.editing, isEditing => {
    if (isEditing) {
      nextTick(() => {
        if (editInputRef.value) {
          editInputRef.value.focus()
          editInputRef.value.select()
        }
      })
    }
  })

  const updateName = (event: Event) => {
    const target = event.target as HTMLInputElement
    emits('update:name', service.id, target.value)
  }
</script>

<template>
  <div class="service">
    <div class="service-item">
      <component :is="ICONS[`${service.type}`].component" class="label-icon" />
      <p
        v-if="!editing"
        class="edit text-truncate"
        @dblclick="emits('start:edit', service.id)"
      >
        {{ service.name }}
      </p>
      <input
        v-else
        ref="editInputRef"
        class="edit-input"
        :value="service.name"
        @blur="emits('finish:edit', service.id)"
        @input="updateName"
        @keyup.enter="emits('finish:edit', service.id)"
      >
    </div>
    <div class="label-action-icon">
      <v-icon @click="emits('start:edit', service.id)">edit</v-icon>
      <v-icon @click="hidden = false; setting = service">settings</v-icon>
    </div>
  </div>
</template>

<style scoped>
.service {
  width: 100%;
  height: 24px;
  padding-left: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .label-icon {
    width: 16px;
    height: 16px;
    margin-right: 8px;
  }

  .label-action-icon {
    display: none;
  }

  &:hover {
    background-color: #d5e2e8;

    .label-action-icon {
      display: flex;
      margin-right: 4px;

      > i.v-icon {
        font-size: 20px;
        color: #4b4b4b;
        margin-left: 4px;
      }
    }
  }
}

.service-item {
  width: 100%;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: start;
  align-items: center;

  .label-icon {
    width: 16px;
    height: 16px;
    margin-right: 8px;
  }

  > div {
    cursor: pointer;
    text-align: center;
    margin: 12px;
    transition: transform 0.3s ease, opacity 0.3s ease;

    &:hover {
      transform: translateY(-4px);
      opacity: 0.7;
    }
  }

  > svg {
    height: 42px;
  }
}

.edit-input {
  background: transparent;
  border: 1px solid #ccc;
  border-radius: 2px;
  padding: 2px 4px;
  font-size: inherit;
  font-family: inherit;
  flex-grow: 1;
}

.edit {
  cursor: pointer;
  flex-grow: 1;
  width: 120px;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
}
</style>
