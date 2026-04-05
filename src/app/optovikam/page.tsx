import { ChevronRight, Users, TrendingUp, Shield, FileText } from 'lucide-react';
import Link from 'next/link';

export default function WholesalePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
        <ChevronRight size={14} />
        <span className="text-text font-medium">Оптовикам</span>
      </nav>

      <div className="bg-surface rounded-xl border border-border p-6 md:p-10">
        <h1 className="text-3xl font-bold mb-6">Оптовикам</h1>

        <p className="text-text-muted leading-relaxed mb-8">
          Приглашаем к сотрудничеству торговые компании, индивидуальных предпринимателей,
          интернет-магазины, рекламные агентства, клубы совместных закупок, самозанятых граждан
          и тревел-блогеров.
        </p>

        <h2 className="text-xl font-bold mb-4">Преимущества работы с нами</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {[
            { icon: TrendingUp, title: 'Выгодные цены', desc: 'Специальные оптовые цены, доступные после регистрации' },
            { icon: Shield, title: 'Оригинальные товары', desc: 'Прямые поставки от производителей, гарантия подлинности' },
            { icon: Users, title: 'Персональный менеджер', desc: 'Индивидуальный подход к каждому партнёру' },
            { icon: FileText, title: 'Полный пакет документов', desc: 'Все необходимые сертификаты и документация' },
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
          <h3 className="font-semibold mb-2">Как начать сотрудничество?</h3>
          <p className="text-sm text-text-muted mb-3">
            Свяжитесь с нами по телефону +7 (917) 574-11-30 или напишите на vipcoll@mail.ru.
            Условия сотрудничества обсуждаются индивидуально. После согласования вы получите
            доступ к оптовым ценам.
          </p>
          <Link
            href="/contacts"
            className="inline-flex items-center gap-2 text-sm text-accent font-medium hover:underline"
          >
            Связаться с нами
          </Link>
        </div>
      </div>
    </div>
  );
}
