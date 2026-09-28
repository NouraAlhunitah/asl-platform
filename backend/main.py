import os
import re
import urllib.parse
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Asl AI Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# قراءة إعدادات Supabase من متغيرات البيئة بآمان دون المكاشفة بالمفاتيح
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://homlonmotghfokwvzmlp.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")  # يتم تحميله من ملف .env المحلي
API_URL = f"{SUPABASE_URL}/rest/v1/canonical_hadiths"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# النطاقات المرجعية المعتمدة للربط الإسنادي
DORAR_BASE_URL = "https://dorar.net/hadith/search"
SHAMELA_BASE_URL = "https://shamela.ws/search"

# 1. قائمة الأقوال المشهورة الشائعة (غير الثابتة)
POPULAR_SAYINGS = [
    "النظافة من الايمان",
    "النظافة من الإيمان",
    "حب الوطن من الايمان",
    "حب الوطن من الإيمان",
    "اطلبوا العلم ولو في الصين",
    "خير البر عاجله",
    "الأقربون أولى بالمعروف",
    "الاقربون اولى بالمعروف"
]

# 2. السجل المحلي المعتمد الشامل (MVP Core Dataset)
CANONICAL_DB = [
    {
        "book_id": "صحيح مسلم",
        "hadith_number": "8",
        "grade": "صحيح مسلم",
        "chapter_title": "مراتب الدين (الإسلام والإيمان والإحسان)",
        "matn_diacritized": "بَيْنَمَا نَحْنُ عِنْدَ رَسُولِ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ ذَاتَ يَوْمٍ إِذْ طَلَعَ عَلَيْنَا رَجُلٌ شَدِيدُ بَيَاضِ الثَّيَابِ شَدِيدُ سَوَادِ الشَّعَرِ",
        "summary_explanation_ar": "حديث جبريل الشهير الذي يبين أركان الإسلام، وأركان الإيمان، ومقام الإحسان، وأشارات الساعة.",
        "context_en": "While we were one day sitting with the Messenger of Allah, there appeared before us a man with very white clothing...",
        "context_id": "Ketika kami sedang duduk bersama Rasulullah SAW pada suatu hari, tiba-tiba muncul seorang laki-laki..."
    },
    {
        "book_id": "سنن الترمذي",
        "hadith_number": "2317",
        "grade": "حديث حسن",
        "chapter_title": "ترك ما لا يعني",
        "matn_diacritized": "مِنْ حُسْنِ إِسْلاَمِ الْمَرْءِ تَرْكُهُ مَا لاَ يَعْنِيهِ",
        "summary_explanation_ar": "أصل عظيم في الأدب والسلوك وشغل الوقت بما ينفع الإنسان في دينه ودنياه وترك التدخل فيما لا يخصه.",
        "context_en": "Part of the perfection of one's Islam is his leaving that which does not concern him.",
        "context_id": "Di antara kebaikan Islam seseorang adalah meninggalkan apa yang tidak berguna baginya."
    },
    {
        "book_id": "صحيح مسلم",
        "hadith_number": "1955",
        "grade": "صحيح مسلم",
        "chapter_title": "الأمر بالإحسان في كل شيء",
        "matn_diacritized": "إِنَّ اللَّهَ كَتَبَ الإِحْسَانَ عَلَى كُلِّ شَيْءٍ فَإِذَا قَتَلْتُمْ فَأَحْسِنُوا القِتْلَةَ وَإِذَا ذَبَحْتُمْ فَأَحْسِنُوا الذَّبْحَ",
        "summary_explanation_ar": "قاعدة إسلامية شاملة تتطلب إتقان العمل والإحسان والرحمة حتى للكائنات والذبائح.",
        "context_en": "Verily Allah has prescribed proficiency and goodness in all things.",
        "context_id": "Sesungguhnya Allah telah mewajibkan berbuat ihsan atas segala sesuatu."
    },
    {
        "book_id": "صحيح مسلم",
        "hadith_number": "43",
        "grade": "صحيح مسلم",
        "chapter_title": "الدين النصيحة",
        "matn_diacritized": "الدِّينُ النَّصِيحَةُ قُلْنَا لِمَنْ قَالَ لِلَّهِ وَلِكِتَابِهِ وَلِرَسُولِهِ وَلأَئِمَّةِ الْمُسْلِمِينَ وَعَامَّتِهِمْ",
        "summary_explanation_ar": "النصيحة عماد الدين وقوامه، وتكون بالإخلاص لله والتزام شرعه والنصح لعامة المسلمين وخاصتهم.",
        "context_en": "Religion is sincerity and good counsel (Nasiha)...",
        "context_id": "Agama adalah nasihat. Kami bertanya: Untuk siapa? Beliau menjawab: Untuk Allah..."
    },
    {
        "book_id": "صحيح البخاري",
        "hadith_number": "2697",
        "grade": "صحيح مجمع عليه",
        "chapter_title": "النهي عن الإحداث في الدين",
        "matn_diacritized": "مَنْ أَحْدَثَ فِي أَمْرِنَا هَذَا مَا لَيْسَ فِيهِ فَهُوَ رَدٌّ",
        "summary_explanation_ar": "أصل عظيم في رد البدع والمحدثات في العبادات ووجوب الاتباع والاقتداء بالسنّة.",
        "context_en": "He who innovates something in this matter of ours that is not of it will have it rejected.",
        "context_id": "Barangsiapa yang membuat perkara baru dalam urusan kami ini..."
    },
    {
        "book_id": "صحيح البخاري",
        "hadith_number": "6018",
        "grade": "صحيح مجمع عليه",
        "chapter_title": "إكرام الجار والضيف والكلمة الطيبة",
        "matn_diacritized": "مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ وَمَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيُكْرِمْ جَارَهُ وَمَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيُكْرِمْ ضَيْفَهُ",
        "summary_explanation_ar": "من مظاهر الإيمان الصادق ضبط اللسان، وإكرام الجار، وحسن استضافة الضيف.",
        "context_en": "Let him who believes in Allah and the Last Day speak good or remain silent...",
        "context_id": "Barangsiapa yang beriman kepada Allah dan hari akhir hendaklah ia berkata baik..."
    },
    {
        "book_id": "صحيح البخاري",
        "hadith_number": "10",
        "grade": "صحيح مجمع عليه",
        "chapter_title": "حفظ اللسان واليد وأثر السلامة",
        "matn_diacritized": "الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ",
        "summary_explanation_ar": "يحدد الحديث المعيار العملي الحقيقي للمسلم في سلامة الناس من أذاه القولي والفعلي.",
        "context_en": "A Muslim is the one from whose tongue and hands Muslims are safe.",
        "context_id": "Seorang Muslim adalah orang yang membuat orang Muslim lainnya selamat..."
    },
    {
        "book_id": "سنن الترمذي",
        "hadith_number": "1987",
        "grade": "حسن صحيح",
        "chapter_title": "تقوى الله واتباع السيئة الحسنة",
        "matn_diacritized": "اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ وَأَتْبِعِ السَّيِّئَةَ الْحَسَنَةَ تَمْحُهَا وَخَالِقِ النَّاسَ بِخُلُقٍ حَسَنٍ",
        "summary_explanation_ar": "وصية عظيمة ترتكز على تقوى الله في السر والعلن، ومحو الخطايا بالصالحات، ومعاملة الناس بحسن الخلق.",
        "context_en": "Fear Allah wherever you are, and follow up a bad deed with a good deed...",
        "context_id": "Bertakwalah kepada Allah di mana saja engkau berada..."
    },
    {
        "book_id": "صحيح مسلم",
        "hadith_number": "1015",
        "grade": "صحيح مسلم",
        "chapter_title": "أسباب إجابة الدعاء وأكل الحلال",
        "matn_diacritized": "إِنَّ اللَّهَ طَيِّبٌ لاَ يَقْبَلُ إِلاَّ طَيِّبًا وَإِنَّ اللَّهَ أَمَرَ الْمُؤْمِنِينَ بِمَا أَمَرَ بِهِ الْمُرْسَلِينَ",
        "summary_explanation_ar": "بيان اشتراط الكسب الحلال والمطعم الطيب لقبول الدعاء والأعمال الصالحة عند الله.",
        "context_en": "Allah the Almighty is Pure and Accepts only that which is pure...",
        "context_id": "Sesungguhnya Allah Ta'ala itu maha baik, tidak menerima kecuali yang baik..."
    },
    {
        "book_id": "صحيح البخاري",
        "hadith_number": "6120",
        "grade": "صحيح البخاري",
        "chapter_title": "الحياء من الإيمان",
        "matn_diacritized": "إِنَّ مِمَّا أَدْرَكَ النَّاسُ مِنْ كَلاَمِ النُّبُوَّةِ الأُولَى إِذَا لَمْ تَسْتَحْيِ فَاصْنَعْ مَا شِئْتَ",
        "summary_explanation_ar": "بيان فضيلة خلق الحياء وأنه الضابط الخلاقي لسلوك الإنسان واقترافه الأفعال.",
        "context_en": "Verily, one of the sayings of the early Prophets: If you do not feel ashamed, then do as you wish.",
        "context_id": "Sesungguhnya di antara perkataan kenabian pertama: Jika engkau tidak malu..."
    },
    {
        "book_id": "صحيح البخاري",
        "hadith_number": "3208",
        "grade": "صحيح مجمع عليه",
        "chapter_title": "مراحل خلق الإنسان والقدر",
        "matn_diacritized": "إِنَّ أَحَدَكُمْ يُجْمَعُ خَلْقُهُ فِي بَطْنِ أُمِّهِ أَرْبَعِينَ يَوْمًا ثُمَّ يَكُونُ عَلَقَةً مِثْلَ ذَلِكَ ثُمَّ يَكُونُ مُضْغَةً مِثْلَ ذَلِكَ",
        "summary_explanation_ar": "بيان أطوار خلق الإنسان في الرحم، وكتابة أرزاقه وأجله وعمله وهو في بطن أمه.",
        "context_en": "Verily the creation of each one of you is brought together in his mother womb...",
        "context_id": "Sesungguhnya setiap kalian dikumpulkan penciptaannya dalam perut ibunya..."
    },
    {
        "book_id": "صحيح البخاري",
        "hadith_number": "25",
        "grade": "صحيح مجمع عليه",
        "chapter_title": "حرمة دم المسلم وماله",
        "matn_diacritized": "أُمِرْتُ أَنْ أُقَاتِلَ النَّاسَ حَتَّى يَشْهَدُوا أَنْ لاَ إِلَهَ إِلاَّ اللَّهُ وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ وَيُقِيمُوا الصَّلاَةَ وَيُؤْتُوا الزَّكَاةَ",
        "summary_explanation_ar": "بيان أحكام العصمة في الإسلام للشخص وماله ودمه إذا أظهر شعائر الإسلام.",
        "context_en": "I have been commanded to fight the people until they testify that there is no deity worthy of worship except Allah...",
        "context_id": "Aku diperintahkan untuk memerangi manusia sampai mereka bersaksi bahwa tidak ada tuhan selain Allah..."
    },
    {
        "book_id": "صحيح البخاري",
        "hadith_number": "6878",
        "grade": "صحيح مجمع عليه",
        "chapter_title": "حرمة النفس المسلمة",
        "matn_diacritized": "لاَ يَحِلُّ دَمُ امْرِئٍ مُسْلِمٍ يَشْهَدُ أَنْ لاَ إِلَهَ إِلاَّ اللَّهُ وَأَنِّي رَسُولُ اللَّهِ إِلاَّ بِإِحْدَى ثَلاَثٍ الثَّيِّبُ الزَّانِي وَالنَّفْسُ بِالنَّفْسِ وَالتَّارِكُ لِدِينِهِ الْمُفَارِقُ لِلْجَمَاعَةِ",
        "summary_explanation_ar": "بيان عظم حرمة النفس المسلمة واستثناء حالات القضاء الشرعي المحدد.",
        "context_en": "The blood of a Muslim who confesses that none has the right to be worshipped but Allah cannot be lawfully shed...",
        "context_id": "Tidak halal darah seorang muslim yang bersaksi bahwa tidak ada tuhan selain Allah..."
    },
    {
        "book_id": "صحيح البخاري",
        "hadith_number": "1",
        "grade": "صحيح مجمع عليه",
        "chapter_title": "الإخلاص والنية",
        "matn_diacritized": "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
        "summary_explanation_ar": "أساس قبول الأعمال الصالحة ومدار قبولها مرتبط بإخلاص النية لله تعالى.",
        "context_en": "Actions are judged by intentions, and every person will get what he intended.",
        "context_id": "Segala amal perbuatan tergantung pada niatnya, dan setiap orang akan mendapatkan sesuai apa yang ia niatkan."
    },
    {
        "book_id": "سنن الترمذي",
        "hadith_number": "2518",
        "grade": "صحيح سنن الترمذي",
        "chapter_title": "ترك الشبهات والورع",
        "matn_diacritized": "دَعْ مَا يَرِيبُكَ إِلَى مَا لاَ يَرِيبُكَ",
        "summary_explanation_ar": "قاعدة جليلة في استبراء الدين والطمأنينة النفسية بترك ما يشك الإنسان في حليته إلى ما يتيقن طهارته وحليته.",
        "context_en": "Leave that which makes you doubt for that which does not make you doubt.",
        "context_id": "Tinggalkanlah apa yang meragukanmu kepada apa yang tidak meragukanmu."
    },
    {
        "book_id": "صحيح البخاري",
        "hadith_number": "52",
        "grade": "صحيح مجمع عليه",
        "chapter_title": "الحلال بين والحرام بين",
        "matn_diacritized": "إِنَّ الْحَلاَلَ بَيِّنٌ وَإِنَّ الْحَرَامَ بَيِّنٌ وَبَيْنَهُمَا أُمُورٌ مُشْتَبِهَاتٌ لاَ يَعْلَمُهُنَّ كَثِيرٌ مِنَ النَّاسِ",
        "summary_explanation_ar": "قاعدة شرعية في اجتناب الشبهات والورع لسلامة الدين والعرض، وصلاح القلب بصلاح أعماله.",
        "context_en": "That which is lawful is clear and that which is unlawful is clear, and between the two of them are doubtful matters...",
        "context_id": "Sesungguhnya yang halal itu jelas dan yang haram itu jelas, dan di antara keduanya terdapat perkara-perkara yang syubhat..."
    },
    {
        "book_id": "صحيح البخاري",
        "hadith_number": "8",
        "grade": "صحيح مجمع عليه",
        "chapter_title": "أركان الإسلام والدعائم الخمس",
        "matn_diacritized": "بُنِيَ الإِسْلاَمُ عَلَى خَمْسٍ شَهَادَةِ أَنْ لاَ إِلَهَ إِلاَّ اللَّهُ وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ وَإِقَامِ الصَّلاَةِ وَإِيتَاءِ الزَّكَاةِ وَالْحَجِّ وَصَوْمِ رَمَضَانَ",
        "summary_explanation_ar": "بيان الأركان والدعائم الخمس الأساسية التي يقوم عليها بنيان الدين الإسلامي.",
        "context_en": "Islam is built upon five pillars: testifying that there is no god but Allah...",
        "context_id": "Islam dibangun di atas lima perkara: bersaksi bahwa tidak ada tuhan selain Allah..."
    },
    {
        "book_id": "صحيح البخاري",
        "hadith_number": "6116",
        "grade": "صحيح البخاري",
        "chapter_title": "النهي عن الغضب وضبط النفس",
        "matn_diacritized": "لاَ تَغْضَبْ فَرَدَّدَ مِرَارًا قَالَ لاَ تَغْضَبْ",
        "summary_explanation_ar": "وصية جامعة من النبي صلى الله عليه وسلم بالسيطرة على النفس والابتعاد عن أسباب الغضب ونزغاته.",
        "context_en": "Do not become angry. The man repeated his request several times...",
        "context_id": "Jangan marah. Orang itu mengulangi permintaannya beberapa kali..."
    },
    {
        "book_id": "صحيح البخاري",
        "hadith_number": "7288",
        "grade": "صحيح مجمع عليه",
        "chapter_title": "التكليف بما يستطاع ورفع الحرج",
        "matn_diacritized": "مَا نَهَيْتُكُمْ عَنْهُ فَاجْتَنِبُوهُ وَمَا أَمَرْتُكُمْ بِهِ فَأْتُوا مِنْهُ مَا اسْتَطَعْتُمْ",
        "summary_explanation_ar": "قاعدة رفع الحرج والتيسير في الشريعة الإسلامية، وأن الأوامر تُنفذ بحسب استطاعة المكلف.",
        "context_en": "What I have forbidden for you, avoid; and what I have ordered you to do...",
        "context_id": "Apa yang aku larang untuk kalian maka jauhilah, dan apa yang aku perintahkan kepada kalian..."
    },
    {
        "book_id": "صحيح البخاري",
        "hadith_number": "13",
        "grade": "صحيح مجمع عليه",
        "chapter_title": "محبة الخير للمؤمنين والإيثار",
        "matn_diacritized": "لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ",
        "summary_explanation_ar": "يرسخ هذا الحديث أصل إسلامياً أصيلاً في سمو الأخلاق والإيثار ونفي كمال الإيمان عمن يحتكر الخير لنفسه دون إخوانه.",
        "context_en": "None of you truly believes until he loves for his brother what he loves for himself.",
        "context_id": "Tidak sempurna iman salah seorang di antara kalian hingga ia menyukai bagi saudaranya..."
    },
    {
        "book_id": "سنن الترمذي",
        "hadith_number": "2516",
        "grade": "حسن صحيح",
        "chapter_title": "حفظ الله والتوكل عليه",
        "matn_diacritized": "احْفَظِ اللَّهَ يَحْفَظْكَ احْفَظِ اللَّهَ تَجِدْهُ تُجَاهَكَ إِذَا سَأَلْتَ فَاسْأَلِ اللَّهَ وَإِذَا اسْتَعَنْتَ فَاسْتَعِنْ بِاللَّهِ",
        "summary_explanation_ar": "من أعظم أحاديث التوحيد والتوكل والاستعانة بالله وحده وحفظ حدوده وأوامره.",
        "context_en": "Be mindful of Allah and Allah will protect you. Be mindful of Allah and you will find Him in front of you...",
        "context_id": "Jagalah Allah niscaya Dia akan menjagamu. Jagalah Allah niscaya engkau akan mendapati-Nya di hadapanmu..."
    }
]

