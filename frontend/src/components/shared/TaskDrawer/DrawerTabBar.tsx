import { Tabs, TabList, Tab, TabPanel } from '../../ui/Tabs';
import type { ReactNode } from 'react';

interface DrawerTabBarProps {
  detailContent: ReactNode;
  commentContent: ReactNode;
}

export function DrawerTabBar({ detailContent, commentContent }: DrawerTabBarProps) {
  return (
    <Tabs defaultSelectedKey="detail" className="flex-1 flex flex-col min-h-0">
      <TabList className="px-6">
        <Tab id="detail">タスク詳細</Tab>
        <Tab id="comment">
          コメント
          <span className="h-2 w-2 rounded-full bg-blue-500" />
        </Tab>
      </TabList>
      <TabPanel id="detail" className="flex-1 overflow-y-auto px-6 py-5">
        {detailContent}
      </TabPanel>
      <TabPanel id="comment" className="flex-1 overflow-y-auto px-6 py-5">
        {commentContent}
      </TabPanel>
    </Tabs>
  );
}
