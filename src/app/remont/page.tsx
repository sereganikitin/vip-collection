import { ChevronRight, Wrench, Settings, CircleCheck } from 'lucide-react';
import Link from 'next/link';

export default function RepairPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
        <ChevronRight size={14} />
        <span className="text-text font-medium">Ремонт</span>
      </nav>

      <div className="bg-surface rounded-xl border border-border p-6 md:p-10">
        <h1 className="text-3xl font-bold mb-6">Ремонт чемоданов</h1>

        <p className="text-text-muted leading-relaxed mb-8">
          Наш сервисный центр осуществляет профессиональный ремонт чемоданов любых брендов.
          Мы используем только оригинальные запчасти и гарантируем качество выполненных работ.
        </p>

        <h2 className="text-xl font-bold mb-4">Виды работ</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {[
            { icon: Settings, title: 'Замена колёс', desc: 'Замена одного или всех колёс на чемодане' },
            { icon: Wrench, title: 'Замена ручек', desc: 'Телескопические и боковые ручки' },
            { icon: Settings, title: 'Ремонт молний', desc: 'Замена бегунков и молний целиком' },
            { icon: CircleCheck, title: 'Замена замков', desc: 'Установка кодовых и TSA замков' },
          ].map((item) => (
            <div key={item.title} className="flex gap-3 p-4 bg-bg rounded-xl">
              <item.icon size={20} className="text-accent flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">{item.title}</h3>
                <p className="text-xs text-text-muted mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 bg-accent/5 border border-accent/20 rounded-xl">
          <h3 className="font-semibold mb-2">Запчасти для чемоданов</h3>
          <p className="text-sm text-text-muted mb-3">
            В нашем каталоге представлен широкий выбор запчастей: колёса, ручки, замки и другие комплектующие.
          </p>
          <Link
            href="/catalog/zapchasti"
            className="inline-flex items-center gap-2 text-sm text-accent font-medium hover:underline"
          >
            Перейти в раздел запчастей
          </Link>
        </div>
      </div>
    </div>
  );
}
