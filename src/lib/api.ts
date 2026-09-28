const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001';

// ---- واجهات بيانات التدقيق (Audit Interfaces) ----

export interface HadithSource {
  provider?: string;
  book?: string;
  hadith_number?: string;
  grade?: string;
  context_summary?: string;
  verification_url?: string;
  reference_url?: string;
}

export interface HadithTranslationDetail {
  title: string;
  text: string;
  context: string;
}

export interface HadithTranslations {
  ar?: HadithTranslationDetail;
  en?: HadithTranslationDetail;
  id?: HadithTranslationDetail;
}

export interface AuditResponse {
  status: 'success' | 'warning' | 'failed';
  accuracy_score: number; // 100, 90, 20
  audit_note: string;
  sources: HadithSource[];
  translations: HadithTranslations;
}

export interface SavedProjectItem {
  id?: number | string;
  original_text: string;
  accuracy_score: number;
  sources_data: any;
  adapted_translations: any;
  created_at: string;
  is_guest?: boolean;
}

// ---- خدمة التدقيق الرئيسية (Audit Engine Service) ----

export const auditHadithText = async (text: string): Promise<AuditResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `خطأ في خادم التدقيق: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Audit API Error:', error);
    return {
      status: 'failed',
      accuracy_score: 0,
      audit_note: 'تعذر الاتصال بخادم التدقيق. يُرجى التأكد من تشغيل الباك إند.',
      sources: [],
      translations: {},
    };
  }
};

// ---- إدارة جلسة المستخدم ----

export const getStoredToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('asl_access_token');
  }
  return null;
};

export const setStoredToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('asl_access_token', token);
  }
};

export const removeStoredToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('asl_access_token');
  }
};

// ---- إدارة مشاريع الزائر (Guest Mode) ----

export const getGuestProjects = (): SavedProjectItem[] => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem('asl_guest_projects');
    return data ? JSON.parse(data) : [];
  }
  return [];
};

export const saveGuestProject = (project: Omit<SavedProjectItem, 'id' | 'created_at' | 'is_guest'>) => {
  const existing = getGuestProjects();
  const newProject: SavedProjectItem = {
    ...project,
    id: 'guest_' + Date.now(),
    created_at: new Date().toISOString(),
    is_guest: true,
  };
  const updated = [newProject, ...existing];
  localStorage.setItem('asl_guest_projects', JSON.stringify(updated));
  return newProject;
};

export const clearGuestProjects = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('asl_guest_projects');
  }
};

// ---- خدمات المزامنة والباك إند (FastAPI) ----

export const registerUser = async (email: string, password: string, fullName?: string) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'فشل إنشاء الحساب، تأكدي من صحة البيانات');
  }
  return response.json();
};

export const loginUser = async (email: string, password: string) => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'اسم المستخدم أو كلمة المرور غير صحيحة');
  }
  return response.json();
};

export const getCurrentUserProfile = async () => {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      removeStoredToken();
      return null;
    }
    return response.json();
  } catch (e) {
    return null;
  }
};

export const saveProject = async (
  originalText: string,
  accuracyScore: number,
  sourcesData: any,
  adaptedTranslations: any
) => {
  const token = getStoredToken();
  if (!token) throw new Error('لا يوجد رمز دخول');

  const response = await fetch(`${API_BASE_URL}/api/v1/projects/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      original_text: originalText,
      accuracy_score: accuracyScore,
      sources_data: sourcesData,
      adapted_translations: adaptedTranslations,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'تعذر حفظ المشروع في السحابة');
  }
  return response.json();
};

export const getUserProjects = async () => {
  const token = getStoredToken();
  if (!token) return [];

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/projects/my-projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    return response.json();
  } catch (e) {
    return [];
  }
};

export const syncGuestProjectsToCloud = async () => {
  const guestProjects = getGuestProjects();
  if (guestProjects.length === 0) return;

  for (const proj of guestProjects) {
    try {
      await saveProject(
        proj.original_text,
        proj.accuracy_score,
        proj.sources_data,
        proj.adapted_translations
      );
    } catch (e) {
      console.error('فشلت مزامنة أحد المشاريع:', e);
    }
  }
  clearGuestProjects();
};