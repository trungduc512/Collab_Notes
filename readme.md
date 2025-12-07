🚀 Collab Notes – Real-Time Collaborative Editing Platform
<div>










Nền tảng chỉnh sửa tài liệu thời gian thực – tương tự Google Docs

MongoDB: Cơ sở dữ liệu NoSQL để lưu trữ dữ liệu người dùng và nội dung tài liệu.

Express.js: Khung backend để xây dựng API.

React: Thư viện frontend để xây dựng giao diện người dùng.

Node.js: JavaScript runtime để phát triển phía máy chủ.

Socket.IO: Cho phép giao tiếp hai chiều thời gian thực giữa máy khách và máy chủ. Được sử dụng để chỉnh sửa cộng tác và theo dõi sự hiện diện.

Quill: Trình soạn thảo WYSIWYG giàu tính năng được sử dụng để chỉnh sửa tài liệu. Được tùy chỉnh cho cộng tác thời gian thực.
</div>
📘 Giới thiệu dự án

Collab Notes là một ứng dụng web cho phép nhiều người dùng chỉnh sửa tài liệu cùng lúc với khả năng realtime mạnh mẽ, kết hợp với WebSocket để đồng bộ nội dung theo thời gian thực.

✨ Các tính năng chính:

Đăng ký, đăng nhập người dùng

Tạo tài liệu cá nhân

Chỉnh sửa tài liệu realtime (websocket)

Mời cộng tác viên, xem ai đang online trong tài liệu

Xác thực người dùng bằng JWT

Quản lý quyền người dùng

👥 Đội ngũ cải tiến
<table align="center" cellspacing="0" cellpadding="14" style="border-collapse:separate; border-spacing:18px; font-family:'Segoe UI', sans-serif;"> <tr> <td style="background:linear-gradient(135deg,#42a5f5,#478ed1);border-radius:20px;color:white;width:240px;height:170px;box-shadow:0 6px 14px rgba(0,0,0,0.25);display:flex;flex-direction:column;align-items:center;justify-content:center;"> <span style="font-size:18px;font-weight:bold;background:rgba(0,0,0,0.3);padding:6px 12px;border-radius:12px;">  MSV: Đỗ Trung Đức </span><br/> Email: email@example.com <br/> <span style="font-weight:bold;"> Team Leader</span><br/> </td> <td style="background:linear-gradient(135deg,#f06292,#ba68c8);border-radius:20px;color:white;width:240px;height:170px;box-shadow:0 6px 14px rgba(0,0,0,0.25);display:flex;flex-direction:column;align-items:center;justify-content:center;"> <span style="font-size:18px;font-weight:bold;background:rgba(0,0,0,0.3);padding:6px 12px;border-radius:12px;"> MSV: Trương Quang Duy </span><br/> Email: email@example.com <br/> </td> <td style="background:linear-gradient(135deg,#ffb74d,#ff8a65);border-radius:20px;color:white;width:240px;height:170px;box-shadow:0 6px 14px rgba(0,0,0,0.25);display:flex;flex-direction:column;align-items:center;justify-content:center;"> <span style="font-size:18px;font-weight:bold;background:rgba(0,0,0,0.3);padding:6px 12px;border-radius:12px;"> 23020060 Nguyễn Anh Hào </span><br/> Email: 23020060@vnu.edu.vn <br/> </td> <td style="background:linear-gradient(135deg,#66bb6a,#26a69a);border-radius:20px;color:white;width:240px;height:170px;box-shadow:0 6px 14px rgba(0,0,0,0.25);display:flex;flex-direction:column;align-items:center;justify-content:center;"> <span style="font-size:18px;font-weight:bold;background:rgba(0,0,0,0.3);padding:6px 12px;border-radius:12px;"> 23020069 Nguyễn Trọng Hiếu </span><br/> Email: 23020069@vnu.edu.vn  <br/> </td> </tr> </table>

1. Cơ chế Refresh Token
   - Vấn đề:
     
     Chỉ có access token

     Khi token hết hạn → user bị logout ngay

     Không thể duy trì phiên đăng nhập lâu dài
     
   - Giải pháp:

     Thêm refreshToken

     Backend rotate refresh token để tăng bảo mật

     Tăng trải nghiệm của người dùng
2. Xác thực WebSocket bằng JWT
   - Vấn đề:
  
     Websocket chỉ truyền username -> không có xác thực

     Chỉ cần thay đổi username -> vào được tài liệu của người

   - Giải pháp:
  
     Websocket gửi cả token khi kết nối

     Server verify token khi handshake

     Thêm cơ chế refresh cho WebSocket
3. API Gateway Offloading (Nginx)
   - Vấn đề:

     Mỗi service đều phải verify JWT -> trùng code, kém hiệu quả

     Tất cả logic từ auth, socket, docs đều nằm chung -> khó bảo trì

     Backend bị quá tải

   - Giải pháp:
  
     Kiến trúc microservice dễ mở rộng, bảo trì + Gateway Offloading
  
     Gateway verify JWT chỉ 1 lần

     Gateway forrward thông tin user qua headers cho các service phía sau
4. Load balancing
   - Vấn đề:
  
     Mỗi service đểu chỉ có 1 instance để xử lý request từ client dẫn tới dễ bị quá tải

   - Giải pháp:
  
     Mỗi service tạo nhiều instance để xử lý được nhiều request đồng thời
