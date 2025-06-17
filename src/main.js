import './assets/main.css'
import { createApp } from "vue";
import App from "./App.vue";

import router from './router/router'
import { start } from './cut_service'
import {createTray} from './tray'
import {init_hotkey} from './hotkey'
start()

async function main() {
    // createTray()
    await init_hotkey()
    const app = createApp(App);
    app.use(router);
    app.mount("#app");
    
}

main();