const PUBLIC_ORIGIN = 'https://priyankaracarsale.lk';
const WORDPRESS_MEDIA_HOST = 'admin.priyankaracarsale.lk';

export function publicMediaPath(value: string): string {
  if (!value) return value;

  try {
    const url = new URL(value, PUBLIC_ORIGIN);
    if (url.hostname === WORDPRESS_MEDIA_HOST && url.pathname.startsWith('/wp-content/uploads/')) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return value;
  }

  return value;
}

export function publicMediaUrl(value: string): string {
  if (!value) return value;

  try {
    const url = new URL(value, PUBLIC_ORIGIN);
    if (url.hostname === WORDPRESS_MEDIA_HOST) {
      return new URL(`${url.pathname}${url.search}${url.hash}`, PUBLIC_ORIGIN).toString();
    }

    if (value.startsWith('/')) {
      return url.toString();
    }
  } catch {
    if (value.startsWith('/')) {
      return new URL(value, PUBLIC_ORIGIN).toString();
    }
  }

  return value;
}
