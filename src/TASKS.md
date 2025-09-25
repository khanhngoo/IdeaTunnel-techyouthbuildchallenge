## Fanout 3 nhánh (Product Brief / Technical Spec / Codebase Guide)

 - [x] Thiết kế hợp đồng dữ liệu cho Fanout 3 nhánh
  - [x] Cập nhật `src/types/graph.ts` thêm type cho fanout theo 3 nhánh: `ProductBriefSection`, `TechnicalSpecSection`, `CodebaseGuideSection`, `Fanout3BranchResponse`.
  - [x] Chuẩn hóa `EdgeType` sử dụng `expands` cho nhánh con; đảm bảo sẵn `section | note` cho block type hiển thị.
  - [x] Định nghĩa mapper: Fanout3BranchResponse → danh sách block + edge.

 - [x] Endpoint LLM `/api/llm/fanout` (POST)
  - [x] Tạo `src/api/llm/fanout/route.ts` nhận `{ idea: string, parentId?: string }`, trả `Fanout3BranchResponse`.
  - [x] Thêm prompt vào `src/lib/prompts.ts` để sinh 3 nhánh với các mục con cố định:
    - [x] Product Brief: Product Summary, Problem Statement, Target Audience / User Personas, Key Features & Benefits, Unique Value Proposition (UVP), Primary Use Cases & Scenarios.
    - [x] Technical Specification: System Architecture Overview, Core Components & Modules, Data Models & Schema, API Endpoints & Contracts, Key Algorithms & Business Logic, Technology Stack, Dependencies & Integrations.
    - [x] Codebase Guide: Project Structure Overview, Local Setup & Installation, Coding Standards & Style Guide, Testing Strategy, Deployment Process, Key Abstractions & Design Patterns.
  - [x] Validate/parse JSON LLM, fallback on retry khi sai schema (không stream ở MVP).

 - [x] Hành động UI “Auto‑Fanout” trên node message
  - [x] Thêm action/nút “Auto‑Fanout” vào `src/app/workflow/components/WorkflowToolbar.tsx` (toolbar + context menu).
  - [x] Khi click: lấy `title/content` của node đang chọn làm `idea`, gọi POST `/api/llm/fanout`.
  - [ ] Loading state + error toast; disable nút khi đang xử lý.

 - [x] Dựng node/edge từ kết quả fanout
  - [x] Với mỗi nhánh (Product Brief / Technical Spec / Codebase Guide) tạo 1 node `section` (tiêu đề theo tên file: `product_brief.md`, `technical_spec.md`, `codebase_guide.md`).
  - [x] Cho mỗi subnode trong nhánh, tạo node con `note` với `title` là tên mục và nội dung là bullets.
  - [x] Tạo edges `expands` từ parent → branch node, và từ branch node → subnode.
  - [x] Bố trí layout: xếp 3 nhánh theo vòng tròn/cung 120° quanh parent; subnodes xếp quạt xung quanh branch, tránh chồng lấp (khoảng cách dựa `node.width/height`).
  - [x] Batch create bằng API tldraw trong 1 transaction để undo/redo tốt.

 - [ ] Lưu trạng thái cục bộ
  - [ ] Đảm bảo upsert vào store (Zustand/Dexie) ở `src/lib/store.ts` và `src/lib/db.dexie.ts` (nếu đang dùng).
  - [ ] Đảm bảo undo/redo với `editor.mark` trước/sau khi tạo hàng loạt.

 - [ ] Biên dịch và xuất file Markdown theo 3 nhánh
  - [ ] Thêm compiler trong `src/lib/prd.ts` (hoặc file mới) để gom các subnodes theo 3 nhánh, output:
    - [ ] `docs/product_brief.md`
    - [ ] `docs/technical_spec.md`
    - [ ] `docs/codebase_guide.md`
  - [ ] Mapping: giữ thứ tự mục con như danh sách yêu cầu; bullets dưới mỗi mục.
  - [ ] Thêm nút “Export” để tải xuống 3 file .md (MVP: download local).

 - [ ] Push GitHub (sau MVP export local)
  - [ ] Tạo route `src/api/github/push/route.ts` (nếu chưa có) để tạo branch `auto/fanout-export`, commit 3 file `.md`, mở PR.
  - [ ] UI nút “Push to GitHub” sau khi compile thành công.

 - [ ] Kiểm thử
  - [ ] Unit test mapper Fanout3BranchResponse → block/edge (không phụ thuộc tldraw).
  - [ ] Unit test parser/validator output LLM.
  - [ ] Integration test route `/api/llm/fanout` với mock LLM.
  - [ ] Manual test layout: 3 nhánh + subnodes không chồng, undo/redo hoạt động.

