<template>
  <div class="settings-container">
    <a-card title="应用设置" :bordered="false">
      <a-form
        :model="config"
        :label-col="{ span: 8 }"
        :wrapper-col="{ span: 16 }"
        @finish="handleSave"
      >
        <a-form-item label="文本历史记录最大条数" name="max_text_history">
          <a-input-number
            v-model:value="config.max_text_history"
            :min="10"
            :max="10000"
            :step="10"
            style="width: 200px"
          />
          <div class="form-hint">默认500条，范围：10-10000</div>
        </a-form-item>

        <a-form-item label="图片历史最大数量" name="max_image_history">
          <a-input-number
            v-model:value="config.max_image_history"
            :min="5"
            :max="1000"
            :step="5"
            style="width: 200px"
          />
          <div class="form-hint">默认30条，范围：5-1000</div>
        </a-form-item>

        <a-form-item label="开机自启动" name="auto_start">
          <a-switch v-model:checked="config.auto_start" />
          <div class="form-hint">开启后，系统启动时自动运行本程序</div>
        </a-form-item>

        <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
          <a-space>
            <a-button type="primary" html-type="submit" :loading="saving">
              保存设置
            </a-button>
            <a-button @click="handleReset">
              重置为默认
            </a-button>
            <a-button @click="handleClose">
              关闭
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <a-alert
        message="提示"
        description="修改配置后，新的限制将在下次添加记录时生效。已存在的历史记录不会被自动删除。"
        type="info"
        show-icon
        style="margin-top: 20px"
      />
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import db_service from '../db_service';

const config = ref({
  max_text_history: 500,
  max_image_history: 30,
  auto_start: true
});

const saving = ref(false);

// 加载配置
const loadConfig = async () => {
  try {
    const result = await invoke('get_config');
    config.value = result;
  } catch (error) {
    console.error('加载配置失败:', error);
    message.error('加载配置失败');
  }
};

// 保存配置
const handleSave = async () => {
  saving.value = true;
  try {
    await invoke('save_config', { config: config.value });
    
    // 设置自启动状态
    await invoke('set_auto_start', { enable: config.value.auto_start });
    
    // 立即重新加载配置到 db_service
    await db_service.reloadConfig();
    
    // 通知主窗口配置已更新
    if (window.__TAURI__) {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('config-updated', config.value);
    }
    
    message.success('配置保存成功并已生效');
  } catch (error) {
    console.error('保存配置失败:', error);
    message.error('保存配置失败: ' + error);
  } finally {
    saving.value = false;
  }
};

// 重置为默认
const handleReset = () => {
  config.value = {
    max_text_history: 500,
    max_image_history: 30,
    auto_start: true
  };
  message.info('已重置为默认配置，请点击保存');
};

// 关闭窗口
const handleClose = async () => {
  const window = getCurrentWebviewWindow();
  await window.close();
};

onMounted(() => {
  loadConfig();
});
</script>

<style scoped>
.settings-container {
  padding: 24px;
  height: 100vh;
  background: #f0f2f5;
  overflow-y: auto;
}

/* 自定义滚动条样式 */
.settings-container::-webkit-scrollbar {
  width: 8px;
}

.settings-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.settings-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.settings-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.form-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

:deep(.ant-card) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>