import { ImportType } from "@/models/ImportSession";
import { IMPORT_CONFIGS, FieldDefinition } from "./types";

export interface MappingSuggestion {
  erpField: FieldDefinition;
  matchedHeader: string | null;
  confidence: "EXACT" | "ALIAS" | "NONE";
}

export class ColumnMapper {
  /**
   * Suggests best match ERP fields for each Excel column header using exact names and aliases.
   */
  public static autoSuggestMapping(type: ImportType, headers: string[]): Record<string, string> {
    const config = IMPORT_CONFIGS[type];
    if (!config) return {};

    const mapping: Record<string, string> = {}; // ERP Field Key -> Excel Header
    const usedHeaders = new Set<string>();

    // 1. Exact match pass (Label or Key)
    for (const field of config.fields) {
      const cleanFieldLabel = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanFieldKey = field.key.toLowerCase().replace(/[^a-z0-9]/g, "");

      for (const header of headers) {
        if (usedHeaders.has(header)) continue;
        const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");

        if (cleanHeader === cleanFieldLabel || cleanHeader === cleanFieldKey) {
          mapping[field.key] = header;
          usedHeaders.add(header);
          break;
        }
      }
    }

    // 2. Alias match pass
    for (const field of config.fields) {
      if (mapping[field.key]) continue;

      for (const alias of field.aliases) {
        const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");

        for (const header of headers) {
          if (usedHeaders.has(header)) continue;
          const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");

          if (cleanHeader === cleanAlias || cleanHeader.includes(cleanAlias)) {
            mapping[field.key] = header;
            usedHeaders.add(header);
            break;
          }
        }
        if (mapping[field.key]) break;
      }
    }

    return mapping;
  }

  /**
   * Validates whether all mandatory fields for the given import category have been mapped.
   */
  public static validateRequiredMappings(
    type: ImportType,
    mapping: Record<string, string>
  ): { valid: boolean; missingRequiredFields: FieldDefinition[] } {
    const config = IMPORT_CONFIGS[type];
    if (!config) {
      return { valid: false, missingRequiredFields: [] };
    }

    const missing: FieldDefinition[] = [];
    for (const field of config.fields) {
      if (field.required) {
        const mappedHeader = mapping[field.key];
        if (!mappedHeader || !mappedHeader.trim()) {
          missing.push(field);
        }
      }
    }

    return {
      valid: missing.length === 0,
      missingRequiredFields: missing,
    };
  }

  /**
   * Transforms raw Excel row values into an ERP key-value object using the verified column mapping.
   */
  public static transformRow(
    rawValues: Record<string, any>,
    mapping: Record<string, string>
  ): Record<string, any> {
    const row: Record<string, any> = {};

    for (const [erpKey, excelHeader] of Object.entries(mapping)) {
      if (excelHeader && rawValues[excelHeader] !== undefined) {
        row[erpKey] = rawValues[excelHeader];
      } else {
        row[erpKey] = null;
      }
    }

    return row;
  }
}
