# Backend Notes

## Corporate Booking Flow (Phase 1: Hotels)

### 1) Run schema migrations

```bash
npm run migrate:legacy
npm run migrate:corporate
```

### 2) Corporate account lifecycle

- Platform admin creates corporate account + first corporate admin via `POST /api/corporates`.
- Corporate admin creates internal users via `POST /api/corporates/my/users`.
- Corporate employee booking creates `pending` approval (no payment gateway).
- Corporate admin approves via `POST /api/bookings/:id/approve`.
- On approve, booking is confirmed and INR wallet is deducted from corporate credit.

### 3) Key endpoints

- `GET /api/corporates` (platform admin)
- `POST /api/corporates` (platform admin)
- `PUT /api/corporates/:id` (platform admin)
- `GET /api/corporates/my/dashboard` (corporate roles)
- `GET /api/corporates/my/users` (corporate admin)
- `POST /api/corporates/my/users` (corporate admin)
- `GET /api/bookings/corporate/pending-approvals` (corporate admin)
- `POST /api/bookings/:id/approve` (corporate admin)
- `POST /api/bookings/:id/reject` (corporate admin)

### 4) Roles

- `admin`, `employee`: platform staff
- `corporate_admin`: manages one corporate account and approves internal requests
- `corporate_employee`: requests corporate bookings that require approval
