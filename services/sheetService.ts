import { SheetRow } from '../types';

/**
 * A more robust CSV parser that handles multiline fields by first reconstructing logical rows.
 * This prevents an unclosed quote in one row from corrupting the rest of the file,
 * which was causing data loading to stop prematurely.
 * @param csvText The raw CSV string.
 * @returns An array of objects representing the rows.
 */
const parseCSV = (csvText: string): SheetRow[] => {
  // 1. Sanitize input text
  const text = csvText.trim().replace(/^\uFEFF/, '');
  if (!text) {
    return [];
  }

  // 2. Reconstruct logical rows by joining lines that are part of a multiline field.
  const logicalRows: string[] = [];
  let rowBuffer = '';
  // The regex splits by newlines (\n or \r\n or \r)
  const lines = text.split(/\r\n|\n|\r/); 

  for (const line of lines) {
    rowBuffer += line;
    // Check for an odd number of non-escaped quotes. If odd, it's a multiline field.
    const quoteCount = (rowBuffer.replace(/""/g, '').match(/"/g) || []).length;
    if (quoteCount % 2 === 0) {
      logicalRows.push(rowBuffer);
      rowBuffer = '';
    } else {
      // It's a multiline field, add a newline to be preserved and continue.
      rowBuffer += '\n';
    }
  }
  // Add any remaining buffer content as the last row
  if (rowBuffer) {
    logicalRows.push(rowBuffer);
  }

  if (logicalRows.length < 2) {
    return []; // Not enough rows for a header and data.
  }

  // 3. Parse fields for each logical row.
  const allRows: string[][] = logicalRows
    .filter(rowStr => rowStr.trim() !== '') // Filter out empty lines
    .map(rowStr => {
      const fields = [];
      let currentField = '';
      let inQuotes = false;
      for (let i = 0; i < rowStr.length; i++) {
        const char = rowStr[i];
        if (char === '"') {
          if (inQuotes && rowStr[i + 1] === '"') { // Escaped quote
            currentField += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          fields.push(currentField);
          currentField = '';
        } else {
          currentField += char;
        }
      }
      fields.push(currentField); // Add the last field
      return fields;
    });

  // 4. Convert array of arrays into array of objects.
  const headers = allRows[0].map(h => h.trim().replace(/^"|"$/g, ''));
  const dataRows: SheetRow[] = [];

  for (let i = 1; i < allRows.length; i++) {
    const values = allRows[i];
    if (values.length === 1 && values[0].trim() === '') continue;

    const rowObject = headers.reduce((acc, header, index) => {
      const value = values[index] || '';
      const cleanedValue = value.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
      acc[header] = cleanedValue;
      return acc;
    }, {} as { [key: string]: string });
    dataRows.push(rowObject as unknown as SheetRow);
  }

  return dataRows;
};


export const fetchSheetData = async (csvUrl: string): Promise<SheetRow[]> => {
  try {
    // Cache-busting: Add a unique query parameter to prevent network caching issues.
    const url = new URL(csvUrl);
    url.searchParams.append('_', new Date().getTime().toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch published sheet data: ${response.status} ${response.statusText}`);
    }
    const csvText = await response.text();

    if (csvText.trim().startsWith('<!DOCTYPE html') || csvText.trim().startsWith('<html')) {
        throw new Error('Failed to parse CSV data. The fetched content appears to be an HTML page, not a CSV file. Please ensure the Google Sheet is correctly "Published to the web" as a CSV.');
    }

    const data = parseCSV(csvText);

    if (data.length === 0 && csvText.trim().length > 0) {
        throw new Error('Failed to parse CSV data. The file was fetched but could not be parsed into rows. Check CSV format and column consistency.');
    }
    return data;
  } catch (error) {
    console.error("Error fetching or parsing sheet data:", error);
    // Re-throw with user-friendly message
    throw new Error('시트를 불러오는 데 실패했습니다. URL이 CSV 공개 링크인지 확인하세요.');
  }
};

// 헤더만 빠르게 가져오는 유틸 (디자이너에서 사용)
export const fetchSheetHeaders = async (csvUrl: string): Promise<string[]> => {
  // 내부 parse 로직을 재사용하지 않고 첫 행만 안전하게 파싱
  const url = new URL(csvUrl);
  url.searchParams.append('_', new Date().getTime().toString());
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('헤더를 불러오지 못했습니다.');
  const text = (await res.text()).trim().replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r\n|\n|\r/)[0] || '';
  const headers: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < firstLine.length; i++) {
    const ch = firstLine[i];
    if (ch === '"') {
      if (inQ && firstLine[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (ch === ',' && !inQ) { headers.push(cur.trim().replace(/^"|"$/g, '')); cur = ''; }
    else { cur += ch; }
  }
  headers.push(cur.trim().replace(/^"|"$/g, ''));
  return headers.filter(Boolean);
};