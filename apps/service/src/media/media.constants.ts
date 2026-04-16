export const MEDIA_OBJECT_PREFIX = '';

export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
export const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm'];
export const ALLOWED_MEDIA_EXTENSIONS = [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_VIDEO_EXTENSIONS];

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
export const ALLOWED_MEDIA_MIME_TYPES = [...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_VIDEO_MIME_TYPES];

export const KB = 1024;
export const MB = KB * 1024;
export const GB = MB * 1024;

export const MAX_IMAGE_SIZE = 10 * MB;
export const MAX_VIDEO_SIZE = 200 * MB;
