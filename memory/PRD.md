# Order Desk — PRD

## Original Problem Statement
Single-user website to track confirmed orders. Dashboard with all orders + New Order button. Order captures customer name, firm name, phone, company (optional), document/image upload, total value, advance, notes, delivery address, and 1+ items (name/brand/quantity). Each item has a 4-stage checklist: Order Placed (manufacturer), Dispatched (factory, requires LR upload), Received, Delivered — each click records date+time. Status derived from item checkboxes (full vs "Partially X"). When all delivered → "Payment Pending"; fully paid+delivered → "Completed". Record payments with amount + receipt doc. Customers subtab (details + past orders). Payments subtab (pending on top, archive for fully paid). Phone autofills name/firm from existing customers. Fully-paid+delivered orders stay 3 days then move to Archive. NotebookLM-inspired warm ivory design.

## User Choices
- No authentication (single user)
- Files stored in MongoDB (base64)
- Currency: INR (₹)
- Phone autofill from existing customers: yes

## Architecture
- Backend: FastAPI + Motor/MongoDB. All routes under /api. Files stored base64 in `files` collection, served via GET /api/files/{id}. Orders in `orders` collection; status/balance/archive computed in `compute_derived()`.
- Frontend: React + react-router + shadcn/ui + sonner. Dashboard with tabs (Orders/Customers/Payments/Archive); OrderDetail route at /order/:id.
- Theme: warm ivory NotebookLM tokens in index.css, Plus Jakarta Sans.

## Core Requirements (static)
- Order CRUD, 4-stage per-item checklist with timestamps, LR-gated dispatch, payments, customers aggregation, payments overview, phone autofill, 3-day archive rule, INR formatting.

## Implemented (2026-06-18)
- Full order lifecycle: create → per-item 4-stage progression → payments → completion.
- Dispatch stage gated on LR document upload.
- Derived statuses (Ordered/Partially…/Delivered/Payment Pending/Completed).
- Customers tab (lifetime value, outstanding, past orders), Payments tab (pending sorted by balance + archive), Archive tab (3-day rule).
- Document upload/view for order docs, LR, payment receipts.
- Phone autofill on blur.
- Verified: 12/12 backend tests + all frontend flows pass.

### Added (2026-06-18, iteration 2)
- Payments tab: search by customer name or phone number (`payment-search-input`) + sort dropdown (`payment-sort-select`) — Newest/Oldest first, Price high→low / low→high. Sort applies within each section (Pending Collections, Payments Archive).
- Orders & Archive tabs: sort dropdown (`order-sort-select` / `archive-sort-select`) with same date/price options; phone search made whitespace-insensitive to match Payments.
- Verified: 16/16 frontend checks pass (iteration_2.json).

## Backlog
- P1: Edit an existing order (currently create + delete only).
- P2: Dashboard summary stats (total outstanding, active orders count).
- P2: Export orders/payments to CSV/PDF.
- P2: Search/filter by status.
