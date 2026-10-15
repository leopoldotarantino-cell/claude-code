let sessionWindowId = null;

chrome.action.onClicked.addListener(async (tab) => {
  if (sessionWindowId !== null) {
    try { await chrome.windows.update(sessionWindowId, { focused: true }); return; } catch { sessionWindowId = null; }
  }
  // va chiamato subito, nel contesto del click sull'icona
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
  const params = new URLSearchParams({ streamId, title: tab.title || "" });
  const win = await chrome.windows.create({
    url: `session.html?${params}`, type: "popup", width: 520, height: 760, focused: true,
  });
  sessionWindowId = win.id;
});

chrome.windows.onRemoved.addListener((id) => { if (id === sessionWindowId) sessionWindowId = null; });
