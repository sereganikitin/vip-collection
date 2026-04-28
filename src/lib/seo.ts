export const SITE_URL = 'https://infoseledka.ru';
export const SITE_NAME = 'VIP COLLECTION';

export const ORGANIZATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/images/ui/logo.png`,
  image: `${SITE_URL}/images/banners/banner-1.jpg`,
  description:
    'Интернет-магазин чемоданов, сумок, портфелей, рюкзаков и кожгалантереи. Собственные бренды VIP COLLECTION и ARISTOCRAT.',
  email: 'vipcoll@mail.ru',
  telephone: '+7-917-574-11-30',
  priceRange: '500₽-50000₽',
  paymentAccepted: 'Cash, Credit Card',
  currenciesAccepted: 'RUB',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Сормовский проезд, 11, стр. 1',
    addressLocality: 'Москва',
    postalCode: '115088',
    addressCountry: 'RU',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 55.7080,
    longitude: 37.6906,
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '10:00',
      closes: '19:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Saturday',
      opens: '11:00',
      closes: '17:00',
    },
  ],
  sameAs: ['https://t.me/VIP_CHEMODAN'],
};

export const WEBSITE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  description: 'Интернет-магазин чемоданов и кожгалантереи',
  publisher: { '@id': `${SITE_URL}/#organization` },
  inLanguage: 'ru-RU',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/catalog/chemodany?search={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbList(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

interface ItemListProduct {
  name: string;
  slug: string;
  price: number;
  image?: string;
  brand: string;
}

export function buildItemList(products: ItemListProduct[], categoryName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: categoryName,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        url: `${SITE_URL}/product/${p.slug}`,
        image: p.image ? `${SITE_URL}${p.image}` : undefined,
        brand: { '@type': 'Brand', name: p.brand },
        offers: {
          '@type': 'Offer',
          price: p.price,
          priceCurrency: 'RUB',
          availability: 'https://schema.org/InStock',
        },
      },
    })),
  };
}
