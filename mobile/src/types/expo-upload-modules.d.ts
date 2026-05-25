declare module 'expo-image-picker' {
  export enum MediaType {
    Images = 'images',
  }

  export type ImagePickerAsset = {
    fileName?: string | null;
    fileSize?: number;
    height?: number;
    mimeType?: string;
    uri: string;
    width?: number;
  };

  export type ImagePickerResult =
    | { canceled: true; assets?: null }
    | { canceled: false; assets: ImagePickerAsset[] };

  export function requestMediaLibraryPermissionsAsync(): Promise<{ granted: boolean }>;
  export function launchImageLibraryAsync(options?: {
    allowsEditing?: boolean;
    mediaTypes?: MediaType[];
    quality?: number;
  }): Promise<ImagePickerResult>;
}

declare module 'expo-document-picker' {
  export type DocumentPickerAsset = {
    mimeType?: string;
    name: string;
    size?: number;
    uri: string;
  };

  export type DocumentPickerResult =
    | { canceled: true; assets?: null }
    | { canceled: false; assets: DocumentPickerAsset[] };

  export function getDocumentAsync(options?: {
    copyToCacheDirectory?: boolean;
    multiple?: boolean;
    type?: string[];
  }): Promise<DocumentPickerResult>;
}

declare module 'expo-file-system' {
  export function getInfoAsync(uri: string, options?: { size?: boolean }): Promise<{
    exists: boolean;
    isDirectory?: boolean;
    size?: number;
    uri: string;
  }>;
}
