'use client';

import { useState, useEffect, useRef } from 'react';
import AuthModal from '@/components/AuthModal';
import {
  getCurrentUserProfile,
  removeStoredToken,
  saveProject,
  saveGuestProject,
  getGuestProjects,
  getUserProjects,
  auditHadithText,
  SavedProjectItem,
} from '@/lib/api';

interface AuditResponse {
  status: string;
  accuracy_score: number;
  audit_note?: string;
  sources: Array<{
    book: string;
    hadith_number: string;
    grade: string;
  }>;
  translations: {
    ar: { title: string; text: string; context: string };
    en: { title: string; text: string; context: string };
    id: { title: string; text: string; context: string };
  };
}

const PRESET_EXAMPLES = [
  { label: 'حديث الإيثار (100%)', text: 'لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه' },
  { label: 'حديث تقوى الله (100%)', text: 'اتق الله حيثما كنت واتبع السيئة الحسنة تمحها' },
  { label: 'تجربة خطأ إملائي (90%)', text: 'اتق الله حيثما كنت واتبع السيئه الحسنه تمحها' },
  { label: 'قول مشهور (20%)', text: 'النظافة من الإيمان' },
];

export default function Home() {
  const [text, setText] = useState('لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResponse | null>(null);

  const [selectedLang, setSelectedLang] = useState<'ar' | 'en' | 'id'>('ar');
  const [cardAspect, setCardAspect] = useState<'1:1' | '9:16' | '16:9'>('1:1');
  const [cardTheme, setCardTheme] = useState<'emerald' | 'gold' | 'navy' | 'white'>('emerald');
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState<'all' | '100' | 'warning'>('all');

  const cardRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const [savedProjectsList, setSavedProjectsList] = useState<SavedProjectItem[]>([]);

  const loadProjects = async (user = currentUser) => {
    try {
      if (user) {
        const cloudProjects = await getUserProjects();
        setSavedProjectsList(cloudProjects);
      } else {
        const guestProjects = getGuestProjects();
        setSavedProjectsList(guestProjects);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    getCurrentUserProfile().then((user) => {
      if (user) {
        setCurrentUser(user);
        loadProjects(user);
      } else {
        loadProjects(null);
      }
    });
  }, []);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToastMsg({ text: message, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleLogout = () => {
    removeStoredToken();
    setCurrentUser(null);
    loadProjects(null);
    showToast('تم تسجيل الخروج بنجاح', 'info');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomLogo(reader.result as string);
        showToast('تم تطبيق شعار المؤسسة على البطاقة بنجاح! 🏷️');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyText = (contentToCopy: string) => {
    if (!contentToCopy) return;
    navigator.clipboard.writeText(contentToCopy);
    showToast('تم نسخ النص المكيّف الشريف إلى الحافظة بنجاح! 📋');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAudit();
    }
  };

  const cleanTitle = (title: string) => {
    if (!title) return 'حديث شريف';
    return title.replace(/^(الحديث\s+[\u0600-\u06FF\s]+\s*:\s*|باب\s+)/, '').trim();
  };

  const runLocalExactAudit = (targetText: string): AuditResponse => {
    const rawClean = targetText.trim();

    const flex = rawClean
      .replace(/[\u0617-\u061A\u064B-\u0652]/g, '')
      .replace(/[إأآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ـ+/g, '')
      .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const strict = rawClean
      .replace(/[\u0617-\u061A\u064B-\u0652]/g, '')
      .replace(/[إأآٱ]/g, 'ا')
      .replace(/ـ+/g, '')
      .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const popularSayings = [
      'النظافه من الايمان',
      'حب الوطن من الايمان',
      'اطلبوا العلم ولو في الصين',
      'خير البر عاجله',
      'الاقربون اولى بالمعروف',
    ];

    if (flex.length >= 3) {
      for (const saying of popularSayings) {
        if (flex.includes(saying) || saying.includes(flex)) {
          return {
            status: 'failed',
            accuracy_score: 20,
            audit_note: 'تنبيه: قول مشهور شائع على الألسنة، لم يثبت كحديث نبوي مرفوع في كتب السنة.',
            sources: [{ book: 'تنبيه الفحص الرقمي', hadith_number: '-', grade: 'قول مشهور (غير ثابت)' }],
            translations: null as any,
          };
        }
      }
    }

    const localDb = [
      {
        book: 'صحيح مسلم',
        number: '8',
        grade: 'صحيح مسلم',
        title: 'مراتب الدين (الإسلام والإيمان والإحسان)',
        text: 'بَيْنَمَا نَحْنُ عِنْدَ رَسُولِ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ ذَاتَ يَوْمٍ إِذْ طَلَعَ عَلَيْنَا رَجُلٌ شَدِيدُ بَيَاضِ الثَّيَابِ شَدِيدُ سَوَادِ الشَّعَرِ',
        contextAr: 'حديث جبريل الشهير الذي يبين أركان الإسلام، وأركان الإيمان، ومقام الإحسان، وأشارات الساعة.',
        contextEn: 'While we were one day sitting with the Messenger of Allah...',
        contextId: 'Ketika kami sedang duduk bersama Rasulullah SAW...',
      },
      {
        book: 'سنن الترمذي',
        number: '2317',
        grade: 'حديث حسن',
        title: 'ترك ما لا يعني',
        text: 'مِنْ حُسْنِ إِسْلاَمِ الْمَرْءِ تَرْكُهُ مَا لاَ يَعْنِيهِ',
        contextAr: 'أصل عظيم في الأدب والسلوك وشغل الوقت بما ينفع الإنسان في دينه ودنياه.',
        contextEn: "Part of the perfection of one's Islam is his leaving that which does not concern him.",
        contextId: 'Di antara kebaikan Islam seseorang adalah meninggalkan apa yang tidak berguna baginya.',
      },
      {
        book: 'صحيح مسلم',
        number: '1955',
        grade: 'صحيح مسلم',
        title: 'الأمر بالإحسان في كل شيء',
        text: 'إِنَّ اللَّهَ كَتَبَ الإِحْسَانَ عَلَى كُلِّ شَيْءٍ فَإِذَا قَتَلْتُمْ فَأَحْسِنُوا القِتْلَةَ وَإِذَا ذَبَحْتُمْ فَأَحْسِنُوا الذَّبْحَ',
        contextAr: 'قاعدة إسلامية شاملة تتطلب إتقان العمل والإحسان والرحمة حتى للكائنات والذبائح.',
        contextEn: 'Verily Allah has prescribed proficiency and goodness in all things.',
        contextId: 'Sesungguhnya Allah telah mewajibkan berbuat ihsan atas segala sesuatu.',
      },
      {
        book: 'صحيح مسلم',
        number: '43',
        grade: 'صحيح مسلم',
        title: 'الدين النصيحة',
        text: 'الدِّينُ النَّصِيحَةُ قُلْنَا لِمَنْ قَالَ لِلَّهِ وَلِكِتَابِهِ وَلِرَسُولِهِ وَلأَئِمَّةِ الْمُسْلِمِينَ وَعَامَّتِهِمْ',
        contextAr: 'النصيحة عماد الدين وقوامه، وتكون بالإخلاص لله والتزام شرعه والنصح لعامة المسلمين وخاصتهم.',
        contextEn: 'Religion is sincerity and good counsel (Nasiha)...',
        contextId: 'Agama adalah nasihat. Kami bertanya: Untuk siapa?...',
      },
      {
        book: 'صحيح البخاري',
        number: '2697',
        grade: 'صحيح مجمع عليه',
        title: 'النهي عن الإحداث في الدين',
        text: 'مَنْ أَحْدَثَ فِي أَمْرِنَا هَذَا مَا لَيْسَ فِيهِ فَهُوَ رَدٌّ',
        contextAr: 'أصل عظيم في رد البدع والمحدثات في العبادات ووجوب الاتباع والاقتداء بالسنّة.',
        contextEn: 'He who innovates something in this matter of ours that is not of it will have it rejected.',
        contextId: 'Barangsiapa yang membuat perkara baru dalam urusan kami ini...',
      },
      {
        book: 'صحيح البخاري',
        number: '6018',
        grade: 'صحيح مجمع عليه',
        title: 'إكرام الجار والضيف والكلمة الطيبة',
        text: 'مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ وَمَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيُكْرِمْ جَارَهُ وَمَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيُكْرِمْ ضَيْفَهُ',
        contextAr: 'من مظاهر الإيمان الصادق ضبط اللسان، وإكرام الجار، وحسن استضافة الضيف.',
        contextEn: 'Let him who believes in Allah and the Last Day speak good or remain silent...',
        contextId: 'Barangsiapa yang beriman kepada Allah dan hari akhir hendaklah ia berkata baik...',
      },
      {
        book: 'صحيح البخاري',
        number: '10',
        grade: 'صحيح مجمع عليه',
        title: 'حفظ اللسان واليد وأثر السلامة',
        text: 'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ',
        contextAr: 'يحدد الحديث المعيار العملي الحقيقي للمسلم في سلامة الناس من أذاه القولي والفعلي.',
        contextEn: 'A Muslim is the one from whose tongue and hands Muslims are safe.',
        contextId: 'Seorang Muslim adalah orang yang membuat orang Muslim lainnya selamat...',
      },
      {
        book: 'سنن الترمذي',
        number: '1987',
        grade: 'حسن صحيح',
        title: 'تقوى الله واتباع السيئة الحسنة',
        text: 'اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ وَأَتْبِعِ السَّيِّئَةَ الْحَسَنَةَ تَمْحُهَا وَخَالِقِ النَّاسَ بِخُلُقٍ حَسَنٍ',
        contextAr: 'وصية عظيمة ترتكز على تقوى الله في السر والعلن، ومحو الخطايا بالصالحات، ومعاملة الناس بحسن الخلق.',
        contextEn: 'Fear Allah wherever you are, and follow up a bad deed with a good deed...',
        contextId: 'Bertakwalah kepada Allah di mana saja engkau berada...',
      },
      {
        book: 'صحيح مسلم',
        number: '1015',
        grade: 'صحيح مسلم',
        title: 'أسباب إجابة الدعاء وأكل الحلال',
        text: 'إِنَّ اللَّهَ طَيِّبٌ لاَ يَقْبَلُ إِلاَّ طَيِّبًا وَإِنَّ اللَّهَ أَمَرَ الْمُؤْمِنِينَ بِمَا أَمَرَ بِهِ الْمُرْسَلِينَ',
        contextAr: 'بيان اشتراط الكسب الحلال والمطعم الطيب لقبول الدعاء والأعمال الصالحة عند الله.',
        contextEn: 'Allah the Almighty is Pure and Accepts only that which is pure...',
        contextId: "Sesungguhnya Allah Ta'ala itu maha baik, tidak menerima kecuali yang baik...",
      },
      {
        book: 'صحيح البخاري',
        number: '6120',
        grade: 'صحيح البخاري',
        title: 'الحياء من الإيمان',
        text: 'إِنَّ مِمَّا أَدْرَكَ النَّاسُ مِنْ كَلاَمِ النُّبُوَّةِ الأُولَى إِذَا لَمْ تَسْتَحْيِ فَاصْنَعْ مَا شِئْتَ',
        contextAr: 'بيان فضيلة خلق الحياء وأنه الضابط الخلاقي لسلوك الإنسان واقترافه الأفعال.',
        contextEn: 'Verily, one of the sayings of the early Prophets: If you do not feel ashamed, then do as you wish.',
        contextId: 'Sesungguhnya di antara perkataan kenabian pertama: Jika engkau tidak malu...',
      },
      {
        book: 'صحيح البخاري',
        number: '3208',
        grade: 'صحيح مجمع عليه',
        title: 'مراحل خلق الإنسان والقدر',
        text: 'إِنَّ أَحَدَكُمْ يُجْمَعُ خَلْقُهُ فِي بَطْنِ أُمِّهِ أَرْبَعِينَ يَوْمًا ثُمَّ يَكُونُ عَلَقَةً مِثْلَ ذَلِكَ ثُمَّ يَكُونُ مُضْغَةً مِثْلَ ذَلِكَ',
        contextAr: 'بيان أطوار خلق الإنسان في الرحم، وكتابة أرزاقه وأجله وعمله وهو في بطن أمه.',
        contextEn: 'Verily the creation of each one of you is brought together in his mother womb...',
        contextId: 'Sesungguhnya setiap kalian dikumpulkan penciptaannya dalam perut ibunya...',
      },
      {
        book: 'صحيح البخاري',
        number: '25',
        grade: 'صحيح مجمع عليه',
        title: 'حرمة دم المسلم وماله',
        text: 'أُمِرْتُ أَنْ أُقَاتِلَ النَّاسَ حَتَّى يَشْهَدُوا أَنْ لاَ إِلَهَ إِلاَّ اللَّهُ وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ وَيُقِيمُوا الصَّلاَةَ وَيُؤْتُوا الزَّكَاةَ',
        contextAr: 'بيان أحكام العصمة في الإسلام للشخص وماله ودمه إذا أظهر شعائر الإسلام.',
        contextEn: 'I have been commanded to fight the people until they testify that there is no deity worthy of worship except Allah...',
        contextId: 'Aku diperintahkan untuk memerangi manusia sampai mereka bersaksi bahwa tidak ada tuhan selain Allah...',
      },
      {
        book: 'صحيح البخاري',
        number: '6878',
        grade: 'صحيح مجمع عليه',
        title: 'حرمة النفس المسلمة',
        text: 'لاَ يَحِلُّ دَمُ امْرِئٍ مُسْلِمٍ يَشْهَدُ أَنْ لاَ إِلَهَ إِلاَّ اللَّهُ وَأَنِّي رَسُولُ اللَّهِ إِلاَّ بِإِحْدَى ثَلاَثٍ الثَّيِّبُ الزَّانِي وَالنَّفْسُ بِالنَّفْسِ وَالتَّارِكُ لِدِينِهِ الْمُفَارِقُ لِلْجَمَاعَةِ',
        contextAr: 'بيان عظم حرمة النفس المسلمة واستثناء حالات القضاء الشرعي المحدد.',
        contextEn: 'The blood of a Muslim who confesses that none has the right to be worshipped but Allah cannot be lawfully shed...',
        contextId: 'Tidak halal darah seorang muslim yang bersaksi bahwa tidak ada tuhan selain Allah...',
      },
      {
        book: 'صحيح البخاري',
        number: '1',
        grade: 'صحيح مجمع عليه',
        title: 'الإخلاص والنية',
        text: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى',
        contextAr: 'أساس قبول الأعمال الصالحة ومدار قبولها مرتبط بإخلاص النية لله تعالى.',
        contextEn: 'Actions are judged by intentions, and every person will get what he intended.',
        contextId: 'Segala amal perbuatan tergantung pada niatnya, dan setiap orang akan mendapatkan sesuai apa yang ia niatkan.',
      },
      {
        book: 'سنن الترمذي',
        number: '2518',
        grade: 'صحيح سنن الترمذي',
        title: 'ترك الشبهات والورع',
        text: 'دَعْ مَا يَرِيبُكَ إِلَى مَا لاَ يَرِيبُكَ',
        contextAr: 'قاعدة جليلة في استبراء الدين والطمأنينة النفسية بترك ما يشك الإنسان في حليته إلى ما يتيقن طهارته وحليته.',
        contextEn: 'Leave that which makes you doubt for that which does not make you doubt.',
        contextId: 'Tinggalkanlah apa yang meragukanmu kepada apa yang tidak meragukanmu.',
      },
      {
        book: 'صحيح البخاري',
        number: '52',
        grade: 'صحيح مجمع عليه',
        title: 'الحلال بين والحرام بين',
        text: 'إِنَّ الْحَلاَلَ بَيِّنٌ وَإِنَّ الْحَرَامَ بَيِّنٌ وَبَيْنَهُمَا أُمُورٌ مُشْتَبِهَاتٌ لاَ يَعْلَمُهُنَّ كَثِيرٌ مِنَ النَّاسِ',
        contextAr: 'قاعدة شرعية في اجتناب الشبهات والورع لسلامة الدين والعرض، وصلاح القلب بصلاح أعماله.',
        contextEn: 'That which is lawful is clear and that which is unlawful is clear, and between the two of them are doubtful matters...',
        contextId: 'Sesungguhnya yang halal itu jelas dan yang haram itu jelas, dan di antara keduanya terdapat perkara-perkara yang syubhat...',
      },
      {
        book: 'صحيح البخاري',
        number: '8',
        grade: 'صحيح مجمع عليه',
        title: 'أركان الإسلام والدعائم الخمس',
        text: 'بُنِيَ الإِسْلاَمُ عَلَى خَمْسٍ شَهَادَةِ أَنْ لاَ إِلَهَ إِلاَّ اللَّهُ وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ وَإِقَامِ الصَّلاَةِ وَإِيتَاءِ الزَّكَاةِ وَالْحَجِّ وَصَوْمِ رَمَضَانَ',
        contextAr: 'بيان الأركان والدعائم الخمس الأساسية التي يقوم عليها بنيان الدين الإسلامي.',
        contextEn: 'Islam is built upon five pillars: testifying that there is no god but Allah...',
        contextId: 'Islam dibangun di atas lima perkara: bersaksi bahwa tidak ada tuhan selain Allah...',
      },
      {
        book: 'صحيح البخاري',
        number: '6116',
        grade: 'صحيح البخاري',
        title: 'النهي عن الغضب وضبط النفس',
        text: 'لاَ تَغْضَبْ فَرَدَّدَ مِرَارًا قَالَ لاَ تَغْضَبْ',
        contextAr: 'وصية جامعة من النبي صلى الله عليه وسلم بالسيطرة على النفس والابتعاد عن أسباب الغضب ونزغاته.',
        contextEn: 'Do not become angry. The man repeated his request several times...',
        contextId: 'Jangan marah. Orang itu mengulangi permintaannya beberapa kali...',
      },
      {
        book: 'صحيح البخاري',
        number: '7288',
        grade: 'صحيح مجمع عليه',
        title: 'التكليف بما يستطاع ورفع الحرج',
        text: 'مَا نَهَيْتُكُمْ عَنْهُ فَاجْتَنِبُوهُ وَمَا أَمَرْتُكُمْ بِهِ فَأْتُوا مِنْهُ مَا اسْتَطَعْتُمْ',
        contextAr: 'قاعدة رفع الحرج والتيسير في الشريعة الإسلامية، وأن الأوامر تُنفذ بحسب استطاعة المكلف.',
        contextEn: 'What I have forbidden for you, avoid; and what I have ordered you to do...',
        contextId: 'Apa yang aku larang untuk kalian maka jauhilah, dan apa yang aku perintahkan kepada kalian...',
      },
      {
        book: 'صحيح البخاري',
        number: '13',
        grade: 'صحيح مجمع عليه',
        title: 'محبة الخير للمؤمنين والإيثار',
        text: 'لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',
        contextAr: 'يرسخ هذا الحديث أصل إسلامياً أصيلاً في سمو الأخلاق والإيثار ونفي كمال الإيمان عمن يحتكر الخير لنفسه دون إخوانه.',
        contextEn: 'None of you truly believes until he loves for his brother what he loves for himself.',
        contextId: 'Tidak sempurna iman salah seorang di antara kalian hingga ia menyukai bagi saudaranya...',
      },
      {
        book: 'سنن الترمذي',
        number: '2516',
        grade: 'حسن صحيح',
        title: 'حفظ الله والتوكل عليه',
        text: 'احْفَظِ اللَّهَ يَحْفَظْكَ احْفَظِ اللَّهَ تَجِدْهُ تُجَاهَكَ إِذَا سَأَلْتَ فَاسْأَلِ اللَّهَ وَإِذَا اسْتَعَنْتَ فَاسْتَعِنْ بِاللَّهِ',
        contextAr: 'من أعظم أحاديث التوحيد والتوكل والاستعانة بالله وحده وحفظ حدوده وأوامره.',
        contextEn: 'Be mindful of Allah and Allah will protect you. Be mindful of Allah and you will find Him in front of you...',
        contextId: 'Jagalah Allah niscaya Dia akan menjagamu. Jagalah Allah niscaya engkau akan mendapati-Nya di hadapanmu...'
      }
    ];

    for (const item of localDb) {
      const canonicalFlex = item.text
        .replace(/[\u0617-\u061A\u064B-\u0652]/g, '')
        .replace(/[إأآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/ـ+/g, '')
        .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (canonicalFlex.includes(flex) || flex.includes(canonicalFlex)) {
        const canonicalStrict = item.text
          .replace(/[\u0617-\u061A\u064B-\u0652]/g, '')
          .replace(/[إأآٱ]/g, 'ا')
          .replace(/ـ+/g, '')
          .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        const isStrictMatch = canonicalStrict.includes(strict) || strict.includes(canonicalStrict);

        return {
          status: isStrictMatch ? 'success' : 'warning',
          accuracy_score: isStrictMatch ? 100 : 90,
          audit_note: isStrictMatch
            ? 'مطابقة تامة وموثقة مع أصل الحديث الشريف.'
            : 'تنبيه: النص مطابق للحديث أصلًا، لكن توجد أخطاء إملائية (مثل ة/هـ).',
          sources: [{ book: item.book, hadith_number: item.number, grade: item.grade }],
          translations: {
            ar: { title: cleanTitle(item.title), text: item.text, context: item.contextAr },
            en: { title: 'Verified Hadith Context', text: item.contextEn, context: 'Contextual translation verified against canonical records.' },
            id: { title: 'Konteks Hadis Terverifikasi', text: item.contextId, context: 'Terjemahan kontekstual terverifikasi.' },
          },
        };
      }
    }

    return {
      status: 'failed',
      accuracy_score: 20,
      audit_note: 'تنبيه: النص الشرعي غير مدرج في نطاق قاعدة البيانات حالياً (مرحلة MVP تضم الأمهات والجامع).',
      sources: [{ book: 'تنبيه الفحص الرقمي', hadith_number: '-', grade: 'غير مدرج بالنظام' }],
      translations: null as any,
    };
  };

  const handleAudit = async (customText?: string) => {
    const targetText = (customText || text).trim();
    if (!targetText) return;

    if (customText) setText(targetText);

    setIsAuditing(true);
    setErrorMsg('');

    try {
      const data = await auditHadithText(targetText);

      if (data && data.accuracy_score > 0) {
        if (data.translations && data.translations.ar && data.translations.ar.title) {
          data.translations.ar.title = cleanTitle(data.translations.ar.title);
        }
        setAuditResult(data as AuditResponse);

        if (data.accuracy_score === 100) {
          showToast('تم الفحص والتخريج الشرعي بنجاح! ✨');
        } else if (data.accuracy_score === 90) {
          showToast('تنبيه: تم كشف أخطاء إملائية في الأحرف الأساسية', 'info');
        } else {
          showToast(data.audit_note || 'تنبيه في نتيجة الفحص الشرعي', 'info');
        }

        setIsAuditing(false);
        return;
      }
    } catch (err) {
      console.warn('Backend server connection fallback executing local audit:', err);
    }

    setTimeout(() => {
      const localResult = runLocalExactAudit(targetText);
      setAuditResult(localResult);

      if (localResult.accuracy_score === 100) {
        showToast('تم الفحص والتخريج الشرعي بنجاح! ✨');
      } else if (localResult.accuracy_score === 90) {
        showToast('تنبيه: تم كشف أخطاء إملائية في الأحرف الأساسية', 'info');
      } else {
        showToast(localResult.audit_note || 'تنبيه في نتيجة الفحص', 'info');
      }

      setIsAuditing(false);
    }, 150);
  };

  const handleSaveProject = async () => {
    if (!auditResult) return;
    setIsSaving(true);

    try {
      if (currentUser) {
        await saveProject(
          text,
          auditResult.accuracy_score,
          auditResult.sources,
          auditResult.translations
        );
        showToast('تم حفظ البطاقة بنجاح في حسابك السحابي! ☁️');
      } else {
        saveGuestProject({
          original_text: text,
          accuracy_score: auditResult.accuracy_score,
          sources_data: auditResult.sources,
          adapted_translations: auditResult.translations,
        });
        showToast('تم الحفظ بنجاح كزائر! أنشئ حساباً لمزامنتها سحابياً 💾');
      }
      await loadProjects();
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء حفظ البطاقة', 'info');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPng = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);

    try {
      const { toPng } = await import('html-to-image');
      const node = cardRef.current;

      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 3,
        // فلترة واستبعاد الأزرار ذات الفئة no-export من الصورة المصدرة
        filter: (domNode) => {
          return !(domNode instanceof HTMLElement && domNode.classList.contains('no-export'));
        },
        style: { margin: '0', transform: 'none' },
      });

      const aspectLabel = cardAspect.replace(':', 'x');
      const link = document.createElement('a');
      link.download = `Asl-Verified-Card-${selectedLang}-${aspectLabel}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      showToast(`تم تصدير بطاقة فائقة الدقة (${cardAspect}) بنجاح! 🖼️`);
    } catch (err: any) {
      console.error('Error exporting card:', err);
      showToast('حدث خطأ أثناء تحضير الصورة لتصديرها', 'info');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdfReport = async () => {
    if (!auditResult || !reportRef.current) return;
    setIsExporting(true);

    try {
      const { toPng } = await import('html-to-image');
      const { default: jsPDF } = await import('jspdf');

      const node = reportRef.current;
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
      });

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const imgHeight = (node.offsetHeight * imgWidth) / node.offsetWidth;

      pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Asl-Arabic-Audit-Report-${Date.now()}.pdf`);

      showToast('تم تصدير تقرير الاعتماد الشرعي بالعربية بنجاح! 📄');
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      showToast('حدث خطأ أثناء إنشاء ملف PDF', 'info');
    } finally {
      setIsExporting(false);
    }
  };

  const getThemeClasses = () => {
    switch (cardTheme) {
      case 'gold':
        return 'bg-gradient-to-br from-amber-950 via-amber-900 to-stone-950 text-white border-amber-400/80 shadow-amber-900/20';
      case 'navy':
        return 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white border-slate-600/80 shadow-slate-900/30';
      case 'white':
        return 'bg-white text-slate-900 border-slate-200 shadow-xl';
      case 'emerald':
      default:
        return 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 text-white border-amber-400/60 shadow-emerald-950/30';
    }
  };

  const getCardAspectClasses = () => {
    switch (cardAspect) {
      case '9:16':
        return 'w-full max-w-[360px] min-h-[580px] p-6';
      case '16:9':
        return 'w-full max-w-[560px] min-h-[310px] p-6';
      case '1:1':
      default:
        return 'w-full max-w-[440px] min-h-[440px] p-7';
    }
  };

  const filteredProjects = savedProjectsList.filter((item) => {
    const matchesSearch = item.original_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesScore =
      scoreFilter === 'all'
        ? true
        : scoreFilter === '100'
        ? item.accuracy_score === 100
        : item.accuracy_score < 100;
    return matchesSearch && matchesScore;
  });

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Tajawal:wght@400;500;700;800;900&display=swap"
        rel="stylesheet"
      />

      <main className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-['Tajawal',sans-serif] relative" dir="rtl">
        {toastMsg && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-lg shadow-xl text-xs font-bold border border-slate-700 animate-bounce">
            {toastMsg.text}
          </div>
        )}

        {/* شريط الرأس المؤسسي */}
        <header className="max-w-7xl mx-auto bg-white border border-slate-200/80 rounded-xl p-5 mb-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-emerald-900 text-amber-300 flex items-center justify-center font-black text-2xl shadow-sm border border-amber-400/30 relative">
              أ
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">أَصْل</h1>
                <span className="text-xs text-emerald-800 font-bold dir-ltr">
                  Asl Platform
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                المنصة المؤسسية للتدقيق الشرعي المعتمد والتكييف الثقافي للمحتوى الإسلامي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center">
                  {(currentUser.full_name || currentUser.email)?.[0]?.toUpperCase()}
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    <span className="text-[11px] font-bold text-slate-700">
                      {currentUser.full_name || currentUser.email}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-xs text-slate-400 hover:text-red-600 font-medium transition-all mr-1"
                >
                  خروج
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>حساب زائر (تخزين محلي)</span>
                </div>
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all shadow-sm active:scale-95"
                >
                  تسجيل الدخول للمزامنة
                </button>
              </div>
            )}
          </div>
        </header>

        {/* مساحة العمل المزدوجة */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* القسم الأيمن: مساحة التدقيق الشرعي */}
          <section className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-700"></span>
                  مساحة التدقيق الشرعي
                </h2>

                {auditResult && (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <span className={`w-2 h-2 rounded-full ${
                        auditResult.accuracy_score === 100 
                          ? 'bg-emerald-600' 
                          : auditResult.accuracy_score === 90 
                          ? 'bg-amber-500' 
                          : 'bg-red-500'
                      }`}></span>
                      <span>الموثوقية: {auditResult.accuracy_score}%</span>
                    </div>

                    {auditResult.audit_note && (
                      <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200 max-w-[280px] text-left">
                        💡 {auditResult.audit_note}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-600">
                  النص الشرعي أو الحديث المراد التحقق من صحته:
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  💡 اضغط <kbd className="bg-slate-100 border border-slate-300 rounded px-1 text-[10px] font-mono">⌘+Enter</kbd> للفحص
                </span>
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={4}
                placeholder="يُرجى إدخال أو لصق النص المراد تدقيقه وتخريجه..."
                className="w-full bg-slate-50/70 border border-slate-200 rounded-lg p-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 transition-all resize-none leading-relaxed text-sm font-['Amiri',serif]"
              />

              {/* شرائح الأمثلة الجاهزة */}
              <div className="mt-2.5 mb-1 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-slate-500 font-bold">تجربة سريعة:</span>
                {PRESET_EXAMPLES.map((example, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAudit(example.text)}
                    className="text-[11px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md font-semibold transition-all active:scale-95"
                  >
                    {example.label}
                  </button>
                ))}
              </div>

              {errorMsg && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium leading-relaxed">
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* زر التدقيق الرئيسي */}
              <button
                type="button"
                onClick={() => handleAudit()}
                disabled={isAuditing || !text.trim()}
                className="w-full mt-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3 rounded-lg transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {isAuditing ? (
                  <>
                    <span className="animate-spin text-base">⏳</span> جاري الفحص والتخريج عبر خوارزميات أصل...
                  </>
                ) : (
                  <>
                    <span>🔍</span> فحص الاعتماد والموثوقية الشرعية
                  </>
                )}
              </button>

              {/* نتائج التخريج والمراجع */}
              {auditResult && auditResult.sources && auditResult.sources.length > 0 && (
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <h3 className="text-xs font-bold text-slate-500 mb-3">التخريج والمراجع المعتمدة:</h3>
                  <div className="space-y-2 mb-4">
                    {auditResult.sources.map((source, index) => (
                      <div
                        key={index}
                        className="bg-slate-50 border border-slate-200/60 p-3 rounded-lg flex justify-between items-center text-xs"
                      >
                        <span className="text-slate-900 font-bold">{source.book}</span>
                        <span className="text-slate-500 font-medium">
                          {source.hadith_number !== '-' ? `حديث رقم: ${source.hadith_number}` : ''}
                        </span>

                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <span className={`w-2 h-2 rounded-full ${auditResult.accuracy_score === 100 ? 'bg-emerald-600' : auditResult.accuracy_score === 90 ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                          <span>{source.grade}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {auditResult.accuracy_score === 100 && (
                    <button
                      onClick={handleExportPdfReport}
                      disabled={isExporting}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <span>📄</span>
                      <span>{isExporting ? 'جاري إعداد الوثيقة...' : 'تصدير وثيقة الاعتماد الشرعي (PDF)'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* القسم الأيسر: مساحة التكييف الثقافي */}
          <section className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
            {(!auditResult || auditResult.accuracy_score < 100) && (
              <div className="absolute inset-0 bg-slate-50/95 backdrop-blur-md z-10 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-2xl mb-3 shadow-sm">
                  🔒
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">مساحة التكييف مغلقة</h3>
                <p className="text-xs text-slate-600 max-w-sm leading-relaxed font-medium">
                  لحماية الخطاب الشرعي وضمان الدقة المطلقة، يتطلب نظام{' '}
                  <span className="font-bold text-emerald-800">أَصْل</span> وصول نسبة الموثوقية إلى{' '}
                  <span className="text-emerald-800 font-bold">100%</span> لفتح خيارات التكييف والإنتاج.
                </p>
              </div>
            )}

            <div>
              <div className="flex flex-wrap justify-between items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  مساحة التكييف الثقافي
                </h2>

                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80">
                  <button
                    onClick={() => setSelectedLang('ar')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      selectedLang === 'ar' ? 'bg-emerald-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    العربية
                  </button>
                  <button
                    onClick={() => setSelectedLang('en')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      selectedLang === 'en' ? 'bg-emerald-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setSelectedLang('id')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      selectedLang === 'id' ? 'bg-emerald-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bahasa
                  </button>
                </div>
              </div>

              {/* شريط أدوات التحكم الشكلي */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 mb-5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-500">الثيم:</span>
                    <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200/80">
                      <button
                        onClick={() => setCardTheme('emerald')}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                          cardTheme === 'emerald' ? 'bg-emerald-800 text-white' : 'text-slate-600'
                        }`}
                      >
                        زمردي
                      </button>
                      <button
                        onClick={() => setCardTheme('gold')}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                          cardTheme === 'gold' ? 'bg-amber-800 text-white' : 'text-slate-600'
                        }`}
                      >
                        ذهبي
                      </button>
                      <button
                        onClick={() => setCardTheme('navy')}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                          cardTheme === 'navy' ? 'bg-slate-900 text-white' : 'text-slate-600'
                        }`}
                      >
                        كحلي
                      </button>
                      <button
                        onClick={() => setCardTheme('white')}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                          cardTheme === 'white' ? 'bg-slate-200 text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        أبيض
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-500">المقاس:</span>
                    <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200/80">
                      <button
                        onClick={() => setCardAspect('1:1')}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                          cardAspect === '1:1' ? 'bg-amber-500 text-slate-950' : 'text-slate-600'
                        }`}
                      >
                        1:1
                      </button>
                      <button
                        onClick={() => setCardAspect('9:16')}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                          cardAspect === '9:16' ? 'bg-amber-500 text-slate-950' : 'text-slate-600'
                        }`}
                      >
                        9:16
                      </button>
                      <button
                        onClick={() => setCardAspect('16:9')}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                          cardAspect === '16:9' ? 'bg-amber-500 text-slate-950' : 'text-slate-600'
                        }`}
                      >
                        16:9
                      </button>
                    </div>
                  </div>

                  <label className="cursor-pointer bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all">
                    <span>🏷️</span>
                    <span>{customLogo ? 'تغيير الشعار' : 'رفع الشعار'}</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* بطاقة المعاينة */}
              {auditResult && auditResult.translations && auditResult.translations[selectedLang] && (
                <div className="w-full flex justify-center items-center py-2">
                  <div
                    ref={cardRef}
                    className={`rounded-xl shadow-xl flex flex-col justify-between transition-all duration-300 border ${getThemeClasses()} ${getCardAspectClasses()}`}
                    dir={selectedLang === 'ar' ? 'rtl' : 'ltr'}
                  >
                    <div className="flex justify-between items-center pb-3 border-b border-current/20">
                      <div className="flex items-center gap-2">
                        {customLogo ? (
                          <img src={customLogo} alt="Institutional Logo" className="h-7 w-auto object-contain rounded-md" />
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xs shadow-sm">
                            أ
                          </div>
                        )}
                        <span className="text-xs font-bold tracking-wide opacity-90">
                          {selectedLang === 'ar'
                            ? 'أَصْل | بطاقة معتمدة'
                            : selectedLang === 'en'
                            ? 'ASL AI | Verified Card'
                            : 'ASL AI | Kartu Terverifikasi'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* استخدام فئة no-export لاستبعاد الزر عند التصدير بنجاح */}
                        <button
                          type="button"
                          onClick={() => handleCopyText(auditResult.translations[selectedLang].text)}
                          title="نسخ النص المكيّف"
                          className="no-export bg-black/20 hover:bg-black/40 text-white px-2 py-0.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 active:scale-95"
                        >
                          📋 نسخ النص
                        </button>
                        <span className="text-[10px] font-bold text-emerald-400">✓ موثق 100%</span>
                      </div>
                    </div>

                    <div className="my-auto py-2">
                      <h4
                        className={`font-bold mb-2 leading-snug ${
                          cardTheme === 'white' ? 'text-emerald-900' : 'text-amber-300'
                        } ${cardAspect === '9:16' ? 'text-xl' : 'text-lg'}`}
                      >
                        {auditResult.translations[selectedLang].title}
                      </h4>

                      <p
                        className={`leading-relaxed italic mb-3 rounded-lg border shadow-inner font-['Amiri',serif] ${
                          cardTheme === 'white'
                            ? 'bg-slate-50 border-slate-200 text-slate-900'
                            : 'bg-black/20 border-white/10 text-slate-100'
                        } ${cardAspect === '9:16' ? 'p-4 text-lg' : 'p-3.5 text-base'}`}
                      >
                        "{auditResult.translations[selectedLang].text}"
                      </p>

                      <div
                        className={`rounded-lg border leading-relaxed ${
                          cardTheme === 'white'
                            ? 'bg-slate-100 border-slate-200 text-slate-700'
                            : 'bg-black/40 border-white/10 text-slate-300'
                        } ${cardAspect === '9:16' ? 'p-3.5 text-xs' : 'p-3 text-[11px]'}`}
                      >
                        <span className={`font-bold block mb-1 ${cardTheme === 'white' ? 'text-emerald-800' : 'text-amber-300'}`}>
                          {selectedLang === 'ar' ? 'السياق الثقافي والشرح المعتمد:' : 'Cultural Context & Commentary:'}
                        </span>
                        {auditResult.translations[selectedLang].context}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-current/20 flex justify-between items-center text-[10px] opacity-80">
                      <span className="font-semibold">المصدر: الأمهات والجامع الصحيح</span>
                      <span className="font-mono tracking-wider dir-ltr">asl-ai.com</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={handleSaveProject}
                disabled={isSaving}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold py-3 rounded-lg text-xs transition-all shadow-sm disabled:opacity-50"
              >
                {isSaving ? 'جاري الحفظ...' : currentUser ? '💾 حفظ سحابي' : '💾 حفظ محلي (زائر)'}
              </button>

              <button
                onClick={handleExportPng}
                disabled={isExporting || !auditResult || auditResult.accuracy_score < 100}
                className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3 rounded-lg text-xs transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                {isExporting ? 'جاري التصدير...' : `🖼️ تصدير بطاقة (${cardAspect})`}
              </button>
            </div>
          </section>
        </div>

        {/* سجل المشاريع */}
        <section className="max-w-7xl mx-auto bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b border-slate-100 gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>📚</span> سجل البطاقات والمشاريع المحفوظة
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {currentUser
                  ? 'مشاريعك المحفوظة سحابياً على خوادم أصل'
                  : 'مشاريعك المحفوظة مؤقتاً في متصفحك الحالي (سجل الحساب لمزامنتها)'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 بحث في النصوص..."
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-700 w-full md:w-48 font-medium"
              />
              <select
                value={scoreFilter}
                onChange={(e: any) => setScoreFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-700 font-bold"
              >
                <option value="all">كافة الدرجات</option>
                <option value="100">الموثوقية 100%</option>
                <option value="warning">تحذيرات / أقل من 100%</option>
              </select>
              <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg font-bold">
                النتائج: {filteredProjects.length}
              </span>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <p className="text-xs text-slate-500 font-medium">لا توجد مشاريع مطابقة لمعايير البحث حالياً.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 flex flex-col justify-between hover:border-emerald-300 transition-all"
                >
                  <div>
                    <div className="flex justify-between items-center mb-2 text-[10px] font-bold">
                      <div className="flex items-center gap-1.5 text-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        <span>موثوقية {item.accuracy_score}%</span>
                      </div>
                      {item.is_guest && (
                        <span className="text-amber-800 font-medium">
                          محلي (زائر)
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-800 line-clamp-2 mb-2 leading-relaxed font-['Amiri',serif]">
                      "{item.original_text}"
                    </p>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-200 flex justify-between items-center font-medium">
                    <span suppressHydrationWarning>{new Date(item.created_at).toLocaleDateString('ar-SA')}</span>
                    <button
                      onClick={() => {
                        setText(item.original_text);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-emerald-800 font-bold hover:underline"
                    >
                      إعادة الفحص ↗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* قالب تقرير الـ PDF */}
        <div className="fixed -left-[9999px] top-0 pointer-events-none">
          <div
            ref={reportRef}
            className="w-[800px] bg-white text-slate-900 p-12 font-['Tajawal',sans-serif] border-[12px] border-emerald-900 rounded-xl shadow-none"
            dir="rtl"
          >
            <div className="flex justify-between items-center border-b-2 border-emerald-900 pb-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-900 text-amber-300 font-black text-3xl flex items-center justify-center rounded-xl shadow-sm border border-amber-400/40">
                  أ
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    أَصْل <span className="text-emerald-800 font-normal text-lg dir-ltr inline-block">(Asl AI)</span>
                  </h1>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">تقرير الاعتماد والتدقيق الشرعي المعتمد</p>
                </div>
              </div>
              <div className="text-left font-mono text-xs text-slate-600 leading-relaxed">
                <p suppressHydrationWarning>
                  <span className="font-bold">تاريخ التقرير:</span> {isMounted ? new Date().toLocaleDateString('ar-SA') : ''}
                </p>
                <p>
                  <span className="font-bold">حالة الاعتماد:</span>{' '}
                  <span className="text-emerald-800 font-bold">موثق ومجمع عليه (100%)</span>
                </p>
                <p suppressHydrationWarning>
                  <span className="font-bold">رقم التوثيق الرقمي:</span> #{isMounted ? Date.now().toString().slice(-6) : '000000'}
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-bold text-emerald-950 mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-800"></span>
                النص الشرعي المفحوص والمخرج:
              </h3>
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl text-lg font-['Amiri',serif] italic leading-relaxed text-slate-900 shadow-inner">
                "{text}"
              </div>
            </div>

            {auditResult && auditResult.sources && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-emerald-950 mb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-800"></span>
                  التخريج والمراجع الشرعية المعتمدة:
                </h3>
                <div className="space-y-3">
                  {auditResult.sources.map((s, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex justify-between items-center text-xs font-medium"
                    >
                      <span className="font-bold text-slate-900">
                        {idx + 1}. {s.book}
                      </span>
                      <span className="text-slate-600">
                        {s.hadith_number !== '-' ? `رقم الحديث: ${s.hadith_number}` : ''}
                      </span>
                      <span className="text-emerald-900 font-bold">
                        🟢 {s.grade}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {auditResult && auditResult.translations && auditResult.translations.ar && (
              <div className="mb-10">
                <h3 className="text-sm font-bold text-emerald-950 mb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-800"></span>
                  السياق الثقافي والشرح المعتمد:
                </h3>
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-lg text-xs text-slate-700 leading-relaxed font-medium">
                  <span className="font-bold text-emerald-900 block mb-1">{auditResult.translations.ar.title}:</span>
                  {auditResult.translations.ar.context}
                </div>
              </div>
            )}

            <div className="border-t-2 border-slate-200 pt-6 flex justify-between items-center text-xs text-slate-500">
              <div>
                <p className="font-bold text-slate-900">صادر عن منصة أصل للتدقيق الشرعي والتكييف الثقافي</p>
                <p className="font-mono text-emerald-800 mt-0.5 dir-ltr">asl-ai.com</p>
              </div>
              <div className="border-2 border-emerald-900 text-emerald-950 bg-emerald-50 px-5 py-2.5 rounded-lg font-bold text-center text-xs">
                ✓ خُتم واعتُمد رقمياً عبر محرك أصل
              </div>
            </div>
          </div>
        </div>

        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={(userData) => {
            getCurrentUserProfile().then((user) => {
              setCurrentUser(user);
              loadProjects(user);
            });
            showToast('تم تسجيل الدخول ومزامنة جميع مشاريع الزائر بنجاح! 🎉');
          }}
        />
      </main>
    </>
  );
}