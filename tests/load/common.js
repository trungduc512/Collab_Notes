import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Shared Options (Thresholds, etc.)
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<500'],
    ws_connecting: ['p(95)<1000'],
  },
};

// --- Environment Variables ---
const BASE_URL = __ENV.BASE_URL || 'http://localhost:80/api/v1';
const WS_BASE_URL = __ENV.WS_URL || 'ws://localhost:80/ws'; 

// --- Setup Logic ---
export function setup() {
  const username = `loadtest_${randomString(8)}`;
  const email = `${username}@example.com`;
  const password = 'password123';

  // Register and Login
  const registerRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
    username,
    email,
    password
  }), { headers: { 'Content-Type': 'application/json' } });
  check(registerRes, { 'Setup: Register 201': (r) => r.status === 201 });

  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email,
    password
  }), { headers: { 'Content-Type': 'application/json' } });
  check(loginRes, { 'Setup: Login 200': (r) => r.status === 200 });

  const token = loginRes.json('token');

  // Create Document
  const createDocRes = http.post(`${BASE_URL}/documents`, JSON.stringify({
    title: `Load Test Doc ${randomString(5)}`,
    isPublic: true
  }), { 
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    } 
  });

  let docId = 'default-doc';
  if (createDocRes.status === 201 || createDocRes.status === 200) {
    const json = createDocRes.json();
    docId = json.data?.document?._id || json.document?._id || json._id; 
  }

  return { token, docId, email, password };
}

// --- Test Functions ---

export function authTest(data) {
  const { token } = data;
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  const res = http.get(`${BASE_URL}/auth/me`, { headers });
  check(res, { 'Auth: Me 200': (r) => r.status === 200 });
  sleep(1); // Standard sleep to prevent overwhelming in ramping-vus
}

export function docTest(data) {
  const { token } = data;
  const headers = { 'Authorization': `Bearer ${token}` };
  const res = http.get(`${BASE_URL}/documents`, { headers });
  check(res, { 'Doc: Get 200': (r) => r.status === 200 });
  sleep(1); 
}

export function wsTest(data) {
  const { token, docId } = data;
  const wsUrl = `${WS_BASE_URL}/${docId}?token=${token}`;

  const response = ws.connect(wsUrl, {}, function (socket) {
    socket.on('open', function () {
      socket.setInterval(function () {
        socket.ping();
      }, 3000);

      // In Ramping VUs, the VU lives for the duration of the stage or until the script finishes.
      // We keep the socket open for a while, but not forever, to simulate session churn.
      socket.setTimeout(function () {
        socket.close();
      }, 30000); // Keep open for 30s
    });

    socket.on('error', function (e) {
      if (e.error() !== 'websocket: close 1006 (abnormal closure): unexpected EOF') {
        // console.log(`WS Error: ${e.error()}`);
      }
    });
  });

  check(response, { 'WS: Connected (101)': (r) => r && r.status === 101 });
  sleep(1);
}
