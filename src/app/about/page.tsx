import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
        <ChevronRight size={14} />
        <span className="text-text font-medium">О компании</span>
      </nav>

      <div className="bg-surface rounded-xl border border-border p-6 md:p-10">
        <h1 className="text-3xl font-bold mb-6">О компании</h1>

        <div className="prose prose-gray max-w-none space-y-4 text-text-muted leading-relaxed">
          <p>
            <strong className="text-text">VIP COLLECTION</strong> — российская компания, специализирующаяся на продаже
            кожгалантереи, чемоданов и аксессуаров для путешествий. Компания была основана на базе
            итальянского консорциума «OVER GROUP», который специализируется на натуральной коже
            растительного дубления.
          </p>

          <p>
            Производство кожи расположено в городе Санта-Кроче-суль-Арно (Тоскана, Италия) —
            историческом центре кожевенного производства. Это позволяет нам гарантировать высочайшее
            качество материалов.
          </p>

          <h2 className="text-xl font-bold text-text mt-8 mb-3">Наши бренды</h2>
          <p>
            <strong className="text-text">VIP COLLECTION</strong> и <strong className="text-text">ARISTOCRAT</strong> —
            собственные бренды компании. Чемоданы изготовлены из 100% поликарбоната, что обеспечивает
            лёгкость и прочность. Аксессуары производятся из натуральной кожи растительного дубления.
          </p>

          <p>
            Помимо собственных брендов, мы являемся официальными дистрибьюторами таких марок как
            David Jones, NERI KARRA, OLIDIK, Conwood, Echolac, Leo Ventoni, Palio, COSSNI и SUSEN.
          </p>

          <h2 className="text-xl font-bold text-text mt-8 mb-3">Сервис</h2>
          <p>
            Мы предлагаем не только продажу, но и профессиональный ремонт чемоданов. Наш сервисный
            центр оснащён всем необходимым оборудованием для замены колёс, ручек, молний и других
            комплектующих.
          </p>

          <h2 className="text-xl font-bold text-text mt-8 mb-3">Реквизиты</h2>
          <p>ИП Исмагилов Константин Яковлевич</p>
          <p>Адрес: 115088, г. Москва, Сормовский пр-д, д. 11, стр. 1</p>
        </div>
      </div>
    </div>
  );
}
