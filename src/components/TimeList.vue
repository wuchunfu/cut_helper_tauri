<template>
  <div class="cut-list"  ref="scrollerRef" style="height: 100%;" @keydown="handleKeyDown">
    <a-back-top :target="()=>getTarget()"/>
    <virt-list class="scroller" tabindex="0"  :list="showItemList" itemKey="id" :minSize="40" 
       id="cutItemBox" ref="virtListRef">
      <!-- page-mode -->
      <!--  -->
      <template #default="{ itemData,index}">
      <div class="list-item" v-on:dblclick="sendCopyItem(itemData)" :class="{'list-item-selected': currentItemIdx === index }" style="padding: 5px">
        <!-- 原有的 a-list-item 内容 -->
        <div style="height: 1.5em;line-height:1.5em;flex:1;overflow: hidden;margin-right: 6px;">
        <a-skeleton avatar :title="false" :loading="!!itemData.loading" active>
          <a-list-item-meta >
            <template #title>
              <a-popover trigger="hover" :mouseEnterDelay="1" placement="topLeft">
                <template #title>{{ formatDate(itemData.createTime) }}</template>
                <template #content>
                  <div class="detail-style" style="max-height: 80vh;max-width: 90vw;">
                    <pre>{{ itemData.content }}</pre>
                  </div>
                </template>
                <div style="margin-right: 6px;white-space: nowrap;">
                  <li>{{ (index + 1) }} . {{ itemData.content }}</li>
                </div>
              </a-popover>
            </template>
          </a-list-item-meta>
        </a-skeleton>
        </div>
        <div  style="display: flex;justify-content: space-between;align-items: center; width: fit-content">
          <div>{{ format(itemData.createTime, 'short') }}</div>
          <a-dropdown :trigger="['click']">
            <more-outlined class="jump" @click.prevent style="cursor: pointer;color: black;" />
            <template #overlay>
              <a-menu>
                <a-menu-item @click="deleteItem(itemData)" key="0" style="color: #f5222d;">
                  <div>
                    <delete-outlined /><span style="margin-left: 8px;">删除</span>
                  </div>
                </a-menu-item>
                <a-menu-item @click="openDetail(itemData)" key="1">
                  <div>
                    <EditOutlined /><span style="margin-left: 8px;">详情</span>
                  </div>
                </a-menu-item>
                <a-menu-item @click="openGroupSelect(itemData)" key="2">
                  <div>
                    <GroupOutlined /><span style="margin-left: 8px;">分组</span>
                  </div>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </div>
      </template>
    </virt-list>
    <div  style="overflow: scroll;">
      <a-modal v-model:open="groupSelectOpen" title="添加分组" ok-text="确认" cancel-text="取消" @ok="addItemToGroup()">
      <a-radio-group v-model:value="groupSelectId">
        <div v-for="item,index in groupList" :key="item.id">
          <a-radio :style="radioStyle" :value="item.id">{{ item.name }}</a-radio>
        </div>
      </a-radio-group>
    </a-modal>

    </div>
    
  </div>

</template>

<script setup>
import { format, register } from 'timeago.js';
import { ref, onMounted, computed, nextTick, watch, watchEffect } from 'vue'
import { MoreOutlined, DeleteOutlined, EditOutlined ,GroupOutlined} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue';
// import { RecycleScroller } from 'vue-virtual-scroller';
import { VirtList } from 'vue-virt-list';
import { containsIgnoreCase } from '../../utils/StringUtil'
import { showMessageShort } from '../../utils/MessageUtil'
import dbService from '../db_service';
import {copyToSystem} from '../cut_service';

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
  ][index];
};

register('short', localeFunc)
//全量剪切版数据
const allCutList = ref([])

//当前item id
const currentItemIdx = ref(-1)

const showItemList = ref([])
var initLoading = ref(true)
// 搜索key
var searchKey = ref("")
var cutDetailVisible = ref(false)
var cutDetail = "";
var doubleClick = false;
let timeoutId = null;
const listKey = ref(0)

const groupList = ref([])

