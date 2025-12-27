/**
 * CSV utility functions for import/export operations
 */

/**
 * Escape a value for CSV format
 * - Wraps in quotes if contains comma, quote, or newline
 * - Doubles any quotes within the value
 */
export function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  const str = String(value)

  // Check if the field needs quoting
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // Escape quotes by doubling them and wrap in quotes
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

/**
 * Convert a record to a CSV row
 */
export function recordToCSVRow<T extends Record<string, unknown>>(
  record: T,
  columns: readonly (keyof T)[]
): string {
  return columns.map((col) => escapeCSVField(record[col])).join(',')
}

/**
 * Convert an array of records to a full CSV string
 */
export function recordsToCSV<T extends Record<string, unknown>>(
  records: T[],
  columns: readonly (keyof T)[]
): string {
  // Header row
  const header = columns.map((col) => escapeCSVField(String(col))).join(',')

  // Data rows
  const rows = records.map((record) => recordToCSVRow(record, columns))

  return [header, ...rows].join('\n')
}

/**
 * Parse a CSV line respecting quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote (double quote)
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i += 2
          continue
        }
        // End of quoted field
        inQuotes = false
        i++
        continue
      }
      current += char
      i++
    } else {
      if (char === '"') {
        inQuotes = true
        i++
        continue
      }
      if (char === ',') {
        result.push(current.trim())
        current = ''
        i++
        continue
      }
      current += char
      i++
    }
  }

  // Push the last field
  result.push(current.trim())

  return result
}

/**
 * Parse a CSV string into an array of records
 * Assumes the first row is headers
 */
export function parseCSV<T extends string>(
  csvString: string,
  expectedColumns: readonly T[]
): Record<T, string>[] {
  const lines = csvString.split(/\r?\n/).filter((line) => line.trim())

  if (lines.length < 2) {
    return []
  }

  // Parse header row
  const headers = parseCSVLine(lines[0])

  // Create a mapping from header index to expected column name
  const columnMap = new Map<number, T>()

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase().trim()
    for (const col of expectedColumns) {
      if (header === col.toLowerCase()) {
        columnMap.set(i, col)
        break
      }
    }
  }

  // Parse data rows
  const records: Record<T, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    const values = parseCSVLine(line)
    const record = {} as Record<T, string>

    // Initialize all expected columns
    for (const col of expectedColumns) {
      record[col] = ''
    }

    // Fill in values from the CSV
    for (const [index, colName] of columnMap) {
      if (index < values.length) {
        record[colName] = values[index]
      }
    }

    records.push(record)
  }

  return records
}
