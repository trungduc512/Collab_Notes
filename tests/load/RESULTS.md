# Load Test Results

## 1. Mô tả kịch bản kiểm thử

| Kịch bản | Loại kiểm thử                             | Mô tả                                                                                                                                                                                                                                                                                                                                                       | Mục đích                                                                                                                                 |
| :------: | :---------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
|    1     | Kiểm thử cơ bản                           | - Request per second: 1<br>- Duration: 5m<br>- preAllocatedVUs: 5<br>- maxVUs: 10                                                                                                                                                                                                                                                                           | Thiết lập một đường cơ sở về hiệu suất của hệ thống dưới một tải trọng nhẹ và ổn định.                                                   |
|    2     | Kiểm thử tải tăng dần (Ramp-up Load Test) | - StartVUs: 0<br>- Các giai đoạn tăng dần bao gồm:<br>+ { duration: '2m', target: 10 }<br>+ { duration: '3m', target: 10 }<br>+ { duration: '2m', target: 30 }<br>+ { duration: '3m', target: 30 }<br>+ { duration: '2m', target: 50 }<br>+ { duration: '5m', target: 50 }<br>+ { duration: '2m', target: 0 }<br>→ Total duration: 19m<br>→ MaxVUs: 50 (5m) | Xem hệ thống phản ứng như thế nào khi tải trọng tăng dần. Từ đó, giúp xác định điểm nghẽn cổ chai và giới hạn hiệu suất.                 |
|    3     | Kiểm thử sức chịu đựng (Stress Test)      | - startVUs: 0<br>- Các giai đoạn:<br>+ { duration: '1m', target: 100 }<br>+ { duration: '5m', target: 100 }<br>+ { duration: '1m', target: 0 }<br>→ Total duration: 7m<br>→ MaxVUs: 100 (5m)                                                                                                                                                                | Xác định khả năng chịu đựng của hệ thống khi hoạt động ở hoặc vượt quá giới hạn tải trọng dự kiến. Từ đó, giúp tìm ra điểm gây hệ thống. |

## 2. Mô tả kết quả

|                    | Kịch bản 1                                                                                                                                                                                                                                                                   | Kịch bản 2                                                                                                                                                                                                                                                                                                           | Kịch bản 3                                                                                                                                                                                                                                                                                                               | Kết luận                                                                                                                                            |
| :----------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hệ thống lúc đầu   | - HTTP Request duration (ổn định):<br>avg=8.01ms<br>min=4.8ms<br>med=7.56ms<br>max=96.03ms<br>- 0/604 request failed (0%)<br>- Request Rate: ~ 1.93 req/s<br>- Checks: 900/900 (100%)<br>- WebSocket connecting:<br>avg=7.23ms, p(95)=9.29ms<br>- VUs: min=1, max=10         | - HTTP Request duration:<br>avg=11.96ms<br>min=2.77ms<br>med=7.03ms<br>max=948.48ms<br>p(90)=26.1ms, p(95)=38.96ms<br>- 1956/65173 request failed (3%)<br>- Request Rate: ~ 42.72 req/s<br>- Checks: 64302/66258 (97%)<br>- WebSocket connecting:<br>avg=8.11ms, p(95)=17.84ms<br>- VUs: min=0, max=150              | - HTTP Request duration:<br>avg=16.55ms<br>min=2.77ms<br>med=9.03ms<br>max=949.34ms<br>p(90)=38.03ms, p(95)=50.08ms<br>- 2135/71163 request failed (3%)<br>- Request Rate: ~ 122.32 req/s<br>- Checks: 70239/72374 (97.05%)<br>- WebSocket connecting:<br>avg=8.99ms, p(95)=24.21ms<br>- VUs: min=2, max=300             | Ở điều kiện rảnh rỗi => hệ thống hoạt động bình thường, chênh lệch không đáng kể, nhưng khi số người dùng tăng lên thì hệ thống bắt đầu gặp vấn đề. |
| Hệ thống cuối cùng | - HTTP Request duration (Cực kỳ ổn định):<br>avg=8.04ms<br>min=4.84ms<br>med=7.34ms<br>max=97.05ms<br>- 0/604 request failed (0%)<br>- Request Rate: ~ 1.93 req/s<br>- Checks: 900/900 (100%)<br>- WebSocket connecting:<br>avg=7.23ms, p(95)=9.29ms<br>- VUs: min=1, max=10 | - HTTP Request duration (Cực kỳ ổn định):<br>avg=9.2ms<br>min=2.13ms<br>med=5.41ms<br>max=729.6ms<br>p(90)=20.08ms, p(95)=29.97ms<br>- 0/65173 request failed (0%)<br>- Request Rate: ~ 55.48 req/s<br>- Checks: 66258/66258 (100%)<br>- WebSocket connecting:<br>avg=6.24ms, p(95)=13.72ms<br>- VUs: min=0, max=150 | - HTTP Request duration (Cực kỳ ổn định):<br>avg=12.73ms<br>min=2.13ms<br>med=6.95ms<br>max=730.26ms<br>p(90)=29.25ms, p(95)=38.52ms<br>- 0/71163 request failed (0%)<br>- Request Rate: ~ 158.81 req/s<br>- Checks: 72374/72374 (100%)<br>- WebSocket connecting:<br>avg=7.01ms, p(95)=17.85ms<br>- VUs: min=2, max=300 | Độ ổn định cao, tatency thấp => kiến trúc microservices đã scaled đc, ngoài ra real-time collaboration ổn định với ws_connecting p(95) < 18ms.      |

## 3. Summary Table

| Scenario                  | Auth Service Avg Latency (ms) | Doc Service Avg Latency (ms) | WebSocket Service Avg Latency (ms) | Max VUs | Duration |
| :------------------------ | :---------------------------: | :--------------------------: | :--------------------------------: | :-----: | :------: |
| **Constant Load** (1 RPS) |            8.04\*             |            8.04\*            |                7.23                |   10    |    5m    |
| **Ramp Up** (0-50 VUs)    |             9.2\*             |            9.2\*             |                6.24                |   150   |   19m    |
| **Spike** (0-100 VUs)     |            12.73\*            |           12.73\*            |                7.01                |   300   |    7m    |

_\*Note: HTTP Latency (`http_req_duration`) is currently aggregated for both Auth and Doc services in the summary report. The value shown is the combined average._

### Metric Definitions

- **Auth/Doc Service Latency**: Average `http_req_duration` (Time to First Byte + Download).
- **WebSocket Service Latency**: Average `ws_connecting` (Time to establish WebSocket handshake).

## 4. Running Tests

Use the helper script to run scenarios and generate new reports:

```bash
# Constant Load
./run-load-test.sh tests/load/scenarios/constant.js

# Ramp Up
./run-load-test.sh tests/load/scenarios/ramp-up.js

# Spike
./run-load-test.sh tests/load/scenarios/spike.js
```
