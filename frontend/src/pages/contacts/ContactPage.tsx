import { useMemo, useState } from 'react';
import { CircleCheckBig, Plus } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { ContactCard } from './components/ContactCard';
import { ContactFormDrawer } from './components/ContactFormDrawer';
import type { ContactFormData } from './components/ContactFormDrawer';
import { getContactsByStatus } from '../../lib/mockData';

export function ContactPage() {
  const [showResolved, setShowResolved] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const contacts = useMemo(
    () => getContactsByStatus(showResolved ? 'resolved' : 'pending'),
    [showResolved]
  );

  const handleSubmit = (data: ContactFormData) => {
    // TODO: API連携時に実装
    void data;
  };

  return (
    <>
      <Header title="お問い合わせ">
        <Button variant="outline" size="sm" onPress={() => setShowResolved(!showResolved)}>
          <CircleCheckBig size={16} />
          {showResolved ? '対応中を表示' : '解決済みを表示'}
        </Button>
        <Button variant="primary" size="sm" onPress={() => setIsDrawerOpen(true)}>
          <Plus size={16} />
          新規作成
        </Button>
      </Header>

      <div className="flex-1 overflow-y-auto p-8">
        {contacts.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-text-tertiary">
              {showResolved ? '解決済みのお問い合わせはありません' : 'お問い合わせはありません'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {contacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        )}
      </div>

      <ContactFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
