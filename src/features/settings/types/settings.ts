export type SettingsSectionId = 'appearance' | 'layout' | 'spaces' | 'widgets' | 'vectors' | 'api' | 'about';

export interface SettingsNavigationItem {
  id: SettingsSectionId;
  icon: string;
  label: string;
  description: string;
}
