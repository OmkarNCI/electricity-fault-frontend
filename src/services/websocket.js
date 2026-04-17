class WSService {
  constructor() {
    this.ws = null;
    this.reconnectTimer = null;
    this.shouldReconnect = true;
  }

  connect(onMessage) {
    if (!this.shouldReconnect) return;

    this.ws = new WebSocket(
      "wss://mpl334ex50.execute-api.us-east-1.amazonaws.com/production"
    );

    this.ws.onopen = () => {
      console.log("✅ WebSocket connected");

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error("Invalid WS message:", event.data);
      }
    };

    this.ws.onerror = (err) => {
      console.error("WS error", err);
    };

    this.ws.onclose = () => {
      console.log("⚠️ WebSocket closed");

      if (!this.shouldReconnect) return;

      this.reconnectTimer = setTimeout(() => {
        console.log("🔄 Reconnecting WebSocket...");
        this.connect(onMessage);
      }, 3000);
    };
  }

  send(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  disconnect() {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.ws) {
      this.ws.close();
    }
  }
}

export const wsService = new WSService();