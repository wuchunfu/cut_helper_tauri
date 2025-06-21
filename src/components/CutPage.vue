<template>
  <div class="box">
    <a-tabs class="box-tabs" style="height: 100%" v-model:activeKey="activeKey" type="card" size="small">
    <a-tab-pane  key="timeList" tab="文本" style="height:100%;">
        <time-list id="timelist" ref="timeListVue"></time-list>
    </a-tab-pane>
    <a-tab-pane key="imageList" tab="图片"><image-item></image-item></a-tab-pane>
    <!-- <a-tab-pane key="groupList" tab="分组"><group></group></a-tab-pane> -->
    <a-tab-pane key="time" tab="白板">
      <!-- <time-page></time-page> -->
       <text-edit></text-edit>
    </a-tab-pane>
    <template #rightExtra>
      <a-button :type="appConfig.top?'primary':'default'" @click="top()">
        <template #icon><PushpinOutlined /></template>
      </a-button>
      <a-input ref="searchInputRef" v-model:value="searchkey" tabindex="0" @keydown="handleKeyDown" :change="search()" size="default" style="width: 8em;margin-left: 4px;" placeholder="搜索" allow-clear />
    </template>
  </a-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { MoreOutlined,PushpinOutlined,SearchOutlined } from '@ant-design/icons-vue'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window';


// invoke("greet",{ name:'迪丽热巴'}).then((res)=>{
//   console.log(res)
// })

const text = ref()
var searchkey = ref(null)
var activeKey = ref("timeList")
const timeListVue = ref(null);
const searchInputRef = ref(null);

var updateTop = (isTop)=>{
  getCurrentWindow().setAlwaysOnTop(isTop);
}

const appConfig = ref({
  "top":true,
})



// 固定界面到最上层
function top(event) {
  appConfig.value.top = !appConfig.value.top
  //nodejs 设置窗口置顶状态
  updateTop(appConfig.value.top)
}
// 搜索关键词
function search() {
  console.log(searchkey.value)
  if(timeListVue.value != null) {
    timeListVue.value.search(searchkey.value)
  }
}
// 监听方向键↓，让列表获得焦点
function handleKeyDown(event) {
  console.log(event.key)
  if(event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault(); // 阻止默认行为
    if(timeListVue.value != null) {
      // 先让TimeList获取焦点
      timeListVue.value.abtainFocus()
      
      // 延迟执行导航，确保焦点切换完成
      setTimeout(() => {
        // 如果TimeList还没有选中项，设置第一个为选中项
        if (timeListVue.value.currentItemIdx === undefined || timeListVue.value.currentItemIdx < 0) {
          // 通过调用TimeList的方法来设置第一个选中项
          timeListVue.value.navigateToFirst && timeListVue.value.navigateToFirst();
        } else if (event.key === 'ArrowDown') {
          // 如果已经有选中项，直接向下导航
          timeListVue.value.navigateDown && timeListVue.value.navigateDown();
        } else if (event.key === 'ArrowUp') {
          // 如果已经有选中项，直接向上导航
          timeListVue.value.navigateUp && timeListVue.value.navigateUp();
        }
      }, 10);
    }
  } else if(event.key === 'Enter') {
    // 按回车键时，如果有搜索结果，切换到列表并选中第一项
    event.preventDefault();
    if(timeListVue.value != null) {
      timeListVue.value.abtainFocus()
      setTimeout(() => {
        timeListVue.value.navigateToFirst && timeListVue.value.navigateToFirst();
      }, 10);
    }
  }
}

// 全局键盘事件处理函数
function handleGlobalKeyDown(event) {
  // 检查是否按下 Ctrl + F
  if (event.ctrlKey && event.key === 'f') {
    event.preventDefault(); // 阻止默认的浏览器搜索行为
    focusSearchInput();
  }
}

// 设置焦点到搜索框
function focusSearchInput() {
  if (searchInputRef.value) {
    searchInputRef.value.focus();
    // 可选：选中搜索框中的文本
    searchInputRef.value.select();
  }
}

onMounted(() => {
  // 添加全局键盘事件监听器
  document.addEventListener('keydown', handleGlobalKeyDown);
})

onUnmounted(() => {
  // 移除全局键盘事件监听器
  document.removeEventListener('keydown', handleGlobalKeyDown);
})
</script>


<style scoped>
.box {
  height: 100vh;
  width: 100vw;
}

.box-tabs :deep() .ant-tabs-content {
  height: 100%;
}

.box :deep() .ant-list-item-action{
  margin-left:10px !important;
}

.box :deep() .ant-tabs-nav {
  margin: 0 0 2px 0;
}
</style>