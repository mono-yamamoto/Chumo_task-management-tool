import { useCallback, useState } from 'react';
import { CircleCheckBig, Plus } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { ContactCard } from './components/ContactCard';
import { ContactFormDrawer } from './components/ContactFormDrawer';
import type { ContactFormData } from './components/ContactFormDrawer';
import { useContacts, useCreateContact, useUpdateContactStatus } from '../../hooks/useContacts';
import { useCurrentUser } from '../../hooks/useCurrentUser';

export function ContactPage() {
  const [showResolved, setShowResolved] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [updatingContactId, setUpdatingContactId] = useState<string | null>(null);

  const status = showResolved ? 'resolved' : 'pending';
  const { data: contacts = [], isLoading, error } = useContacts(status);
  const createContact = useCreateContact();
  const updateStatus = useUpdateContactStatus();
  const { data: currentUser } = useCurrentUser();

  const handleStatusChange = useCallback(
    (contactId: string, newStatus: 'pending' | 'resolved') => {
      setUpdatingContactId(contactId);
      updateStatus.mutate(
        { contactId, status: newStatus },
        { onSettled: () => setUpdatingContactId(null) }
      );
    },
    [updateStatus]
  );

  const handleSubmit = (data: ContactFormData) => {
    createContact.mutate(
      {
        type: data.type,
        title: data.title,
        content: data.content || undefined,
        userName: currentUser?.displayName ?? '',
        userEmail: currentUser?.email ?? '',
        errorReportDetails: data.errorDetails
          ? {
              issue: data.errorDetails.issue,
              reproductionSteps: data.errorDetails.reproductionSteps,
              environment: {
                device: data.errorDetails.device,
                os: data.errorDetails.os,
                browser: data.errorDetails.browser,
                osVersion: data.errorDetails.osVersion,
                browserVersion: data.errorDetails.browserVersion,
              },
            }
          : undefined,
      },
      { onSuccess: () => setIsDrawerOpen(false) }
    );
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
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-error-border bg-error-bg p-4 text-sm text-error-text">
            お問い合わせの取得に失敗しました: {error.message}
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-text-tertiary">
              {showResolved ? '解決済みのお問い合わせはありません' : 'お問い合わせはありません'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onStatusChange={handleStatusChange}
                isUpdating={updatingContactId === contact.id}
              />
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
