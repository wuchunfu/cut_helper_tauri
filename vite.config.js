import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Components from 'unplugin-vue-components/vite';
import { AntDesignVueResolver,ElementPlusResolver,VantResolver } from 'unplugin-vue-components/resolvers';

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [
    vue(),
    Components({
      dts: true, // 自动生成类型声明文件
      resolvers: [
        // 支持第三方组件库的解析器
        ElementPlusResolver(),
        AntDesignVueResolver({
          importStyle: false, // css in js
        }),
        VantResolver()
      ]
    })
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
