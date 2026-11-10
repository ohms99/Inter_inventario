import assert from 'node:assert/strict';
import test from 'node:test';
import { rowsToCsv } from './csv.js';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

test('beer export keeps locale dates and the counted units in their columns', () => {
  const started = new Date('2026-11-10T17:02:51.000Z');
  const ended = new Date('2026-11-10T18:15:00.000Z');
  const csv = rowsToCsv([
    ['Inventory Start', 'Inventory End', 'Beer Name', 'Category', 'Count'],
    [started.toLocaleString('es-MX'), ended.toLocaleString('es-MX'), 'Miller High Life', 'Media', 24],
  ]);

  const [header, row] = parseCsv(csv);
  assert.deepEqual(header, ['Inventory Start', 'Inventory End', 'Beer Name', 'Category', 'Count']);
  assert.equal(row.length, 5);
  assert.equal(row[0], started.toLocaleString('es-MX'));
  assert.equal(row[1], ended.toLocaleString('es-MX'));
  assert.equal(row[2], 'Miller High Life');
  assert.equal(row[3], 'Media');
  assert.equal(row[4], '24');
  assert.match(row[0], /,/);
});

test('liquor export keeps a comma inside the bottle name', () => {
  const csv = rowsToCsv([
    ['Fecha Inicio', 'Fecha Fin', 'Tipo', 'Nombre', 'Volumen', '% Restante', 'Oz Restante', 'Bebidas'],
    ['2026-11-10T17:02:51.000Z', '2026-11-10T18:15:00.000Z', 'tequila', 'Don Julio, 70', 750, '50.0', '12.68', 8],
  ]);

  const [, row] = parseCsv(csv);
  assert.equal(row.length, 8);
  assert.equal(row[3], 'Don Julio, 70');
  assert.equal(row[4], '750');
  assert.equal(row[7], '8');
});

test('quotes and line breaks inside a field stay inside that field', () => {
  const csv = rowsToCsv([
    ['Nombre', 'Notas'],
    ['Miller "High" Life', 'line 1\nline 2'],
  ]);

  const [, row] = parseCsv(csv);
  assert.deepEqual(row, ['Miller "High" Life', 'line 1\nline 2']);
});
