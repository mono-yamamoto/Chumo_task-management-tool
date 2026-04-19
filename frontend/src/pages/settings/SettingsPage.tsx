import { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { SettingsNav } from './components/SettingsNav';
import { ProfileTab } from './components/ProfileTab';
import { IntegrationsTab } from './components/IntegrationsTab';
// TODO: Web Push 実装後に復活
// import { NotificationsTab } from './components/NotificationsTab';
import { AdminTab } from './components/AdminTab';

export type SettingsTab = 'profile' | 'integrations' | 'notifications' | 'admin';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  return (
    <div className="flex h-full flex-col">
      <Header title="設定">
        <span />
      </Header>
      <div className="flex flex-1 overflow-hidden">
        <SettingsNav activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'integrations' && <IntegrationsTab />}
          {/* TODO: Web Push 実装後に復活 */}
          {/* {activeTab === 'notifications' && <NotificationsTab />} */}
          {activeTab === 'admin' && <AdminTab />}
        </div>
      </div>
    </div>
  );
}
