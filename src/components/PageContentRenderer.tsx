// Универсальный рендер контента страницы из БД.
// Принимает PageContentShape, отрисовывает intro / sections (с иконками) / body / faq.

import {
  Truck, MapPin, Phone, Mail, Clock, Shield, CreditCard, Wrench, Settings,
  CircleCheck, Users, TrendingUp, Percent, FileText, Send, ChevronRight,
} from 'lucide-react';
import { renderMarkdown } from '@/lib/markdown';
import type { PageContentShape, PageSection } from '@/lib/page-defaults';

const ICONS: Record<string, typeof Truck> = {
  Truck, MapPin, Phone, Mail, Clock, Shield, CreditCard, Wrench, Settings,
  CircleCheck, Users, TrendingUp, Percent, FileText, Send,
};

function SectionCard({ section }: { section: PageSection }) {
  const Icon = section.icon ? ICONS[section.icon] : undefined;
  return (
    <div className="flex gap-4 p-5 bg-bg rounded-xl">
      {Icon && <Icon size={24} className="text-accent flex-shrink-0 mt-1" />}
      <div className="flex-1 min-w-0">
        {section.title && (
          <h2 className="font-semibold text-lg mb-2">{section.title}</h2>
        )}
        <div className="text-text-muted text-sm leading-relaxed space-y-2 [&_strong]:text-text">
          {renderMarkdown(section.body)}
        </div>
      </div>
    </div>
  );
}

export default function PageContentRenderer({ content }: { content: PageContentShape }) {
  return (
    <div className="bg-surface rounded-xl border border-border p-6 md:p-10">
      <h1 className="text-3xl font-bold mb-4">{content.title}</h1>

      {content.intro && (
        <div className="text-text-muted leading-relaxed mb-6 space-y-3 [&_strong]:text-text">
          {renderMarkdown(content.intro)}
        </div>
      )}

      {content.sections.length > 0 && (
        <div className="space-y-4 mb-8">
          {content.sections.map((s, i) => (
            <SectionCard key={i} section={s} />
          ))}
        </div>
      )}

      {content.body && (
        <div className="text-text-muted leading-relaxed space-y-3 [&_strong]:text-text [&_h2]:text-text [&_h3]:text-text [&_a]:text-accent">
          {renderMarkdown(content.body)}
        </div>
      )}

      {content.faq.length > 0 && (
        <section className="mt-10 pt-8 border-t border-border">
          <h2 className="text-2xl font-bold mb-4">Частые вопросы</h2>
          <div className="divide-y divide-border">
            {content.faq.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex justify-between items-start cursor-pointer text-base font-medium hover:text-accent transition-colors">
                  <span>{item.q}</span>
                  <ChevronRight size={18} className="flex-shrink-0 ml-3 mt-0.5 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
