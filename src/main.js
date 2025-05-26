import './assets/main.css'
import { createApp } from "vue";
import App from "./App.vue";

import router from './router/router'
import { message } from 'ant-design-vue';

import Database from '@tauri-apps/plugin-sql';
const db = await Database.load('sqlite:cut.db');

const app = createApp(App)
app.use(router)
app.mount("#app");
