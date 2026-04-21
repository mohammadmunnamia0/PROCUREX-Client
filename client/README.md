# ORDERFLOW — Frontend

**ORDERFLOW** is a full-stack Inventory & Order Management System built with the MERN stack.  
This is the **React frontend** providing the user interface for the ORDERFLOW platform.

---

## Tech Stack

| Technology        | Purpose                        |
| ----------------- | ------------------------------ |
| React 18          | UI library                     |
| Vite 5            | Build tool & dev server        |
| React Router 6    | Client-side routing            |
| Axios             | HTTP client                    |
| Recharts          | Data visualization / charts    |
| React Toastify    | Toast notifications            |
| React Icons       | Icon library                   |

---

## Features

### Authentication
- Login / Register pages
- JWT token management
- Automatic redirect on session expiry
- Role-based route protection

### Dashboard
- KPI cards (Total Orders, Pending, Delivered, Cancelled, Low Stock, Out of Stock)
- Inventory accuracy & fulfillment rate metrics
- Order trend chart (last 7 days — using Recharts)
- Order status breakdown
- Recent orders list
- Stock alert notifications

### Product Management
- Product listing with search and pagination
- Category filtering
- Create / Edit / Archive products
- SKU and reorder level management

### Inventory Management
- Real-time stock levels per warehouse
- Stock health indicators (Healthy / Low Stock / Out of Stock)
- Manual stock adjustments with reason tracking
- Warehouse filtering

### Customer Management
- Customer directory with search
- Create / Edit / Delete customers
- Protected routes (admin & sales only)

### Order Management
- Full order lifecycle visualization
- Create multi-item orders
- Order confirmation & cancellation
- Detailed order view page
- CSV export (admin only)

### Fulfillment
- Pack / Ship / Deliver workflow interface
- Tracking number management
- Status transition controls (admin & warehouse only)

### Reconciliation
- Create reconciliation records
- Expected vs. actual stock comparison
- Approval / rejection workflow
- Admin-only reconciliation management

### Stock Movements
- Complete audit trail of all stock changes
- Filter by movement type (initial, adjustment, sale, return, reconciliation)

### User Management (Admin)
- View all system users
- Update user roles and status
- Activate / deactivate accounts

---

## Project Structure

```
client/
├── public/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ErrorBoundary.jsx
│   │   ├── Header.jsx
│   │   ├── Layout.jsx
│   │   ├── Pagination.jsx
│   │   └── Sidebar.jsx
│   ├── context/
│   │   └── AuthContext.jsx  # Authentication state management
│   ├── pages/               # Route pages
│   │   ├── Dashboard.jsx
│   │   ├── Products.jsx
│   │   ├── Inventory.jsx
│   │   ├── Customers.jsx
│   │   ├── Orders.jsx
│   │   ├── OrderDetail.jsx
│   │   ├── Fulfillment.jsx
│   │   ├── Reconciliation.jsx
│   │   ├── StockMovements.jsx
│   │   ├── Users.jsx
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── services/
│   │   └── api.js           # Axios instance & interceptors
│   ├── App.jsx              # App routes
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── index.html
├── vite.config.js
├── vercel.json
└── package.json
```

---

## User Roles & Access

| Page              | Admin | Sales | Warehouse | Viewer |
| ----------------- | :---: | :---: | :-------: | :----: |
| Dashboard         |  yes  |  yes  |    yes    |  yes   |
| Products          |  yes  |  yes  |    yes    |  yes   |
| Inventory         |  yes  |  yes  |    yes    |  yes   |
| Customers         |  yes  |  yes  |    —     |   —   |
| Orders            |  yes  |  yes  |    yes    |  yes   |
| Fulfillment       |  yes  |  —   |    yes    |   —   |
| Reconciliation    |  yes  |  —   |    yes    |   —   |
| Stock Movements   |  yes  |  yes  |    yes    |  yes   |
| User Management   |  yes  |  —   |    —     |   —   |

---

## Environment Variables

Create a `.env` file in the `client/` directory:

```env
VITE_API_URL=/api
```

For production (when backend is deployed separately):

```env
VITE_API_URL=https://your-backend-url.vercel.app/api
```

---

## Installation & Setup

```bash
# Clone the repository
git clone https://github.com/<your-username>/orderflow-frontend.git
cd orderflow-frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API URL

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The development server runs at `http://localhost:3000` with API proxy to `http://localhost:5000`.

---

## Deployment (Vercel)

This frontend is configured for **Vercel deployment**.

1. Push this folder to a GitHub repository
2. Import the repo on [vercel.com](https://vercel.com)
3. Set the **Root Directory** to `client`
4. Set the **Framework Preset** to `Vite`
5. Add environment variable in Vercel dashboard:
   - `VITE_API_URL` = `https://your-backend-url.vercel.app/api`
6. Deploy!

The `vercel.json` handles SPA routing by redirecting all paths to `index.html`.

---

## License

MIT
