'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Truck, Shield, Percent, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { products } from '@/data/products';
import { categories } from '@/data/categories';
import { brands } from '@/data/brands';
import ProductCard from '@/components/ProductCard';
import Carousel from '@/components/Carousel';
import FadeSlider, { type FadeSlide } from '@/components/FadeSlider';
import JsonLd from '@/components/JsonLd';
import { ORGANIZATION_JSONLD, WEBSITE_JSONLD } from '@/lib/seo';

const DEFAULT_SLIDES: FadeSlide[] = [
  { image: '/images/banners/banner-1.jpg' },
  { image: '/images/banners/banner-2.jpg' },
  { image: '/images/banners/banner-3.jpg' },
  { image: '/images/banners/banner-5.jpg' },
];

export default function Home() {
  const newProducts = products.filter((p) => p.isNew);
  const saleProducts = products.filter((p) => p.isSale);
  const popularProducts = products.slice(0, 8);

  const [slides, setSlides] = useState<FadeSlide[]>(DEFAULT_SLIDES);

  useEffect(() => {
    fetch('/api/banners')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSlides(
            data.map((b: { image: string; imageMobile?: string | null }) => ({
              image: b.image,
              imageMobile: b.imageMobile,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <JsonLd data={ORGANIZATION_JSONLD} />
      <JsonLd data={WEBSITE_JSONLD} />
      {/* Hero with slider */}
      <section className="relative bg-black overflow-hidden">
        <div className="relative">
          <FadeSlider slides={slides} autoplayDelay={5000} />
          {/* Text overlay */}
          <div className="absolute inset-0 z-10 flex items-end sm:items-center pointer-events-none pb-16 sm:pb-0">
            <div className="mx-auto max-w-7xl px-4 w-full">
              <div className="max-w-2xl"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7), 0 1px 2px rgba(0,0,0,0.9)' }}>
                <p className="text-accent font-semibold tracking-wide uppercase text-xs sm:text-sm mb-2 sm:mb-3">Итальянские традиции качества</p>
                <h1 className="text-3xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-3 sm:mb-6">
                  Чемоданы и аксессуары для путешествий
                </h1>
                <p className="text-gray-100 text-sm sm:text-base md:text-lg mb-5 sm:mb-8 leading-relaxed">
                  Собственные бренды VIP COLLECTION и ARISTOCRAT. 100% поликарбонат,
                  натуральная кожа, итальянское производство.
                </p>
                <div className="flex flex-wrap gap-3 sm:gap-4 pointer-events-auto">
                  <Link
                    href="/catalog/chemodany"
                    className="inline-flex items-center gap-2 px-5 sm:px-8 py-2.5 sm:py-3.5 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors text-sm sm:text-base shadow-lg"
                  >
                    Смотреть каталог
                    <ArrowRight size={18} />
                  </Link>
                  <Link
                    href="/catalog/rasprodazha"
                    className="inline-flex items-center gap-2 px-5 sm:px-8 py-2.5 sm:py-3.5 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/15 transition-colors text-sm sm:text-base backdrop-blur-sm"
                  >
                    Распродажа
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
              { icon: Truck, title: 'Бесплатная доставка', desc: 'От 20 000 ₽ по Москве' },
              { icon: Shield, title: 'Гарантия качества', desc: 'Оригинальные товары' },
              { icon: Percent, title: 'Скидка 15%', desc: 'В день рождения' },
              { icon: Wrench, title: 'Ремонт чемоданов', desc: 'Сервисный центр' },
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
          <Link href="/catalog/chemodany" className="text-accent font-medium hover:underline text-sm flex items-center gap-1">
            Все категории <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {categories.filter(c => c.id !== 'sale' && c.id !== 'misc').map((cat) => (
            <Link
              key={cat.id}
              href={`/catalog/${cat.slug}`}
              className="group relative bg-surface rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all"
            >
              <div className="aspect-square relative bg-white">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                />
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
              href="/catalog/rasprodazha"
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
            <Link href="/catalog/rasprodazha" className="text-accent font-medium hover:underline text-sm flex items-center gap-1">
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
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="aspect-[3/2] bg-white border border-border rounded-xl flex items-center justify-center p-4 hover:shadow-md transition-shadow cursor-pointer relative"
              >
                <Image
                  src={brand.logo}
                  alt={brand.name}
                  fill
                  className="object-contain p-3"
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Promo info */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-surface rounded-xl border border-border p-6 md:p-8">
            <h3 className="text-xl font-bold mb-3">Собственные бренды</h3>
            <p className="text-text-muted leading-relaxed text-sm">
              VIP COLLECTION и ARISTOCRAT — собственные бренды компании, производимые из высококачественных материалов
              в лучших традициях итальянского мастерства. Чемоданы из 100% поликарбоната, аксессуары из натуральной кожи
              растительного дубления из Тосканы.
            </p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-6 md:p-8">
            <h3 className="text-xl font-bold mb-3">Выгодные акции</h3>
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
                <span className="text-accent font-bold">0 ₽</span>
                <span>Бесплатная доставка от 20 000 ₽ по Москве</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* SEO content block */}
      <section className="mx-auto max-w-7xl px-4 py-12 border-t border-border">
        <article className="prose prose-sm max-w-none">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Интернет-магазин VIP COLLECTION в Москве</h2>
          <div className="grid md:grid-cols-2 gap-6 text-text-muted text-sm leading-relaxed">
            <div>
              <h3 className="text-base font-semibold text-text mb-2">Чемоданы из поликарбоната</h3>
              <p className="mb-4">
                В нашем каталоге представлены <strong>чемоданы из 100% поликарбоната</strong> различных размеров —
                S (20&quot;), M (24&quot;), L (28&quot;) и наборы из трёх чемоданов. Под собственным брендом
                <strong> VIP COLLECTION</strong> производятся премиальные модели с TSA-замками,
                а под брендом <strong>ARISTOCRAT</strong> — доступные модели для повседневного использования.
                Все чемоданы оборудованы 4-мя двойными колёсами с поворотом на 360° и телескопической ручкой.
              </p>
              <h3 className="text-base font-semibold text-text mb-2">Сумки, портфели, рюкзаки</h3>
              <p>
                Женские сумки <strong>David Jones</strong> — стильный аксессуар на каждый день. Кожаные портфели
                <strong> VIP COLLECTION</strong> и рюкзаки <strong>ARISTOCRAT</strong> с отделениями для ноутбуков
                до 17&quot;. Портмоне и обложки для документов <strong>NERI KARRA</strong> из натуральной кожи
                растительного дубления.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-text mb-2">Доставка и оплата</h3>
              <p className="mb-4">
                Доставляем по всей России: курьером по Москве, через СДЭК, Почту России, Яндекс.Доставку и Авито.
                <strong> Бесплатная доставка по Москве при заказе от 20 000 ₽</strong>. Оплата картой онлайн или
                наличными при получении. Возможен самовывоз с нашего склада на Сормовском проезде, 11.
              </p>
              <h3 className="text-base font-semibold text-text mb-2">Ремонт и гарантия</h3>
              <p>
                Все товары — оригинальные, с гарантией от производителя. У нас работает собственный
                <strong> сервисный центр по ремонту чемоданов</strong>: замена колёс, ручек, замков и других
                комплектующих. Скидки именинникам — 15% в день рождения. Для оптовых клиентов —
                индивидуальные условия и регистрация в личном кабинете.
              </p>
            </div>
          </div>
          <p className="mt-6 text-sm text-text-muted">
            Адрес магазина: 115088, Москва, Сормовский проезд, 11, стр. 1.
            Телефон / WhatsApp / Telegram: <a href="tel:+79175741130" className="text-accent hover:underline">+7 (917) 574-11-30</a>.
            Email: <a href="mailto:vipcoll@mail.ru" className="text-accent hover:underline">vipcoll@mail.ru</a>.
          </p>
        </article>
      </section>
    </>
  );
}
