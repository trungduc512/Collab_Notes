import { options as commonOptions, setup as commonSetup, authTest, docTest } from '../common.js';
import ws from 'k6/ws';
import { check } from 'k6';

// Re-export setup and other tests
export const setup = commonSetup;
export { authTest, docTest };

// Define the constant scenario options
export const options = {
  scenarios: {
    // Scenario 1: Auth Service (Login/Me)
    auth_service_test: {
      executor: 'constant-arrival-rate',
      rate: 1, // 1 request per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 5,
      maxVUs: 10,
      exec: 'authTest',
    },
    // Scenario 2: Doc Service (Get Documents)
    doc_service_test: {
      executor: 'constant-arrival-rate',
      rate: 1, // 1 request per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 5,
      maxVUs: 10,
      exec: 'docTest',
    },
    // Scenario 3: WebSocket Service (Connect & Ping)
    websocket_service_test: {
      executor: 'constant-arrival-rate',
      rate: 1, // 1 connection initiation per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 5,
      maxVUs: 10,
      exec: 'wsTest',
    },
  },
  thresholds: commonOptions.thresholds,
};

// Override wsTest to match the specific timeout requirements of this scenario
// (8s connection duration to fit within 10 MaxVUs at 1 RPS)
const WS_BASE_URL = __ENV.WS_URL || 'ws://localhost:80/ws'; 

export function wsTest(data) {
  const { token, docId } = data;
  const wsUrl = `${WS_BASE_URL}/${docId}?token=${token}`;

  const response = ws.connect(wsUrl, {}, function (socket) {
    socket.on('open', function () {
      // Send a ping every 2s
      socket.setInterval(function () {
        socket.ping();
      }, 2000);

      // Close connection after 8s to allow VU reuse within the 10 maxVUs limit
      // (1 RPS * 8s hold = ~8 concurrent connections < 10 maxVUs)
      socket.setTimeout(function () {
        socket.close();
      }, 8000); 
    });

    socket.on('error', function (e) {
      if (e.error() !== 'websocket: close 1006 (abnormal closure): unexpected EOF') {
        // console.log(`WS Error: ${e.error()}`);
      }
    });
  });

  check(response, { 'WS: Connected (101)': (r) => r && r.status === 101 });
}