- [ ] Nâng cao (sau MVP)
  - [ ] “Enrich” từng subnode (gọi LLM theo mục riêng).
  - [ ] Idempotency: nếu fanout nhiều lần trên cùng parent, hỏi ghi đè hay tạo nhóm mới.
  - [ ] Streaming từng nhánh khi cần.
  - [ ] Gắn metadata để compiler có thể chèn thêm citations sau này.

## Acceptance Criteria (MVP)
- [ ] Click “Auto‑Fanout” trên 1 message node tạo đúng 3 nhánh với đủ mục con như mô tả.
- [ ] Các node/edge được tạo đúng loại (`section`/`note`, edge `expands`) và bố trí không chồng.
- [ ] Có thể export được 3 file: `docs/product_brief.md`, `docs/technical_spec.md`, `docs/codebase_guide.md` với nội dung theo thứ tự chuẩn.
- [ ] Undo/redo hoàn chỉnh cho thao tác fanout.
- [ ] Lỗi LLM/parse hiển thị rõ, không tạo node dở dang.

---

## Root Chat Flow & Export (updated)

- [ ] Implement RootChatBar tool UI (shadcn) on toolbar
  - [ ] White/black UI, input nền trắng viền đen; nút “+” preset "product package"
  - [ ] Đặt RootChatBar lên canvas từ toolbar; có thể xóa như node thường
- [ ] Stream short description via `/api/stream` and normalize title (≤ 60 chars)
- [ ] Create main `message` node tại vị trí chatbar; chatbar biến mất
- [ ] Auto‑run fanout sau khi tạo main node; thêm loading indicator quanh node
- [ ] Add Export dropdown (chọn file) với 4 lựa chọn
-  - [x] `docs/product_brief.md`
-  - [x] `docs/technical_spec.md`
-  - [x] `docs/codebase_guide.md`
-  - [x] `docs/tasks.md` (GFM checklist)
- [x] Compiler 3 files từ graph
- [x] Generate `tasks.md` (GFM checklist) từ 3 branches
- [ ] Allow multiple main nodes; có thể đặt RootChatBar nhiều lần
- [ ] Clean up: remove Auto‑Fanout button khỏi toolbar/context menu cũ
- [ ] Tests cơ bản: chuẩn hóa title, mapping branches → nodes/edges

---

## Auto Layout (tree/DAG)

- [ ] Chọn engine layout
  - [ ] Cây 1-parent: `d3-hierarchy` + `d3.tree()`/`cluster()`
  - [ ] DAG nhiều-parent: `elkjs` (layered) hoặc `dagre`
- [ ] Xây builder dữ liệu layout (nodes/edges) từ `tldraw` shapes
- [ ] Tính kích thước thực tế node (width/height) + margin → `nodeSize`
- [x] Tính layout → map về `editor.animateShapes([...])`
- [ ] Hỗ trợ nhiều root (mỗi root layout cục bộ, tránh va chạm)
- [ ] Trigger: sau fanout và khi graph đổi (debounce)
  
Progress:
- [x] Tạo `treeLayout.ts` dùng `d3-hierarchy` + `tree().nodeSize([dx,dy])`
- [x] Hook vào flow: chạy auto layout sau fanout trong `RootChatDefinition`
- [ ] Thêm separation cho siblings (`tree().separation((a,b)=>...)`) để giãn đều
- [x] Lấy `width/height` thực tế từ bounds để tính `dx,dy` động
- [x] Nút "Re-layout" trên toolbar (áp dụng cho cây của node đang chọn)
- [ ] Debounce re-layout khi graph thay đổi (thêm/sửa/xóa edge)
  
Progress (tiếp):
- [ ] Debounce re-layout: (bỏ qua theo quyết định: user chủ động bấm Re-layout)