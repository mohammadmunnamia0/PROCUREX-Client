# ORDERFLOW — Backend API

**ORDERFLOW** is a full-stack Inventory & Order Management System built with the MERN stack.  
This is the **backend REST API** powering the ORDERFLOW platform.

---

## Tech Stack

| Technology       | Purpose                         |
| ---------------- | ------------------------------- |
| Node.js          | Runtime                         |
| Express 4        | Web framework                   |
| MongoDB          | NoSQL database                  |
| Mongoose 8       | ODM / data modeling             |
| JWT              | Authentication (jsonwebtoken)   |
| bcryptjs         | Password hashing                |
| Helmet           | Security headers                |
| CORS             | Cross-origin resource sharing   |
| express-rate-limit | Rate limiting                 |
| express-validator | Input validation               |
| Morgan           | HTTP request logging            |
| dotenv           | Environment variable management |

---

## Features

### Authentication & Authorization
- JWT-based authentication with 7-day token expiry
- Role-based access control: **admin**, **sales**, **warehouse**, **viewer**
- Password change support
- Account deactivation enforcement
- Rate limiting on auth endpoints (20 req / 15 min)

### Product Management
- Full CRUD with search (name/SKU) and pagination
- Category filtering and listing
- SKU uniqueness enforcement (auto-uppercase)
- Reorder level tracking per product
- Soft-delete via archive (no hard delete)
- Auto-creates Inventory & StockMovement on product creation

### Inventory Management
- Real-time stock tracking per warehouse
- Available stock = totalStock − reservedStock
- Stock health indicators: Healthy / Low Stock / Out of Stock
- Manual stock adjustments (add/remove) with reason logging
- Low-stock filtering

### Customer Management
- Full CRUD with search (name/email/phone)
- Deletion protection if customer has associated orders

### Order Management
- Full lifecycle: **Draft → Confirmed → Packed → Shipped → Delivered** (or **Cancelled**)
- Auto-generated order numbers: `ORD-YYYYMMDD-NNNN`
- Stock reservation on confirmation, release on cancellation
- CSV export support
- Multi-item line items with automatic total calculation

### Fulfillment
- Pack / Ship / Deliver workflow
- Tracking number assignment
- Stock deduction on packing

### Reconciliation
- Create reconciliation records with expected vs. actual counts
- Approval/rejection workflow (admin only)
- Auto stock-correction on approval
- Linked stock movement records

### Stock Movements
- Automatic tracking of all stock changes
- Types: initial, adjustment, sale, return, reconciliation
- Full audit trail with user attribution

### Dashboard Analytics
- KPI cards: total orders, pending, delivered, cancelled, low stock, out-of-stock
- Inventory accuracy percentage
- Fulfillment rate & average processing time
- Order trends (last 7 days)
- Status breakdown aggregation
- Stock alerts (items at/below reorder level)

---

## API Endpoints

| Method | Endpoint                          | Description                  | Auth     |
| ------ | --------------------------------- | ---------------------------- | -------- |
| POST   | `/api/auth/register`              | Register new user            | Public   |
| POST   | `/api/auth/login`                 | Login                        | Public   |
| GET    | `/api/auth/me`                    | Get current user             | Token    |
| PUT    | `/api/auth/change-password`       | Change password              | Token    |
| GET    | `/api/users`                      | List all users               | Admin    |
| PUT    | `/api/users/:id`                  | Update user role/status      | Admin    |
| GET    | `/api/products`                   | List products                | Token    |
| POST   | `/api/products`                   | Create product               | Admin    |
| PUT    | `/api/products/:id`               | Update product               | Admin    |
| PATCH  | `/api/products/:id/archive`       | Archive product              | Admin    |
| GET    | `/api/products/categories`        | List categories              | Token    |
| GET    | `/api/inventory`                  | List inventory               | Token    |
| PUT    | `/api/inventory/:id/adjust`       | Adjust stock                 | Admin/WH |
| GET    | `/api/inventory/warehouses`       | List warehouses              | Token    |
| GET    | `/api/customers`                  | List customers               | Token    |
| POST   | `/api/customers`                  | Create customer              | Admin/Sales |
| PUT    | `/api/customers/:id`              | Update customer              | Admin/Sales |
| DELETE | `/api/customers/:id`              | Delete customer              | Admin    |
| GET    | `/api/orders`                     | List orders                  | Token    |
| POST   | `/api/orders`                     | Create order                 | Admin/Sales |
| GET    | `/api/orders/:id`                 | Get order details            | Token    |
| PUT    | `/api/orders/:id`                 | Update order                 | Admin/Sales |
| PATCH  | `/api/orders/:id/confirm`         | Confirm order                | Admin/Sales |
| PATCH  | `/api/orders/:id/cancel`          | Cancel order                 | Admin/Sales |
| GET    | `/api/orders/export/csv`          | Export orders as CSV         | Admin    |
| GET    | `/api/fulfillment`                | List fulfillment orders      | Admin/WH |
| PATCH  | `/api/fulfillment/:id/pack`       | Pack order                   | Admin/WH |
| PATCH  | `/api/fulfillment/:id/ship`       | Ship order                   | Admin/WH |
| PATCH  | `/api/fulfillment/:id/deliver`    | Deliver order                | Admin/WH |
| GET    | `/api/reconciliation`             | List reconciliations         | Admin/WH |
| POST   | `/api/reconciliation`             | Create reconciliation        | Admin/WH |
| PATCH  | `/api/reconciliation/:id/approve` | Approve reconciliation       | Admin    |
| PATCH  | `/api/reconciliation/:id/reject`  | Reject reconciliation        | Admin    |
| GET    | `/api/stock-movements`            | List stock movements         | Token    |
| GET    | `/api/dashboard`                  | Get dashboard analytics      | Token    |

---

## Database Models

| Model          | Key Fields                                                                 |
| -------------- | -------------------------------------------------------------------------- |
| User           | name, email, password, role (admin/sales/warehouse/viewer), isActive       |
| Product        | name, sku, category, price, unit, reorderLevel, isArchived                 |
| Inventory      | product, warehouse, totalStock, reservedStock, lastRestocked               |
| Customer       | name, email, phone, address, city                                          |
| Order          | orderNumber, customer, items[], status, totalAmount, confirmedAt, etc.     |
| StockMovement  | product, type, quantity, reason, performedBy, relatedOrder                 |
| Reconciliation | product, warehouse, expectedQty, actualQty, difference, status, approvedBy|

---

## Environment Variables

Create a `.env` file in the `server/` directory:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/orderflow
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

---

## Installation & Setup

```bash
# Clone the repository
git clone https://github.com/<your-username>/orderflow-backend.git
cd orderflow-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Seed the database (optional)
npm run seed

# Start development server
npm run dev

# Start production server
npm start
```

---

## Seed Data

Run `npm run seed` to populate the database with sample data including:
- Admin user (admin@orderflow.com / password123)
- Sample products, inventory, customers, and orders

---

## Deployment (Vercel)

This backend is configured for **Vercel serverless deployment**.

1. Push this folder to a GitHub repository
2. Import the repo on [vercel.com](https://vercel.com)
3. Set the **Root Directory** to `server`
4. Add environment variables in Vercel dashboard:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `CLIENT_URL` (your deployed frontend URL)
   - `NODE_ENV=production`
5. Deploy!

---

## License

MIT
