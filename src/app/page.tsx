import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Truck, Shield, Percent, Wrench } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import Carousel from '@/components/Carousel';
import FadeSlider, { type FadeSlide } from '@/components/FadeSlider';
import JsonLd from '@/components/JsonLd';
import {
  ORGANIZATION_JSONLD,
  WEBSITE_JSONLD,
  HOME_SPEAKABLE_JSONLD,
  buildFaqJsonLd,
} from '@/lib/seo';
import { HOME_FAQ } from '@/data/seo-content';

// Маппинг названий брендов из БД на slug их бренд-страницы.
// Если бренда нет в маппинге — логотип на главной отображается без ссылки.
const BRAND_PAGE_BY_NAME: Record<string, string> = {
  'VIP COLLECTION': 'vip-collection',
  ARISTOCRAT: 'aristocrat',
  'David Jones': 'david-jones',
  'NERI KARRA': 'neri-karra',
  OLIDIK: 'olidik',
};
import { prisma } from '@/lib/prisma';
import { getCategoriesForFrontend } from '@/lib/categories';
import { getProductsForFrontend } from '@/lib/products';
import { getBrandsForFrontend } from '@/lib/brands';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [banners, categories, brands, newProducts, saleProducts, popularProducts, minSuitcase] = await Promise.all([
    prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    getCategoriesForFrontend(),
    getBrandsForFrontend(),
    getProductsForFrontend({ isNew: true, limit: 12 }),
    getProductsForFrontend({ isSale: true, limit: 12 }),
    getProductsForFrontend({ limit: 8 }),
    prisma.product.aggregate({
      where: { isActive: true, categoryId: 'suitcases', price: { gt: 0 } },
      _min: { price: true },
    }),
  ]);
  const slides: FadeSlide[] = banners.map((b) => ({
    image: b.image,
    imageMobile: b.imageMobile,
  }));
  const minSuitcasePrice = Math.round(minSuitcase._min.price ?? 3500);
  const minSuitcasePriceFmt = new Intl.NumberFormat('ru-RU').format(minSuitcasePrice);

  return (
    <>
      <JsonLd data={ORGANIZATION_JSONLD} />
      <JsonLd data={WEBSITE_JSONLD} />
      <JsonLd data={HOME_SPEAKABLE_JSONLD} />
      <JsonLd data={buildFaqJsonLd(HOME_FAQ)} />
      {/* Hero with slider */}
      <section className="relative bg-black overflow-hidden">
        <div className="relative">
          <FadeSlider slides={slides} autoplayDelay={3000} />
          {/* Text overlay */}
          <div className="absolute inset-0 z-10 flex items-end sm:items-center pointer-events-none pb-8 sm:pb-0">
            <div className="mx-auto max-w-7xl px-4 w-full">
              <div className="max-w-2xl"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7), 0 1px 2px rgba(0,0,0,0.9)' }}>
                <p className="text-accent font-semibold tracking-wide uppercase text-xs sm:text-sm mb-2 sm:mb-3">Курьер по Москве · Я.Доставка по всей России</p>
                <h1 className="text-3xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-3 sm:mb-6">
                  Чемоданы на колёсах от {minSuitcasePriceFmt} ₽
                </h1>
                <p className="speakable-summary text-gray-100 text-sm sm:text-base md:text-lg mb-5 sm:mb-8 leading-relaxed">
                  Чемоданы VIP COLLECTION, рюкзаки и сумки ARISTOCRAT,
                  портмоне NERI KARRA, запчасти для ремонта.
                  Доставка курьером по Москве и Я.Доставкой по России.
                </p>
                <div className="flex flex-wrap gap-3 sm:gap-4 pointer-events-auto">
                  <Link
                    href="/catalog/suitcases"
                    className="inline-flex items-center gap-2 px-5 sm:px-8 py-2.5 sm:py-3.5 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors text-sm sm:text-base shadow-lg"
                  >
                    В каталог
                    <ArrowRight size={18} />
                  </Link>
                  <Link
                    href="/catalog/sale"
                    className="inline-flex items-center gap-2 px-5 sm:px-8 py-2.5 sm:py-3.5 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/15 transition-colors text-sm sm:text-base backdrop-blur-sm"
                  >
                    Акции и скидки
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advantages */}
      <section className="bg-surface border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Truck, title: 'Курьер по Москве', desc: 'Наличные или онлайн-оплата' },
              { icon: Shield, title: 'Доставка по России', desc: 'Я.Доставка во все города' },
              { icon: Percent, title: 'Скидки и акции', desc: 'До 45% на хиты' },
              { icon: Wrench, title: 'Ремонт чемоданов', desc: 'Свой сервисный центр' },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">{item.title}</p>
                  <p className="text-xs text-text-muted">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">Каталог</h2>
          <Link href="/catalog/suitcases" className="text-accent font-medium hover:underline text-sm flex items-center gap-1">
            Все категории <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {categories.filter(c => c.id !== 'misc').map((cat) => (
            <Link
              key={cat.id}
              href={`/catalog/${cat.slug}`}
              className="group relative bg-surface rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all"
            >
              <div className="aspect-square relative bg-white">
                {cat.image && (
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                    unoptimized={cat.image.startsWith('/uploads/')}
                  />
                )}
              </div>
              <div className="p-3 text-center">
                <h3 className="text-sm font-medium group-hover:text-accent transition-colors line-clamp-2">{cat.name}</h3>
                <p className="text-xs text-text-muted mt-1">{cat.productCount} товаров</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular products */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">Популярные товары</h2>
        </div>
        <div className="hidden md:block">
          <Carousel slidesPerView={4}>
            {popularProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </Carousel>
        </div>
        <div className="md:hidden grid grid-cols-2 gap-3">
          {popularProducts.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Sale banner */}
      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="bg-gradient-to-r from-danger to-red-700 rounded-2xl p-8 md:p-12 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-1/3 h-full opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,white,transparent_70%)]" />
          </div>
          <div className="relative z-10 max-w-lg">
            <p className="text-red-200 font-semibold text-sm uppercase tracking-wide mb-2">Специальное предложение</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Распродажа</h2>
            <p className="text-red-100 mb-6">Скидки до 45% на чемоданы и сумки из прошлых коллекций. Количество ограничено!</p>
            <Link
              href="/catalog/sale"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-danger font-semibold rounded-lg hover:bg-red-50 transition-colors"
            >
              Смотреть товары <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* New arrivals */}
      {newProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Новинки</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {newProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Sale products */}
      {saleProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-danger">Распродажа</h2>
            <Link href="/catalog/sale" className="text-accent font-medium hover:underline text-sm flex items-center gap-1">
              Все товары <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {saleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Brands */}
      <section className="bg-surface border-y border-border">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Наши бренды</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6">
            {brands.map((brand) => {
              const brandSlug = BRAND_PAGE_BY_NAME[brand.name];
              const inner = brand.logo ? (
                <Image
                  src={brand.logo}
                  alt={brand.name}
                  fill
                  className="object-contain p-3"
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                  unoptimized={brand.logo.startsWith('/uploads/')}
                />
              ) : (
                <span className="text-sm font-medium text-text-muted">{brand.name}</span>
              );
              if (brandSlug) {
                return (
                  <Link
                    key={brand.id}
                    href={`/brand/${brandSlug}`}
                    aria-label={`${brand.name} — каталог`}
                    className="aspect-[3/2] bg-white border border-border rounded-xl flex items-center justify-center p-4 hover:shadow-md hover:border-accent transition-all relative"
                  >
                    {inner}
                  </Link>
                );
              }
              return (
                <div
                  key={brand.id}
                  className="aspect-[3/2] bg-white border border-border rounded-xl flex items-center justify-center p-4 relative"
                >
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Promo info */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-surface rounded-xl border border-border p-6 md:p-8">
            <h3 className="text-xl font-bold mb-3">Как купить</h3>
            <ul className="space-y-2 text-sm text-text-muted">
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold">→</span>
                <span><strong>Курьер по Москве</strong> — наличные или предоплата онлайн</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold">→</span>
                <span><strong>Я.Доставка по России</strong> — во все города. Расчёт по адресу</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold">→</span>
                <span><strong>Оплата</strong> картой онлайн или при получении</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold">→</span>
                <span><strong>Гарантия</strong> производителя и собственный сервисный центр для ремонта</span>
              </li>
            </ul>
          </div>
          <div className="bg-surface rounded-xl border border-border p-6 md:p-8">
            <h3 className="text-xl font-bold mb-3">Скидки и акции</h3>
            <ul className="space-y-2 text-sm text-text-muted">
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold">15%</span>
                <span>Скидка в день рождения</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold">7%</span>
                <span>При покупке 2-х одинаковых чемоданов</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold">15%</span>
                <span>При покупке 3-х одинаковых чемоданов</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold">−45%</span>
                <span>На прошлые коллекции в разделе «Распродажа»</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* SEO content block */}
      <section className="mx-auto max-w-7xl px-4 py-12 border-t border-border">
        <article className="prose prose-sm max-w-none">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Купить чемодан в Москве — VIP COLLECTION</h2>
          <div className="grid md:grid-cols-2 gap-6 text-text-muted text-sm leading-relaxed">
            <div>
              <h3 className="text-base font-semibold text-text mb-2">Надёжные чемоданы на 4 колёсах</h3>
              <p className="mb-4">
                В каталоге — <strong>надёжные чемоданы на 4 колёсах</strong> из 100% поликарбоната
                под брендом <strong>VIP COLLECTION</strong> (Вип коллекшн). Корпус ударопрочный,
                «неубиваемый» при перевозках в багажном отделении. Размеры S (20&quot;), M (24&quot;),
                L (28&quot;) и наборы 3-в-1. Чемоданы доступны и в классических чёрных, и в
                <strong> цветных</strong> вариантах: Sweet Pink, Watermelon Red, Burgundy, Pearl Blue.
                Все модели — на четырёх двойных колёсах с поворотом 360°, с TSA-замком и
                алюминиевой телескопической ручкой.
              </p>
              <h3 className="text-base font-semibold text-text mb-2">Кейс-пилоты для деловых поездок</h3>
              <p className="mb-4">
                <strong>Кейс-пилоты</strong> VIP COLLECTION — горизонтальный формат с фронтальным
                отделением для ноутбука и документов. Идеален <strong>кейс-пилот для поездки</strong>
                выходного дня и коротких командировок. Лёгкий, помещается в верхние полки самолётов.
              </p>
              <h3 className="text-base font-semibold text-text mb-2">Запчасти и ремонт</h3>
              <p>
                Сломалось колесо или ручка — не выкидывайте чемодан. <strong>Запчасти для чемоданов</strong>:
                колёса, телескопические ручки, замки — цены от 200 ₽. Собственный сервисный центр
                чинит чемоданы любых брендов за 1-3 дня. Гарантийный ремонт чемоданов
                VIP COLLECTION — бесплатно. Доставка в сервис — Я.Доставкой.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-text mb-2">Сумки женские, рюкзаки и кожгалантерея</h3>
              <p className="mb-4">
                <strong>Сумки женские</strong> <strong>David Jones</strong> — модно и недорого, от 1 500 ₽:
                классические, кросс-боди, тоут, рюкзаки. <strong>Рюкзаки</strong> и
                <strong> сумки для ноутбуков</strong> ARISTOCRAT — с отделением до 16&quot;,
                USB-выходом и ортопедической спинкой.
              </p>
              <h3 className="text-base font-semibold text-text mb-2">Кожгалантерея NERI KARRA</h3>
              <p className="mb-4">
                <strong>Кожгалантерея</strong> премиум-класса бренда <strong>NERI KARRA</strong>:
                портмоне, кошельки, обложки для паспорта и автодокументов из натуральной кожи.
                Турецкая кожа полного дубления, RFID-защита, классические и современные модели.
                Также — кожаные ремни, поясные сумки, чехлы для чемоданов.
              </p>
              <h3 className="text-base font-semibold text-text mb-2">Доставка по Москве и по всей России</h3>
              <p>
                <strong>Курьер по Москве</strong> — оплата наличными или картой курьеру, либо предоплата онлайн.
                <strong> Я.Доставка по России</strong> — отправляем во все города через сеть Я.Доставки.
                Оплата онлайн на сайте или при получении заказа.
              </p>
            </div>
          </div>
          <p className="mt-6 text-sm text-text-muted">
            Звонок, WhatsApp, Telegram: <a href="tel:+79257437135" className="text-accent hover:underline">+7 (925) 743-71-35</a>.
            Email: <a href="mailto:vipshopp@yandex.ru" className="text-accent hover:underline">vipshopp@yandex.ru</a>.
            Работаем без выходных.
          </p>
        </article>
      </section>

      {/* FAQ — для FAQPage Schema и GEO (AI-цитирование) */}
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="bg-surface rounded-2xl border border-border p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Частые вопросы</h2>
          <div className="divide-y divide-border">
            {HOME_FAQ.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex justify-between items-start cursor-pointer text-base font-semibold hover:text-accent transition-colors">
                  <span>{item.q}</span>
                  <ArrowRight size={18} className="flex-shrink-0 ml-3 mt-0.5 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm text-text-muted leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
