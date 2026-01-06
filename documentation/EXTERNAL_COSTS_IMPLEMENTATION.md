# External Costs Management System Implementation

## Overview

Implemented a comprehensive external costs management system that allows fishermen to add, edit, and delete external trip costs in a separate screen, with full database integration and auto-calculation features.

## Features Implemented

### 1. Backend API (NestJS + MongoDB)

#### Schema

**Location:** `Backend/src/schemas/external-cost.schema.ts`

- MongoDB schema with the following fields:
  - `userId`: Reference to User (ObjectId)
  - `tripId`: Optional reference to Trip (ObjectId)
  - `costType`: String (e.g., "Crew Wages", "Gear/Equipment", "Food & Water")
  - `unit`: String (e.g., "kg", "liters", "hours", "units")
  - `unitPrice`: Number (price per unit)
  - `amount`: Number (quantity)
  - `totalPrice`: Number (auto-calculated: amount × unitPrice)
  - `description`: Optional string for additional notes
  - `isActive`: Boolean (default: true)
  - Timestamps: createdAt, updatedAt

#### DTOs

**Location:** `Backend/src/external-cost/dto/`

- `create-external-cost.dto.ts`: Validation for creating costs
- `update-external-cost.dto.ts`: Validation for updating costs

#### Service

**Location:** `Backend/src/external-cost/external-cost.service.ts`

Methods:

- `create()`: Create a new external cost
- `findAll()`: Get all costs with optional filters
- `findByUser(userId)`: Get all costs for a specific user
- `findByTrip(tripId)`: Get all costs for a specific trip
- `findOne(id)`: Get a single cost by ID
- `update(id, updateDto)`: Update an existing cost
- `remove(id)`: Soft delete a cost (sets isActive to false)
- `getSummary(userId, tripId?)`: Get total cost and count summary

#### Controller

**Location:** `Backend/src/external-cost/external-cost.controller.ts`

Endpoints:

- `POST /api/external-costs`: Create a new cost
- `GET /api/external-costs`: Get all costs (with filters: userId, tripId, isActive)
- `GET /api/external-costs/summary`: Get cost summary
- `GET /api/external-costs/:id`: Get a specific cost
- `PATCH /api/external-costs/:id`: Update a cost
- `DELETE /api/external-costs/:id`: Delete a cost

#### Module Registration

**Location:** `Backend/src/app.module.ts`

- Added `ExternalCostModule` to imports array

### 2. Mobile App (React Native + Expo)

#### External Costs Manager Screen

**Location:** `mobile/app/(root)/(fisherman)/external-costs.tsx`

Features:

- **List Display**: Shows all user's external costs in a scrollable list
- **Add/Edit Modal**:
  - Input fields: Cost Type, Unit, Unit Price, Amount
  - Auto-calculation: Total Price = Amount × Unit Price
  - Real-time total calculation as user types
  - Description field (optional)
- **Summary Card**:
  - Shows total cost across all items
  - Displays count of cost items
  - Prominent display at top of screen
- **CRUD Operations**:
  - Create: Add new costs via modal form
  - Read: Display all costs with details
  - Update: Edit existing costs (pre-fills modal)
  - Delete: Remove costs with confirmation alert
- **Empty State**: Friendly message when no costs exist
- **Loading States**: Shows spinner while loading data

UI/UX Features:

- Gradient header with title
- Card-based layout for each cost item
- Color-coded summary card (blue gradient)
- Icons for actions (edit, delete)
- Safe area handling
- Responsive design

#### Trip Cost Prediction Integration

**Location:** `mobile/app/(root)/(fisherman)/trip-cost-prediction.tsx`

Changes:

- **Removed** inline cost management form
- **Removed** deprecated functions: `addExternalCost()`, `removeExternalCost()`
- **Removed** unused state variables: `newCostType`, `newCostAmount`, `newCostDescription`
- **Removed** Quick Add buttons section

New Features:

- **Load External Costs**: Fetches costs from backend API on mount
- **Refresh on Focus**: Automatically reloads costs when returning from External Costs Manager
- **Manage Button**: Links to External Costs Manager screen
- **Display Loaded Costs**: Shows costs with their details in prediction result
- **Updated Interface**: Uses `ExternalCost` type matching backend schema
- **Cost Breakdown**: Shows base cost + external costs separately in results

#### Navigation

**Location:** `mobile/app/(root)/(fisherman)/_layout.tsx`

Added:

- "External Costs" menu item in drawer navigation
- Icon: 💰 (money bag emoji)
- Route: `/external-costs`
- Drawer screen registration

#### Store Update

**Location:** `mobile/stores/authStore.tsx`

Updated:

- Added `_id?: string` to User interface for MongoDB ID compatibility

## Data Flow

### Adding External Costs

1. User opens "External Costs" from drawer menu
2. Taps "Add External Cost" button
3. Fills in form:
   - Selects cost type from picker
   - Enters unit (e.g., "kg", "liters")
   - Enters unit price
   - Enters amount
   - (Optional) Adds description
