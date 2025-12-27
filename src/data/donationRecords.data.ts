import type { Bindings } from '../bindings'
import type { DonationRecord, DonationRecordInput, DonationRecordUpdate } from './donationRecords'

export async function createDonationRecord(
  env: Bindings,
  id: string,
  input: DonationRecordInput
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO donation_records (id, name, mobile, pan_number, committed_amount)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      input.name || null,
      input.mobile || null,
      input.pan_number || null,
      input.committed_amount || null
    )
    .run()
}

export async function getAllDonationRecords(env: Bindings): Promise<DonationRecord[]> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM donation_records ORDER BY created_at DESC'
  ).all<DonationRecord>()
  return results
}

export async function getDonationRecordById(
  env: Bindings,
  id: string
): Promise<DonationRecord | null> {
  const record = await env.DB.prepare(
    'SELECT * FROM donation_records WHERE id = ? LIMIT 1'
  )
    .bind(id)
    .first<DonationRecord>()
  return record || null
}

export async function updateDonationRecord(
  env: Bindings,
  id: string,
  data: DonationRecordUpdate
): Promise<void> {
  await env.DB.prepare(
    `UPDATE donation_records
     SET name = ?, mobile = ?, pan_number = ?, committed_amount = ?, donated_amount = ?
     WHERE id = ?`
  )
    .bind(
      data.name ?? null,
      data.mobile ?? null,
      data.pan_number ?? null,
      data.committed_amount ?? null,
      data.donated_amount ?? null,
      id
    )
    .run()
}

export async function updateDonatedAmount(
  env: Bindings,
  id: string,
  amount: number | null
): Promise<void> {
  await env.DB.prepare(
    'UPDATE donation_records SET donated_amount = ? WHERE id = ?'
  )
    .bind(amount, id)
    .run()
}

export async function deleteDonationRecord(env: Bindings, id: string): Promise<void> {
  await env.DB.prepare('DELETE FROM donation_records WHERE id = ?').bind(id).run()
}

export async function bulkInsertDonationRecords(
  env: Bindings,
  records: Array<{ id: string } & DonationRecordInput & { donated_amount?: number | null }>
): Promise<number> {
  let insertedCount = 0
  for (const record of records) {
    await env.DB.prepare(
      `INSERT INTO donation_records (id, name, mobile, pan_number, committed_amount, donated_amount)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        record.id,
        record.name || null,
        record.mobile || null,
        record.pan_number || null,
        record.committed_amount || null,
        record.donated_amount || null
      )
      .run()
    insertedCount++
  }
  return insertedCount
}

export async function deleteAllDonationRecords(env: Bindings): Promise<void> {
  await env.DB.prepare('DELETE FROM donation_records').run()
}

export async function replaceAllDonationRecords(
  env: Bindings,
  records: Array<{ id: string } & DonationRecordInput & { donated_amount?: number | null }>
): Promise<number> {
  // Delete all existing records first
  await deleteAllDonationRecords(env)
  // Then bulk insert new records
  return await bulkInsertDonationRecords(env, records)
}
