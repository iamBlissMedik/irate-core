# Sharing API Documentation with Your Team

## 📤 Option 1: Direct File Sharing (Simplest)

### Share via Git

The Postman files are already in the repository! Your team can:

```bash
git pull origin refactor
cd postman/
# Open Postman and import the files
```

### Share via File Transfer

Send these files to team members:

- `iRate-API.postman_collection.json`
- `iRate-Local.postman_environment.json`

They import into Postman and start testing immediately!

---

## 📤 Option 2: Postman Workspace (Recommended for Teams)

### Benefits

- Real-time sync across team
- Collaborative editing
- Version history
- Comments and discussions
- Team library of examples

### Setup Steps

1. **Create Postman Workspace**
   - Open Postman → Click "Workspaces" (top left)
   - Click "Create Workspace"
   - Name: "iRate Development"
   - Visibility: Team
   - Click "Create"

2. **Import Collection into Workspace**
   - Click "Import"
   - Select `iRate-API.postman_collection.json`
   - Collection appears in workspace

3. **Import Environments**
   - Click "Environments" (left sidebar)
   - Click "Import"
   - Select all environment files
   - Environments appear in workspace

4. **Invite Team Members**
   - Click workspace name → "Invite"
   - Enter team member emails
   - Set permissions (Viewer/Editor)
   - Send invitations

5. **Team Access**
   - Team members accept invitation
   - Workspace appears in their Postman
   - All collections and environments synced automatically

---

## 📤 Option 3: Published Documentation (Public/Client Facing)

### Generate Public Documentation

1. **In Postman:**
   - Right-click collection
   - Select "View Documentation"
   - Click "Publish"
   - Choose visibility (Public/Private)
   - Get shareable URL

2. **Share the URL:**
   - Send to external developers
   - Add to README.md
   - Embed in developer portal

### Example URL Structure:

```
https://documenter.getpostman.com/view/{workspace-id}/{collection-id}
```

---

## 📤 Option 4: Export and Version Control (Current Setup ✅)

### What's Already Done

- ✅ Postman files in `postman/` folder
- ✅ Committed to Git repository
- ✅ Environment files for each stage
- ✅ Documentation in markdown

### Team Workflow

1. Engineers clone repository
2. Import Postman files
3. Select appropriate environment
4. Start testing

### Updating Collection

```bash
# Make changes in Postman
# Export updated collection
# Replace file in postman/ folder
git add postman/
git commit -m "docs: update API endpoints"
git push
```

---

## 📤 Option 5: Newman CLI (Automated Testing)

### What is Newman?

Newman is Postman's command-line runner. Use it for:

- CI/CD integration
- Automated API testing
- Command-line API testing

### Setup

```bash
# Install Newman globally
npm install -g newman

# Run collection
newman run postman/iRate-API.postman_collection.json \
  -e postman/iRate-Local.postman_environment.json

# Run with detailed report
newman run postman/iRate-API.postman_collection.json \
  -e postman/iRate-Local.postman_environment.json \
  --reporters cli,json,html \
  --reporter-html-export newman-report.html
```

### Add to CI/CD (GitHub Actions Example)

```yaml
# .github/workflows/api-tests.yml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Install Newman
        run: npm install -g newman

      - name: Run API Tests
        run: |
          newman run postman/iRate-API.postman_collection.json \
            -e postman/iRate-Local.postman_environment.json \
            --bail
```

---

## 🎯 Recommended Approach

### For Small Teams (< 5 engineers)

**Use Option 1 (Git) + Option 4 (Version Control)**

- Simple setup
- No extra accounts needed
- Files versioned with code

### For Medium Teams (5-20 engineers)

**Use Option 2 (Postman Workspace)**

- Real-time collaboration
- Easy updates
- Team visibility

### For Large Teams or With Clients

**Use Option 2 (Workspace) + Option 3 (Public Docs)**

- Internal workspace for development
- Public docs for external partners
- Professional presentation

---

## 📝 Best Practices

### 1. Keep Environments Separate

```
✅ iRate-Local.postman_environment.json (localhost)
✅ iRate-Staging.postman_environment.json (staging server)
✅ iRate-Production.postman_environment.json (production - read-only)
```

### 2. Use Environment Variables

Never hardcode:

- API keys
- Passwords
- Server URLs
- User IDs

Always use:

- `{{baseUrl}}`
- `{{accessToken}}`
- `{{walletId}}`

### 3. Document Edge Cases

Add examples for:

- Successful responses (200, 201)
- Error responses (400, 401, 403, 404)
- Edge cases (insufficient funds, expired tokens)

### 4. Add Test Scripts

Every request should have:

- Status code validation
- Response structure validation
- Automatic variable extraction

Example:

```javascript
pm.test("Status is 200", () => {
  pm.response.to.have.status(200);
});

pm.test("Has access token", () => {
  const response = pm.response.json();
  pm.expect(response.data.accessToken).to.exist;
});
```

### 5. Update Regularly

- Export after adding new endpoints
- Commit to repository
- Notify team of updates

---

## 🔐 Security Considerations

### DO NOT Commit:

- Real access tokens
- Real API keys
- Production credentials
- Personal data

### DO Commit:

- Collection structure
- Example requests
- Environment templates (with placeholder values)
- Documentation

### For Production Environment:

```json
{
  "key": "accessToken",
  "value": "", // ← Leave empty, team adds their own
  "type": "secret"
}
```

---

## 📞 Support

### For Team Onboarding

1. Share `postman/QUICKSTART.md`
2. Help with first import
3. Ensure environment is selected
4. Test with Register + Login flow

### For Issues

- Check `postman/README.md` troubleshooting section
- Review environment variables
- Verify server is running
- Check network/CORS settings

### For Updates

- Announce in team chat
- Document changes in commit message
- Update version in collection info

---

## ✅ Checklist for Sharing

- [ ] Collection exported and committed
- [ ] All environment files included
- [ ] Documentation written (README.md)
- [ ] Quick start guide created
- [ ] Sensitive data removed
- [ ] Test scripts working
- [ ] Environment variables documented
- [ ] Team invited (if using workspace)
- [ ] First test successful

---

**Ready to share! Your team now has production-ready API documentation. 🚀**

Choose your sharing method and get started!
