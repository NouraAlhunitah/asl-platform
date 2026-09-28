import re
import requests

# =========================================================
# 1. إعدادات الاتصال بـ Supabase REST API (مع دعم الدمج والتحديث)
# =========================================================
SUPABASE_URL = "https://homlonmotghfokwvzmlp.supabase.co"
SUPABASE_KEY = "sb_secret_UmMfaY-EkfYtdCjDJUd1aQ_uWH1nSWd"

# إضافة on_conflict لضمان تحديث البيانات المسجلة سابقاً بدون أخطاء 409
API_URL = f"{SUPABASE_URL}/rest/v1/canonical_hadiths?on_conflict=canonical_key"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
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
# 3. حزمة الأربعين النووية الشاملة (متن، تخريج، وسياق)
# =========================================================
NAWAWI_DATASET = [
    {
        "canonical_key": "bukhari:1",
        "book_id": "bukhari",
        "hadith_number": "1",
        "chapter_title": "الحديث الأول: إنما الأعمال بالنيات",
        "matn_diacritized": "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
        "grade": "صحيح مجمع عليه",
        "grade_authority": "رواه البخاري ومسلم في صحيحيهما",
        "narrator_companion": "عمر بن الخطاب رضي الله عنه",
        "summary_explanation_ar": "أساس قبول الأعمال الصالحة ومدار قبولها مرتبط بإخلاص النية لله تعالى.",
        "context_en": "Actions are judged by intentions, and every person will get what he intended.",
        "context_id": "Segala amal perbuatan tergantung pada niatnya, dan setiap orang akan mendapatkan sesuai apa yang ia niatkan."
    },
    {
        "canonical_key": "muslim:8",
        "book_id": "muslim",
        "hadith_number": "8",
        "chapter_title": "الحديث الثاني: مراتب الدين (الإسلام والإيمان والإحسان)",
        "matn_diacritized": "بَيْنَمَا نَحْنُ عِنْدَ رَسُولِ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ ذَاتَ يَوْمٍ إِذْ طَلَعَ عَلَيْنَا رَجُلٌ شَدِيدُ بَيَاضِ الثِّيَابِ شَدِيدُ سَوَادِ الشَّعَرِ",
        "grade": "صحيح مسلم",
        "grade_authority": "رواه الإمام مسلم في صحيحه",
        "narrator_companion": "عمر بن الخطاب رضي الله عنه",
        "summary_explanation_ar": "حديث جبريل الشهير الذي يبين أركان الإسلام، وأركان الإيمان، ومقام الإحسان، وأشارات الساعة.",
        "context_en": "While we were one day sitting with the Messenger of Allah, there appeared before us a man with very white clothing and very black hair.",
        "context_id": "Ketika kami sedang duduk bersama Rasulullah SAW pada suatu hari, tiba-tiba muncul seorang laki-laki yang berpakaian sangat putih dan berambut sangat hitam."
    },
    {
        "canonical_key": "bukhari:8",
        "book_id": "bukhari",
        "hadith_number": "8",
        "chapter_title": "الحديث الثالث: أركان الإسلام",
        "matn_diacritized": "بُنِيَ الإِسْلاَمُ عَلَى خَمْسٍ شَهَادَةِ أَنْ لاَ إِلَهَ إِلاَّ اللَّهُ وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ وَإِقَامِ الصَّلاَةِ وَإِيتَاءِ الزَّكَاةِ وَالْحَجِّ وَصَوْمِ رَمَضَانَ",
        "grade": "صحيح مجمع عليه",
        "grade_authority": "رواه البخاري ومسلم في صحيحيهما",
        "narrator_companion": "عبد الله بن عمر رضي الله عنهما",
        "summary_explanation_ar": "بيان الأركان والدعائم الخمس الأساسية التي يقوم عليها بنيان الدين الإسلامي.",
        "context_en": "Islam is built upon five pillars: testifying that there is no god but Allah and Muhammad is His Messenger, establishing prayer, paying Zakat, Hajj, and fasting Ramadan.",
        "context_id": "Islam dibangun di atas lima perkara: bersaksi bahwa tidak ada tuhan selain Allah dan Muhammad adalah utusan Allah, mendirikan shalat, menunaikan zakat, haji, dan puasa Ramadan."
    },
    {
        "canonical_key": "bukhari:3208",
        "book_id": "bukhari",
        "hadith_number": "3208",
        "chapter_title": "الحديث الرابع: مراحل خلق الإنسان والقدر",
        "matn_diacritized": "إِنَّ أَحَدَكُمْ يُجْمَعُ خَلْقُهُ فِي بَطْنِ أُمِّهِ أَرْبَعِينَ يَوْمًا ثُمَّ يَكُونُ عَلَقَةً مِثْلَ ذَلِكَ ثُمَّ يَكُونُ مُضْغَةً مِثْلَ ذَلِكَ",
        "grade": "صحيح مجمع عليه",
        "grade_authority": "رواه البخاري ومسلم في صحيحيهما",
        "narrator_companion": "عبد الله بن مسعود رضي الله عنه",
        "summary_explanation_ar": "بيان أطوار خلق الإنسان في الرحم، وكتابة أرزاقه وأجله وعمله وهو في بطن أمه.",
        "context_en": "Verily the creation of each one of you is brought together in his mother's womb for forty days in the form of a drop, then he becomes a clot of blood...",
        "context_id": "Sesungguhnya setiap kalian dikumpulkan penciptaannya dalam perut ibunya selama empat puluh hari berupa nutfah, kemudian menjadi 'alaqah..."
    },
    {
        "canonical_key": "bukhari:2697",
        "book_id": "bukhari",
        "hadith_number": "2697",
        "chapter_title": "الحديث الخامس: النهي عن الإحداث في الدين",
        "matn_diacritized": "مَنْ أَحْدَثَ فِي أَمْرِنَا هَذَا مَا لَيْسَ فِيهِ فَهُوَ رَدٌّ",
        "grade": "صحيح مجمع عليه",
        "grade_authority": "رواه البخاري ومسلم في صحيحيهما",
        "narrator_companion": "عائشة أم المؤمنين رضي الله عنها",
        "summary_explanation_ar": "أصل عظيم في رد البدع والمحدثات في العبادات ووجوب الاتباع والاقتداء بالسنّة.",
        "context_en": "He who innovates something in this matter of ours that is not of it will have it rejected.",
        "context_id": "Barangsiapa yang membuat perkara baru dalam urusan kami ini yang tidak ada asal-usulnya, maka hal itu tertolak."
    },
    {
        "canonical_key": "bukhari:52",
        "book_id": "bukhari",
        "hadith_number": "52",
        "chapter_title": "الحديث السادس: الحلال بين والحرام بين",
        "matn_diacritized": "إِنَّ الْحَلاَلَ بَيِّنٌ وَإِنَّ الْحَرَامَ بَيِّنٌ وَبَيْنَهُمَا أُمُورٌ مُشْتَبِهَاتٌ لاَ يَعْلَمُهُنَّ كَثِيرٌ مِنَ النَّاسِ",
        "grade": "صحيح مجمع عليه",
        "grade_authority": "رواه البخاري ومسلم في صحيحيهما",
        "narrator_companion": "النعمان بن بشير رضي الله عنهما",
        "summary_explanation_ar": "قاعدة شرعية في اجتناب الشبهات والورع لسلامة الدين والعرض، وصلاح القلب بصلاح أعماله.",
        "context_en": "That which is lawful is clear and that which is unlawful is clear, and between the two of them are doubtful matters...",
        "context_id": "Sesungguhnya yang halal itu jelas dan yang haram itu jelas, dan di antara keduanya terdapat perkara-perkara yang syubhat..."
    },
    {
        "canonical_key": "muslim:43",
        "book_id": "muslim",
        "hadith_number": "43",
        "chapter_title": "الحديث السابع: الدين النصيحة",
        "matn_diacritized": "الدِّينُ النَّصِيحَةُ قُلْنَا لِمَنْ قَالَ لِلَّهِ وَلِكِتَابِهِ وَلِرَسُولِهِ وَلأَئِمَّةِ الْمُسْلِمِينَ وَعَامَّتِهِمْ",
        "grade": "صحيح مسلم",
        "grade_authority": "رواه الإمام مسلم في صحيحه",
        "narrator_companion": "تميم الداري رضي الله عنه",
        "summary_explanation_ar": "النصيحة عماد الدين وقوامه، وتكون بالإخلاص لله والتزام شرعه والنصح لعامة المسلمين وخاصتهم.",
        "context_en": "Religion is sincerity and good counsel (Nasiha): to Allah, His Book, His Messenger, and to the leaders and common people of Muslims.",
        "context_id": "Agama adalah nasihat. Kami bertanya: Untuk siapa? Beliau menjawab: Untuk Allah, Kitab-Nya, Rasul-Nya, para pemimpin kaum muslimin dan orang-orang awam."
    },
    {
        "canonical_key": "bukhari:25",
        "book_id": "bukhari",
        "hadith_number": "25",
        "chapter_title": "الحديث الثامن: حرمة دم المسلم وماله",
        "matn_diacritized": "أُمِرْتُ أَنْ أُقَاتِلَ النَّاسَ حَتَّى يَشْهَدُوا أَنْ لاَ إِلَهَ إِلاَّ اللَّهُ وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ وَيُقِيمُوا الصَّلاَةَ وَيُؤْتُوا الزَّكَاةَ",
        "grade": "صحيح مجمع عليه",
        "grade_authority": "رواه البخاري ومسلم في صحيحيهما",
        "narrator_companion": "عبد الله بن عمر رضي الله عنهما",
        "summary_explanation_ar": "بيان أحكام العصمة في الإسلام للشخص وماله ودمه إذا أظهر شعائر الإسلام.",
        "context_en": "I have been commanded to fight the people until they testify that there is no deity worthy of worship except Allah and that Muhammad is the Messenger of Allah...",
        "context_id": "Aku diperintahkan untuk memerangi manusia sampai mereka bersaksi bahwa tidak ada tuhan selain Allah dan bahwa Muhammad adalah utusan Allah..."
    },
    {
        "canonical_key": "bukhari:7288",
        "book_id": "bukhari",
        "hadith_number": "7288",
        "chapter_title": "الحديث التاسع: التكليف بما يستطاع",
        "matn_diacritized": "مَا نَهَيْتُكُمْ عَنْهُ فَاجْتَنِبُوهُ وَمَا أَمَرْتُكُمْ بِهِ فَأْتُوا مِنْهُ مَا اسْتَطَعْتُمْ",
        "grade": "صحيح مجمع عليه",
        "grade_authority": "رواه البخاري ومسلم في صحيحيهما",
        "narrator_companion": "أبو هريرة رضي الله عنه",
        "summary_explanation_ar": "قاعدة رفع الحرج والتيسير في الشريعة الإسلامية، وأن الأوامر تُنفذ بحسب استطاعة المكلف.",
        "context_en": "What I have forbidden for you, avoid; and what I have ordered you to do, do as much of it as you can.",
        "context_id": "Apa yang aku larang untuk kalian maka jauhilah, dan apa yang aku perintahkan kepada kalian maka lakukanlah semampu kalian."
    },
    {
        "canonical_key": "muslim:1015",
        "book_id": "muslim",
        "hadith_number": "1015",
        "chapter_title": "الحديث العاشر: أسباب إجابة الدعاء وأكل الحلال",
        "matn_diacritized": "إِنَّ اللَّهَ طَيِّبٌ لاَ يَقْبَلُ إِلاَّ طَيِّبًا وَإِنَّ اللَّهَ أَمَرَ الْمُؤْمِنِينَ بِمَا أَمَرَ بِهِ الْمُرْسَلِينَ",
        "grade": "صحيح مسلم",
        "grade_authority": "رواه الإمام مسلم في صحيحه",
        "narrator_companion": "أبو هريرة رضي الله عنه",
        "summary_explanation_ar": "بيان اشتراط الكسب الحلال والمطعم الطيب لقبول الدعاء والأعمال الصالحة عند الله.",
        "context_en": "Allah the Almighty is Pure and Accepts only that which is pure. And verily Allah has commanded the Believers to do that which He has commanded the Messengers...",
        "context_id": "Sesungguhnya Allah Ta'ala itu maha baik, tidak menerima kecuali yang baik. Dan sesungguhnya Allah memerintahkan orang-orang mukmin sebagaimana Yang Dia perintahkan kepada para Rasul..."
    },
    {
        "canonical_key": "tirmidhi:2518",
        "book_id": "tirmidhi",
        "hadith_number": "2518",
        "chapter_title": "الحديث الحادي عشر: ترك الشبهات",
        "matn_diacritized": "دَعْ مَا يَرِيبُكَ إِلَى مَا لاَ يَرِيبُكَ",
        "grade": "صحيح سنن الترمذي",
        "grade_authority": "رواه الترمذي وقال حديث حسن صحيح",
        "narrator_companion": "الحسن بن علي رضي الله عنهما",
        "summary_explanation_ar": "قاعدة جليلة في استبراء الدين والطمأنينة النفسية بترك ما يشك الإنسان في حليته إلى ما يتيقن طهارته وحليته.",
        "context_en": "Leave that which makes you doubt for that which does not make you doubt.",
        "context_id": "Tinggalkanlah apa yang meragukanmu kepada apa yang tidak meragukanmu."
    },
    {
        "canonical_key": "tirmidhi:2317",
        "book_id": "tirmidhi",
        "hadith_number": "2317",
        "chapter_title": "الحديث الثاني عشر: ترك ما لا يعني",
        "matn_diacritized": "مِنْ حُسْنِ إِسْلاَمِ الْمَرْءِ تَرْكُهُ مَا لاَ يَعْنِيهِ",
        "grade": "حديث حسن",
        "grade_authority": "رواه الترمذي وغيره",
        "narrator_companion": "أبو هريرة رضي الله عنه",
        "summary_explanation_ar": "أصل عظيم في الأدب والسلوك وشغل الوقت بما ينفع الإنسان في دينه ودنياه وترك التدخل فيما لا يخصه.",
        "context_en": "Part of the perfection of one's Islam is his leaving that which does not concern him.",
        "context_id": "Di antara kebaikan Islam seseorang adalah meninggalkan apa yang tidak berguna baginya."
    },
    {
        "canonical_key": "bukhari:13",
        "book_id": "bukhari",
        "hadith_number": "13",
        "chapter_title": "الحديث الثالث عشر: محبة الخير للمؤمنين",
        "matn_diacritized": "لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ",
        "grade": "صحيح مجمع عليه",
        "grade_authority": "رواه البخاري ومسلم في صحيحيهما",
        "narrator_companion": "أنس بن مالك رضي الله عنه",
        "summary_explanation_ar": "يرسخ هذا الحديث أصل إسلامياً أصيلاً في سمو الأخلاق والإيثار ونفي كمال الإيمان عمن يحتكر الخير لنفسه دون إخوانه.",
        "context_en": "None of you truly believes until he loves for his brother what he loves for himself.",
        "context_id": "Tidak sempurna iman salah seorang di antara kalian hingga ia menyukai bagi saudaranya apa yang ia menyukai bagi dirinya sendiri."
    },
    {
        "canonical_key": "bukhari:6878",
        "book_id": "bukhari",
        "hadith_number": "6878",
        "chapter_title": "الحديث الرابع عشر: حرمة دم المسلم",
        "matn_diacritized": "لاَ يَحِلُّ دَمُ امْرِئٍ مُسْلِمٍ يَشْهَدُ أَنْ لاَ إِلَهَ إِلاَّ اللَّهُ وَأَنِّي رَسُولُ اللَّهِ إِلاَّ بِإِحْدَى ثَلاَثٍ الثَّيِّبُ الزَّانِي وَالنَّفْسُ بِالنَّفْسِ وَالتَّارِكُ لِدِينِهِ الْمُفَارِقُ لِلْجَمَاعَةِ",
        "grade": "صحيح مجمع عليه",
        "grade_authority": "رواه البخاري ومسلم في صحيحيهما",
        "narrator_companion": "عبد الله بن مسعود رضي الله عنه",
        "summary_explanation_ar": "بيان عظم حرمة النفس المسلمة واستثناء حالات القضاء الشرعي المحدد.",
        "context_en": "The blood of a Muslim who confesses that none has the right to be worshipped but Allah and that I am His Messenger cannot be lawfully shed except in one of three cases...",
        "context_id": "Tidak halal darah seorang muslim yang bersaksi bahwa tidak ada tuhan selain Allah dan bahwa aku adalah utusan Allah kecuali karena salah satu dari tiga alasan..."
    },
    {
        "canonical_key": "bukhari:6018",
        "book_id": "bukhari",
        "hadith_number": "6018",
        "chapter_title": "الحديث الخامس عشر: إكرام الجار والضيف والكلمة الطيبة",
        "matn_diacritized": "مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ وَمَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيُكْرِمْ جَارَهُ وَمَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيُكْرِمْ ضَيْفَهُ",
        "grade": "صحيح مجمع عليه",
        "grade_authority": "رواه البخاري ومسلم في صحيحيهما",
        "narrator_companion": "أبو هريرة رضي الله عنه",
        "summary_explanation_ar": "من مظاهر الإيمان الصادق ضبط اللسان، وإكرام الجار، وحسن استضافة الضيف.",
        "context_en": "Let him who believes in Allah and the Last Day speak good or remain silent, and let him who believes in Allah and the Last Day be generous to his neighbor...",
        "context_id": "Barangsiapa yang beriman kepada Allah dan hari akhir hendaklah ia berkata baik atau diam, dan barangsiapa yang beriman kepada Allah dan hari akhir hendaklah ia memuliakan tetangganya..."
    },
    {
        "canonical_key": "bukhari:6116",
        "book_id": "bukhari",
        "hadith_number": "6116",
        "chapter_title": "الحديث السادس عشر: النهي عن الغضب",
        "matn_diacritized": "لاَ تَغْضَبْ ، فَرَدَّدَ مِرَارًا ، قَالَ لاَ تَغْضَبْ",
        "grade": "صحيح البخاري",
        "grade_authority": "رواه الإمام البخاري في صحيحه",
        "narrator_companion": "أبو هريرة رضي الله عنه",
        "summary_explanation_ar": "وصية جامعة من النبي صلى الله عليه وسلم بالسيطرة على النفس والابتعاد عن أسباب الغضب ونزغاته.",
        "context_en": "Do not become angry. The man repeated his request several times, and each time the Prophet said: Do not become angry.",
        "context_id": "Jangan marah. Orang itu mengulangi permintaannya beberapa kali, beliau tetap bersabda: Jangan marah."
    },
    {
        "canonical_key": "muslim:1955",
        "book_id": "muslim",
        "hadith_number": "1955",
        "chapter_title": "الحديث السابع عشر: الأمر بالإحسان في كل شيء",
        "matn_diacritized": "إِنَّ اللَّهَ كَتَبَ الإِحْسَانَ عَلَى كُلِّ شَيْءٍ فَإِذَا قَتَلْتُمْ فَأَحْسِنُوا الْقِتْلَةَ وَإِذَا ذَبَحْتُمْ فَأَحْسِنُوا الذَّبْحَ",
        "grade": "صحيح مسلم",
        "grade_authority": "رواه الإمام مسلم في صحيحه",
        "narrator_companion": "شداد بن أوس رضي الله عنه",
        "summary_explanation_ar": "قاعدة إسلامية شاملة تتطلب إتقان العمل والإحسان والرحمة حتى للكائنات والذبائح.",
        "context_en": "Verily Allah has prescribed proficiency and goodness in all things. So if you kill, kill well; and if you slaughter, slaughter well...",
        "context_id": "Sesungguhnya Allah telah mewajibkan berbuat ihsan atas segala sesuatu. Maka jika kalian membunuh hendaklah membunuh dengan cara yang baik..."
    },
    {
        "canonical_key": "tirmidhi:1987",
        "book_id": "tirmidhi",
        "hadith_number": "1987",
        "chapter_title": "الحديث الثامن عشر: تقوى الله واتباع السيئة الحسنة",
        "matn_diacritized": "اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ وَأَتْبِعِ السَّيِّئَةَ الْحَسَنَةَ تَمْحُهَا وَخَالِقِ النَّاسَ بِخُلُقٍ حَسَنٍ",
        "grade": "حسن صحيح",
        "grade_authority": "رواه الترمذي وقال حديث حسن",
        "narrator_companion": "أبو ذر ومعاذ بن جبل رضي الله عنهما",
        "summary_explanation_ar": "وصية عظيمة ترتكز على تقوى الله في السر والعلن، ومحو الخطايا بالصالحات، ومعاملة الناس بحسن الخلق.",
        "context_en": "Fear Allah wherever you are, and follow up a bad deed with a good deed and it will wipe it out, and behave towards people with good character.",
        "context_id": "Bertakwalah kepada Allah di mana saja engkau berada, dan iringilah keburukan dengan kebaikan niscaya kebaikan itu akan menghapusnya, dan berakhlaklah kepada manusia dengan akhlak yang baik."
    },
    {
        "canonical_key": "tirmidhi:2516",
        "book_id": "tirmidhi",
        "hadith_number": "2516",
        "chapter_title": "الحديث التاسع عشر: حفظ الله والتوكل عليه (احفظ الله يحفظك)",
        "matn_diacritized": "احْفَظِ اللَّهَ يَحْفَظْكَ احْفَظِ اللَّهَ تَجِدْهُ تُجَاهَكَ إِذَا سَأَلْتَ فَاسْأَلِ اللَّهَ وَإِذَا اسْتَعَنْتَ فَاسْتَعِنْ بِاللَّهِ",
        "grade": "حسن صحيح",
        "grade_authority": "رواه الترمذي وقال حديث حسن صحيح",
        "narrator_companion": "عبد الله بن عباس رضي الله عنهما",
        "summary_explanation_ar": "من أعظم أحاديث التوحيد والتوكل والاستعانة بالله وحده وحفظ حدوده وأوامره.",
        "context_en": "Be mindful of Allah and Allah will protect you. Be mindful of Allah and you will find Him in front of you. If you ask, ask of Allah; if you seek help, seek help of Allah...",
        "context_id": "Jagalah Allah niscaya Dia akan menjagamu. Jagalah Allah niscaya engkau akan mendapati-Nya di hadapanmu. Jika engkau memohon, mohonlah kepada Allah..."
    },
    {
        "canonical_key": "bukhari:6120",
        "book_id": "bukhari",
        "hadith_number": "6120",
        "chapter_title": "الحديث العشرون: الحياء من الإيمان",
        "matn_diacritized": "إِنَّ مِمَّا أَدْرَكَ النَّاسُ مِنْ كَلاَمِ النُّبُوَّةِ الأُولَى إِذَا لَمْ تَسْتَحْيِ فَاصْنَعْ مَا شِئْتَ",
        "grade": "صحيح البخاري",
        "grade_authority": "رواه الإمام البخاري في صحيحه",
        "narrator_companion": "أبو مسعود عقبة بن عمرو رضي الله عنه",
        "summary_explanation_ar": "بيان فضيلة خلق الحياء وأنه الضابط الخلاقي لسلوك الإنسان واقترافه الأفعال.",
        "context_en": "Verily, one of the sayings of the early Prophets which the people have got is: If you do not feel ashamed, then do as you wish.",
        "context_id": "Sesungguhnya di antara perkataan kenabian pertama yang didapati manusia adalah: Jika engkau tidak malu, maka berbuatlah sesukamu."
    }
]

# =========================================================
# 4. تشغيل عملية الرفع والتحديث الآلي
# =========================================================
def run_forty_nawawi_ingestion():
    print("🚀 بدء تغذية وتحديث حزمة الأربعين النووية في Supabase...")
    success_count = 0
    
    for item in NAWAWI_DATASET:
        # توليد النص المنظف آلياً
        item["matn_normalized"] = normalize_arabic_text(item["matn_diacritized"])
        
        try:
            response = requests.post(API_URL, headers=HEADERS, json=item, timeout=12)
            if response.status_code in [200, 201]:
                success_count += 1
                print(f"✅ تم رفع/تحديث [{item['canonical_key']}]: {item['chapter_title']}")
            else:
                print(f"❌ خطأ عند رفع [{item['canonical_key']}]: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ تعذر الاتصال بـ Supabase عند رفع [{item['canonical_key']}]: {e}")

    print(f"\n اكتملت العملية بنجاح: تم رفع وتحديث {success_count} من أصل {len(NAWAWI_DATASET)} أحاديث في قاعدة البيانات!")

if __name__ == "__main__":
    run_forty_nawawi_ingestion()