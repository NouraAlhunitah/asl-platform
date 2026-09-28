import re
import requests

# =========================================================
# 1. إعدادات الاتصال بـ Supabase REST API
# =========================================================
SUPABASE_URL = "https://homlonmotghfokwvzmlp.supabase.co"
SUPABASE_KEY = "sb_secret_UmMfaY-EkfYtdCjDJUd1aQ_uWH1nSWd"

API_URL = f"{SUPABASE_URL}/rest/v1/canonical_hadiths?on_conflict=canonical_key"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"  # دمج وتحديث البيانات تلقائياً عند تكرار canonical_key
}

# =========================================================
# 2. دالة التطهير الآلي للنصوص العربية
# =========================================================
def normalize_arabic_text(text: str) -> str:
    """تطهير وتوحيد النصوص العربية لإلغاء فروقات التشكيل والهمزات"""
    if not text:
        return ""
    text = re.sub(r'[\u0617-\u061A\u064B-\u0652]', '', text)
    text = re.sub(r'[إأآٱ]', 'ا', text)
    text = re.sub(r'ى', 'ي', text)
    text = re.sub(r'ؤ', 'و', text)
    text = re.sub(r'ئ', 'ي', text)
    text = re.sub(r'ة', 'ه', text)
    text = re.sub(r'ـ+', '', text)
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# =========================================================
# 3. حزمة الأحاديث المعتمدة والموسعة للتغذية
# =========================================================
SEED_HADITHS = [
    {
        "canonical_key": "bukhari:1",
        "book_id": "bukhari",
        "hadith_number": "1",
        "chapter_title": "باب كيف كان بدء الوحي إلى رسول الله صلى الله عليه وسلم",
        "matn_diacritized": "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
        "grade": "صحيح مجمع عليه",
        "grade_authority": "إجماع المتقدمين (البخاري ومسلم)",
        "narrator_companion": "عمر بن الخطاب رضي الله عنه",
        "summary_explanation_ar": "أساس الأعمال وقبولها مرتبط بالنوايا، وهو من القواعد الكبرى في الشريعة الإسلامية.",
        "context_en": "Actions are judged by intentions, and every person will get what he intended.",
        "context_id": "Segala amal perbuatan tergantung pada niatnya, dan setiap orang akan mendapatkan sesuai apa yang ia niatkan."
    },
    {
        "canonical_key": "bukhari:13",
        "book_id": "bukhari",
        "hadith_number": "13",
        "chapter_title": "باب حُبِّ الرَّسُولِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ مِنَ الإِيمَانِ",
        "matn_diacritized": "لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ",
        "grade": "صحيح مجمع عليه",
        "grade_authority": "إجماع المتقدمين (البخاري ومسلم)",
        "narrator_companion": "أنس بن مالك رضي الله عنه",
        "summary_explanation_ar": "يرسخ هذا الحديث أصل إسلامياً أصيلاً في سمو الأخلاق والإيثار ونفي كمال الإيمان عمن يحتكر الخير لنفسه دون إخوانه.",
        "context_en": "None of you truly believes until he loves for his brother what he loves for himself.",
        "context_id": "Tidak sempurna iman salah seorang di antara kalian hingga ia menyukai bagi saudaranya apa yang ia menyukai bagi dirinya sendiri."
    },
    {
        "canonical_key": "bukhari:10",
        "book_id": "bukhari",
        "hadith_number": "10",
        "chapter_title": "باب الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ",
        "matn_diacritized": "الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ",
        "grade": "صحيح مجمع عليه",
        "grade_authority": "إجماع المتقدمين (البخاري ومسلم)",
        "narrator_companion": "عبد الله بن عمرو رضي الله عنهما",
        "summary_explanation_ar": "يحدد الحديث المعيار العملي الحقيقي للمسلم في سلامة الناس من أذاه القولي والفعلي.",
        "context_en": "A Muslim is the one from whose tongue and hands Muslims are safe.",
        "context_id": "Seorang Muslim adalah orang yang membuat orang Muslim lainnya selamat dari lisan dan tangannya."
    },
    {
        "canonical_key": "muslim:43",
        "book_id": "muslim",
        "hadith_number": "43",
        "chapter_title": "باب بيان أن الدين النصيحة",
        "matn_diacritized": "الدِّينُ النَّصِيحَةُ قُلْنَا لِمَنْ قَالَ لِلَّهِ وَلِكِتَابِهِ وَلِرَسُولِهِ وَلأَئِمَّةِ الْمُسْلِمِينَ وَعَامَّتِهِمْ",
        "grade": "صحيح مسلم",
        "grade_authority": "الإمام مسلم بن الحجاج",
        "narrator_companion": "تميم الداري رضي الله عنه",
        "summary_explanation_ar": "النصيحة عماد الدين وقوامه، وتكون بالإخلاص لله والتزام شرعه والنصح لعامة المسلمين وخاصتهم.",
        "context_en": "Religion is sincerity and good counsel (Nasiha): to Allah, His Book, His Messenger, and to the leaders and common people of Muslims.",
        "context_id": "Agama adalah nasihat. Kami bertanya: Untuk siapa? Beliau menjawab: Untuk Allah, Kitab-Nya, Rasul-Nya, para pemimpin kaum muslimin dan orang-orang awam."
    },
    {
        "canonical_key": "bukhari:6018",
        "book_id": "bukhari",
        "hadith_number": "6018",
        "chapter_title": "باب علامة المنافق",
        "matn_diacritized": "آيَةُ الْمُنَافِقِ ثَلاَثٌ إِذَا حَدَّثَ كَذَبَ وَإِذَا وَعَدَ أَخْلَفَ وَإِذَا اؤْتُمِنَ خَانَ",
        "grade": "صحيح مجمع عليه",
        "grade_authority": "إجماع المتقدمين (البخاري ومسلم)",
        "narrator_companion": "أبو هريرة رضي الله عنه",
        "summary_explanation_ar": "بيان الخصال المذمومة في سلوك المنافق ليتجنبها المسلم ويحافظ على الأمانة والصدق والوفاء.",
        "context_en": "The signs of a hypocrite are three: whenever he speaks, he tells a lie; whenever he promises, he always breaks it; and if you trust him, he proves to be dishonest.",
        "context_id": "Tanda-tanda orang munafik ada tiga: jika berbicara dia berdusta, jika berjanji dia mengingkari, dan jika dipercaya dia berkhianat."
    }
]

# =========================================================
# 4. تشغيل عملية الرفع والتغذية
# =========================================================
def seed_database():
    print("🚀 بدء تغذية قاعدة البيانات بالأحاديث المعتمدة عبر REST API...")
    success_count = 0
    
    for item in SEED_HADITHS:
        # توليد النص المنظف تلقائياً
        item["matn_normalized"] = normalize_arabic_text(item["matn_diacritized"])
        
        # إرسال طلب الإدراج/التحديث عبر HTTP POST
        try:
            response = requests.post(API_URL, headers=HEADERS, json=item, timeout=10)
            if response.status_code in [200, 201]:
                success_count += 1
                print(f"✅ تم حفظ/تحديث الحديث [{item['canonical_key']}]: {item['matn_diacritized'][:35]}...")
            else:
                print(f"❌ خطأ في إدخال الحديث [{item['canonical_key']}]: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ تعذر الاتصال بـ Supabase عند رفع [{item['canonical_key']}]: {e}")

    print(f"\n اكتملت العملية: تم إدخال/تحديث {success_count} من أصل {len(SEED_HADITHS)} أحاديث بنجاح!")

if __name__ == "__main__":
    seed_database()