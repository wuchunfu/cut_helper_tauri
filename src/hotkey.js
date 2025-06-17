import { register, unregister, isRegistered } from '@tauri-apps/plugin-global-shortcut';
import { getCurrentWindow } from '@tauri-apps/api/window';


async function toggleWindowVisibility() {
    var appWindow = getCurrentWindow()
    const isMinimized = await appWindow.isMinimized();
    if (isMinimized) {
      await appWindow.unminimize();
      await appWindow.show();
      await appWindow.setFocus();
    } else {
      await appWindow.minimize();
    }
}

export async function init_hotkey() {
    let focus_key = 'CommandOrControl+Space'
    if (await isRegistered(focus_key)) {
        await unregister(focus_key)
    }
    await register(focus_key, async (event) => {
        console.log("press")
        if (event.state === "Released") {
            console.log('Shortcut triggered');
            toggleWindowVisibility()
        }
    });
}



