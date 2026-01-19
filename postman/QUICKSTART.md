# Quick Start Guide for Engineers

## 🚀 Getting Started with iRate API

### Step 1: Import into Postman

1. Open Postman
2. Click **Import** (top left corner)
3. Drag these files into Postman:
   - `iRate-API.postman_collection.json`
   - `iRate-Local.postman_environment.json`

### Step 2: Select Environment

1. Click environment dropdown (top right)
2. Select **"iRate - Local Development"**

### Step 3: Test the API

**Try this simple workflow:**

#### 1. Register a New User

- Go to: `Authentication` → `Register User`
- Click **Send**
- ✅ User created! User ID automatically saved

#### 2. Login

- Go to: `Authentication` → `Login`
- Click **Send**
- ✅ Tokens automatically saved! You're authenticated

#### 3. Create a Wallet

- Go to: `Wallets` → `Create Wallet`
- Click **Send**
- ✅ Wallet ID automatically saved

#### 4. Get Your Balance

- Go to: `Wallets` → `Get Wallet Balance`
- Click **Send**
- ✅ See your balance (starts at 0)

#### 5. Transfer Money

- Go to: `Transactions` → `Transfer Money`
- Update `toWalletId` with recipient's wallet ID
- Update `amount` with transfer amount
- Click **Send**
- ✅ Transfer complete!

---

## 🔑 Key Features

### Automatic Token Management

- No need to copy/paste tokens
- Login automatically saves access & refresh tokens
- All authenticated requests work automatically

### Idempotent Transfers

- Prevents duplicate transactions
- Uses `Idempotency-Key` header (auto-generated UUID)
- Safe to retry failed requests

### Nigerian Fintech Features

- KYC with BVN/NIN support
- Multi-wallet support
- NGN currency
- Transaction ledger tracking

---

## 📋 Available Endpoints

### Authentication (4 endpoints)

- Register, Login, Refresh Token, Logout

### Users (2 endpoints)

- Get my profile, Get user by ID

### Wallets (3 endpoints)

- Create wallet, List my wallets, Get balance

### Transactions (2 endpoints)

- Transfer money, Get transaction history

### KYC (2 endpoints)

- Submit KYC, Get KYC status

### Admin (9 endpoints)

- Dashboard, Users, Wallets, KYC review, Credits

---

## 🐛 Common Issues

**Problem: "Unauthorized" error**
→ Solution: Login again to refresh your token

**Problem: Environment variables not working**
→ Solution: Make sure "iRate - Local Development" is selected

**Problem: "Idempotency-Key required"**
→ Solution: Header is already added with `{{$guid}}` value

**Problem: Can't access admin endpoints**
→ Solution: Update user role to ADMIN in database:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

---

## 📖 Need More Help?

- **Full Documentation**: Read [postman/README.md](./README.md)
- **API Architecture**: See [BACKEND_ARCHITECTURE.md](../BACKEND_ARCHITECTURE.md)
- **API Reference**: See [README.md](../README.md)

---

## 💡 Pro Tips

1. **Use Variables**: All IDs are saved automatically - use `{{walletId}}`, `{{userId}}` in requests
2. **Check Console**: View test results in Console tab after sending requests
3. **Duplicate Requests**: Right-click any request → Duplicate to create custom versions
4. **Share Collection**: Export and send to teammates for easy onboarding

---

**Happy Testing! 🚀**

Need help? Ask the backend team or check the full documentation.
