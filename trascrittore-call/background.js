let sessionWindowId = null;

const openCalls = (key) => chrome.tabs.create({ url: `calls.html${key ? `?key=${encodeURIComponent(key)}` : ""}` });

chrome.action.onClicked.addListener(async (tab) => {
  // Su Google Meet la trascrizione parte da sola dai sottotitoli: apriamo l'archivio.
  if (tab.url?.startsWith("https://meet.google.com/")) return openCalls();

  if (sessionWindowId !== null) {
    try { await chrome.windows.update(sessionWindowId, { focused: true }); return; } catch { sessionWindowId = null; }
  }
  // Altre piattaforme: registrazione audio della scheda. Va chiamato subito, nel contesto del click.
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
  const params = new URLSearchParams({ streamId, title: tab.title || "" });
  const win = await chrome.windows.create({
    url: `session.html?${params}`, type: "popup", width: 520, height: 760, focused: true,
  });
  sessionWindowId = win.id;
});

chrome.windows.onRemoved.addListener((id) => { if (id === sessionWindowId) sessionWindowId = null; });

chrome.runtime.onMessage.addListener((msg) => { if (msg.type === "openCalls") openCalls(msg.key); });
