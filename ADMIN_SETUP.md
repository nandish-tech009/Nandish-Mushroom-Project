# Admin Setup Instructions

## Admin Credentials
- **Email**: admin@mushroommarket.com
- **Password**: Admin@123

## Setup Steps

### 1. Create Admin Account
1. Go to the Auth page (`/auth`)
2. Sign up with the admin credentials above
3. You'll be automatically logged in

### 2. Assign Admin Role
After signing up, you need to assign the admin role. Go to your Lovable Cloud Database and run:

```sql
-- Get the user_id for the admin user
SELECT id, email FROM auth.users WHERE email = 'admin@mushroommarket.com';

-- Insert admin role (replace USER_ID with the actual UUID from above)
INSERT INTO user_roles (user_id, role)
VALUES ('USER_ID', 'admin');
```

### 3. Access Admin Panel
Once the admin role is assigned:
1. Log in with admin credentials
2. Click on your profile icon (top right)
3. Select "Admin Panel" from the dropdown
4. Or directly navigate to `/admin`

## Order Management Workflow

### 4-Stage Approval System
1. **Pending Approval** - New orders waiting for admin review
2. **Confirmed** - Orders approved by admin
3. **Processing** - Orders being prepared
4. **Delivered** - Orders completed and delivered

### Admin Capabilities
- View all orders in realtime (automatic updates)
- Approve pending orders
- Update order status through all 4 stages
- View customer details and order history
- Manage products and users

### Customer Experience
- Customers see colorful dashboard with order stats
- "My Orders" tab shows active orders with product details
- "Delivered Orders" tab shows completed orders
- Realtime status updates (no page refresh needed)
- Product images displayed in order details

## Features
✅ Menu buttons in navbar (Dashboard, Products)
✅ Colorful stat cards on both dashboards
✅ Order details with product images
✅ 4-stage order approval system
✅ Realtime order updates
✅ Separate sections for active and delivered orders
✅ Admin credentials displayed on landing and auth pages
