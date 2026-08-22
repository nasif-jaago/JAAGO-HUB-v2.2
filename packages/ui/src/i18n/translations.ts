export type SupportedLanguage = 'en' | 'bn';

export const i18nDictionary: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'My Dashboard',
    'nav.overview': 'Overview',
    'nav.workflows': 'Workflows & Approvals',
    'nav.reports': 'Reports & Analytics',
    'nav.modules': 'Modules Manager',
    'nav.logs': 'System Logs',
    'nav.control_center': 'System Control Center',
    'nav.api_keys': 'API Settings',
    'nav.integrations': 'AI Agent & Integrations',
    'nav.sign_out': 'Sign Out',

    // Dashboard & Metrics
    'dash.welcome': 'JAAGO Foundation ERP Platform',
    'dash.pending_approvals': 'Pending Approvals',
    'dash.approved_month': 'Approved This Month',
    'dash.active_volunteers': 'Active Volunteers',
    'dash.budget_utilized': 'Budget Utilized',
    'dash.system_healthy': 'All Systems Operational',

    // Actions & Buttons
    'action.approve': 'Approve & Advance',
    'action.reject': 'Reject Request',
    'action.download_csv': 'Download Signed CSV',
    'action.generate_key': 'Generate API Key',
    'action.search_placeholder': 'Search staff, workflows, modules, reports...',
    'action.save': 'Save Changes',
    'action.close': 'Close',

    // Status Badges
    'status.active': 'Active',
    'status.pending': 'Pending',
    'status.approved': 'Approved',
    'status.rejected': 'Rejected',
    'status.clean': 'Clean',
    'status.quarantined': 'Quarantined',
  },
  bn: {
    // Navigation
    'nav.dashboard': 'আমার ড্যাশবোর্ড',
    'nav.overview': 'সারসংক্ষেপ',
    'nav.workflows': 'কর্মপ্রবাহ ও অনুমোদন',
    'nav.reports': 'রিপোর্ট ও বিশ্লেষণ',
    'nav.modules': 'মডিউল ম্যানেজার',
    'nav.logs': 'সিস্টেম লগ',
    'nav.control_center': 'সিস্টেম কন্ট্রোল সেন্টার',
    'nav.api_keys': 'এপিআই সেটিংস',
    'nav.integrations': 'এআই এজেন্ট ও ইন্টিগ্রেশন',
    'nav.sign_out': 'লগ আউট',

    // Dashboard & Metrics
    'dash.welcome': 'জাগো ফাউন্ডেশন ইআরপি প্ল্যাটফর্ম',
    'dash.pending_approvals': 'অনুমোদনের অপেক্ষায়',
    'dash.approved_month': 'এই মাসে অনুমোদিত',
    'dash.active_volunteers': 'সক্রিয় ভলান্টিয়ার',
    'dash.budget_utilized': 'ব্যয়িত বাজেট',
    'dash.system_healthy': 'সকল সিস্টেম সচল',

    // Actions & Buttons
    'action.approve': 'অনুমোদন ও অগ্রসর করুন',
    'action.reject': 'প্রত্যাখ্যান করুন',
    'action.download_csv': 'সিএসভি ডাউনলোড করুন',
    'action.generate_key': 'এপিআই কি তৈরি করুন',
    'action.search_placeholder': 'কর্মী, রিকুইজিশন, মডিউল বা রিপোর্ট খুঁজুন...',
    'action.save': 'সংরক্ষণ করুন',
    'action.close': 'বন্ধ করুন',

    // Status Badges
    'status.active': 'সক্রিয়',
    'status.pending': 'অপেক্ষমান',
    'status.approved': 'অনুমোদিত',
    'status.rejected': 'প্রত্যাখ্যাত',
    'status.clean': 'নিরাপদ',
    'status.quarantined': 'কোয়ারেন্টাইন',
  },
};

export function translate(key: string, lang: SupportedLanguage = 'en'): string {
  const dict = i18nDictionary[lang] || i18nDictionary.en;
  return dict[key] || i18nDictionary.en[key] || key;
}