4. Total price auto-calculates (amount × unitPrice)
5. Taps "Add" button
6. POST request to `/api/external-costs`
7. Cost saved to MongoDB
8. List refreshes to show new cost
9. Summary card updates with new totals

### Using in Trip Prediction

1. User opens "Trip Cost Prediction" screen
2. Screen auto-loads external costs from backend
3. User fills in trip details and generates prediction
4. Prediction shows:
   - Base cost (from ML model)
   - External costs (loaded from database)
   - Total trip cost (base + external)
5. If user wants to modify costs:
   - Taps "Manage" button
   - Navigates to External Costs Manager
   - Makes changes
   - Returns to prediction screen
   - Costs automatically refresh

## API Integration

### Base URL

```typescript
const API = "http://192.168.1.100:3000";
```

### Authentication

- Uses JWT token from AsyncStorage
- Token passed in Authorization header: `Bearer ${token}`

### Example API Calls

**Load Costs:**

```typescript
GET /api/external-costs?userId=${currentUser?._id}
Headers: { Authorization: `Bearer ${token}` }
```

**Create Cost:**

```typescript
POST /api/external-costs
Body: {
  userId: "...",
  costType: "Crew Wages",
  unit: "hours",
  unitPrice: 500,
  amount: 8,
  totalPrice: 4000,
  description: "2 crew members"
}
```

**Update Cost:**

```typescript
PATCH /api/external-costs/${id}
Body: { unitPrice: 600, totalPrice: 4800 }
```

**Delete Cost:**

```typescript
DELETE /api/external-costs/${id}
```

## Auto-Calculation Logic

The system implements real-time auto-calculation:

```typescript
// In External Costs Manager
const calculatedTotal =
  amount && unitPrice
    ? (parseFloat(amount) * parseFloat(unitPrice)).toFixed(2)
    : "0.00";

// Auto-updates as user types in amount or unitPrice fields
```

## Database Schema

```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  tripId?: ObjectId (ref: Trip),
  costType: String,
  unit: String,
  unitPrice: Number,
  amount: Number,
  totalPrice: Number,
  description?: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## Testing the Implementation

1. **Start Backend:**

   ```bash
   cd Backend
   pnpm install
   pnpm start:dev
   ```

2. **Start Mobile App:**

   ```bash
   cd mobile
   npm install
   npx expo start
   ```

3. **Test Flow:**
   - Login as fisherman
   - Open drawer menu → External Costs
   - Add a cost (e.g., Crew Wages: 2 crew × 500 LKR/hour × 8 hours = 8000 LKR)
   - Go back to Trip Cost Prediction
   - Fill in trip details
   - Click "Predict Cost"
   - Verify external costs appear in breakdown
   - Click "Manage" to modify costs
   - Return and see updated costs

## Files Modified/Created

### Backend

- ✅ `Backend/src/schemas/external-cost.schema.ts` (created)
- ✅ `Backend/src/external-cost/dto/create-external-cost.dto.ts` (created)
- ✅ `Backend/src/external-cost/dto/update-external-cost.dto.ts` (created)
- ✅ `Backend/src/external-cost/external-cost.controller.ts` (created)
- ✅ `Backend/src/external-cost/external-cost.service.ts` (created)
- ✅ `Backend/src/external-cost/external-cost.module.ts` (created)
- ✅ `Backend/src/app.module.ts` (modified - added ExternalCostModule)

### Mobile

- ✅ `mobile/app/(root)/(fisherman)/external-costs.tsx` (created)
- ✅ `mobile/app/(root)/(fisherman)/_layout.tsx` (modified - added menu item)
- ✅ `mobile/app/(root)/(fisherman)/trip-cost-prediction.tsx` (modified - integration)
- ✅ `mobile/stores/authStore.tsx` (modified - added \_id to User)

### Documentation

- ✅ `documentation/EXTERNAL_COSTS_IMPLEMENTATION.md` (this file)

## Key Benefits

1. **Separation of Concerns**: External costs managed in dedicated screen
2. **Database Persistence**: All costs stored in MongoDB
3. **Auto-Calculation**: Real-time calculation of total prices
4. **Full CRUD**: Complete create, read, update, delete operations
5. **User-Friendly**: Intuitive UI with summary cards and empty states
6. **Integration**: Seamlessly integrates with trip cost prediction
7. **Flexible**: Supports various cost types, units, and descriptions
8. **Scalable**: Built with NestJS modules and proper architecture

## Future Enhancements

- [ ] Add cost categories (predefined types)
- [ ] Export costs to CSV/Excel
- [ ] Cost history and analytics
- [ ] Bulk cost operations
- [ ] Cost templates for common expenses
- [ ] Currency conversion support
- [ ] Attach receipts/photos to costs
- [ ] Share costs with crew members
