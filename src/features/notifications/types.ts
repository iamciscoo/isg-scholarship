export type AccountNotification = {
  id: string;
  title: string;
  body: string;
  link: string;
  created_at: string;
  is_read: boolean;
};
export type ReceiptTask = { id: string; title: string; link: string; replacement: boolean };
export type Inbox = {
  items: AccountNotification[];
  unread: number;
  receiptTasks?: ReceiptTask[];
  receiptTaskCount?: number;
};
