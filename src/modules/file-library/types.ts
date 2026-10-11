export interface LibraryFile {
  id: string;
  name: string;
  folder: string | null;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  checksum: string | null;
  source: 'upload' | 'wix' | 'link';
  source_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Result of adding one file from a link or from Wix. */
export type ImportResult =
  | { file: LibraryFile; skipped?: false }
  | { skipped: true; duplicateOf: { id: string; name: string } };
