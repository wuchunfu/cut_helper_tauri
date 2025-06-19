import './assets/main.css'
import { createApp } from "vue";
import App from "./App.vue";

import router from './router/router'
import { start } from './cut_service'
import {init_hotkey} from './hotkey'
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.message);
});
start()

async function main() {
    await init_hotkey()
    const app = createApp(App);
    app.use(router);
    app.mount("#app");
    
}

main();