const groupSelectOpen = ref(false)
const groupSelectId = ref("")
const currCutItem = ref({})
const listRef = ref(null);
const scrollerRef = ref(null);
const virtListRef = ref(null);
onMounted(() => {
  // 获取全量数据
  sendQueryCutList();
  initLoading.value = false
  // 设置焦点到列表容器
  nextTick(() => {
    if (scrollerRef.value) {
      scrollerRef.value.focus();
    }
    // 确保虚拟滚动组件已初始化
    if (virtListRef.value) {
      console.log('虚拟滚动组件已初始化');
      // 调试：查看虚拟滚动组件的DOM结构
      console.log('虚拟滚动组件DOM:', virtListRef.value.$el);
      console.log('虚拟滚动组件子元素:', virtListRef.value.$el?.children);
    }
  });
})

watchEffect(()=>{
  //获取总列表的状态
  if (searchKey.value){
    showItemList.value = allCutList.value.filter(filterData)
  }else{
    showItemList.value = allCutList.value
  }
  listKey.value = 0
})

// =============================发射
//查询全部剪切列表
var sendQueryCutList = async() => {
  let result = await dbService.fetchItems()
  allCutList.value = result
}

// window.electron.ipcRenderer.invoke('queryCutList').then(resp => {
//   allCutList.value = resp
// })

var sendDeleteItem = (remove) => {
    dbService.removeItem(remove.id)
}
// window.electron.ipcRenderer.send('deleteCutListItem', JSON.stringify(remove))

var sendOpenDetail = (item) => {}
// window.electron.ipcRenderer.send('openDetailWindow', JSON.stringify(item))


//查询所有分组
const queryGroups = () => {}
// window.electron.ipcRenderer.invoke("queryGroups", null).then((items) => {
//   groupList.value = items
// })

const addGroupItem = (groupItem) => {}
// window.electron.ipcRenderer.invoke("addGroupItem", groupItem).then((item) => {
//   if(item){
//     showMessageShort("添加成功")
//   }
// })

//剪切板拷贝
var sendCopyItem = (item) => {
  doubleClick = true;
  console.log(item)
  copyToSystem(item.content)
  // window.electron.ipcRenderer.send('sendCopyItem', JSON.stringify(item))
  showMessageShort("拷贝成功")
}
//接收
// window.electron.ipcRenderer.on('update', (_, value) => update(value))

function update(value) {
  console.log(value)
  let len = allCutList.value.unshift(value);
  if (len >= 300) {
    allCutList.value.pop()
  }
      
  // listKey.value += 1;

  // nextTick(() => {
  //   // scrollerRef.value.$el.scrollTop += 1;
  //   document.getElementsByClassName('cut-list').scrollTop = 100
  // });
}

window.addCutItemToList = update
// 关闭弹出信息

// 打开选择分组Model
function openGroupSelect(item) {
    groupSelectOpen.value = true
    currCutItem.value = item
    queryGroups()
}

function openDetail(item) {
  sendOpenDetail(item)
}

function addItemToGroup() {
    groupSelectOpen.value = false
    let item = currCutItem.value
    if (!item){
      return
    }
    let tmpGroupItem = {
      groupId : groupSelectId.value,
      title : item.content,
      content : item.content,
    }
    addGroupItem(tmpGroupItem)
}




function getTarget() {
  return document.getElementById("cutItemBox")
}

const filterItems = computed(() => {
  return allCutList.value.filter(filterData);
});

function copyItem() {

}

const search = (key) => {
  clearTimeout(timeoutId); // 取消之前的定时器
  timeoutId = setTimeout(() => {
    console.log(key)
    searchKey.value = key
    // 搜索时重置选中状态到第一项
    currentItemIdx.value = 0;
  }, 500);
}

function filterData(item) {
  return containsIgnoreCase(item.content, searchKey.value)
}


