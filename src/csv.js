// Spreadsheet apps split on every comma. Dates from toLocaleString and
// bottle names such as "Don Julio, 70" have to stay in one column.
export function rowsToCsv(rows) {
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\n');
}

function escapeCsvField(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
