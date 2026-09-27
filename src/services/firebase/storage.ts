import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { getBytes, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { ALLOWED_IMAGE_MIME_TYPES, LIMITS } from '@shared/constants';
import { storage } from './app';

export class UploadValidationError extends Error {
  constructor(public readonly code: 'too-large' | 'unsupported-type') {
    super(code);
  }
}

export interface PreparedImage {
  uri: string;
  width: number;
  height: number;
}

/**
 * Resizes and re-encodes a picked image as JPEG. This strips EXIF metadata
 * (including GPS coordinates, which could reveal a cook's home) and keeps
 * uploads small to control storage and bandwidth costs.
 */
export async function prepareImage(uri: string, maxDimension = 1600, quality = 0.72): Promise<PreparedImage> {
  const result = await manipulateAsync(uri, [{ resize: { width: maxDimension } }], {
    compress: quality,
    format: SaveFormat.JPEG,
  });
  return { uri: result.uri, width: result.width, height: result.height };
}

async function toBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return response.blob();
}

function randomName(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.jpg`;
}

/** Uploads an image under `folder` and returns its storage path. */
export async function uploadImage(
  folder: string,
  localUri: string,
  options?: { maxDimension?: number },
): Promise<string> {
  const prepared = await prepareImage(localUri, options?.maxDimension);
  const blob = await toBlob(prepared.uri);
  if (blob.size > LIMITS.maxImageBytes) throw new UploadValidationError('too-large');
  const contentType = 'image/jpeg';
  if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(contentType))
    throw new UploadValidationError('unsupported-type');
  const path = `${folder.replace(/\/+$/, '')}/${randomName()}`;
  await uploadBytes(ref(storage, path), blob, { contentType, cacheControl: 'public,max-age=604800' });
  return path;
}

/** Uploads a public-facing image and returns a download URL for display. */
export async function uploadPublicImage(folder: string, localUri: string): Promise<{ path: string; url: string }> {
  const path = await uploadImage(folder, localUri);
  const url = await getDownloadURL(ref(storage, path));
  return { path, url };
}

/**
 * Reads a private file through the SDK (Storage rules enforced) and returns a
 * data URI. Used for identity documents so that no shareable public URL is
 * ever created for them.
 */
export async function readPrivateImageAsDataUri(path: string): Promise<string> {
  const bytes = new Uint8Array(await getBytes(ref(storage, path), LIMITS.maxImageBytes));
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:image/jpeg;base64,${globalThis.btoa(binary)}`;
}
