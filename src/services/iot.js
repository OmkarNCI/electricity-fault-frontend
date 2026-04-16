import mqtt from "mqtt";
import { fetchAuthSession } from "aws-amplify/auth";

let mqttClient = null;

async function getPresignedConnection() {
  const session = await fetchAuthSession();
  const idToken = session.tokens?.idToken?.toString();

  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/iot/presigned-url`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch IoT presigned URL");
  }

  return res.json();
}

export async function connectIoT() {
  if (mqttClient?.connected) return mqttClient;

  const { url, clientId: serverClientId } = await getPresignedConnection();
  const clientId = `${serverClientId}-${crypto.randomUUID()}`;

  return new Promise((resolve, reject) => {
    const client = mqtt.connect(url, {
      clientId,
      protocol: "wss",
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
    });

    client.on("connect", () => {
      mqttClient = client;
      resolve(client);
    });

    client.on("error", (err) => {
      console.error("AWS IoT error:", err);
      reject(err);
    });

    client.on("close", () => {
      console.log("AWS IoT connection closed");
    });
  });
}

export async function subscribeToTopic(topic, onMessage) {
  const client = await connectIoT();

  const handler = (incomingTopic, payload) => {
    if (incomingTopic === topic) {
      try {
        onMessage?.(JSON.parse(payload.toString()));
      } catch {
        onMessage?.(payload.toString());
      }
    }
  };

  return new Promise((resolve, reject) => {
    client.subscribe(topic, (err) => {
      if (err) {
        reject(err);
        return;
      }

      client.on("message", handler);

      resolve(() => {
        client.unsubscribe(topic);
        client.off("message", handler);
      });
    });
  });
}

export function buildAreaTopics(areaId, poleId) {
  const topics = [`area/${areaId}/summaries`];

  if (poleId) {
    topics.push(`area/${areaId}/aggregates/${poleId}`);
    topics.push(`area/${areaId}/alerts/${poleId}`);
  }

  return topics;
}