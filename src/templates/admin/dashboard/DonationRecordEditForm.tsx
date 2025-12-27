/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import type { DonationRecord } from '../../../data/donationRecords'

type DonationRecordEditFormProps = {
  record: DonationRecord
  csrfToken: string
  error?: string
}

const DonationRecordEditForm: FC<DonationRecordEditFormProps> = ({
  record,
  csrfToken,
  error
}) => {
  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Donation Record</h2>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Update the donation record details.
          </p>
        </div>
        <a
          href="/admin/dashboard/donation-records"
          class="rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          Back to List
        </a>
      </div>

      {/* Error Message */}
      {error && (
        <div class="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
          <p class="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Edit Form */}
      <form
        action="/admin/dashboard/donation-records/save"
        method="POST"
        class="space-y-6 max-w-2xl"
      >
        <input type="hidden" name="csrf_token" value={csrfToken} />
        <input type="hidden" name="id" value={record.id} />

        {/* Name */}
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={record.name || ''}
            maxlength={255}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Mobile */}
        <div>
          <label for="mobile" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Mobile Number
          </label>
          <input
            type="tel"
            id="mobile"
            name="mobile"
            value={record.mobile || ''}
            pattern="[0-9]{10}"
            maxlength={10}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">10-digit mobile number</p>
        </div>

        {/* PAN Number */}
        <div>
          <label for="pan_number" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            PAN Number
          </label>
          <input
            type="text"
            id="pan_number"
            name="pan_number"
            value={record.pan_number || ''}
            pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
            maxlength={10}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm uppercase dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Format: ABCDE1234F</p>
        </div>

        {/* Committed Amount */}
        <div>
          <label for="committed_amount" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Committed Amount (INR)
          </label>
          <input
            type="number"
            id="committed_amount"
            name="committed_amount"
            value={record.committed_amount ?? ''}
            min={0}
            step="0.01"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Donated Amount */}
        <div>
          <label for="donated_amount" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Donated Amount (INR)
          </label>
          <input
            type="number"
            id="donated_amount"
            name="donated_amount"
            value={record.donated_amount ?? ''}
            min={0}
            step="0.01"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Actual amount donated (verified from bank records)
          </p>
        </div>

        {/* Metadata */}
        <div class="border-t border-gray-200 pt-4 dark:border-gray-700">
          <dl class="text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <div>
              <dt class="inline font-medium">Created:</dt>
              <dd class="inline ml-1">{record.created_at}</dd>
            </div>
            <div>
              <dt class="inline font-medium">Updated:</dt>
              <dd class="inline ml-1">{record.updated_at}</dd>
            </div>
          </dl>
        </div>

        {/* Submit */}
        <div class="flex gap-4">
          <button
            type="submit"
            class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Save Changes
          </button>
          <a
            href="/admin/dashboard/donation-records"
            class="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-600"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}

export default DonationRecordEditForm
