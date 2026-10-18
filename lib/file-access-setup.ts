// Set while Settings or the popup is waiting for file access. Granting it reloads the extension,
// which can close or reset the Settings tab, so the restarted worker uses this to
// bring Settings back and confirm the change.
export const FILE_ACCESS_SETUP_KEY = "fileAccessSetupPending"
