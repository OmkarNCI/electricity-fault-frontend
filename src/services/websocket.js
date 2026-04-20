class WSService {
  constructor() {
    this.ws = null;
    this.reconnectTimer = null;
    this.shouldReconnect = true;
    this.isConnected = false;
    // Use environment variable or default
    this.wsUrl = "wss://lcgt3lf5j4.execute-api.us-east-1.amazonaws.com/production";
  }

  connect(onMessage, onStatus) {
    if (!this.shouldReconnect) return;

    try {
      console.log(`🔌 Connecting to WebSocket: ${this.wsUrl}`);
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log("✅ WebSocket connected");
        this.isConnected = true;
        
        if (onStatus) onStatus("connected");
        
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 WS Message:", data);
          if (onMessage) onMessage(data);
        } catch (err) {
          console.error("❌ Invalid WS message:", event.data);
        }
      };

      this.ws.onerror = (err) => {
        console.error("❌ WS error:", err);
        this.isConnected = false;
        if (onStatus) onStatus("error");
      };

      this.ws.onclose = () => {
        console.log("⚠️ WebSocket closed");
        this.isConnected = false;
        
        if (onStatus) onStatus("disconnected");

        if (!this.shouldReconnect) return;

        // Reconnect after 3 seconds
        this.reconnectTimer = setTimeout(() => {
          console.log("🔄 Attempting to reconnect...");
          this.connect(onMessage, onStatus);
        }, 3000);
      };
    } catch (err) {
      console.error("❌ WebSocket connection error:", err);
      this.isConnected = false;
      if (onStatus) onStatus("error");
    }
  }

  send(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
      console.log("📤 WS Sent:", msg);
      return true;
    } else {
      console.warn("⚠️ WebSocket not ready");
      return false;
    }
  }

  disconnect() {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  isConnectedToServer() {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }
}

// Create singleton instance
const wsService = new WSService();

// Export for both CJS and ESM
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { wsService };
}

export { wsService };
export default wsService;

    if (this.ws) {
      this.ws.close();
    }
  }
}

export const wsService = new WSService();