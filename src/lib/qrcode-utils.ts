import QRCode from 'qrcode';
import JSZip from 'jszip';
import { QRCodeRecord } from '../types/qrcode.ts';

/**
 * Sanitizes a string for use as a valid filename across Windows/Mac/Linux
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
}

/**
 * Formats a sequential number to at least 3 digits (e.g. 1 -> "001", 99 -> "099", 100 -> "100")
 */
export function formatThreeDigitCode(num: number): string {
  if (num < 10) return `00${num}`;
  if (num < 100) return `0${num}`;
  return `${num}`;
}

/**
 * Formats a clean download filename for a QR Code
 * Example: "001.png" or "001 - Restaurante Silva.png"
 */
export function getQRCodeFilename(record: { code: string; name?: string }, extension: 'png' | 'jpg' | 'jpeg'): string {
  const code = sanitizeFilename(record.code);
  const name = record.name ? sanitizeFilename(record.name) : '';

  if (name && name.toLowerCase() !== `qr ${code.toLowerCase()}` && name !== code) {
    return `${code} - ${name}.${extension}`;
  }
  return `${code}.${extension}`;
}

/**
 * Generates an HTML Canvas element with the QR Code rendered at high resolution
 */
export async function generateQRCodeCanvas(
  text: string,
  size: number = 1000,
  margin: number = 2
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  await QRCode.toCanvas(canvas, text, {
    width: size,
    margin,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  return canvas;
}

/**
 * Generates a PNG Data URL
 */
export async function generateQRCodeDataUrl(
  text: string,
  size: number = 1000,
  format: 'image/png' | 'image/jpeg' = 'image/png',
  quality: number = 0.95
): Promise<string> {
  const canvas = await generateQRCodeCanvas(text, size);
  return canvas.toDataURL(format, quality);
}

/**
 * Downloads a single QR code as PNG file
 */
export async function downloadQRCodePNG(
  dynamicUrl: string,
  filename: string,
  size: number = 1000
): Promise<void> {
  const canvas = await generateQRCodeCanvas(dynamicUrl, size);
  const link = document.createElement('a');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads a single QR code as JPEG/JPG file
 */
export async function downloadQRCodeJPEG(
  dynamicUrl: string,
  filename: string,
  size: number = 1000
): Promise<void> {
  const canvas = await generateQRCodeCanvas(dynamicUrl, size);
  const link = document.createElement('a');
  link.download = filename.replace(/\.(png|jpeg|jpg)$/i, '') + '.jpg';
  link.href = canvas.toDataURL('image/jpeg', 0.95);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Batch generate QR Codes as a ZIP file
 */
export async function downloadBatchZip(
  records: QRCodeRecord[],
  baseUrl: string,
  zipFilename: string = 'qrcodes.zip',
  size: number = 1000,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (records.length === 0) return;

  const zip = new JSZip();
  const folder = zip.folder('qrcodes') || zip;

  // Track progress
  let completed = 0;
  const total = records.length;
  if (onProgress) onProgress(0, total);

  // Generate QR code for each record
  for (const record of records) {
    const dynamicUrl = `${baseUrl.replace(/\/$/, '')}/r/${record.code}`;
    const canvas = await generateQRCodeCanvas(dynamicUrl, size);

    // Convert canvas to base64 buffer
    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

    const filename = getQRCodeFilename(record, 'png');
    folder.file(filename, base64Data, { base64: true });

    completed++;
    if (onProgress) onProgress(completed, total);
  }

  // Include CSV index inside the ZIP for easy reference
  const csvContent = generateCSVContent(records, baseUrl);
  zip.file('lista_qrcodes.csv', csvContent);

  // Include README text file
  const readme = `QR DINÂMICO - LOTE DE QR CODES
Gerado em: ${new Date().toLocaleString('pt-BR')}
Total de QR Codes: ${records.length}
Resolução das Imagens: ${size}x${size} pixels
URL Base: ${baseUrl}

COMO FUNCIONA:
- Cada imagem neste arquivo ZIP possui um identificador único (ex: 001.png).
- O QR Code aponta para o link dinâmico: ${baseUrl}/r/[ID]
- Você pode imprimir essas imagens em placas físicas, adesivos ou totens.
- A qualquer momento, você pode alterar o link de destino no painel web sem precisar reimprimir as placas!
`;
  zip.file('LEIAME.txt', readme);

  // Generate ZIP blob and trigger download
  const blob = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = zipFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}

/**
 * Builds CSV string content with UTF-8 BOM
 */
export function generateCSVContent(records: QRCodeRecord[], baseUrl: string): string {
  const headers = ['ID', 'NOME', 'LINK DE DESTINO', 'URL DINAMICA', 'STATUS', 'TOTAL DE SCANS', 'DATA DE CRIACAO'];
  
  const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

  const rows = records.map((r) => [
    escapeCsv(r.code),
    escapeCsv(r.name),
    escapeCsv(r.destination_url || 'Não configurado'),
    escapeCsv(`${baseUrl.replace(/\/$/, '')}/r/${r.code}`),
    escapeCsv(r.active ? 'Ativo' : 'Desativado'),
    r.scan_count || 0,
    escapeCsv(new Date(r.created_at).toLocaleString('pt-BR')),
  ]);

  const csvRows = [headers.join(','), ...rows.map((r) => r.join(','))];
  // Add UTF-8 BOM so Excel opens accents correctly
  return '\uFEFF' + csvRows.join('\r\n');
}

/**
 * Downloads full spreadsheet (CSV)
 */
export function downloadCSV(records: QRCodeRecord[], baseUrl: string, filename: string = 'qrcodes-export.csv'): void {
  const content = generateCSVContent(records, baseUrl);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
