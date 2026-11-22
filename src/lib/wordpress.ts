import 'server-only';
import { CARS } from '@/data/cars';
import type { Car } from '@/types/car';
import { getWooProducts, WooProduct } from './wooWordpress';

type WordPressVehicle = {
  id: number;
  slug: string;
  link?: string;
  title?: { rendered?: string };
  content?: { rendered?: string };
  excerpt?: { rendered?: string };
  class_list?: string[];
  acf?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url?: string }>;
  };
  prices?: {
    price?: string;
    regular_price?: string;
  }
};

export type VehicleSeoMetadata = {
  title?: string;
  description?: string;
  image?: string;
  structuredData?: Record<string, unknown>;
};

type RankMathHeadResponse = {
  success?: boolean;
  head?: string;
};


const apiUrl = process.env.WORDPRESS_API_URL?.replace(/\/+$/, '');
const postType = process.env.WORDPRESS_VEHICLE_POST_TYPE || 'vehicles';
// const productType = process.env.WORDPRESS_VEHICLE_PRODUCT_TYPE || 'vehicles';
const productType = process.env.WORDPRESS_VEHICLE_PRODUCT_TYPE || 'product';



function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function field(post: WordPressVehicle, key: string): unknown {
  return post.acf?.[key] ?? post.meta?.[key];
}



function text(value: unknown, fallback = ''): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return fallback;
}

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function priceInLkr(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value !== 'string') return null;

  const normalized = value
    .trim()
    .replace(/^(?:rs\.?|lkr)\s*/i, '')
    .replace(/,/g, '');
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*(lakhs?|lacs?)?$/i);
  if (!match) return null;

  const amount = Number(match[1]);
  const price = Math.round(amount * (match[2] ? 100_000 : 1));
  return Number.isFinite(price) && price > 0 ? price : null;
}

function wooPriceInLkr(woo?: WooProduct): number | null {
  if (!woo) return null;

  const minorUnits = woo.prices.currency_minor_unit ?? 0;
  if (
    (woo.prices.currency_code && woo.prices.currency_code !== 'LKR') ||
    !Number.isInteger(minorUnits) ||
    minorUnits < 0
  ) {
    return null;
  }

  const price = Number(woo.prices.price) / 10 ** minorUnits;
  return Number.isFinite(price) && price > 0 ? price : null;
}

function boolean(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback;
}

function imagesFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((image) => {
    if (typeof image === 'string') return [image];
    if (image && typeof image === 'object' && 'url' in image && typeof image.url === 'string') {
      return [image.url];
    }
    return [];
  });
}

