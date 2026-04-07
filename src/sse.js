// In-memory map of userId -> Set of SSE response objects
const clients = new Map();

/**
 * Registers an SSE client for a given userId.
 * @param {string} userId
 * @param {import('express').Response} res
 */
export function addClient(userId, res) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);
}

/**
 * Removes an SSE client (called on connection close).
 * @param {string} userId
 * @param {import('express').Response} res
 */
export function removeClient(userId, res) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(userId);
}

/**
 * Sends a named SSE event to all connected clients for a userId.
 * @param {string} userId
 * @param {string} event
 * @param {object} data
 */
export function emitToUser(userId, event, data) {
  const set = clients.get(userId.toString());
  if (!set) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try {
      res.write(payload);
    } catch {
      // Client disconnected mid-write — will be cleaned up via 'close' event
    }
  }
}
