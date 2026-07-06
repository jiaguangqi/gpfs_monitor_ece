
/**
 * Parses GPFS -Y output into structured objects.
 * GPFS -Y format: command:tag:version:reserved:reserved:field1:field2:...
 */
export const parseGpfsOutput = <T extends Record<string, any>>(rawOutput: string): T[] => {
  if (!rawOutput) return [];
  const lines = rawOutput.trim().split('\n');
  if (lines.length < 2) return [];

  const results: T[] = [];
  const headersMap = new Map<string, string[]>();

  lines.forEach(line => {
    const parts = line.split(':');
    // Skip invalid parts or empty lines
    if (parts.length < 6) return;

    const command = parts[0];
    // tag 可能为空（如 mmgetstate::HEADER），也可能在第二列（mmhealth:Summary:HEADER）
    const tagValue = parts[1] || 'default';
    const isHeader = parts[1] === 'HEADER' || parts[2] === 'HEADER';
    const headerKey = `${command}:${tagValue}`;

    if (isHeader) {
      // Store header fields (skipping the first 6 metadata fields)
      headersMap.set(headerKey, parts.slice(6));
    } else {
      const fallbackKey = Array.from(headersMap.keys()).find((key) => key.startsWith(`${command}:`));
      const headers = headersMap.get(headerKey) || (fallbackKey ? headersMap.get(fallbackKey) : undefined);
      if (headers) {
        const dataValues = parts.slice(6);
        const obj: any = {};
        headers.forEach((header, index) => {
          if (header) {
            obj[header] = dataValues[index] || '';
          }
        });
        results.push(obj as T);
      }
    }
  });

  return results;
};

/**
 * Specifically parses mmgetstate -Y summary-like data or mixed outputs
 */
export const extractClusterSummary = (rawOutput: string): any[] => {
  return parseGpfsOutput(rawOutput);
};
