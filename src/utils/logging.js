export const logRequest = (playerName, type) => {
  try {
    const logs = JSON.parse(localStorage.getItem('requestLogs')) || [];
    logs.push({ playerName, type, timestamp: new Date().toISOString() });
    localStorage.setItem('requestLogs', JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to log request', err);
  }
};
