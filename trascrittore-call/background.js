// Lo stato va in storage.session: il service worker può essere riavviato da Chrome in qualsiasi momento.
const state = () => chrome.storage.session.get({ sessionWindowId: null, backupTabId: null });

const openCalls = (key) => chrome.tabs.create({ url: `calls.html${key ? `?key=${encodeURIComponent(key)}` : ""}` });

function notifyBackup(tabId, on) {
  if (tabId !== null) chrome.tabs.sendMessage(tabId, { type: "backup", on }).catch(() => {});
}

chrome.action.onClicked.addListener(async (tab) => {
  const isMeet = tab.url?.startsWith("https://meet.google.com/");
  const { sessionWindowId } = await state();
  if (sessionWindowId !== null) {
    try { await chrome.windows.update(sessionWindowId, { focused: true }); return; } catch { /* finestra chiusa */ }
  }
  if (isMeet) {
    const { meetAudioBackup = true } = await chrome.storage.sync.get("meetAudioBackup");
    if (!meetAudioBackup) return openCalls();
  }
  // Registrazione audio della scheda: richiede il click sull'icona dell'estensione.
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
  const params = new URLSearchParams({ streamId, title: tab.title || "" });
  if (isMeet) {
    const code = new URL(tab.url).pathname.split("/")[1] || "";
    params.set("meetCode", code);
    params.set("title", `Google Meet ${code}`);
  }
  const win = await chrome.windows.create({
    url: `session.html?${params}`, type: "popup", width: 520, height: 760, focused: true,
  });
  await chrome.storage.session.set({ sessionWindowId: win.id, backupTabId: isMeet ? tab.id : null });
  if (isMeet) notifyBackup(tab.id, true);
});

chrome.windows.onRemoved.addListener(async (id) => {
  const { sessionWindowId, backupTabId } = await state();
  if (id !== sessionWindowId) return;
  notifyBackup(backupTabId, false);
  await chrome.storage.session.set({ sessionWindowId: null, backupTabId: null });
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type === "openCalls") openCalls(msg.key);
  if (msg.type === "backupStopped") state().then(({ backupTabId }) => notifyBackup(backupTabId, false));
  if (msg.type === "backupStatus") {
    state().then(({ backupTabId }) => reply({ on: backupTabId !== null && backupTabId === sender.tab?.id }));
    return true;
  }
});
