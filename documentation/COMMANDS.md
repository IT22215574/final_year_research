# 📝 Import Commands Cheat Sheet

## Essential Commands (Copy & Paste)

### 1️⃣ First Time Setup

```powershell
# Navigate to backend
cd Backend

# Login and get token
curl -X POST http://localhost:5000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"your@email.com","password":"yourpassword"}'

# Set token (paste your actual token)
$env:AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Run auto-setup to get boat ID
.\src\trips\utils\setup-import.ps1
```

### 2️⃣ Update Configuration

```typescript
// Edit: src/trips/utils/bulk-import-trips.ts (line ~25)
const USE_SINGLE_BOAT = true;
const SINGLE_BOAT_ID = 'paste-boat-id-here';
```

### 3️⃣ Run Import

```powershell
# RECOMMENDED: Import with actual data for ML training
npx ts-node src\trips\utils\bulk-import-trips.ts --with-actuals

# ALTERNATIVE: Import without actuals (just predictions)
npx ts-node src\trips\utils\bulk-import-trips.ts

# With delay (slower, safer for weak servers)
npx ts-node src\trips\utils\bulk-import-trips.ts --with-actuals --delay=2000
```

---

## Verification Commands

### Check if trips imported

```powershell
curl http://localhost:5000/api/v1/trips `
  -H "Authorization: Bearer $env:AUTH_TOKEN" | ConvertFrom-Json | Select-Object -ExpandProperty trips | Measure-Object
```

### Run ML batch training

```powershell
curl -X POST http://localhost:5000/api/v1/trips/batch-train `
  -H "Authorization: Bearer $env:AUTH_TOKEN"
```

### View specific trip

```powershell
curl http://localhost:5000/api/v1/trips/TRIP_ID `
  -H "Authorization: Bearer $env:AUTH_TOKEN"
```

---

## Troubleshooting Commands

### Check if backend is running

```powershell
curl http://localhost:5000/api/v1/auth/health
```

### Get your boats

```powershell
curl http://localhost:5000/api/v1/boat `
  -H "Authorization: Bearer $env:AUTH_TOKEN"
```

### Check token expiry

```powershell
# If you get 401 Unauthorized, login again:
curl -X POST http://localhost:5000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"your@email.com","password":"yourpassword"}'
```

### View ML service status

```powershell
curl http://localhost:5001/health
```

---

## One-Liner (After Setup)

Once configured, just run:

```powershell
$env:AUTH_TOKEN="your-token"; npx ts-node src\trips\utils\bulk-import-trips.ts --with-actuals
```

---

## File Locations

| File                         | Purpose                                  |
| ---------------------------- | ---------------------------------------- |
| `bulk-import-trips.ts`       | Main import script (UPDATE BOAT ID HERE) |
| `setup-import.ps1`           | Auto-setup helper                        |
| `QUICK_START.md`             | Detailed step-by-step guide              |
| `README.md`                  | Full documentation                       |
| `sample-trip-transformer.ts` | Data transformation logic                |

---

## Import Arguments

| Argument         | Description                           | Example               |
| ---------------- | ------------------------------------- | --------------------- |
| `--with-actuals` | Log actual data for ML training       | Required for learning |
| `--delay=MS`     | Delay between requests (milliseconds) | `--delay=2000`        |

---

## Expected Timeline

- ⚡ Without actuals: ~1 minute (41 trips × 1s delay)
- 🚀 With actuals: ~2 minutes (41 trips × 1.5s delay + logging)
- 🐌 With --delay=2000: ~3 minutes

---

## Success Indicators

✅ **Should see:**

```
✅ Success: 41
❌ Failed: 0
```

✅ **Mobile app shows 41 new trips**

✅ **Batch training shows positive/small errors (not -262.06)**

---

## Quick Reference: What's Being Imported?

- **41 trips** across 5 boat types
- **Distance range:** 14.8 - 128.5 km
- **Fishing hours:** 4.8 - 25.0 hours
- **Crew size:** 2 - 9 people
- **Catch:** 30 - 430 kg expected
- **Weather:** Varied conditions (calm to rough seas)

---

**💡 TIP:** Bookmark this file for quick reference!
