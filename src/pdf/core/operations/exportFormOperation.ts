/**
 * AcroForm Data Export Operation for PDF-LoFi.
 * Extracts interactive PDF form fields into structured JSON and standard RFC-4180 CSV formats.
 *
 * Supported Field Types:
 * - Text fields (strings, multiline, numbers)
 * - Checkboxes (boolean true / false)
 * - Radio button groups (selected option string)
 * - Dropdown selection lists (selected option and available choices)
 *
 * Truth Boundary:
 * Bounded strictly to standard ISO 32000 AcroForm structures.
 * Proprietary Adobe XFA forms are detected and reported, but dynamic XML dataset extraction
 * is not claimed.
 */
import { inspectPdfForm, FormFieldInfo } from './formOperation';

export interface AcroFormExportResult {
  hasForm: boolean;
  isXfa: boolean;
  fieldCount: number;
  fields: FormFieldInfo[];
  exportedAt: string;
}

/**
 * Extracts all form field information from the provided PDF document.
 */
export async function exportAcroFormData(
  data: Uint8Array
): Promise<AcroFormExportResult> {
  const inspection = await inspectPdfForm(data);

  return {
    hasForm: inspection.hasForm,
    isXfa: inspection.isXfa,
    fieldCount: inspection.fields.length,
    fields: inspection.fields,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Exports AcroForm field data as a formatted JSON string.
 */
export async function exportAcroFormDataToJson(
  data: Uint8Array,
  pretty = true
): Promise<string> {
  const result = await exportAcroFormData(data);
  return JSON.stringify(result, null, pretty ? 2 : undefined);
}

/**
 * Escapes a string value according to RFC-4180 CSV formatting rules.
 */
function escapeCsvValue(val: string): string {
  if (
    val.includes('"') ||
    val.includes(',') ||
    val.includes('\n') ||
    val.includes('\r')
  ) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return `"${val}"`;
}

/**
 * Exports AcroForm field data as an RFC-4180 compliant CSV string.
 * Columns: "Field Name","Field Type","Value","Is Read Only","Options"
 */
export async function exportAcroFormDataToCsv(
  data: Uint8Array
): Promise<string> {
  const result = await exportAcroFormData(data);

  const header = ['Field Name', 'Field Type', 'Value', 'Is Read Only', 'Options']
    .map(escapeCsvValue)
    .join(',');

  const rows = result.fields.map((field) => {
    const name = field.name;
    const type = field.type;
    const val = typeof field.value === 'boolean' ? (field.value ? 'true' : 'false') : String(field.value ?? '');
    const isReadOnly = field.isReadOnly ? 'true' : 'false';
    const options = (field.options || []).join('; ');

    return [
      escapeCsvValue(name),
      escapeCsvValue(type),
      escapeCsvValue(val),
      escapeCsvValue(isReadOnly),
      escapeCsvValue(options),
    ].join(',');
  });

  return [header, ...rows].join('\r\n');
}
