# Implementation Plan: Donation Tracking Feature

## Overview
Add a donor information collection form on the public donation page, store donation records in a new database table, and provide admin functionality to view, edit, export (CSV), and import (CSV) donation data.

---

## Phase 1: Database Migration

### Step 1.1: Create Migration File
**File**: `migrations/0017_donation_records.sql`

**Table Schema**:
```sql
CREATE TABLE IF NOT EXISTS donation_records (
    id TEXT PRIMARY KEY,
    name TEXT,
    mobile TEXT,
    pan_number TEXT,
    committed_amount REAL,
    donated_amount REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_donation_records_created_at ON donation_records(created_at);
CREATE INDEX IF NOT EXISTS idx_donation_records_name ON donation_records(name);
```

**Key Design Decisions**:
- `id`: TEXT PRIMARY KEY (UUID format, generated client-side for consistency with other tables)
- All donor fields (name, mobile, pan_number, committed_amount) are nullable since they're optional
- `donated_amount`: Nullable, set by admin after bank verification
- Indexes on `created_at` for sorting and `name` for searching
- No foreign key dependencies on existing tables (isolated, safe migration)

### Step 1.2: Run Migration
```bash
npx wrangler d1 migrations apply DB
```

**Risk Mitigation**: This is an additive migration (new table only). No existing tables or data are affected.

---

## Phase 2: Data Layer

### Step 2.1: Create Type Definitions
**File**: `src/data/donationRecords.ts`

```typescript
export interface DonationRecord {
  id: string;
  name: string | null;
  mobile: string | null;
  pan_number: string | null;
  committed_amount: number | null;
  donated_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface DonationRecordInput {
  name?: string;
  mobile?: string;
  pan_number?: string;
  committed_amount?: number;
}
```

### Step 2.2: Create Data Access Functions
**File**: `src/data/donationRecords.data.ts`

Functions to implement:
1. `createDonationRecord(env, input)` - Insert new record
2. `getAllDonationRecords(env)` - Fetch all records for admin
3. `getDonationRecordById(env, id)` - Fetch single record
4. `updateDonationRecord(env, id, data)` - Update record (admin edit)
5. `updateDonatedAmount(env, id, amount)` - Quick update for donated amount
6. `deleteDonationRecord(env, id)` - Delete single record
7. `bulkInsertDonationRecords(env, records)` - For CSV import (append)
8. `replaceAllDonationRecords(env, records)` - For CSV import (replace)

---

## Phase 3: Public Donation Form

### Step 3.1: Create Form Component
**File**: `src/templates/public/pages/DonorInfoForm.tsx` (new component)

**Form Fields**:
- Privacy notice text (bilingual)
- Name (text input, optional)
- Mobile Number (tel input, optional)
- PAN Number (text input, optional, pattern validation)
- Committed Amount (number input, optional)
- Submit button

**Privacy Notice Text** (bilingual):
- EN: "Your information is strictly used for donation auditing purpose. We will never use and disclose your data for any other purposes."
- HI: "आपकी जानकारी केवल दान लेखापरीक्षा के उद्देश्य से उपयोग की जाती है। हम आपके डेटा का किसी अन्य उद्देश्य के लिए कभी उपयोग या प्रकटीकरण नहीं करेंगे।"

### Step 3.2: Update Donation Page
**File**: `src/templates/public/pages/DonatePage.tsx`

**Changes**:
- Import `DonorInfoForm` component
- Add form above or below the QR code section
- Pass language prop for bilingual support

### Step 3.3: Create API Endpoint for Form Submission
**File**: `src/routes/public/saveDonorInfo.ts` (new file)

**Endpoint**: `POST /donate/submit`

**Implementation**:
- Parse form data
- Validate with Zod schema (all fields optional but with format validation)
- Generate UUID for record
- Insert into database
- Return success/error response (JSON for HTMX or redirect)

### Step 3.4: Register Route
**File**: `src/routes/index.ts`

Add route: `POST /donate/submit` → `saveDonorInfo`

---

## Phase 4: Admin Dashboard - Donation Records View

### Step 4.1: Create Admin Panel Component
**File**: `src/templates/admin/dashboard/DonationRecordsPanel.tsx` (new file)

**Features**:
- Table displaying all donation records
- Columns: Name, Mobile, PAN, Committed Amount, Donated Amount, Created At, Actions
- Edit button per row (opens inline edit or modal)
- Inline editable "Donated Amount" field with save button
- Export CSV button
- Import CSV section with file upload and append/replace radio buttons

### Step 4.2: Update Dashboard Handler
**File**: `src/routes/admin/dashboard.tsx`

