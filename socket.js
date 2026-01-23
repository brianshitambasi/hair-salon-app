/**
 * socket.js
 * Centralized Socket.IO instance manager
 * This prevents multiple socket instances and circular imports
 */

let ioInstance = null;

const socket = {
  /**
   * Initialize Socket.IO
   * This must be called ONCE from app.js
   */
  init: (io) => {
    if (ioInstance) {
      console.warn("⚠️ Socket.IO already initialized");
      return ioInstance;
    }

    ioInstance = io;
    console.log("✅ Socket.IO initialized");
    return ioInstance;
  },

  /**
   * Get the initialized Socket.IO instance
   * Used in services to emit events
   */
  getIO: () => {
    if (!ioInstance) {
      throw new Error("❌ Socket.IO not initialized. Call socket.init(io) in app.js first.");
    }
    return ioInstance;
  }
};

module.exports = socket;