// 删除列表中的某一项
function deleteItem(remove) {
  let index = allCutList.value.findIndex(item => item.id === remove.id);
  // 删除对象
  if (index !== -1) {
    sendDeleteItem(remove)
    allCutList.value.splice(index, 1);
    showMessageShort("删除成功")
  } else {
    showMessageShort("删除失败")
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  const formattedDate = `${year}年${month}月${day}日，${hours}:${minutes}:${seconds}`;
  return formattedDate
}

function abtainFocus() {
  if (virtListRef.value?.$el) {
    virtListRef.value.$el.focus();
  } else if (scrollerRef.value) {
    scrollerRef.value.focus();
  }
}


// 暴漏方法
defineExpose({ search, abtainFocus, currentItemIdx, navigateToFirst, navigateUp, navigateDown, navigateToLast });

// 键盘导航处理
function handleKeyDown(event) {
  const key = event.key;
  
  switch (key) {
    case 'ArrowUp':
      event.preventDefault();
      navigateUp();
      break;
    case 'ArrowDown':
      event.preventDefault();
      navigateDown();
      break;
    case 'Enter':
      event.preventDefault();
      if (currentItemIdx.value >= 0 && currentItemIdx.value < showItemList.value.length) {
        sendCopyItem(showItemList.value[currentItemIdx.value]);
      }
      break;
    case 'Home':
      event.preventDefault();
      navigateToFirst();
      break;
    case 'End':
      event.preventDefault();
      navigateToLast();
      break;
  }
}

// 向上导航
function navigateUp() {
  if (showItemList.value.length === 0) return;
  
  if (currentItemIdx.value > 0) {
    currentItemIdx.value--;
  }
  
  // 检查是否需要滚动，添加延迟确保虚拟滚动渲染完成
  nextTick(() => {
    setTimeout(() => {
      if (!isSelectedItemVisible()) {
        scrollToSelectedItem();
      }
    }, 50);
  });
}

// 向下导航
function navigateDown() {
  if (showItemList.value.length === 0) return;
  
  if (currentItemIdx.value < showItemList.value.length - 1) {
    currentItemIdx.value++;
  }
  
  // 检查是否需要滚动，添加延迟确保虚拟滚动渲染完成
  nextTick(() => {
    setTimeout(() => {
      if (!isSelectedItemVisible()) {
        scrollToSelectedItem();
      }
    }, 50);
  });
}

// 跳转到第一项
function navigateToFirst() {
  if (showItemList.value.length === 0) return;
  currentItemIdx.value = 0;
  scrollToSelectedItem();
}

// 跳转到最后一项
function navigateToLast() {
  if (showItemList.value.length === 0) return;
  currentItemIdx.value = showItemList.value.length - 1;
  scrollToSelectedItem();
}

// 检测选中项是否在可视区域内
function isSelectedItemVisible() {
  if (currentItemIdx.value < 0 || currentItemIdx.value >= showItemList.value.length) {
    return false;
  }
  
  // 尝试多种方式获取滚动容器
  let scrollContainer = null;
  
  // 方法1: 通过虚拟滚动组件的引用
  if (virtListRef.value?.$el) {
    scrollContainer = virtListRef.value.$el;
  }
  
  // 方法2: 通过ID查找
  if (!scrollContainer) {
    scrollContainer = document.getElementById('cutItemBox');
  }
  
  // 方法3: 查找实际的滚动容器
  if (!scrollContainer) {
    const scrollerElement = document.querySelector('.scroller');
    if (scrollerElement) {
      scrollContainer = scrollerElement;
    }
  }
  
  if (!scrollContainer) {
    return false;
  }
  
  const itemHeight = 40;
  const targetScrollTop = currentItemIdx.value * itemHeight;
  const containerHeight = scrollContainer.clientHeight;
  const currentScrollTop = scrollContainer.scrollTop;
  const maxScrollTop = scrollContainer.scrollHeight - containerHeight;
  
  const itemTop = targetScrollTop;
  const itemBottom = itemTop + itemHeight;
  const visibleTop = currentScrollTop;
  const visibleBottom = currentScrollTop + containerHeight;
  
  // 检查项目是否完全在可视区域内
  const isFullyVisible = itemTop >= visibleTop && itemBottom <= visibleBottom;
  
  // 特殊处理：如果是最后一个item，允许部分可见
  if (currentItemIdx.value === showItemList.value.length - 1) {
    return itemTop >= visibleTop && itemTop < visibleBottom;
  }
  
  return isFullyVisible;
}

// 滚动到选中项
function scrollToSelectedItem() {
  nextTick(() => {
    if (currentItemIdx.value < 0 || currentItemIdx.value >= showItemList.value.length) {
      return;
    }
    
    // 尝试多种方式获取滚动容器
    let scrollContainer = null;
    
    // 方法1: 通过虚拟滚动组件的引用
    if (virtListRef.value?.$el) {
      scrollContainer = virtListRef.value.$el;
    }
    
    // 方法2: 通过ID查找
    if (!scrollContainer) {
      scrollContainer = document.getElementById('cutItemBox');
    }
    
    // 方法3: 查找实际的滚动容器
    if (!scrollContainer) {
      const scrollerElement = document.querySelector('.scroller');
      if (scrollerElement) {
        scrollContainer = scrollerElement;
      }
    }
    
    if (!scrollContainer) {
      console.warn('无法找到滚动容器');
      return;
    }
    
    // 计算选中项的位置
    const itemHeight = 40; // minSize 的值
    const targetScrollTop = currentItemIdx.value * itemHeight;
    
    // 获取当前滚动容器的尺寸
    const containerHeight = scrollContainer.clientHeight;
    const currentScrollTop = scrollContainer.scrollTop;
    const maxScrollTop = scrollContainer.scrollHeight - containerHeight;
    
    // 检查是否需要滚动
    const itemTop = targetScrollTop;
    const itemBottom = itemTop + itemHeight;
    const visibleTop = currentScrollTop;
    const visibleBottom = currentScrollTop + containerHeight;
    
    let newScrollTop = currentScrollTop;
    
    // 特殊处理：如果是最后一个item
    if (currentItemIdx.value === showItemList.value.length - 1) {
      // 确保最后一个item的顶部在可视区域内
      if (itemTop < visibleTop) {
        newScrollTop = itemTop;
      } else if (itemTop >= visibleBottom) {
        newScrollTop = itemTop;
      }
    } else {
      // 普通item的滚动逻辑
      if (itemTop < visibleTop) {
        newScrollTop = itemTop;
      } else if (itemBottom > visibleBottom) {
        newScrollTop = itemBottom - containerHeight;
      }
    }
    
    // 边界检查：确保滚动位置在有效范围内
    newScrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop));
    
    // 执行滚动
    if (newScrollTop !== currentScrollTop) {
      try {
        scrollContainer.scrollTo({
          top: newScrollTop,
          behavior: 'smooth'
        });
      } catch (error) {
        console.warn('scrollTo方法失败，尝试使用scrollIntoView:', error);
        // 备选方案：使用scrollIntoView
        const selectedElement = document.querySelector('.list-item-selected');
        if (selectedElement) {
          selectedElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
        }
      }
    }
  });
}
</script>


<style scoped>
/* .cut-list .ant-list-item-action li  {
  padding: 0 !important;
} */
.cut-list ::v-deep(.ant-list-item-action li) {
  padding: 0 !important;
}

.cut-list ::v-deep(.ant-list-item-action) {
  margin-left: 5px !important;
}

.cut-list ::v-deep(.ant-list-item) {
  padding-right: 3px !important;
}

.bg {
  background-color: rgb(221, 219, 219);
}

.list-item {
  display: flex;
  height: 3em;
  align-items: center;
}

.list-item:hover {
  background-color: rgb(171, 225, 153);
}

.list-item-selected {
  background-color: rgb(171, 225, 153);
}

.cut-list:focus {
  outline: none;
}

.list-item:focus {
  outline: none;
}

.click—class {
  cursor: pointer !important;
}

.detail-style {
  overflow-y: scroll;
  overflow-x: scroll;
}

.scroller {
  height: 100%;
}
</style>