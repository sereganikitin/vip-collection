'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Truck, Shield, Percent, Wrench } from 'lucide-react';
import { products } from '@/data/products';
import { categories } from '@/data/categories';
import { brands } from '@/data/brands';
import ProductCard from '@/components/ProductCard';
import Carousel from '@/components/Carousel';

export default function Home() {
  const newProducts = products.filter((p) => p.isNew);
  const saleProducts = products.filter((p) => p.isSale);
  const popularProducts = products.slice(0, 8);

  return (
    <>
      {/* Hero with slider */}
      <section className="relative bg-primary overflow-hidden">
        <div className="relative">
          <Carousel autoplay loop slidesPerView={1}>
            {[
              '/images/banners/banner-1.jpg',
              '/images/banners/banner-2.jpg',
              '/images/banners/banner-3.jpg',
              '/images/banners/banner-4.jpg',
              '/images/banners/banner-5.jpg',
            ].map((src, i) => (
              <div key={i} className="relative w-full aspect-[21/9] md:aspect-[21/7]">
                <Image
                  src={src}
                  alt={`Баннер ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  priority={i === 0}
                />
                <div className="absolute inset-0 bg-primary/50" />
              </div>
            ))}
          </Carousel>
          {/* Text overlay */}
          <div className="absolute inset-0 z-10 flex items-center pointer-events-none">
            <div className="mx-auto max-w-7xl px-4 w-full">
              <div className="max-w-2xl">
                <p className="text-accent font-semibold tracking-wide uppercase text-sm mb-3">Итальянские традиции качества</p>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 drop-shadow-lg">
                  Чемоданы и аксессуары для путешествий
                </h1>
                <p className="text-gray-200 text-base md:text-lg mb-8 leading-relaxed drop-shadow">
                  Собственные бренды VIP COLLECTION и ARISTOCRAT. 100% поликарбонат,
                  натуральная кожа, итальянское производство.
                </p>
                <div className="flex flex-wrap gap-4 pointer-events-auto">
                  <Link
                    href="/catalog/chemodany"
                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors"
                  >
                    Смотреть каталог
                    <ArrowRight size={18} />
                  </Link>
                  <Link
                    href="/catalog/rasprodazha"
                    className="inline-flex items-center gap-2 px-8 py-3.5 border-2 border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
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
    </>
  );
}
