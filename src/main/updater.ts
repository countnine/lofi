/* eslint-disable no-console */
import { app, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';

let eventsWired = false;

const wireUpdaterEvents = (): void => {
  if (eventsWired) {
    return;
  }
  eventsWired = true;

  autoUpdater.on('error', (error) => {
    console.error('Auto-update error:', error);
  });

  autoUpdater.on('update-downloaded', async ({ version: newVersion }) => {
    const { response } = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update ready',
      message: `lofi ${newVersion} has been downloaded.`,
      detail: 'Restart the app to apply the update.',
    });

    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
};

// Silent background check on startup. Updates only resolve for the packaged app
// published to GitHub releases (see package.json build.publish); in dev there is
// no update feed, so skip entirely.
export const checkForUpdatesOnStartup = (): void => {
  if (!app.isPackaged) {
    return;
  }

  wireUpdaterEvents();
  autoUpdater.checkForUpdatesAndNotify().catch((error) => {
    console.error('Auto-update check failed:', error);
  });
};

// Manual check from the tray menu — unlike the startup check this also reports
// the "already up to date" and error cases back to the user.
export const checkForUpdatesManually = async (): Promise<void> => {
  if (!app.isPackaged) {
    await dialog.showMessageBox({
      type: 'info',
      title: 'Check for updates',
      message: 'Updates are only available in the installed app.',
    });
    return;
  }

  wireUpdaterEvents();
  try {
    const result = await autoUpdater.checkForUpdates();
    const latestVersion = result?.updateInfo?.version;

    // A newer version starts downloading automatically; the update-downloaded
    // handler then offers the restart. Only surface a dialog when up to date.
    if (!latestVersion || latestVersion === app.getVersion()) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'Check for updates',
        message: 'You are running the latest version of lofi.',
      });
    }
  } catch (error) {
    console.error('Manual update check failed:', error);
    await dialog.showMessageBox({
      type: 'error',
      title: 'Check for updates',
      message: 'Could not check for updates.',
      detail: String(error),
    });
  }
};
