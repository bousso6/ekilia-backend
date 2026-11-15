import { stringify } from 'csv-stringify/sync';

const UTF8_BOM = '\uFEFF';

export function formatCsvDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

/**
 * Génère une chaîne CSV encodée en UTF-8 avec BOM (\uFEFF) pour Excel.
 * @param {Array<Record<string, unknown>>} rows
 * @param {Array<{ key: string, header: string }>} columns
 * @returns {string}
 */
export function toCsvBufferString(rows, columns) {
  const csvBody = stringify(rows, {
    header: true,
    columns,
    delimiter: ';',
    cast: {
      date: (value) => formatCsvDate(value),
      boolean: (value) => (value ? 'oui' : 'non'),
    },
  });

  return `${UTF8_BOM}${csvBody}`;
}

export function sendCsvResponse(res, filename, rows, columns) {
  const csv = toCsvBufferString(rows, columns);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(csv);
}
