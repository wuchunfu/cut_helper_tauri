import {
  createRouter,
  createWebHistory,
  createWebHashHistory
} from 'vue-router'
import CutPage from '../components/CutPage.vue'
import About from '../components/About.vue'
import Setting from '../components/setting/Setting.vue'
import Detail from '../components/Detail.vue'
import TextEdit from '../components/TextEdit.vue'
import ImageItem from '../components/ImageItem.vue'
import SettingsWindow from '../components/SettingsWindow.vue'


const routes = [{
    path: '/',
    component: CutPage
  },
  {
    path: '/about',
    component: About
  },
  {

    path: '/setting',
    component: Setting

  },
  {

    path: '/detail',
    component: Detail

  },
  {
    path: '/textEdit',
    component: TextEdit
  },
  {
    path: '/imageItems',
    component: ImageItem
  },
  {
    path: '/settings',
    component: SettingsWindow
  }
]

const router = createRouter({
  // history: createWebHistory(),
  history: createWebHashHistory(),
  routes,
})
export default router