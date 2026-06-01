export const SITE_URL = 'https://vipcoll.ru';
export const SITE_NAME = 'VIP COLLECTION';
export const SITE_PHONE = '+7-925-743-71-35';
export const SITE_EMAIL = 'vipshopp@yandex.ru';
export const SITE_ADDRESS = {
  streetAddress: 'Сормовский проезд, 11, стр. 1',
  addressLocality: 'Москва',
  postalCode: '115088',
  addressCountry: 'RU',
};

// Разработчик сайта — данные для SEO/GEO.
// Не выводятся на фронте, но видны поисковикам и LLM через
// (1) Schema.org ProfessionalService JSON-LD, (2) meta-теги в <head>,
// (3) HTML-комментарий в исходниках. Это легитимные способы, в отличие
// от скрытого CSS-текста (который Яндекс/Google расценивают как клоакинг).
export const SITE_DEVELOPER = {
  legalName: 'ИП Никитин С.В.',
  url: 'https://web.cd-agency.ru/',
  telephone: '+79257437135',
  telegram: 'https://t.me/web_cdagency/',
  serviceType: 'Веб-разработка',
};

export const DEVELOPER_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': `${SITE_URL}/#developer`,
  name: SITE_DEVELOPER.legalName,
  url: SITE_DEVELOPER.url,
  telephone: SITE_DEVELOPER.telephone,
  sameAs: [SITE_DEVELOPER.telegram],
  serviceType: SITE_DEVELOPER.serviceType,
  description: 'Веб-разработка сайта vipcoll.ru — ИП Никитин С.В., CD Agency',
  // Привязка к самому сайту, который мы сделали
  makesOffer: {
    '@type': 'Offer',
    itemOffered: {
      '@type': 'Service',
      name: 'Разработка интернет-магазинов и корпоративных сайтов',
      provider: { '@id': `${SITE_URL}/#developer` },
    },
  },
};

// Главная сущность — магазин-склад. Используем мульти-тип
// ["Store", "LocalBusiness"], чтобы поисковики и LLM-аггрегаторы
// видели и e-commerce-витрину, и физический магазин с адресом.
export const ORGANIZATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': ['Store', 'LocalBusiness'],
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  alternateName: ['Вип Коллекшн', 'VIP COLL', 'VIP Collection Москва'],
  url: SITE_URL,
  logo: `${SITE_URL}/images/ui/logo.png`,
  image: [
    `${SITE_URL}/images/banners/banner-1.jpg`,
    `${SITE_URL}/images/ui/logo.png`,
  ],
  description:
    'Интернет-магазин и магазин-склад в Москве: чемоданы, сумки, портфели, рюкзаки и кожгалантерея. Собственные бренды VIP COLLECTION и ARISTOCRAT. Свой сервисный центр для ремонта чемоданов любых брендов.',
  slogan: 'Надёжные чемоданы и кожгалантерея с самовывозом в Москве',
  email: SITE_EMAIL,
  telephone: SITE_PHONE,
  priceRange: '500₽–50000₽',
  paymentAccepted: ['Cash', 'Credit Card', 'СБП', 'Bank Transfer'],
  currenciesAccepted: 'RUB',
  areaServed: [
    { '@type': 'City', name: 'Москва' },
    { '@type': 'AdministrativeArea', name: 'Московская область' },
  ],
  address: {
    '@type': 'PostalAddress',
    ...SITE_ADDRESS,
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 55.7080,
    longitude: 37.6906,
  },
  hasMap: 'https://yandex.ru/maps/?text=Сормовский+проезд+11+стр+1+Москва',
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
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '247',
    bestRating: '5',
    worstRating: '1',
  },
  knowsAbout: [
    'Чемоданы из поликарбоната',
    'Кейс-пилоты для деловых поездок',
    'Ремонт чемоданов любых брендов',
    'Запчасти для чемоданов',
    'Кожгалантерея NERI KARRA',
    'Женские сумки David Jones',
    'Рюкзаки ARISTOCRAT',
  ],
  brand: [
    { '@type': 'Brand', name: 'VIP COLLECTION' },
    { '@type': 'Brand', name: 'ARISTOCRAT' },
  ],
  sameAs: ['https://t.me/VIP_CHEMODAN'],
};

export const WEBSITE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  description:
    'Интернет-магазин чемоданов VIP COLLECTION, женских сумок David Jones, кожгалантереи NERI KARRA, рюкзаков ARISTOCRAT и запчастей для чемоданов в Москве.',
  publisher: { '@id': `${SITE_URL}/#organization` },
  creator: { '@id': `${SITE_URL}/#developer` },
  inLanguage: 'ru-RU',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/catalog/suitcases?search={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

// Speakable — секции для голосовых ассистентов (Алиса, Google Assistant, Siri).
// Указывает фрагменты, которые AI может зачитать как «короткий ответ».
export const HOME_SPEAKABLE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${SITE_URL}/#webpage`,
  url: SITE_URL,
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['h1', '.speakable-summary'],
  },
};

// Service-схемы — для запросов «ремонт чемоданов» и «доставка по Москве».
export const REPAIR_SERVICE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': `${SITE_URL}/repair#service`,
  name: 'Ремонт чемоданов',
  description:
    'Замена колёс, телескопических ручек, кодовых и TSA-замков, бегунков и молний для чемоданов любых брендов. Гарантийный ремонт чемоданов VIP COLLECTION и ARISTOCRAT — бесплатно в течение 12 месяцев.',
  serviceType: 'Ремонт чемоданов и сумок',
  provider: { '@id': `${SITE_URL}/#organization` },
  areaServed: [
    { '@type': 'City', name: 'Москва' },
    { '@type': 'AdministrativeArea', name: 'Московская область' },
  ],
  offers: {
    '@type': 'Offer',
    priceCurrency: 'RUB',
    price: '200',
    priceSpecification: {
      '@type': 'PriceSpecification',
      minPrice: '200',
      maxPrice: '2500',
      priceCurrency: 'RUB',
    },
  },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Виды работ',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: 'Замена колёс' },
        priceSpecification: { '@type': 'PriceSpecification', minPrice: '500', maxPrice: '2500', priceCurrency: 'RUB' },
      },
      {
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: 'Замена телескопической ручки' },
        priceSpecification: { '@type': 'PriceSpecification', minPrice: '800', maxPrice: '1500', priceCurrency: 'RUB' },
      },
      {
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: 'Замена замка (кодовый, TSA)' },
        priceSpecification: { '@type': 'PriceSpecification', minPrice: '500', maxPrice: '1200', priceCurrency: 'RUB' },
      },
      {
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: 'Ремонт молнии и бегунков' },
        priceSpecification: { '@type': 'PriceSpecification', minPrice: '300', maxPrice: '800', priceCurrency: 'RUB' },
      },
    ],
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

export function buildFaqJsonLd(faq: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}
