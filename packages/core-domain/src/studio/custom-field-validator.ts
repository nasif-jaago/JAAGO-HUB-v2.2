export interface CustomFieldDefinition {
  fieldKey: string;
  label: string;
  fieldType: 'text' | 'number' | 'boolean' | 'select' | 'date';
  optionsJson?: string[] | undefined;
  isRequired: boolean;
}

export class CustomFieldValidator {
  /**
   * Validates custom field values against dynamic field definitions
   */
  public static validate(
    definitions: CustomFieldDefinition[],
    values: Record<string, unknown>,
  ): { valid: boolean; errors: Array<{ fieldKey: string; error: string }> } {
    const errors: Array<{ fieldKey: string; error: string }> = [];

    for (const def of definitions) {
      const val = values[def.fieldKey];

      // Required check
      if (def.isRequired && (val === undefined || val === null || val === '')) {
        errors.push({ fieldKey: def.fieldKey, error: `${def.label} is required` });
        continue;
      }

      if (val === undefined || val === null || val === '') {
        continue;
      }

      // Type checks
      if (def.fieldType === 'number' && typeof val !== 'number' && isNaN(Number(val))) {
        errors.push({ fieldKey: def.fieldKey, error: `${def.label} must be a valid number` });
      } else if (def.fieldType === 'boolean' && typeof val !== 'boolean') {
        errors.push({ fieldKey: def.fieldKey, error: `${def.label} must be a boolean` });
      } else if (def.fieldType === 'select' && def.optionsJson && !def.optionsJson.includes(String(val))) {
        errors.push({
          fieldKey: def.fieldKey,
          error: `${def.label} must be one of: ${def.optionsJson.join(', ')}`,
        });
      } else if (def.fieldType === 'date' && isNaN(Date.parse(String(val)))) {
        errors.push({ fieldKey: def.fieldKey, error: `${def.label} must be a valid date string` });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
