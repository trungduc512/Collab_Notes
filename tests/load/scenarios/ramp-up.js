import { options as commonOptions, setup as commonSetup, authTest, docTest, wsTest } from '../common.js';

export const options = {
  scenarios: {
    // Scenario 1: Auth Service (Login/Me)
    auth_service_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '3m', target: 10 },
        { duration: '2m', target: 30 },
        { duration: '3m', target: 30 },
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      exec: 'authTest',
    },
    // Scenario 2: Doc Service (Get Documents)
    doc_service_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '3m', target: 10 },
        { duration: '2m', target: 30 },
        { duration: '3m', target: 30 },
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      exec: 'docTest',
    },
    // Scenario 3: WebSocket Service (Connect & Ping)
    websocket_service_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '3m', target: 10 },
        { duration: '2m', target: 30 },
        { duration: '3m', target: 30 },
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      exec: 'wsTest',
    },
  },
  thresholds: commonOptions.thresholds,
};

export const setup = commonSetup;
export { authTest, docTest, wsTest };
