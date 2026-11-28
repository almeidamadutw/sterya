export type OperationalReport = {
  title: string;
  scope: string;
  count: string;
  headers: string[];
  widths: string[];
  rows: string[][];
};

type Page<T> = { data: T[] | null; count: number | null; error: unknown };

export async function readReportRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<Page<T>>,
  batchSize = 100,
): Promise<T[]> {
  const rows: T[] = [];
  let total: number | null = null;
  do {
    const page = await fetchPage(rows.length, rows.length + batchSize - 1);
    if (page.error || !page.data || page.count == null || (total !== null && page.count !== total)) {
      throw new Error('A lista mudou ou não pôde ser carregada.');
    }
    total = page.count;
    if (!page.data.length && rows.length < total) throw new Error('Consulta incompleta.');
    rows.push(...page.data);
  } while (rows.length < total);
  return rows;
}