def normalize_flexible(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'[\u0617-\u061A\u064B-\u0652]', '', text)
    text = re.sub(r'[إأآٱ]', 'ا', text)
    text = re.sub(r'ى', 'ي', text)
    text = re.sub(r'ؤ', 'و', text)
    text = re.sub(r'ئ', 'ي', text)
    text = re.sub(r'ة', 'ه', text)
    text = re.sub(r'ـ+', '', text)
    text = re.sub(r'[^\u0600-\u06FFa-zA-Z0-9\s]', '', text)
    return re.sub(r'\s+', ' ', text).strip()

def normalize_strict(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'[\u0617-\u061A\u064B-\u0652]', '', text)
    text = re.sub(r'[إأآٱ]', 'ا', text)
    text = re.sub(r'ـ+', '', text)
    text = re.sub(r'[^\u0600-\u06FFa-zA-Z0-9\s]', '', text)
    return re.sub(r'\s+', ' ', text).strip()

def clean_chapter_title(title: str) -> str:
    if not title:
        return "حديث شريف"
    cleaned = re.sub(r'^(الحديث\s+[\u0600-\u06FF\s]+\s*:\s*|باب\s+)', '', title).strip()
    return cleaned if cleaned else title

class AuditRequest(BaseModel):
    text: str

@app.post("/api/v1/audit")
def audit_content(req: AuditRequest):
    user_raw_text = req.text.strip()
    user_flex = normalize_flexible(user_raw_text)
    user_strict = normalize_strict(user_raw_text)
    
    if not user_flex:
        raise HTTPException(status_code=400, detail="النص المدخل غير صالح للتدقيق.")

    encoded_query = urllib.parse.quote(user_raw_text)
    dorar_link = f"{DORAR_BASE_URL}?q={encoded_query}"
    shamela_link = f"{SHAMELA_BASE_URL}?q={encoded_query}"

    # 1. فحص الأقوال المشهورة (حظر وتنبيه)
    if len(user_flex) >= 3:
        for saying in POPULAR_SAYINGS:
            saying_flex = normalize_flexible(saying)
            if saying_flex in user_flex or user_flex in saying_flex:
                return {
                    "status": "failed",
                    "accuracy_score": 20,
                    "audit_note": "تنبيه: قول مشهور شائع على الألسنة، لم يثبت كحديث نبوي مرفوع في كتب السنة المعتمدة.",
                    "sources": [
                        {
                            "provider": "موسوعة الدرر السنية (dorar.net)",
                            "book": "تنبيه الفحص الرقمي",
                            "hadith_number": "-",
                            "grade": "قول مشهور (غير ثابت)",
                            "verification_url": dorar_link
                        }
                    ],
                    "translations": {}
                }

    canonical_item = None

    # 2. البحث في قاعدة بيانات Supabase
    if SUPABASE_KEY:
        try:
            words = user_flex.split()
            first_word = words[0] if words else ""
            response = requests.get(
                API_URL,
                headers=HEADERS,
                params={"matn_normalized": f"ilike.%{first_word}%"},
                timeout=3
            )
            if response.status_code == 200 and response.json():
                for record in response.json():
                    matn_flex = normalize_flexible(record.get("matn_diacritized", ""))
                    if user_flex in matn_flex or matn_flex in user_flex:
                        canonical_item = record
                        break
        except Exception as e:
            print("Supabase connection warning:", e)

    # 3. البحث في السجل المحلي المعتمد (الاحتياطي)
    if not canonical_item:
        for item in CANONICAL_DB:
            matn_flex = normalize_flexible(item["matn_diacritized"])
            if user_flex in matn_flex or matn_flex in user_flex:
                canonical_item = item
                break

    # 4. تقويم النتيجة وتثبيت المراجع الحية عند العثور على الحديث
    if canonical_item:
        canonical_strict = normalize_strict(canonical_item.get("matn_diacritized", ""))
        
        # فحص المطابقة الحرفية الصارمة 100% مقابل 90%
        if user_strict in canonical_strict or canonical_strict in user_strict:
            status = "success"
            accuracy_score = 100
            audit_note = "مطابقة تامة وموثقة مع أصل الحديث الشريف في المراجع المعتمدة."
        else:
            status = "warning"
            accuracy_score = 90
            audit_note = "تنبيه: النص مطابق للحديث أصلًا، لكن توجد أخطاء إملائية بضبط الحروف (مثل ة/هـ)."

        raw_title = canonical_item.get("chapter_title", "")
        clean_title = clean_chapter_title(raw_title)

        return {
            "status": status,
            "accuracy_score": accuracy_score,
            "audit_note": audit_note,
            "sources": [
                {
                    "provider": "موسوعة الدرر السنية (dorar.net)",
                    "book": canonical_item.get("book_id", "سنن الترمذي"),
                    "hadith_number": canonical_item.get("hadith_number", "2516"),
                    "grade": canonical_item.get("grade", "حسن صحيح"),
                    "verification_url": dorar_link
                },
                {
                    "provider": "المكتبة الشاملة (shamela.ws)",
                    "book": canonical_item.get("book_id", "أمهات الكتب"),
                    "context_summary": canonical_item.get("summary_explanation_ar", "شرح وتخريج معتمد."),
                    "reference_url": shamela_link
                }
            ],
            "translations": {
                "ar": {
                    "title": clean_title,
                    "text": canonical_item.get("matn_diacritized", user_raw_text),
                    "context": canonical_item.get("summary_explanation_ar", "شرح وتخريج معتمد للحديث الشريف.")
                },
                "en": {
                    "title": "Verified Hadith Context",
                    "text": canonical_item.get("context_en", ""),
                    "context": "Contextual translation verified against canonical records."
                },
                "id": {
                    "title": "Konteks Hadis Terverifikasi",
                    "text": canonical_item.get("context_id", ""),
                    "context": "Terjemahan kontekstual terverifikasi."
                }
            }
        }

    # 5. النص الشرعي غير مدرج بالنظام حالياً
    return {
        "status": "failed",
        "accuracy_score": 20,
        "audit_note": "تنبيه: النص الشرعي غير مدرج في نطاق قاعدة البيانات حالياً (مرحلة MVP تضم الأمهات والجامع).",
        "sources": [
            {
                "provider": "الدرر السنية (dorar.net)",
                "verification_url": dorar_link
            }
        ],
        "translations": {}
    }