**Changes**:
- Add new case for panel: `donation-records`
- Create `handleDonationRecordsRequest()` function
- Fetch all donation records from database
- Render `DonationRecordsPanel` component

### Step 4.3: Add Dashboard Navigation
**Files**:
- `src/templates/admin/dashboard/Dashboard.tsx`
- `src/config/navigation.ts` (if sidebar config exists)

Add "Donation Records" link to admin sidebar/navigation.

---

## Phase 5: Admin Edit Functionality

### Step 5.1: Create Save Endpoint for Single Record Edit
**File**: `src/routes/admin/saveDonationRecord.ts` (new file)

**Endpoint**: `POST /admin/dashboard/donation-records/save`

**Implementation**:
- Require auth + admin role
- CSRF validation
- Parse form data (id, name, mobile, pan_number, committed_amount, donated_amount)
- Validate with Zod
- Update database record
- Return success response / redirect

### Step 5.2: Create Quick Update Endpoint for Donated Amount
**File**: `src/routes/admin/updateDonatedAmount.ts` (new file)

**Endpoint**: `POST /admin/dashboard/donation-records/:id/donated-amount`

**Implementation**:
- Require auth + admin role
- CSRF validation
- Parse donated_amount from body
- Update only the donated_amount field
- Return success response (HTMX-friendly)

### Step 5.3: Register Admin Routes
**File**: `src/routes/index.ts`

Add routes:
- `POST /admin/dashboard/donation-records/save`
- `POST /admin/dashboard/donation-records/:id/donated-amount`

---

## Phase 6: CSV Export

### Step 6.1: Create Export Endpoint
**File**: `src/routes/admin/exportDonationRecords.ts` (new file)

**Endpoint**: `GET /admin/dashboard/donation-records/export`

**Implementation**:
- Require auth + admin role
- Fetch all donation records
- Generate CSV string with headers: `id,name,mobile,pan_number,committed_amount,donated_amount,created_at,updated_at`
- Properly escape CSV fields (handle commas, quotes, newlines)
- Return response with:
  - Content-Type: `text/csv`
  - Content-Disposition: `attachment; filename="donation_records_YYYY-MM-DD.csv"`

### Step 6.2: Create CSV Utility
**File**: `src/utils/csv.ts` (new file)

Functions:
- `escapeCSVField(value)` - Escape special characters
- `recordToCSVRow(record, columns)` - Convert record to CSV row
- `recordsToCSV(records, columns)` - Convert array to full CSV string
- `parseCSV(csvString, columns)` - Parse CSV string to records array

---

## Phase 7: CSV Import

### Step 7.1: Create Import Endpoint
**File**: `src/routes/admin/importDonationRecords.ts` (new file)

**Endpoint**: `POST /admin/dashboard/donation-records/import`

**Request**:
- Content-Type: `multipart/form-data`
- Fields:
  - `file`: CSV file
  - `mode`: "append" | "replace"
  - `csrf_token`: CSRF token

**Implementation**:
- Require auth + admin role
- CSRF validation
- Parse uploaded CSV file
- Validate CSV structure (required columns)
- Validate each row (format validation)
- If mode is "replace":
  - Begin transaction
  - Delete all existing records
  - Insert all new records
  - Commit transaction
- If mode is "append":
  - Generate new UUIDs for each record
  - Bulk insert records
- Return success/error response with count of imported records

### Step 7.2: Add File Upload to Panel
**File**: `src/templates/admin/dashboard/DonationRecordsPanel.tsx`

**Upload Form**:
```html
<form action="/admin/dashboard/donation-records/import" method="POST" enctype="multipart/form-data">
  <input type="hidden" name="csrf_token" value="..." />
  <input type="file" name="file" accept=".csv" required />
  <fieldset>
    <legend>Import Mode</legend>
    <label><input type="radio" name="mode" value="append" checked /> Append to existing data</label>
    <label><input type="radio" name="mode" value="replace" /> Replace all existing data</label>
  </fieldset>
  <button type="submit">Import CSV</button>
</form>
```

---

## Phase 8: Route Registration & Integration

### Step 8.1: Create Route Aggregator
**File**: `src/routes/admin/donationRecords.ts` (new file)

Aggregate all donation record routes:
- GET `/admin/dashboard/donation-records` → Panel view
- POST `/admin/dashboard/donation-records/save` → Save single record
- POST `/admin/dashboard/donation-records/:id/donated-amount` → Quick update
- GET `/admin/dashboard/donation-records/export` → CSV export
- POST `/admin/dashboard/donation-records/import` → CSV import

### Step 8.2: Update Main Routes
**File**: `src/routes/index.ts`

