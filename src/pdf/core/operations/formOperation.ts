/**
 * PDF Form Handling & Flattening Operation for PDF-LoFi.
 * Supports standard AcroForms directly in-browser using pdf-lib.
 * Does not support proprietary XFA forms, and clearly reports when XFA is detected.
 */
import {
  PDFTextField,
  PDFCheckBox,
  PDFRadioGroup,
  PDFDropdown,
  PDFName,
  PDFDict,
} from 'pdf-lib';
import { loadPdfLibDoc, savePdfLibDoc } from '../../engines/pdfLibEngine';
import { OperationResult } from './rotateOperation';

export interface FormFieldInfo {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'option' | 'other';
  value: string | boolean;
  options?: string[];
  isReadOnly: boolean;
}

export interface FormInspectionResult {
  hasForm: boolean;
  isXfa: boolean;
  fields: FormFieldInfo[];
}

export async function inspectPdfForm(data: Uint8Array): Promise<FormInspectionResult> {
  const pdfDoc = await loadPdfLibDoc(data);

  try {
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    // Check for XFA presence in AcroForm catalog
    let isXfa = false;
    try {
      const acroFormDict = pdfDoc.catalog.lookupMaybe(
        PDFName.of('AcroForm'),
        PDFDict
      );
      if (acroFormDict && acroFormDict.has(PDFName.of('XFA'))) {
        isXfa = true;
      }
    } catch {
      // Ignore XFA check error
    }

    if (fields.length === 0) {
      return { hasForm: false, isXfa, fields: [] };
    }

    const fieldInfos: FormFieldInfo[] = [];

    for (const field of fields) {
      const name = field.getName();
      const isReadOnly = field.isReadOnly();

      if (field instanceof PDFTextField) {
        fieldInfos.push({
          name,
          type: 'text',
          value: field.getText() || '',
          isReadOnly,
        });
      } else if (field instanceof PDFCheckBox) {
        fieldInfos.push({
          name,
          type: 'checkbox',
          value: field.isChecked(),
          isReadOnly,
        });
      } else if (field instanceof PDFRadioGroup) {
        fieldInfos.push({
          name,
          type: 'radio',
          value: field.getSelected() || '',
          options: field.getOptions(),
          isReadOnly,
        });
      } else if (field instanceof PDFDropdown) {
        fieldInfos.push({
          name,
          type: 'dropdown',
          value: field.getSelected()[0] || '',
          options: field.getOptions(),
          isReadOnly,
        });
      } else {
        fieldInfos.push({
          name,
          type: 'other',
          value: '',
          isReadOnly,
        });
      }
    }

    return {
      hasForm: true,
      isXfa,
      fields: fieldInfos,
    };
  } catch {
    return {
      hasForm: false,
      isXfa: false,
      fields: [],
    };
  }
}

export async function executeFillForm(
  data: Uint8Array,
  fieldValues: Record<string, string | boolean>
): Promise<OperationResult> {
  const pdfDoc = await loadPdfLibDoc(data);
  const form = pdfDoc.getForm();

  for (const [name, val] of Object.entries(fieldValues)) {
    try {
      const field = form.getFieldMaybe(name);
      if (!field) continue;

      if (field instanceof PDFTextField && typeof val === 'string') {
        field.setText(val);
      } else if (field instanceof PDFCheckBox) {
        if (val === true) {
          field.check();
        } else {
          field.uncheck();
        }
      } else if (field instanceof PDFRadioGroup && typeof val === 'string') {
        field.select(val);
      } else if (field instanceof PDFDropdown && typeof val === 'string') {
        field.select(val);
      }
    } catch (e) {
      console.warn(`Could not set value for field "${name}":`, e);
    }
  }

  const savedBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: savedBytes,
    pageCount: pdfDoc.getPageCount(),
  };
}

export async function executeClearForm(data: Uint8Array): Promise<OperationResult> {
  const pdfDoc = await loadPdfLibDoc(data);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  for (const field of fields) {
    try {
      if (field instanceof PDFTextField) {
        field.setText('');
      } else if (field instanceof PDFCheckBox) {
        field.uncheck();
      }
    } catch {
      // Ignore
    }
  }

  const savedBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: savedBytes,
    pageCount: pdfDoc.getPageCount(),
  };
}

export async function executeFlattenForm(data: Uint8Array): Promise<OperationResult> {
  const pdfDoc = await loadPdfLibDoc(data);
  const form = pdfDoc.getForm();

  // Convert interactive form widgets to static vector graphics
  form.flatten();

  const savedBytes = await savePdfLibDoc(pdfDoc);
  return {
    data: savedBytes,
    pageCount: pdfDoc.getPageCount(),
  };
}
