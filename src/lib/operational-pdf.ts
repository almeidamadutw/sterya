import PdfPrinter from 'pdfmake';
import embeddedFonts from 'pdfmake/build/vfs_fonts.js';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type { OperationalReport } from './operational-report';

const fonts = embeddedFonts as unknown as Record<string, string>;
const printer = new PdfPrinter({ Roboto: {
  normal: Buffer.from(fonts['Roboto-Regular.ttf'], 'base64'),
  bold: Buffer.from(fonts['Roboto-Medium.ttf'], 'base64'),
} });

export async function operationalPdf(report: OperationalReport, now = new Date()): Promise<Uint8Array<ArrayBuffer>> {
  const timestamp = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(now);
  const definition: TDocumentDefinitions = {
    pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [32, 30, 32, 35],
    info: { title: report.title, author: 'CEO Club CPE' },
    defaultStyle: { font: 'Roboto', fontSize: 9, color: '#202a3c' },
    footer: (page, total) => ({ columns: ['CEO Club CPE · ' + report.title, { text: page + ' / ' + total, alignment: 'right' }],
      margin: [32, 8, 32, 0], fontSize: 8, color: '#4a5d69' }),
    content: [
      { text: 'CEO CLUB CPE', bold: true, color: '#226c63', fontSize: 10 },
      { text: report.title, bold: true, fontSize: 21, margin: [0, 5, 0, 5] },
      { text: report.scope, margin: [0, 0, 0, 4] },
      { text: report.count + ' · Gerado em ' + timestamp + ' (Brasília)', color: '#53646c', margin: [0, 0, 0, 14] },
      report.rows.length ? {
        table: { headerRows: 1, widths: report.widths, body: [
          report.headers.map(text => ({ text, bold: true, color: '#ffffff' })), ...report.rows,
        ] },
        layout: { hLineWidth: () => 0.4, vLineWidth: () => 0, hLineColor: () => '#d7dfdd',
          fillColor: row => row === 0 ? '#215650' : row % 2 ? '#ffffff' : '#f1f5f4',
          paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 5, paddingBottom: () => 5 },
      } : { text: 'Nenhum registro para os filtros selecionados.' },
    ],
  };
  const document = printer.createPdfKitDocument(definition);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    document.on('data', chunk => chunks.push(chunk));
    document.on('error', reject);
    document.on('end', () => resolve(Uint8Array.from(Buffer.concat(chunks))));
    document.end();
  });
}
