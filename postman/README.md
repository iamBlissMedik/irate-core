# iRate API - Postman Documentation

Complete Postman collection for testing and integrating with the iRate Fintech API.

## 📦 What's Included

- **Postman Collection**: `iRate-API.postman_collection.json` - All API endpoints with examples
- **Environment Files**: 
  - `iRate-Local.postman_environment.json` - Local development (http://localhost:5000)
  - `iRate-Staging.postman_environment.json` - Staging environment
  - `iRate-Production.postman_environment.json` - Production environment

## 🚀 Quick Start

### 1. Import Collection & Environment

**Option A: Import via Postman App**
1. Open Postman
2. Click **Import** button (top left)
3. Drag and drop all `.json` files from this folder
4. Collection and environments will be imported automatically

**Option B: Import from File**
1. Open Postman
2. Click **Import** → **Choose Files**
3. Select:
   - `iRate-API.postman_collection.json`
   - `iRate-Local.postman_environment.json`
   - `iRate-Staging.postman_environment.json` (optional)
   - `iRate-Production.postman_environment.json` (optional)

### 2. Select Environment

1. Click environment dropdown (top right)
2. Select **iRate - Local Development**
3. Environment variables will be loaded

### 3. Start Testing

1. **Register a User**:
   - Navigate to `Authentication` → `Register User`
   - Click **Send**
   - User ID is automatically saved to environment

2. **Login**:
   - Navigate to `Authentication` → `Login`
   - Click **Send**
   - Access token and refresh token are automatically saved

3. **Test Protected Endpoints**:
   - All authenticated endpoints now work automatically
   - Bearer token is applied from environment

## 📚 API Endpoints Overview

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get tokens
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user

### Users
- `GET /api/v1/users/me` - Get current user profile
- `GET /api/v1/users/:userId` - Get user by ID

### Wallets
- `POST /api/v1/wallets` - Create wallet
- `GET /api/v1/wallets` - Get my wallets
- `GET /api/v1/wallets/:walletId/balance` - Get wallet balance

### Transactions
- `POST /api/v1/transactions/transfer` - Transfer money between wallets
- `GET /api/v1/transactions/:walletId/transactions` - Get transaction history

### KYC
- `POST /api/v1/kyc/submit` - Submit KYC documents
- `GET /api/v1/kyc/status` - Get my KYC status

### Admin (Requires Admin Role)
- `GET /api/v1/admin/me` - Get admin profile
- `POST /api/v1/admin/credit/:walletId` - Credit user wallet
- `GET /api/v1/admin/users` - Get all users
- `GET /api/v1/admin/wallets/balance` - Get total platform balance
- `GET /api/v1/admin/users/stats` - Get user statistics
- `GET /api/v1/admin/dashboard/overview` - Get dashboard overview
- `GET /api/v1/admin/kyc` - List all KYC submissions
- `PATCH /api/v1/admin/kyc/:kycId/review` - Review KYC submission

## 🔐 Authentication

### Bearer Token (Automatic)
All authenticated endpoints use Bearer token authentication. After login:
- Access token is automatically saved to `{{accessToken}}` variable
- Token is automatically applied to all requests requiring authentication
- No manual copying/pasting needed!

### Token Lifecycle
- **Access Token**: Expires after 15 minutes
- **Refresh Token**: Expires after 7 days
- Use **Refresh Token** endpoint to get new access token without re-login

## 🌍 Environment Variables

### Automatically Set Variables
These are set by test scripts after API responses:
- `accessToken` - JWT access token (from login)
- `refreshToken` - JWT refresh token (from login)
- `userId` - Current user ID (from register/login)
- `walletId` - User's wallet ID (from create wallet)
- `kycId` - KYC submission ID (from submit KYC)

### Manual Configuration
- `baseUrl` - API base URL
  - Local: `http://localhost:5000`
  - Staging: `https://staging-api.irate.com`
  - Production: `https://api.irate.com`

## 💡 Usage Examples

### Example 1: Complete User Journey
```
1. Register User → automatically saves userId
2. Login → automatically saves accessToken, refreshToken
3. Create Wallet → automatically saves walletId
4. Get Wallet Balance → uses saved walletId
5. Submit KYC → submit documents
6. Transfer Money → send money to another wallet
```

### Example 2: Admin Workflow
```
1. Login as Admin → get admin access token
2. Get Dashboard Overview → view platform stats
3. List KYC Submissions → see pending verifications
4. Review KYC → approve or reject submission
5. Credit User Wallet → add bonus funds
```

### Example 3: Idempotent Transfers
```
1. Open "Transfer Money" request
2. Note the Idempotency-Key header (auto-generated UUID)
3. Send request → transfer succeeds
4. Send same request again → returns cached result (no duplicate)
5. Change Idempotency-Key → creates new transfer
```

## 🎯 Testing Features

### Automatic Test Scripts
The collection includes JavaScript test scripts that:
- Automatically save tokens after login
- Extract and save IDs from responses
- Log success messages to console
- Validate response status codes

### View Test Results
1. Send any request
2. Click **Test Results** tab at bottom
3. See console logs and validation results

## 🔧 Customization

### Add Custom Headers
1. Select any request
2. Go to **Headers** tab
3. Add custom headers as needed

### Modify Request Body
1. Select request
2. Go to **Body** tab
3. Edit JSON as needed
4. Use `{{variable}}` for environment variables

### Add New Requests
1. Right-click on folder
2. Select **Add Request**
3. Configure endpoint, method, body
4. Save

## 📝 Nigerian Fintech Features

### KYC Compliance
- Supports **BVN** (Bank Verification Number)
- Supports **NIN** (National Identification Number)
- Required for CBN (Central Bank of Nigeria) compliance

### Transaction Security
- **Idempotency Keys**: Prevent duplicate transfers
- **Atomic Transactions**: Both wallets update or neither
- **Ledger Tracking**: Complete audit trail
- **Balance Validation**: Prevent overdrafts

### Currency
- All amounts in **NGN** (Nigerian Naira)
- Supports decimal amounts (e.g., 1500.50)

## 🐛 Troubleshooting

### Issue: "Unauthorized" Error
**Solution**: 
- Login again to refresh token
- Check if access token expired (15 min lifetime)
- Use Refresh Token endpoint to get new access token

### Issue: Environment Variables Not Working
**Solution**:
- Ensure correct environment is selected (top right dropdown)
- Check if variables are set (click eye icon next to environment)
- Re-import environment file if needed

### Issue: "Idempotency-Key Required"
**Solution**:
- Transfer endpoint requires Idempotency-Key header
- Use `{{$guid}}` in header value (Postman generates unique ID)
- Or manually provide UUID

### Issue: Can't Access Admin Endpoints
**Solution**:
- Admin endpoints require user with role "ADMIN"
- Create admin user directly in database:
  ```sql
  UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@example.com';
  ```

## 📖 Additional Resources

- [Backend Architecture Documentation](../BACKEND_ARCHITECTURE.md)
- [API Migration Guide](../MIGRATION_GUIDE.md)
- [Full README](../README.md)

## 🤝 Sharing with Team

### Share Collection
1. Export collection: Right-click → **Export**
2. Send `.json` file to team members
3. They import into their Postman

### Share via Postman Workspace (Recommended)
1. Create Postman Workspace
2. Invite team members
3. Collections and environments sync automatically
4. Changes are visible to all team members

### Generate API Documentation
1. Click collection name
2. Click **View Documentation**
3. Click **Publish**
4. Get shareable documentation URL

## 🔗 API Documentation Links

- **Postman Documentation**: Click "View Docs" in collection
- **OpenAPI/Swagger**: Coming soon
- **Postman Public Link**: Share collection with public URL

## 💻 Development Tips

### Use Variables Everywhere
```json
{
  "fromWalletId": "{{walletId}}",
  "toWalletId": "{{recipientWalletId}}",
  "amount": {{transferAmount}}
}
```

### Use Pre-request Scripts
Add to collection or request:
```javascript
// Generate unique transaction ID
pm.environment.set("transactionId", pm.variables.replaceIn('{{$guid}}'));

// Add timestamp
pm.environment.set("timestamp", new Date().toISOString());
```

### Use Test Scripts for Validation
```javascript
// Validate response
pm.test("Status is 200", () => {
    pm.response.to.have.status(200);
});

pm.test("Response has data", () => {
    const response = pm.response.json();
    pm.expect(response.data).to.exist;
});
```

## 📞 Support

For API issues or questions:
- Check Backend README: `../README.md`
- Review Architecture: `../BACKEND_ARCHITECTURE.md`
- Contact Backend Team

---

**Built for Nigerian Fintech Excellence 🇳🇬**

Ready to test | Production-ready | Interview-ready
