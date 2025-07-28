export type PageKey = 'login' | 'signup' | 'dashboard' | 'new-screening' | 'results' | 'settings' | 'database';

export interface NavigationItem {
  key: PageKey;
  label: string;
  icon: string;
  active?: boolean;
}