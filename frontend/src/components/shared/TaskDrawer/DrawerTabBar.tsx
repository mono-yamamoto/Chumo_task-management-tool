import { Tabs, TabList, Tab, TabPanel } from '../../ui/Tabs';
import type { ReactNode } from 'react';
import { useUnreadComments } from '../../../hooks/useTaskComments';

interface DrawerTabBarProps {
  taskId?: string | null;
  detailTabLabel?: string;
  detailContent: ReactNode;
  commentContent?: ReactNode;
  /** detail タブパネルにデフォルトの px-6 py-5 を付けるか（デフォルト: true） */
  detailPadding?: boolean;
}

export function DrawerTabBar({
  taskId,
  detailTabLabel = 'タスク詳細',
  detailContent,
  commentContent,
  detailPadding = true,
}: DrawerTabBarProps) {
  const { data: unreadTaskIds } = useUnreadComments();
  const hasUnread = taskId ? (unreadTaskIds?.has(taskId) ?? false) : false;

  return (
    <Tabs defaultSelectedKey="detail" className="flex-1 flex flex-col min-h-0">
      <TabList className="px-6">
        <Tab id="detail">{detailTabLabel}</Tab>
        {commentContent != null && (
          <Tab id="comment">
            コメント
            {hasUnread && <span className="h-2 w-2 rounded-full bg-blue-500" />}
          </Tab>
        )}
      </TabList>
      <TabPanel
        id="detail"
        className={`flex-1 overflow-y-auto ${detailPadding ? 'px-6 py-5' : ''}`}
      >
        {detailContent}
      </TabPanel>
      {commentContent != null && (
        <TabPanel id="comment" className="flex-1 overflow-y-auto px-6 py-5">
          {commentContent}
        </TabPanel>
      )}
    </Tabs>
  );
}
