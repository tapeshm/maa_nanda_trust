/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import type { DonationRecord } from '../../../data/donationRecords'

type DonationRecordsPanelProps = {
  records: DonationRecord[]
  csrfToken: string
  success?: string
  error?: string
}

const formatAmount = (amount: number | null): string => {
  if (amount === null || amount === undefined) return '-'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}

const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

const maskPan = (pan: string | null): string => {
  if (!pan) return '-'
  if (pan.length !== 10) return pan
  return `XXXXXX${pan.slice(6)}`
}

const DonationRecordsPanel: FC<DonationRecordsPanelProps> = ({
  records,
  csrfToken,
  success,
  error
}) => {
  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Donation Records</h2>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Manage donor information and track donations. Total records: {records.length}
          </p>
        </div>
        <div class="flex gap-2">
          <a
            href="/admin/dashboard/donation-records/export"
            class="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-500"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div class="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
          <p class="text-sm text-green-700 dark:text-green-400">{success}</p>
        </div>
      )}
      {error && (
        <div class="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
          <p class="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* CSV Import Section */}
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Import Donation Records</h3>
        <form
          action="/admin/dashboard/donation-records/import"
          method="POST"
          enctype="multipart/form-data"
          class="flex flex-wrap items-end gap-4"
        >
          <input type="hidden" name="csrf_token" value={csrfToken} />

          <div>
            <label for="csv_file" class="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              CSV File
            </label>
            <input
              type="file"
              id="csv_file"
              name="file"
              accept=".csv"
              required
              class="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900 dark:file:text-indigo-300"
            />
          </div>

          <div class="flex gap-4">
            <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="radio" name="mode" value="append" checked class="text-indigo-600" />
              Append to existing
            </label>
            <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="radio" name="mode" value="replace" class="text-indigo-600" />
              Replace all data
            </label>
          </div>

          <button
            type="submit"
            class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
          >
            Import CSV
          </button>
        </form>
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          CSV format: name, mobile, pan_number, committed_amount, donated_amount
        </p>
      </div>

      {/* Records Table */}
      <div class="flow-root">
        <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">
                      Name
                    </th>
                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Mobile
                    </th>
                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      PAN
                    </th>
                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Committed
                    </th>
                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Donated
                    </th>
                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Date
                    </th>
                    <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span class="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={7} class="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                        No donation records found.
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.id} class={record.donated_amount === null ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}>
                        <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                          {record.name || '-'}
                        </td>
                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                          {record.mobile || '-'}
                        </td>
                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                          {maskPan(record.pan_number)}
                        </td>
                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                          {formatAmount(record.committed_amount)}
                        </td>
                        <td class="whitespace-nowrap px-3 py-4 text-sm">
                          {record.donated_amount !== null ? (
                            <span class="text-green-600 dark:text-green-400 font-medium">
                              {formatAmount(record.donated_amount)}
                            </span>
                          ) : (
                            <span class="text-yellow-600 dark:text-yellow-400 italic">Pending</span>
                          )}
                        </td>
                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                          {formatDate(record.created_at)}
                        </td>
                        <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <a
                            href={`/admin/dashboard/donation-records/edit/${record.id}`}
                            class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            Edit
                          </a>
                          <button
                            type="button"
                            command="show-modal"
                            commandfor={`delete-dialog-${record.id}`}
                            class="ml-4 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Delete
                          </button>

                          {/* Delete Modal */}
                          <el-dialog>
                            <dialog
                              id={`delete-dialog-${record.id}`}
                              aria-labelledby={`delete-title-${record.id}`}
                              class="fixed inset-0 size-auto max-h-none max-w-none overflow-y-auto bg-transparent backdrop:bg-transparent"
                            >
                              <el-dialog-backdrop class="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in dark:bg-gray-900/50"></el-dialog-backdrop>

                              <div tabIndex={0} class="flex min-h-full items-end justify-center p-4 text-center focus:outline-none sm:items-center sm:p-0">
                                <el-dialog-panel class="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-800 dark:outline dark:-outline-offset-1 dark:outline-white/10">
                                  <div>
                                    <div class="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
                                      <svg class="size-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                      </svg>
                                    </div>
                                    <div class="mt-3 text-center sm:mt-5">
                                      <h3 id={`delete-title-${record.id}`} class="text-base font-semibold text-gray-900 dark:text-white">
                                        Delete Donation Record
                                      </h3>
                                      <div class="mt-2">
                                        <p class="text-sm text-gray-500 dark:text-gray-400">
                                          Are you sure you want to delete this donation record? This action cannot be undone.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div class="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                    <form method="post" action="/admin/dashboard/donation-records/delete" class="contents">
                                      <input type="hidden" name="csrf_token" value={csrfToken} />
                                      <input type="hidden" name="id" value={record.id} />
                                      <button
                                        type="submit"
                                        class="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 sm:col-start-2 dark:bg-red-500 dark:hover:bg-red-400"
                                      >
                                        Delete
                                      </button>
                                    </form>
                                    <button
                                      type="button"
                                      command="close"
                                      commandfor={`delete-dialog-${record.id}`}
                                      class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring-1 inset-ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0 dark:bg-white/10 dark:text-white dark:inset-ring-white/5 dark:hover:bg-white/20"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </el-dialog-panel>
                              </div>
                            </dialog>
                          </el-dialog>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DonationRecordsPanel