Import and mount donation records routes under admin aggregate.

---

## Phase 9: Testing & Validation

### Step 9.1: Validation Schemas
**File**: `src/utils/validation/donationRecord.ts` (new file)

```typescript
// Public form submission
export const donorInfoSchema = z.object({
  name: z.string().max(255).optional(),
  mobile: z.string().regex(/^[0-9]{10}$/).optional().or(z.literal('')),
  pan_number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional().or(z.literal('')),
  committed_amount: z.coerce.number().positive().optional(),
});

// Admin edit
export const donationRecordSchema = donorInfoSchema.extend({
  id: z.string().uuid(),
  donated_amount: z.coerce.number().min(0).optional(),
});
```

### Step 9.2: Error Handling
- Form validation errors displayed inline
- Database errors logged and generic message shown
- CSV parse errors return row numbers with issues

---

## File Creation Summary

### New Files to Create:
| # | File Path | Purpose |
|---|-----------|---------|
| 1 | `migrations/0017_donation_records.sql` | Database table |
| 2 | `src/data/donationRecords.ts` | Type definitions |
| 3 | `src/data/donationRecords.data.ts` | Data access layer |
| 4 | `src/templates/public/pages/DonorInfoForm.tsx` | Public form component |
| 5 | `src/routes/public/saveDonorInfo.ts` | Public form handler |
| 6 | `src/templates/admin/dashboard/DonationRecordsPanel.tsx` | Admin panel |
| 7 | `src/routes/admin/donationRecords.ts` | Admin routes aggregate |
| 8 | `src/utils/csv.ts` | CSV utilities |
| 9 | `src/utils/validation/donationRecord.ts` | Zod schemas |

### Files to Modify:
| # | File Path | Changes |
|---|-----------|---------|
| 1 | `src/templates/public/pages/DonatePage.tsx` | Add DonorInfoForm |
| 2 | `src/routes/admin/dashboard.tsx` | Add donation-records panel handler |
| 3 | `src/templates/admin/dashboard/Dashboard.tsx` | Add nav link |
| 4 | `src/routes/index.ts` | Register new routes |

---

## Implementation Order (Recommended)

1. **Phase 1**: Database migration (isolated, no risk)
2. **Phase 2**: Data layer (foundation for all features)
3. **Phase 3**: Public form (donor-facing feature)
4. **Phase 4**: Admin panel view (read-only first)
5. **Phase 5**: Admin edit functionality
6. **Phase 6**: CSV export
7. **Phase 7**: CSV import
8. **Phase 8**: Route integration (final wiring)
9. **Phase 9**: Testing

---

## Risk Mitigation Checklist

- [ ] Migration is additive only (new table, no alterations to existing tables)
- [ ] All new routes use existing auth middleware (`requireAuth`, `requireAdmin`)
- [ ] CSRF protection on all POST endpoints
- [ ] Input validation with Zod on all user inputs
- [ ] CSV import uses transactions for replace mode
- [ ] PAN number stored securely (consider if encryption needed for PII)
- [ ] Rate limiting on public form submission to prevent spam
- [ ] Mobile/PAN format validation but fields remain optional
- [ ] Error handling doesn't expose internal details

---

## Security Considerations

1. **PAN Number**: This is sensitive PII (Permanent Account Number). Consider:
   - Masking in admin UI (show only last 4 characters)
   - Export should require additional confirmation
   - Audit log for who accessed/exported data (future enhancement)

2. **Mobile Number**: Moderate sensitivity
   - Validate format but don't over-restrict
   - Consider masking middle digits in admin view

3. **Public Form**:
   - Add rate limiting to prevent spam submissions
   - Consider adding simple honeypot field or reCAPTCHA (future)

4. **CSV Import**:
   - Validate file size limit (e.g., max 5MB)
   - Sanitize all imported data
   - Log import operations with admin user ID

---

## UI/UX Notes

1. **Public Form**:
   - Clean, minimal design matching existing donation page
   - Clear privacy notice above form fields
   - Success message after submission (thank you for your commitment)
   - Form should not interfere with QR code visibility

2. **Admin Panel**:
   - Sortable table columns (at minimum, created_at)
   - Pagination if records exceed threshold (50+)
   - Search/filter by name (future enhancement)
   - Clear visual distinction between committed vs. donated amounts
   - Highlight rows where donated_amount is null (pending verification)

---

## Future Enhancements (Out of Scope)

1. Email notifications to admin for new donations
2. Receipt generation for donors
3. Dashboard analytics (total committed, total received, pending)
4. Data encryption at rest for PII
5. Audit logging for data access
6. Export filters (date range, amount range)
