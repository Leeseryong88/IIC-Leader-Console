import { SheetRow } from '../types';

// 사용자가 제공한 URL로 Google Sheets CSV 링크를 업데이트했습니다.
const PUBLISHED_GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRiGkMTvzk4pVRUqbgDynK4YnAfsmckpQFbq7VWdWhQ-SDNXDmLpQ8ePyKgLEyl7nNNHi_-Wbt1AdYp/pub?gid=1432477272&single=true&output=csv';

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


export const fetchSheetData = async (): Promise<SheetRow[]> => {
  try {
    // Cache-busting: Add a unique query parameter to prevent network caching issues.
    const url = new URL(PUBLISHED_GOOGLE_SHEET_CSV_URL);
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
    throw error;
  }
};