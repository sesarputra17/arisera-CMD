/**
 * ARISERA Platform - Google Workspace Data Service (Sheets & Drive)
 * Menggunakan access token client-side dari memory via googleAuthService.
 * Mendukung pembacaan spreadsheet, mapping kolom produk, dan penarikan aset gambar Drive.
 */

import googleAuthService from './googleAuth';
import { GoogleDriveFile, GoogleSheetInfo } from '../types/database';

export interface GoogleServiceResult<T> {
  data: T | null;
  error: string | null;
}

export interface SheetRowData {
  name: string;
  price: number;
  description?: string;
  category?: string;
  sku?: string;
  stock?: number;
}

export const googleService = {
  /**
   * Helper header otorisasi Bearer token
   */
  getAuthHeaders(): HeadersInit | null {
    const token = googleAuthService.getAccessToken();
    if (!token) return null;
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
  },

  /**
   * Mengambil daftar file gambar dari Google Drive milik pengguna
   */
  async listDriveImages(): Promise<GoogleServiceResult<GoogleDriveFile[]>> {
    const headers = this.getAuthHeaders();
    if (!headers) {
      return {
        data: null,
        error: 'Sesi Google belum terhubung atau token telah kedaluwarsa. Silakan masuk dengan Google.',
      };
    }

    try {
      const query = encodeURIComponent("mimeType contains 'image/' and trashed = false");
      const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,thumbnailLink,webContentLink,size,modifiedTime)&pageSize=40`;

      const response = await fetch(url, { headers });
      if (!response.ok) {
        if (response.status === 401) {
          await googleAuthService.signOut();
          return { data: null, error: 'Token otorisasi Google kedaluwarsa. Silakan login kembali.' };
        }
        if (response.status === 403) {
          return { data: null, error: 'Izin Google Drive ditolak atau kuota API terlampaui.' };
        }
        const errJson = await response.json().catch(() => ({}));
        return { data: null, error: errJson?.error?.message || `Gagal mengakses Google Drive (${response.status})` };
      }

      const json = await response.json();
      const files: GoogleDriveFile[] = (json.files || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        thumbnailLink: f.thumbnailLink,
        webContentLink: f.webContentLink,
        size: f.size ? Number(f.size) : undefined,
        modifiedTime: f.modifiedTime,
      }));

      return { data: files, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Terjadi kesalahan jaringan saat memuat Google Drive.' };
    }
  },

  /**
   * Mengambil daftar file Google Sheets dari Google Drive milik pengguna
   */
  async listSpreadsheets(): Promise<GoogleServiceResult<GoogleDriveFile[]>> {
    const headers = this.getAuthHeaders();
    if (!headers) {
      return {
        data: null,
        error: 'Sesi Google belum terhubung. Silakan masuk dengan akun Google Anda.',
      };
    }

    try {
      const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
      const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,modifiedTime)&pageSize=30`;

      const response = await fetch(url, { headers });
      if (!response.ok) {
        if (response.status === 401) {
          await googleAuthService.signOut();
          return { data: null, error: 'Token Google kedaluwarsa. Silakan login kembali.' };
        }
        const errJson = await response.json().catch(() => ({}));
        return { data: null, error: errJson?.error?.message || 'Gagal mengambil daftar spreadsheet.' };
      }

      const json = await response.json();
      const files: GoogleDriveFile[] = (json.files || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        modifiedTime: f.modifiedTime,
      }));

      return { data: files, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Kesalahan jaringan saat memuat spreadsheet.' };
    }
  },

  /**
   * Mengambil metadata dan daftar sheet dari Google Sheets
   */
  async getSpreadsheetDetails(spreadsheetId: string): Promise<GoogleServiceResult<GoogleSheetInfo>> {
    const headers = this.getAuthHeaders();
    if (!headers) {
      return { data: null, error: 'Sesi Google tidak aktif.' };
    }

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        return { data: null, error: errJson?.error?.message || 'Gagal membaca detail spreadsheet.' };
      }

      const json = await response.json();
      const sheetInfo: GoogleSheetInfo = {
        id: json.spreadsheetId,
        name: json.properties?.title || 'Untitled Spreadsheet',
        sheets: (json.sheets || []).map((s: any) => ({
          id: s.properties?.sheetId,
          title: s.properties?.title,
          rowCount: s.properties?.gridProperties?.rowCount,
        })),
      };

      return { data: sheetInfo, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal memproses spreadsheet.' };
    }
  },

  /**
   * Membaca baris data dari lembar sheet tertentu
   */
  async getSheetRows(
    spreadsheetId: string,
    sheetTitle: string,
    range: string = 'A1:Z100'
  ): Promise<GoogleServiceResult<{ headers: string[]; rows: string[][] }>> {
    const headers = this.getAuthHeaders();
    if (!headers) {
      return { data: null, error: 'Sesi Google tidak aktif.' };
    }

    try {
      const fullRange = encodeURIComponent(`'${sheetTitle}'!${range}`);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${fullRange}`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        return { data: null, error: errJson?.error?.message || 'Gagal membaca baris tabel.' };
      }

      const json = await response.json();
      const values: string[][] = json.values || [];

      if (values.length === 0) {
        return { data: { headers: [], rows: [] }, error: null };
      }

      const sheetHeaders = values[0].map((h) => String(h || '').trim());
      const dataRows = values.slice(1);

      return { data: { headers: sheetHeaders, rows: dataRows }, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal mengambil data baris spreadsheet.' };
    }
  },

  /**
   * Melakukan konversi baris spreadsheet menjadi entitas produk terstruktur
   */
  parseProductsFromRows(
    headers: string[],
    rows: string[][],
    mapping: {
      nameCol: string;
      priceCol: string;
      descCol?: string;
      stockCol?: string;
      skuCol?: string;
    }
  ): SheetRowData[] {
    const nameIdx = headers.indexOf(mapping.nameCol);
    const priceIdx = headers.indexOf(mapping.priceCol);
    const descIdx = mapping.descCol ? headers.indexOf(mapping.descCol) : -1;
    const stockIdx = mapping.stockCol ? headers.indexOf(mapping.stockCol) : -1;
    const skuIdx = mapping.skuCol ? headers.indexOf(mapping.skuCol) : -1;

    if (nameIdx === -1 || priceIdx === -1) {
      return [];
    }

    const results: SheetRowData[] = [];

    for (const row of rows) {
      const name = row[nameIdx]?.trim();
      if (!name) continue;

      const rawPrice = row[priceIdx]?.toString().replace(/[^0-9.]/g, '') || '0';
      const price = parseFloat(rawPrice) || 0;

      const desc = descIdx !== -1 && row[descIdx] ? row[descIdx].trim() : undefined;
      const stockRaw = stockIdx !== -1 && row[stockIdx] ? row[stockIdx].replace(/[^0-9]/g, '') : '10';
      const stock = parseInt(stockRaw, 10) || 10;
      const sku = skuIdx !== -1 && row[skuIdx] ? row[skuIdx].trim() : undefined;

      results.push({
        name,
        price,
        description: desc,
        stock,
        sku,
      });
    }

    return results;
  },
};

export default googleService;
