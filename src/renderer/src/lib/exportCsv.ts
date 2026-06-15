export async function exportRowsToCsv(
  fileName: string,
  columns: string[],
  rows: unknown[][]
): Promise<void> {
  await window.api.exportCsv({
    defaultFileName: fileName.endsWith('.csv') ? fileName : `${fileName}.csv`,
    columns,
    rows
  })
}
