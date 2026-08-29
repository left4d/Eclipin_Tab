export interface IconResult {
  url: string;
  isFallback: boolean;
  iconSmall?: boolean;
}

export type NetworkIconResult =
  | { kind: 'blob'; blob: Blob; iconSmall: boolean }
  | { kind: 'url'; url: string; iconSmall: boolean };

export const SMALL_ICON_THRESHOLD = 100;