function parseFeatures(featuresValue: unknown): string[] {
  if(Array.isArray(featuresValue)){
    return featuresValue.filter(
      (item): item is string =>
        typeof item === "string"
      
    );
  }

  if (typeof featuresValue === "string"){
    return featuresValue
      .split(/\r?\n/)
      .map((item)=>item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseImages(image: unknown): string[]{
  if (Array.isArray(image)){
    return image.filter(
      (item): item is string => typeof item === "string"
    );
  }

  if (typeof image === "string"){
    return image
      .split(/\r?\n/)
      .map((img)=>img.trim())
      .filter(Boolean)
  }

  return []
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function metaContent(head: string, key: 'name' | 'property', value: string): string | undefined {
  const tags = head.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of tags) {
    const attributes: Record<string, string> = {};
    const attributePattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
    let match: RegExpExecArray | null;

    while ((match = attributePattern.exec(tag)) !== null) {
      attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
    }

    if (attributes[key]?.toLowerCase() === value.toLowerCase() && attributes.content) {
      return decodeHtml(attributes.content);
    }
  }

  return undefined;
}

function metadataFromRankMathHead(head: string): VehicleSeoMetadata {
  const titleTag = head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const schemaTag = head.match(
    /<script\b(?=[^>]*\bclass=["'][^"']*\brank-math-schema\b[^"']*["'])[^>]*>([\s\S]*?)<\/script>/i,
  )?.[1];
  let structuredData: Record<string, unknown> | undefined;

  if (schemaTag) {
    const parsed: unknown = JSON.parse(schemaTag);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Rank Math returned invalid structured data');
    }
    structuredData = parsed as Record<string, unknown>;
  }

  return {
    title: titleTag
      ? decodeHtml(titleTag.replace(/<[^>]*>/g, '').trim())
      : metaContent(head, 'property', 'og:title'),
    description:
      metaContent(head, 'name', 'description') ??
      metaContent(head, 'property', 'og:description'),
    image: metaContent(head, 'property', 'og:image'),
    structuredData,
  };
}

export async function getVehicleSeoMetadata(id: string): Promise<VehicleSeoMetadata | undefined> {
  if (!apiUrl) return undefined;

  const productEndpoint = new URL(apiUrl);
  productEndpoint.searchParams.set('rest_route', `/wp/v2/${productType}`);
  productEndpoint.searchParams.set('slug', id);

  const productResponse = await fetch(productEndpoint, {
    next: { revalidate: 60 },
  });
  if (!productResponse.ok) {
    throw new Error(
      `WordPress vehicle SEO lookup failed (${productResponse.status} ${productResponse.statusText})`,
    );
  }

  const products = (await productResponse.json()) as WordPressVehicle[];
  const product = products.find((item) => item.slug.toLowerCase() === id.toLowerCase());
  if (!product?.link) return undefined;

  const headEndpoint = new URL(apiUrl);
  headEndpoint.searchParams.set('rest_route', '/rankmath/v1/getHead');
  headEndpoint.searchParams.set('url', product.link);

  const headResponse = await fetch(headEndpoint, {
    next: { revalidate: 60 },
  });
  if (!headResponse.ok) {
    throw new Error(
      `Rank Math metadata request failed (${headResponse.status} ${headResponse.statusText})`,
    );
  }

  const result = (await headResponse.json()) as RankMathHeadResponse;
  if (!result.success || typeof result.head !== 'string') {
    throw new Error('Rank Math returned an invalid metadata response');
  }

  const metadata = metadataFromRankMathHead(result.head);
  if (!metadata.title || !metadata.description) {
    console.warn(`Rank Math returned no vehicle-specific title and description for "${id}"`);
    return undefined;
  }

  return metadata;
}



function mapVehicle(post: WordPressVehicle, woo?: WooProduct): Car {
  const title = stripHtml(post.title?.rendered || '');
  const price = text(field(post, 'price'), 'Negotiable');
  const wooPrice = woo?.prices?.price;
  const priceLkrValue = field(post, 'pricestr_lkr');
  const gallery = parseImages(field(post, 'images'));
  const featuredImage = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
const images =
  woo?.images?.length
    ? woo.images.map((img) => img.src)
    : [...new Set([
        ...gallery,
        ...(featuredImage ? [featuredImage] : [])
      ])];const featuresValue = field(post, 'features');
  const features = parseFeatures(featuresValue);
  
 
  

  return {
    id: post.slug || String(post.id),
    name: text(field(post, 'name'), title),
    make: text(field(post, 'make')),
    model: text(field(post, 'model')),
    year: number(field(post, 'year')),
    condition: enumValue(field(post, 'condition'), ['Brand New', 'Used', 'Reconditioned'], 'Used'),
    owner: text(field(post, 'owner'), 'Contact for details'),
    bodyType: text(field(post, 'body_type')),
    transmission: enumValue(field(post, 'transmission'), ['Automatic', 'Manual'], 'Automatic'),
    fuelType: enumValue(field(post, 'fuel_type'), ['Petrol', 'Hybrid', 'Diesel', 'Electric'], 'Petrol'),
    engineCc: number(field(post, 'engine_cc')),
    mileage: number(field(post, 'mileage')),
    price:wooPrice || "Negotiable",
    priceLkr: wooPriceInLkr(woo) ?? priceInLkr(priceLkrValue),
    priceDisplay: text(field(post, 'price_display'), price),
    
    features,
    description: stripHtml(text(field(post, 'description'), post.content?.rendered || post.excerpt?.rendered || '')),
    images,
    featured: post.class_list
      ? post.class_list.includes('featured')
      : woo?.featured ?? boolean(field(post, 'featured')),
  //  isSold: boolean(field(post, 'is_sold')),
  isSold: post.class_list?.includes('outofstock') ?? false,
          //: woo?.featured ?? boolean(field(post, 'outofstock'))
  };
}

export async function getVehicles(): Promise<Car[]> {
  if (!apiUrl) return CARS;

  const endpoint = `${apiUrl}/wp-json/wp/v2/${encodeURIComponent(postType)}`;
 // const acfEndpoint = `${apiUrl}/wp-json/wp/v2/${encodeURIComponent(productType)}`;
const acfEndpoint = `${apiUrl}/?rest_route=/wp/v2/${encodeURIComponent(productType)}`;

const wooProducts = await getWooProducts();

const wooMap = new Map(
  wooProducts.map((product)=>[
    product.slug,
    product
  ])
)

  const fetchPage = async (page: number) => {
   // const response = await fetch(`${acfEndpoint}?per_page=100&_embed&page=${page}&orderby=date&order=desc`, {
    const response = await fetch(`${acfEndpoint}&per_page=100&_embed&page=${page}&orderby=date&order=desc`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      console.log(acfEndpoint)
      throw new Error(`WordPress vehicle request failed (${response.status} ${response.statusText})`);
    }
    return {
      posts: (await response.json()) as WordPressVehicle[],
      totalPages: Number(response.headers.get('X-WP-TotalPages')) || 1,
    };
  };


  const firstPage = await fetchPage(1);

  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) =>
      fetchPage(index + 2),
    ),
  );



  const posts = [firstPage, ...remainingPages].flatMap((page) => page.posts);
//  return posts.map(mapVehicle);
return posts.map((post)=>
mapVehicle(post, wooMap.get(post.slug)))
}

export async function getVehicleById(id: string): Promise<Car | undefined> {
  const vehicles = await getVehicles();
  return vehicles.find((vehicle) => vehicle.id.toLowerCase() === id.toLowerCase());
}
