export type AdminNotificationItem = Readonly<{ id: string; title: string; group: string; href: string | null; createdAt: string; isRead: boolean; requiresAttention: boolean }>;
export type NotificationFeed = Readonly<{ items: readonly AdminNotificationItem[]; unreadCount: number; nextCursor: string | null; toastCandidates: readonly AdminNotificationItem[] }>;
