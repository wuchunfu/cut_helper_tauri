<template>
  <div class="image-list-container">
    <a-back-top :target="() => getTarget()" />
    
    <virt-list 
      class="scroller" 
      :list="imageList" 
      itemKey="id" 
      :minSize="150" 
      id="imageItemBox"
      ref="virtListRef"
    >
      <template #default="{ itemData, index }">
        <div class="image-item-wrapper">
          <div class="image_box">
            <!-- 图片展示 -->
            <a-image
              :src="itemData.content"
              :preview="false"
              @click="handlePreview(itemData)"
              @error="handleImageError(itemData)"
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3PTWBSGcbGzM6GCKqlIBRV0dHRJFarQ0eUT8LH4BnRU0NHR0UEFVdIlFRV7TzRksomPY8uykTk/zewQfKw/9znv4yvJynLv4uLiV2dBoDiBf4qP3/ARuCRABEFAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghgg"
            />
            
            <!-- 操作按钮覆盖层 -->
            <div class="image-actions">
              <a-space>
                <a-button 
                  type="primary" 
                  size="small" 
                  @click.stop="handleCopy(itemData)"
                  title="复制"
                >
                  <template #icon><CopyOutlined /></template>
                </a-button>
                <a-button 
                  size="small" 
                  @click.stop="handlePreview(itemData)"
                  title="查看大图"
                >
                  <template #icon><EyeOutlined /></template>
                </a-button>
                <a-button 
                  danger 
                  size="small" 
                  @click.stop="handleDelete(itemData)"
                  title="删除"
                >
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </a-space>
            </div>
            
            <!-- 图片信息 -->
            <div class="image-info">
              <span>{{ itemData.width }} × {{ itemData.height }}</span>
              <span>{{ format(itemData.createTime, 'short') }}</span>
            </div>
          </div>
        </div>
      </template>
    </virt-list>
    
    <!-- 图片预览对话框 -->
    <a-modal
      v-model:open="previewVisible"
      :footer="null"
      :width="'90%'"
      :bodyStyle="{ padding: '20px', textAlign: 'center' }"
      @cancel="closePreview"
    >
      <template #title>
        <div style="text-align: center;">
          <span>图片预览</span>
          <span style="margin-left: 20px; font-size: 14px; color: #999;">
            {{ previewImageData.width }} × {{ previewImageData.height }}
          </span>
        </div>
      </template>
      
      <div class="preview-content">
        <img 
          :src="previewImageData.content" 
          style="max-width: 100%; max-height: 70vh; object-fit: contain;"
        />
      </div>
      
      <div style="margin-top: 16px; text-align: center;">
        <a-space>
          <a-button type="primary" @click="handleCopy(previewImageData)">
            <template #icon><CopyOutlined /></template>
            复制到剪贴板
          </a-button>
          <a-button danger @click="handleDeleteFromPreview">
            <template #icon><DeleteOutlined /></template>
            删除
          </a-button>
          <a-button @click="closePreview">关闭</a-button>
        </a-space>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { VirtList } from 'vue-virt-list';
import { CopyOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { format, register } from 'timeago.js';
import { copyImageToSystem } from '../cut_service';
import db_service from '../db_service';


message.config({
  top: `50px`,
  duration: 1,
  maxCount: 2,
  rtl: true,
  prefixCls: 'ant-message',
});

// ==================== 时间格式化配置 ====================
const localeFunc = (number, index, totalSec) => {
  return [
    ['刚刚', 'right now'],
    ['%s秒前', 'in %s seconds'],
    ['1分前', 'in 1 minute'],
    ['%s分前', 'in %s minutes'],
    ['1小时前', 'in 1 hour'],
    ['%s小时前', 'in %s hours'],
    ['昨天', 'in 1 day'],
    ['%s天前', 'in %s days'],
    ['1周前', 'in 1 week'],
    ['%s周前', 'in %s weeks'],
    ['1月前', 'in 1 month'],
    ['%s月前', 'in %s months'],
    ['1年前', 'in 1 year'],
    ['%s年前', 'in %s years']
  ][index]
}

register('short', localeFunc)

// ==================== 响应式数据 ====================
const imageList = ref([]);
const previewVisible = ref(false);
const previewImageData = ref({});
const virtListRef = ref(null);

// ==================== 生命周期 ====================
onMounted(() => {
  queryImageItems();
});

// 组件卸载时清理内存
onBeforeUnmount(() => {
  // 清空图片列表，释放 base64 数据占用的内存
  imageList.value = [];
  previewImageData.value = {};
  
  // 移除全局函数引用
  if (window.addImageItemToList) {
    delete window.addImageItemToList;
  }
});

// 将添加图片到列表的函数暴露给全局
window.addImageItemToList = (item) => {
  imageList.value.unshift(item);
  
  // 🔥 关键修复：限制内存中的列表长度，保持与数据库一致
  const MAX_IMAGE_LIST = 50;
  if (imageList.value.length > MAX_IMAGE_LIST) {
    // 删除超出部分，释放内存
    imageList.value.splice(MAX_IMAGE_LIST);
  }
  
  message.success('已保存图片到历史记录');
};

// ==================== 数据操作 ====================
const queryImageItems = async () => {
  try {
    // 🚀 从数据库获取图片列表
    const result = await db_service.fetchImageItems();
    imageList.value = result || [];
  } catch (error) {
    console.error('获取图片列表失败:', error);
    message.error('获取图片列表失败');
  }
};

const handleDelete = async (item) => {
  try {
    // 🚀 从数据库删除图片
    await db_service.removeImageItem(item.id);
    const index = imageList.value.findIndex(img => img.id === item.id);
    if (index !== -1) {
      imageList.value.splice(index, 1);
      message.success('删除成功');
    }
  } catch (error) {
    console.error('删除失败:', error);
    message.error('删除失败');
  }
};

const handleDeleteFromPreview = async () => {
  await handleDelete(previewImageData.value);
  closePreview();
};

const handleCopy = async (item) => {
  try {
    await copyImageToSystem(item.content);
    message.success('已复制到剪贴板');
  } catch (error) {
    console.error('复制失败:', error);
    message.error('复制失败');
  }
};

const handlePreview = (item) => {
  previewImageData.value = item;
  previewVisible.value = true;
};

const handleImageError = (item) => {
  console.error('图片加载失败:', item.id);
};

const closePreview = () => {
  previewVisible.value = false;
};

const getTarget = () => {
  return document.getElementById('imageItemBox');
};
</script>

<style scoped>
.image-list-container {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.scroller {
  height: 100%;
  padding: 8px;
}

.image-item-wrapper {
  padding: 4px;
}

.image_box {
  position: relative;
  margin: 4px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
  background-color: #fafafa;
  transition: all 0.3s ease;
  cursor: pointer;
}

.image_box:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #1890ff;
}

.image_box :deep(.ant-image) {
  width: 100%;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
}

.image_box :deep(.ant-image img) {
  max-width: 100%;
  max-height: 140px;
  object-fit: contain;
}

.image-actions {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 10;
}

.image_box:hover .image-actions {
  opacity: 1;
}

.image-actions :deep(.ant-space) {
  gap: 4px !important;
}

.image-info {
  display: flex;
  justify-content: space-between;
  padding: 4px 8px;
  font-size: 12px;
  color: #666;
  background-color: rgba(255, 255, 255, 0.9);
}

.preview-content {
  max-height: 75vh;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
