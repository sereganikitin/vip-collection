import { ChevronRight, Truck, Package, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function DeliveryPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/" className="hover:text-accent transition-colors">Главная</Link>
        <ChevronRight size={14} />
        <span className="text-text font-medium">Доставка</span>
      </nav>

      <div className="bg-surface rounded-xl border border-border p-6 md:p-10">
        <h1 className="text-3xl font-bold mb-6">Доставка</h1>

        <div className="space-y-6">
          <div className="flex gap-4 p-5 bg-bg rounded-xl">
            <Truck size={24} className="text-accent flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Доставка по Москве</h3>
              <p className="text-text-muted text-sm mb-3">Стоимость доставки зависит от типа товара:</p>
              <ul className="space-y-2 text-sm text-text-muted">
                <li className="flex justify-between max-w-md"><span>Чехлы, сумки на пояс, ремни</span> <span className="font-medium text-text">100 ₽</span></li>
                <li className="flex justify-between max-w-md"><span>Рюкзаки, сумки для ноутбука, женские сумки</span> <span className="font-medium text-text">250 ₽</span></li>
                <li className="flex justify-between max-w-md"><span>Чемоданы, кейсы, дорожные сумки</span> <span className="font-medium text-text">500 ₽</span></li>
              </ul>
              <p className="mt-3 text-sm text-success font-medium">Бесплатная доставка от 20 000 ₽ в пределах МКАД!</p>
            </div>
          </div>

          <div className="flex gap-4 p-5 bg-bg rounded-xl">
            <Package size={24} className="text-accent flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Доставка по России</h3>
              <p className="text-text-muted text-sm mb-3">Мы работаем со следующими транспортными компаниями:</p>
              <ul className="space-y-1 text-sm text-text-muted">
                <li>СДЭК — курьерская доставка и пункты выдачи</li>
                <li>Почта России — доставка в любой населённый пункт</li>
                <li>Яндекс Доставка — быстрая доставка по Москве и МО</li>
              </ul>
              <p className="mt-3 text-sm text-text-muted">Стоимость доставки в регионы рассчитывается индивидуально.</p>
            </div>
          </div>

          <div className="flex gap-4 p-5 bg-bg rounded-xl">
            <MapPin size={24} className="text-accent flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Самовывоз</h3>
              <p className="text-text-muted text-sm">
                Вы можете забрать заказ самостоятельно по адресу:<br />
                <strong className="text-text">115088, Москва, Сормовский пр-д, 11, стр. 1</strong><br />
                Предварительно согласуйте время визита по телефону +7 (917) 574-11-30.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
