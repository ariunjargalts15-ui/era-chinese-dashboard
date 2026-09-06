/* ERA Chinese — language.

   Keys are the English text, so an untranslated string simply falls back to
   English instead of showing a key. T('{n} words', {n: 8}) fills placeholders. */
(function (global) {
  'use strict';

  var KEY = 'era-chinese-lite/lang';

  var LANGS = [
    { id: 'en', label: 'English', short: 'EN' },
    { id: 'mn', label: 'Монгол', short: 'МН' },
    { id: 'zh', label: '中文', short: '中' }
  ];

  var CAL = {
    en: {
      days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      short: function (d, n, m) { return d + ' ' + n + ' ' + m; },
      long: function (d, n, m, y) { return d + ', ' + n + ' ' + m + ' ' + y; }
    },
    mn: {
      days: ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'],
      months: ['1-р', '2-р', '3-р', '4-р', '5-р', '6-р', '7-р', '8-р', '9-р', '10-р', '11-р', '12-р'],
      short: function (d, n, m) { return m + ' сарын ' + n + ', ' + d; },
      long: function (d, n, m, y) { return y + ' оны ' + m + ' сарын ' + n + ', ' + d; }
    },
    zh: {
      days: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
      short: function (d, n, m) { return m + n + '日 ' + d; },
      long: function (d, n, m, y) { return y + '年' + m + n + '日 ' + d; }
    }
  };

  /* ══ Монгол ══════════════════════════════════════════ */
  var MN = {
    /* navigation & roles */
    'Dashboard': 'Хяналтын самбар', 'My classes': 'Миний ангиуд', 'Lessons': 'Хичээлүүд',
    'Homework': 'Гэрийн даалгавар', 'Students': 'Сурагчид', 'My timetable': 'Миний хуваарь',
    'Vocabulary': 'Шинэ үг', 'My progress': 'Миний ахиц', 'Lesson': 'Хичээл', 'Class': 'Анги',
    'Online classroom': 'Онлайн танхим', 'Teacher': 'Багш', 'Student': 'Сурагч',
    'Sign in': 'Нэвтрэх', 'Sign out': 'Гарах', 'Not found': 'Олдсонгүй',
    'Page not found': 'Хуудас олдсонгүй', 'The link may be out of date.': 'Холбоос хуучирсан байж магадгүй.',
    'Something went wrong on this page': 'Энэ хуудсанд алдаа гарлаа',

    /* login */
    'Every lesson, register and mark in one place.': 'Хичээл, ирц, дүн — бүгд нэг дор.',
    'Teachers plan the lesson, run it online, take the register and grade the work. Students join the call, follow the board and hand in homework.':
      'Багш хичээлээ төлөвлөж, онлайнаар заана, ирц бүртгэж, даалгавар дүгнэнэ. Сурагч дуудлагад нэгдэж, самбарыг дагаж, даалгавраа илгээнэ.',
    'Pick an account to open the school.': 'Сургуулийг нээхийн тулд хэрэглэгч сонгоно уу.',
    'Demo school — data is stored in this browser only.': 'Туршилтын сургууль — өгөгдөл зөвхөн энэ браузерт хадгалагдана.',
    'Reset the demo data': 'Туршилтын өгөгдлийг шинэчлэх', 'Reset demo': 'Дахин эхлүүлэх',
    'Restore the demo school': 'Туршилтын сургуулийг сэргээх', 'Reset the demo school': 'Туршилтын сургуулийг дахин эхлүүлэх',
    'Every class, lesson, register, grade and assessment goes back to how it started. Anything you added here is lost.':
      'Бүх анги, хичээл, ирц, дүн, үнэлгээ анхны байдалдаа буцна. Таны нэмсэн зүйл устана.',
    'Reset': 'Дахин эхлүүлэх', 'Demo school restored': 'Туршилтын сургууль сэргээгдлээ',
    'Signed in as {name}': '{name} нэрээр нэвтэрлээ', 'Language changed': 'Хэл солигдлоо',

    /* dashboard */
    'Classes': 'Ангиуд', 'across all classes': 'бүх ангид', 'Lessons this week': 'Энэ 7 хоногийн хичээл',
    'Attendance': 'Ирц', '{n} marks recorded': '{n} бүртгэл хийгдсэн', 'Next lesson': 'Дараагийн хичээл',
    'Lesson in progress': 'Хичээл явж байна', 'All lessons': 'Бүх хичээл', 'Needs attention': 'Анхаарах зүйлс',
    '{n} assignments to grade': 'Дүгнэх {n} даалгавар', 'Homework handed in and waiting': 'Ирсэн даалгавар хүлээгдэж байна',
    '{n} registers still open': 'Хаагдаагүй {n} ирц', 'Past lessons never closed out': 'Өнгөрсөн хичээл хаагдаагүй',
    '{n} students below 70%': '70%-иас доош {n} сурагч', 'Attendance needs a conversation': 'Ирцийн талаар ярилцах шаардлагатай',
    'Attendance trend': 'Ирцийн чиг хандлага', 'No completed lessons yet': 'Дууссан хичээл алга',
    'Nothing scheduled': 'Товлосон зүйл алга', 'Create a lesson to get started.': 'Эхлэхийн тулд хичээл үүсгэнэ үү.',
    'no lessons': 'хичээл алга', 'Class roster': 'Ангийн бүртгэл', 'Open lesson': 'Хичээл нээх',
    '{n} students': '{n} сурагч', 'Words studied': 'Судалсан үг', 'across completed lessons': 'дууссан хичээлүүдэд',
    'Homework due': 'Хийх даалгавар', 'hand in when ready': 'бэлэн болмогц илгээнэ', 'all caught up': 'бүгд бэлэн',
    'Average grade': 'Дундаж дүн', '{n} graded': '{n} дүгнэгдсэн', 'To do': 'Хийх зүйл',
    'Nothing outstanding': 'Үлдэгдэл байхгүй', 'Every assignment handed in': 'Бүх даалгавар илгээгдсэн',
    'Recent lessons': 'Сүүлийн хичээлүүд', 'Practise words': 'Үг давтах', 'No upcoming lessons': 'Ирэх хичээл алга',
    'Not enrolled in a class yet': 'Одоогоор ангид бүртгэгдээгүй', '{n} lessons recorded': '{n} хичээл бүртгэгдсэн',

    /* classes */
    'New class': 'Шинэ анги', 'Edit class': 'Анги засах', 'Delete class': 'Анги устгах',
    'Class name': 'Ангийн нэр', 'Chinese name': 'Хятад нэр', 'Level': 'Түвшин', 'Room': 'Өрөө',
    'Time': 'Цаг', 'Days of the week': 'Долоо хоногийн өдрүүд', 'Enrol students now': 'Одоо сурагч элсүүлэх',
    'Create class': 'Анги үүсгэх', 'Class created': 'Анги үүслээ', 'Class saved': 'Анги хадгалагдлаа',
    'Class deleted': 'Анги устлаа', 'Class not found': 'Анги олдсонгүй', 'All classes': 'Бүх анги',
    'The class needs a name': 'Ангид нэр өгнө үү', 'No classes yet': 'Одоогоор анги алга',
    'Create your first class.': 'Эхний ангиа үүсгэнэ үү.',
    'Create a class — HSK 4, say — then enrol your students in it.':
      'Анги үүсгэ — жишээ нь HSK 4 — тэгээд сурагчдаа элсүүлээрэй.',
    'Delete {name}? Its {n} lessons, registers and grades go with it.':
      '{name}-г устгах уу? Түүний {n} хичээл, ирц, дүн хамт устана.',
    '{done} of {total} lessons delivered': '{total}-аас {done} хичээл заагдсан',
    '{n} lessons in the course': 'Хөтөлбөрт {n} хичээл', 'Roster': 'Бүртгэл',
    'Enrol': 'Элсүүлэх', 'Enrol students': 'Сурагч элсүүлэх', 'Existing students': 'Байгаа сурагчид',
    'OR CREATE A NEW ONE': 'ЭСВЭЛ ШИНЭЭР ҮҮСГЭХ', 'Name': 'Нэр', 'Full name': 'Бүтэн нэр',
    'Email': 'И-мэйл', 'Everybody is already in this class.': 'Бүгд аль хэдийн энэ ангид байна.',
    'Nobody selected': 'Хэн ч сонгогдоогүй', '{n} students enrolled': '{n} сурагч элслээ',
    'Nobody enrolled yet': 'Одоогоор хэн ч элсээгүй', 'Press Enrol to add students.': 'Сурагч нэмэхийн тулд Элсүүлэх дар.',
    'Remove from the class': 'Ангиас хасах', 'Remove': 'Хасах', 'Removed from the class': 'Ангиас хасагдлаа',
    'Take {name} off this roster? Their attendance history stays.':
      '{name}-г бүртгэлээс хасах уу? Ирцийн түүх нь хэвээр үлдэнэ.',
    'New student': 'Шинэ сурагч', 'Create student': 'Сурагч үүсгэх', 'Student created': 'Сурагч үүслээ',
    'The student needs a name': 'Сурагчид нэр өгнө үү', 'Enrol in class': 'Ангид элсүүлэх',
    'None for now': 'Одоохондоо байхгүй', 'No students yet': 'Одоогоор сурагч алга',
    'Create a class and enrol students in it.': 'Анги үүсгээд сурагчдаа элсүүлээрэй.',
    'e.g. HSK 4 · Upper intermediate': 'жишээ нь HSK 4 · Ахисан дунд',

    /* lessons */
    'New lesson': 'Шинэ хичээл', 'Create lesson': 'Хичээл үүсгэх', 'Lesson created': 'Хичээл үүслээ',
    'Lesson not found': 'Хичээл олдсонгүй', 'No lessons yet': 'Хичээл алга', 'Nothing here': 'Энд юу ч алга',
    'Try another filter or create a lesson.': 'Өөр шүүлтүүр сонгох эсвэл хичээл үүсгэнэ үү.',
    'Try another filter.': 'Өөр шүүлтүүр сонгоно уу.', 'Upcoming': 'Ирэх', 'Past': 'Өнгөрсөн', 'All': 'Бүгд',
    'Date': 'Огноо', 'When': 'Хэзээ', 'Marked': 'Бүртгэсэн', 'Status': 'Төлөв', 'Title': 'Гарчиг',
    'Topic': 'Сэдэв', 'Vocabulary set': 'Үгийн багц', 'Create a class first': 'Эхлээд анги үүсгэнэ үү',
    'Its words are copied into the lesson — edit them afterwards.':
      'Түүний үгс хичээлд хуулагдана — дараа нь засаж болно.',
    'Defaults to the vocabulary set name': 'Хоосон бол үгийн багцын нэр авна',
    'What the class will cover': 'Хичээлээр юу үзэх вэ', 'Optional': 'Сонголтоор',
    'Edit lesson plan': 'Хичээлийн төлөвлөгөө засах', 'Edit plan': 'Төлөвлөгөө засах',
    'Lesson plan': 'Хичээлийн төлөвлөгөө', 'Lesson plan saved': 'Төлөвлөгөө хадгалагдлаа',
    'Private notes': 'Хувийн тэмдэглэл', 'Only you can see this': 'Зөвхөн та харна',
    'TOPIC': 'СЭДЭВ', 'HOMEWORK': 'ГЭРИЙН ДААЛГАВАР', 'PRIVATE NOTES': 'ХУВИЙН ТЭМДЭГЛЭЛ',
    'None set': 'Өгөөгүй', 'Delete lesson': 'Хичээл устгах', 'Lesson deleted': 'Хичээл устлаа',
    'Delete {title} on {date}? Its register and any handed-in homework go with it.':
      '{date}-ний {title} хичээлийг устгах уу? Ирц болон ирсэн даалгавар хамт устана.',
    'Complete lesson': 'Хичээл дуусгах', 'What was covered': 'Юу үзсэн бэ',
    'Leave blank for none': 'Байхгүй бол хоосон орхи',
    'Any student still unmarked will be recorded as absent.': 'Бүртгэгдээгүй сурагчид тасалсан гэж тэмдэглэгдэнэ.',
    'Lesson completed and register closed': 'Хичээл дууслаа, ирц хаагдлаа',
    'Reopen': 'Дахин нээх', 'Lesson reopened': 'Хичээл дахин нээгдлээ',
    'Lesson {n} of {total}': '{total}-аас {n}-р хичээл', 'Course progress': 'Хөтөлбөрийн явц',
    '{done} of {total} lessons': '{total}-аас {done} хичээл',

    /* attendance */
    'Attendance register': 'Ирцийн бүртгэл', 'Mark all present': 'Бүгдийг ирсэн гэх',
    'Everyone unmarked is now present': 'Бүртгэгдээгүй бүгд ирсэн боллоо',
    '{n} of {total} marked': '{total}-аас {n} бүртгэгдсэн', 'Mark present': 'Ирсэн гэж тэмдэглэх',
    'Present': 'Ирсэн', 'Late': 'Хоцорсон', 'Absent': 'Тасалсан', 'Excused': 'Чөлөөтэй',
    'Not marked': 'Бүртгээгүй', 'Completed': 'Дууссан', 'Today': 'Өнөөдөр', 'Tomorrow': 'Маргааш',
    'Yesterday': 'Өчигдөр', 'Not closed': 'Хаагдаагүй', 'Scheduled': 'Товлогдсон',
    'in {n} days': '{n} хоногийн дараа', '{n} days ago': '{n} хоногийн өмнө',
    'RECENT ATTENDANCE': 'СҮҮЛИЙН ИРЦ', 'Nothing recorded yet': 'Одоогоор бүртгэл алга',
    'attendance': 'ирц', 'overall': 'нийт',

    /* homework */
    'Handed in': 'Ирсэн', 'all time': 'нийт хугацаанд', 'Waiting to grade': 'Дүгнэх хүлээгдэж буй',
    'Ungraded': 'Дүгнээгүй', 'Graded': 'Дүгнэсэн', 'Grade': 'Дүгнэх', 'Review': 'Харах',
    'Grade homework': 'Даалгавар дүгнэх', 'Grade (0–100)': 'Оноо (0–100)', 'Feedback': 'Сэтгэгдэл',
    'Save grade': 'Оноо хадгалах', 'Grade saved': 'Оноо хадгалагдлаа', 'ASSIGNMENT': 'ДААЛГАВАР',
    'STUDENT ANSWER': 'СУРАГЧИЙН ХАРИУ', 'handed in {date}': '{date}-нд ирсэн',
    'Nothing handed in yet': 'Одоогоор юу ч ирээгүй', 'Assignments': 'Даалгаврууд',
    'set for my classes': 'миний ангиудад өгсөн', 'Hand in': 'Илгээх', 'Hand in homework': 'Даалгавар илгээх',
    'Edit my answer': 'Хариугаа засах', 'My answer': 'Миний хариу', 'MY ANSWER': 'МИНИЙ ХАРИУ',
    'Save answer': 'Хариу хадгалах', 'Homework handed in': 'Даалгавар илгээгдлээ',
    'Write something before handing in': 'Илгээхээсээ өмнө юм бичнэ үү',
    'Type your answer, or describe the work you are handing in.': 'Хариугаа бич, эсвэл илгээж буй ажлаа тайлбарла.',
    'Already graded {g}/100 — editing clears the grade so your teacher can look again.':
      'Аль хэдийн {g}/100 дүгнэгдсэн — засвал дүн арилж, багш дахин харна.',
    'Waiting for grading': 'Дүгнэлт хүлээж байна', 'Submitted': 'Илгээсэн', 'Not handed in': 'Илгээгээгүй',
    'Nothing set for this lesson.': 'Энэ хичээлд даалгавар өгөөгүй.', 'none': 'байхгүй',
    'Edit': 'Засах', 'Homework avg': 'Даалгаврын дундаж', 'Skills': 'Чадвар', 'Open': 'Нээх',
    'My students': 'Миний сурагчид',

    /* news & noticeboard */
    'News': 'Мэдээ', 'School news': 'Сургуулийн мэдээ', 'All news': 'Бүх мэдээ',
    'Write a notice': 'Мэдээ бичих', 'Edit notice': 'Мэдээ засах', 'Save notice': 'Мэдээ хадгалах',
    'Delete notice': 'Мэдээ устгах', 'Notice': 'Мэдээний агуулга', 'Headline': 'Гарчиг',
    'Chinese headline': 'Хятад гарчиг', 'What is happening': 'Юу болж байна',
    'The whole notice, as your students should read it.':
      'Сурагчид уншихаар бүтэн мэдээгээ бичнэ үү.',
    'Publish it now': 'Одоо нийтлэх', 'Pin to the top': 'Дээр нь бэхлэх',
    'Published': 'Нийтэлсэн', 'Drafts': 'Ноорог', 'Draft': 'Ноорог', 'Pinned': 'Бэхлэсэн',
    'Publish': 'Нийтлэх', 'Unpublish': 'Нийтлэхээ болих', 'Pin to top': 'Дээр бэхлэх', 'Unpin': 'Бэхлэлт авах',
    'Notice published': 'Мэдээ нийтлэгдлээ', 'Notice taken down': 'Мэдээг буулгалаа',
    'Notice saved': 'Мэдээ хадгалагдлаа', 'Notice saved as a draft': 'Мэдээ ноорогт хадгалагдлаа',
    'Notice deleted': 'Мэдээ устлаа', 'The notice needs a headline': 'Мэдээнд гарчиг хэрэгтэй',
    'Delete {title}? Anyone reading it now will stop seeing it.':
      '{title}-г устгах уу? Одоо уншиж байгаа хүмүүст харагдахаа болино.',
    'Nothing on the noticeboard yet': 'Одоогоор мэдээ алга', 'No drafts': 'Ноорог алга',
    'Write a notice and publish it — visitors see it before they even sign in.':
      'Мэдээ бичээд нийтэл — зочид нэвтрэхээсээ ч өмнө уншина.',
    'Published notices appear on the sign-in page and on every student dashboard.':
      'Нийтэлсэн мэдээ нэвтрэх хуудас болон сурагч бүрийн самбар дээр гарна.',
    'School news will show up here.': 'Сургуулийн мэдээ энд гарч ирнэ.',
    'by {name}': '{name}',

    /* a student's own tuition */
    'My tuition': 'Миний төлбөр', 'My invoices': 'Миний нэхэмжлэх',
    'Still to pay': 'Төлөх үлдэгдэл', 'Paid so far': 'Төлсөн дүн', 'Next due': 'Дараагийн хугацаа',
    'nothing outstanding': 'үлдэгдэлгүй', 'all settled': 'бүгд төлөгдсөн',
    '{n} of {total} billed': 'нэхэмжилсэн {total}-н {n}%',
    '{money} is past its due date': '{money} хугацаа хэтэрсэн байна',
    'Speak to the school office to settle it.': 'Төлбөрөө барагдуулахаар сургуулийн ажилтантай холбогдоно уу.',
    'paid {date}': '{date}-нд төлсөн', '{money} still owed': '{money} үлдэгдэлтэй',
    'No invoices yet': 'Одоогоор нэхэмжлэх алга', 'Nothing has been billed to you.': 'Танд нэхэмжлэх гараагүй байна.',
    'Payments are recorded by the school — this page shows what is on file for you.':
      'Төлбөрийг сургууль бүртгэдэг — энэ хуудас таны бүртгэлд юу байгааг харуулна.',

    /* graduation */
    'Graduated': 'Төгссөн', 'Studying': 'Суралцаж буй', 'Graduate': 'Төгсгөх',
    'Bring back': 'Эргүүлэн авах', 'finished {date}': '{date}-нд төгссөн',
    'Nobody has graduated yet': 'Одоогоор төгссөн хүн алга',
    'Finished students are kept here with their whole record.':
      'Төгссөн сурагчид бүх түүхийнхээ хамт энд хадгалагдана.',
    'Graduate {name}': '{name}-г төгсгөх',
    '{name} stops appearing on new registers and is no longer billed. Their attendance, marks and tuition history stay on file.':
      '{name} шинэ ирцийн бүртгэлд орохоо больж, төлбөр нэхэмжлэхээ зогсооно. Ирц, дүн, төлбөрийн түүх нь хэвээр үлдэнэ.',
    '{money} is still outstanding on {n} invoices — that debt stays on the books.':
      '{n} нэхэмжлэх дээр {money} төлөгдөөгүй байна — тэр өр бүртгэлд хэвээр үлдэнэ.',
    '{name} has graduated': '{name} төгслөө', '{name} is studying again': '{name} дахин суралцаж байна',
    'You have finished your course': 'Та сургалтаа дүүргэсэн байна',
    'Graduated on {date}. Your record stays here to look back on.':
      '{date}-нд төгссөн. Таны бүртгэл эргэн харахад бэлэн энд үлдэнэ.',
    'Your record stays here to look back on.': 'Таны бүртгэл эргэн харахад бэлэн энд үлдэнэ.',
    'Classes taken': 'Үзсэн ангиуд', 'over your whole course': 'сургалтын турш',
    'Your course is finished': 'Таны сургалт дууссан',
    'Everything you studied is still here to look back on.':
      'Таны үзсэн бүхэн эргэн харахад бэлэн энд байна.',
    'Course complete': 'Сургалт дууссан', 'Nothing left to hand in': 'Илгээх зүйл үлдээгүй',
    'Never handed in — the course has since finished.':
      'Илгээгээгүй өнгөрсөн — сургалт дуусчихсан.',
    'Your course has finished': 'Таны сургалт дууссан байна',

    /* progress & assessment */
    'Grades over time': 'Дүнгийн явц', 'No grades yet': 'Одоогоор дүн алга',
    'Not assessed yet': 'Үнэлгээ хийгдээгүй', 'SKILL ASSESSMENT': 'ЧАДВАРЫН ҮНЭЛГЭЭ',
    'Update assessment': 'Үнэлгээ шинэчлэх', 'Assess {name}': '{name}-г үнэлэх',
    'Save assessment': 'Үнэлгээ хадгалах', 'Assessment saved': 'Үнэлгээ хадгалагдлаа',
    'Speaking': 'Ярих', 'Listening': 'Сонсох', 'Reading': 'Унших', 'Writing': 'Бичих',
    'This student is not in a class yet': 'Энэ сурагч ангид ороогүй байна', 'Close': 'Хаах',

    /* vocabulary */
    'Add word': 'Үг нэмэх', 'Add a word': 'Үг нэмэх', 'Characters': 'Ханз', 'Pinyin': 'Пиньинь',
    'Meaning': 'Утга', 'Add': 'Нэмэх', 'Word added': 'Үг нэмэгдлээ',
    'Characters are required': 'Ханз оруулах шаардлагатай', 'No words yet': 'Одоогоор үг алга',
    'Add the vocabulary for this lesson.': 'Энэ хичээлийн шинэ үгсийг нэмнэ үү.',
    'No words for this lesson': 'Энэ хичээлд үг алга', 'No vocabulary yet': 'Одоогоор шинэ үг алга',
    'Choose a set to practise': 'Давтах багцаа сонго', 'Choose another set': 'Өөр багц сонгох',
    'Practise these words': 'Эдгээр үгийг давтах', 'Preview the words': 'Үгсийг урьдчилан үзэх',
    'Click the card to reveal the pinyin and meaning': 'Пиньинь, утгыг харахын тулд карт дээр дар',
    'Back': 'Буцах', 'Say it': 'Дуудах', 'I know this': 'Би мэднэ', 'Known': 'Мэднэ',
    'Shuffle': 'Холих', 'Shuffled': 'Холилоо', 'Next': 'Дараах',
    '{known} of {total} marked as known': '{total}-аас {known}-г мэднэ гэж тэмдэглэсэн',
    'use the arrow keys to move, space to flip': 'сум товчоор шилжиж, зайн товчоор эргүүлнэ',
    'End of the set — {known} of {total} known': 'Багц дууслаа — {total}-аас {known}-г мэднэ',
    '{n} words': '{n} үг',

    /* online classroom */
    'Start the online lesson': 'Онлайн хичээл эхлүүлэх', 'Back into the classroom': 'Танхим руу буцах',
    'Join the lesson': 'Хичээлд нэгдэх', '{class} is live now': '{class} яг одоо хичээллэж байна',
    'Leave the classroom': 'Танхимаас гарах', 'Video call': 'Видео дуудлага', 'Class board': 'Ангийн самбар',
    'Teaching tools': 'Багшийн хэрэгсэл', 'My controls': 'Миний удирдлага', 'In the room': 'Танхимд',
    'Chat': 'Чат', 'Write a message': 'Мессеж бичих', 'No messages yet.': 'Одоогоор мессеж алга.',
    'Live': 'Шууд', 'Room closed': 'Танхим хаалттай', '{n} in the room': 'Танхимд {n}',
    'Open the room': 'Танхим нээх', 'End the lesson': 'Хичээл дуусгах', 'Lesson ended': 'Хичээл дууслаа',
    'The room is open': 'Танхим нээлттэй', 'The room is not open yet': 'Танхим хараахан нээгдээгүй',
    'Press “Open the room” to let your students in.': '„Танхим нээх“ дарж сурагчдаа оруулна уу.',
    'Your teacher has not started the lesson.': 'Багш хичээлээ эхлүүлээгүй байна.',
    'Join the call': 'Дуудлагад нэгдэх', 'Turn off video': 'Видео унтраах', 'New tab': 'Шинэ цонх',
    'You left the call': 'Та дуудлагаас гарлаа',
    'Join when you are ready — your camera stays off until you do.':
      'Бэлэн болмогцоо нэгдээрэй — түүнээс өмнө камер унтарсан хэвээр.',
    'Test camera': 'Камер шалгах', 'Camera and microphone': 'Камер ба микрофон',
    'Asking for permission…': 'Зөвшөөрөл хүсэж байна…',
    'Camera and microphone are working. Speak to see the level move.':
      'Камер, микрофон ажиллаж байна. Ярихад түвшин хөдөлнө.',
    'This browser cannot open the camera.': 'Энэ браузер камер нээж чадахгүй.',
    'Could not open the camera: {msg}': 'Камер нээж чадсангүй: {msg}',
    'Room settings': 'Танхимын тохиргоо', 'Room settings saved': 'Тохиргоо хадгалагдлаа',
    'Video service': 'Видео үйлчилгээ', 'built in, free': 'суурилуулсан, үнэгүй',
    'My own link (Zoom, Meet, Teams…)': 'Өөрийн холбоос (Zoom, Meet, Teams…)', 'No video': 'Видеогүй',
    'Jitsi room name': 'Jitsi танхимын нэр', 'My own meeting link': 'Өөрийн уулзалтын холбоос',
    'Anyone with the name can join, so keep it hard to guess.':
      'Нэрийг мэдсэн хэн ч нэгдэж чадна — тааварлахад хэцүү нэр өг.',
    'No meeting link': 'Уулзалтын холбоос алга', 'Add one in Room settings.': 'Танхимын тохиргоонд нэмнэ үү.',
    'Flashcards': 'Флэшкарт', 'Writing pad': 'Бичих самбар', 'Quick quiz': 'Хурдан сорил',
    'Big text': 'Том бичвэр', 'Pick a student': 'Сурагч сонгох', 'Clear': 'Цэвэрлэх',
    'Open the room to use the tools.': 'Хэрэгсэл ашиглахын тулд танхимаа нээ.',
    'Reveal': 'Харуулах', 'Hide': 'Нуух',
    'The card on every student screen follows yours.': 'Сурагч бүрийн дэлгэц дэх карт таныг дагана.',
    'Waiting for the teacher to reveal it': 'Багш харуулахыг хүлээж байна',
    'Undo': 'Буцаах', 'Grid': 'Тор', '田字格 practice grid': '田字格 дасгалын тор', 'Plain': 'Хоосон',
    'Start the quiz': 'Сорил эхлүүлэх', 'Show the answer': 'Хариу харуулах', 'Next question': 'Дараагийн асуулт',
    'Quiz finished': 'Сорил дууслаа', 'QUICK QUIZ': 'ХУРДАН СОРИЛ', '{n} answered': '{n} хариулсан',
    'This lesson has no words yet': 'Энэ хичээлд одоогоор үг алга',
    'Put on the board': 'Самбарт гаргах',
    'Type a sentence — students see it as you type': 'Өгүүлбэр бич — сурагчид шууд харна',
    'The teacher is writing…': 'Багш бичиж байна…', 'Pick someone': 'Нэгийг сонго',
    'YOUR TURN': 'ТАНЫ ЭЭЛЖ', 'Nobody to pick': 'Сонгох хүн алга',
    'TIMER': 'ЦАГ', 'Stop': 'Зогсоох', 'Time is up': 'Цаг дууслаа',
    'Raise my hand': 'Гараа өргөх', 'Lower my hand': 'Гараа буулгах',
    'Lesson vocabulary': 'Хичээлийн шинэ үг', 'in the room': 'танхимд', 'not here': 'алга',
    'teacher': 'багш', 'Nothing on the board': 'Самбар хоосон байна',
    'Pick a tool on the right.': 'Баруун талаас хэрэгсэл сонгоно уу.',
    'Your teacher will put something up shortly.': 'Багш тун удахгүй самбарт гаргана.',
    'The board wakes up when the lesson starts': 'Хичээл эхлэхэд самбар ажиллана',


    /* tuition */
    'Payments': 'Төлбөр', 'Tuition per class': 'Ангийн сургалтын төлбөр',
    'Collected': 'Цугласан', 'Outstanding': 'Төлөгдөөгүй', 'Overdue': 'Хугацаа хэтэрсэн',
    'Waiting': 'Хүлээгдэж буй', 'Paid': 'Төлсөн', 'All settled': 'Бүрэн төлөгдсөн',
    '{n}% of {total} billed': 'Нэхэмжилсэн {total}-ийн {n}%',
    '{n} invoices unpaid': '{n} нэхэмжлэх төлөгдөөгүй',
    '{n} past the due date': '{n} нь хугацаа хэтэрсэн',
    'Period': 'Хугацаа', 'All months': 'Бүх сар', 'Amount': 'Дүн',
    'Due date': 'Төлөх хугацаа', 'Paid on': 'Төлсөн огноо', 'Method': 'Хэлбэр', 'Note': 'Тэмдэглэл',
    'Cash': 'Бэлэн', 'Bank transfer': 'Дансаар', 'Card': 'Картаар', 'Mobile': 'Мобайл',
    'Bill {month}': '{month}-ыг нэхэмжлэх', 'Raise invoices': 'Нэхэмжлэх үүсгэх',
    '{n} invoices raised': '{n} нэхэмжлэх үүслээ',
    'Everyone is already billed for {month}': '{month}-ын нэхэмжлэх бүгдэд үүсгэсэн байна',
    '{n} students have no invoice for {month} yet. Each is billed the fee of their class, due on {date}.':
      '{n} сурагчид {month}-ын нэхэмжлэхгүй байна. Тус бүрд ангийнх нь төлбөрөөр, {date}-нд төлөх хугацаатай үүснэ.',
    '{n} enrolled': '{n} сурагч', '{n} already billed': '{n} нэхэмжилсэн',
    'Record a payment': 'Төлбөр бүртгэх', 'New invoice': 'Шинэ нэхэмжлэх',
    'Mark paid': 'Төлсөн болгох', 'Mark unpaid': 'Төлөлтийг буцаах',
    'Edit invoice': 'Нэхэмжлэх засах', 'Delete invoice': 'Нэхэмжлэх устгах',
    'Save invoice': 'Нэхэмжлэх хадгалах', 'Invoice saved': 'Нэхэмжлэх хадгалагдлаа',
    'Invoice deleted': 'Нэхэмжлэх устлаа', 'Payment recorded': 'Төлбөр бүртгэгдлээ',
    'Payment reversed': 'Төлбөр буцаагдлаа', 'Enter an amount': 'Дүнгээ оруулна уу',
    'Enrol a student first': 'Эхлээд сурагч элсүүлнэ үү',
    'Paid already': 'Аль хэдийн төлсөн', 'Records today as the payment date.': 'Өнөөдрийг төлсөн огноогоор бүртгэнэ.',
    'Receipt number, who paid…': 'Баримтын дугаар, хэн төлсөн…',
    '{name} · {month} · {money}': '{name} · {month} · {money}',
    'Delete the {month} invoice for {name}?': '{name}-ийн {month}-ын нэхэмжлэхийг устгах уу?',
    'Monthly fee': 'Сарын төлбөр', 'Fee per student, per month': 'Нэг сурагчийн сарын төлбөр',
    'per student, per month': 'сурагч бүрд, сард',
    '{money} per student, per month': 'Сурагч бүрд сард {money}',
    '{money} a month if everyone pays': 'Бүгд төлвөл сард {money}',
    '{money} outstanding': '{money} төлөгдөөгүй',
    'Invoices already raised keep their amount.': 'Үүсгэсэн нэхэмжлэхийн дүн хэвээр үлдэнэ.',
    'Fee saved': 'Төлбөр хадгалагдлаа',
    'Bill the month to raise an invoice for every enrolled student.':
      'Элссэн сурагч бүрд нэхэмжлэх үүсгэхийн тулд тухайн сарыг нэхэмжил.',
    'Create a class before billing tuition.': 'Төлбөр нэхэмжлэхийн өмнө анги үүсгэнэ үү.',


    /* advances */
    'Advance': 'Урьдчилгаа', 'Part paid': 'Хэсэгчилсэн', 'Amount received': 'Хүлээн авсан дүн',
    'Record payment': 'Төлбөр бүртгэх',
    'Less than {money} is kept as an advance.': '{money}-с бага бол урьдчилгаа болон үлдэнэ.',
    'Advance recorded — {money} left': 'Урьдчилгаа бүртгэгдлээ — {money} үлдлээ',
    '{money} left': '{money} үлдэгдэл', '{money} in advances': '{money} урьдчилгаа',
    '{money} in advance already': 'урьдчилгаа {money} төлсөн',
    'Ignored when the invoice is already paid in full.': 'Бүтэн төлсөн тохиолдолд тооцогдохгүй.',
    'Held against the {money} due': 'Нийт {money} төлбөрт тооцогдоно',
    'Settled in full.': 'Бүрэн төлөгдсөн.',

    /* misc */
    'Save': 'Хадгалах', 'Delete': 'Устгах',
    'Mon': 'Да', 'Tue': 'Мя', 'Wed': 'Лх', 'Thu': 'Пү', 'Fri': 'Ба', 'Sat': 'Бя', 'Sun': 'Ня'
  };

  /* ══ 中文 ════════════════════════════════════════════ */
  var ZH = {
    'Dashboard': '概览', 'My classes': '我的班级', 'Lessons': '课程', 'Homework': '作业',
    'Students': '学生', 'My timetable': '我的课表', 'Vocabulary': '生词', 'My progress': '我的进度',
    'Lesson': '课程', 'Class': '班级', 'Online classroom': '在线课堂', 'Teacher': '教师', 'Student': '学生',
    'Sign in': '登录', 'Sign out': '退出', 'Not found': '未找到', 'Page not found': '页面不存在',
    'The link may be out of date.': '链接可能已失效。', 'Something went wrong on this page': '此页面出错了',

    'Every lesson, register and mark in one place.': '课程、考勤、成绩，尽在一处。',
    'Teachers plan the lesson, run it online, take the register and grade the work. Students join the call, follow the board and hand in homework.':
      '教师备课、线上授课、点名并批改作业；学生加入通话、跟随白板并提交作业。',
    'Pick an account to open the school.': '选择一个账号进入学校。',
    'Demo school — data is stored in this browser only.': '演示学校 — 数据仅保存在此浏览器中。',
    'Reset the demo data': '重置演示数据', 'Reset demo': '重置演示', 'Restore the demo school': '恢复演示学校',
    'Reset the demo school': '重置演示学校',
    'Every class, lesson, register, grade and assessment goes back to how it started. Anything you added here is lost.':
      '所有班级、课程、考勤、成绩与评估都会回到初始状态，您添加的内容将丢失。',
    'Reset': '重置', 'Demo school restored': '演示学校已恢复', 'Signed in as {name}': '已以 {name} 登录',
    'Language changed': '语言已切换',

    'Classes': '班级', 'across all classes': '所有班级合计', 'Lessons this week': '本周课程',
    'Attendance': '出勤', '{n} marks recorded': '已记录 {n} 条', 'Next lesson': '下节课',
    'Lesson in progress': '正在上课', 'All lessons': '全部课程', 'Needs attention': '待处理',
    '{n} assignments to grade': '{n} 份作业待批改', 'Homework handed in and waiting': '已交作业等待批改',
    '{n} registers still open': '{n} 份考勤未关闭', 'Past lessons never closed out': '过去的课程未结课',
    '{n} students below 70%': '{n} 名学生低于 70%', 'Attendance needs a conversation': '出勤需要沟通',
    'Attendance trend': '出勤趋势', 'No completed lessons yet': '还没有已完成的课程',
    'Nothing scheduled': '没有安排', 'Create a lesson to get started.': '创建一节课开始吧。',
    'no lessons': '暂无课程', 'Class roster': '班级名单', 'Open lesson': '打开课程',
    '{n} students': '{n} 名学生', 'Words studied': '已学生词', 'across completed lessons': '已完成课程合计',
    'Homework due': '待交作业', 'hand in when ready': '准备好就提交', 'all caught up': '全部完成',
    'Average grade': '平均成绩', '{n} graded': '{n} 份已评分', 'To do': '待办',
    'Nothing outstanding': '没有待办', 'Every assignment handed in': '所有作业均已提交',
    'Recent lessons': '最近课程', 'Practise words': '练习生词', 'No upcoming lessons': '没有即将开始的课',
    'Not enrolled in a class yet': '尚未加入任何班级', '{n} lessons recorded': '已记录 {n} 节课',

    'New class': '新建班级', 'Edit class': '编辑班级', 'Delete class': '删除班级', 'Class name': '班级名称',
    'Chinese name': '中文名', 'Level': '等级', 'Room': '教室', 'Time': '时间', 'Days of the week': '上课日',
    'Enrol students now': '现在添加学生', 'Create class': '创建班级', 'Class created': '班级已创建',
    'Class saved': '班级已保存', 'Class deleted': '班级已删除', 'Class not found': '未找到班级',
    'All classes': '全部班级', 'The class needs a name': '请填写班级名称', 'No classes yet': '还没有班级',
    'Create your first class.': '创建第一个班级。',
    'Create a class — HSK 4, say — then enrol your students in it.': '创建一个班级（比如 HSK 4），然后把学生加进去。',
    'Delete {name}? Its {n} lessons, registers and grades go with it.':
      '删除 {name}？其 {n} 节课、考勤与成绩将一并删除。',
    '{done} of {total} lessons delivered': '已上 {done} / {total} 节',
    '{n} lessons in the course': '课程共 {n} 节', 'Roster': '名单', 'Enrol': '添加',
    'Enrol students': '添加学生', 'Existing students': '已有学生', 'OR CREATE A NEW ONE': '或新建一位',
    'Name': '姓名', 'Full name': '全名', 'Email': '邮箱',
    'Everybody is already in this class.': '所有人都已在此班级中。', 'Nobody selected': '未选择任何人',
    '{n} students enrolled': '已添加 {n} 名学生', 'Nobody enrolled yet': '还没有学生',
    'Press Enrol to add students.': '点击“添加”加入学生。', 'Remove from the class': '移出班级',
    'Remove': '移除', 'Removed from the class': '已移出班级',
    'Take {name} off this roster? Their attendance history stays.': '把 {name} 移出名单？其出勤记录会保留。',
    'New student': '新学生', 'Create student': '创建学生', 'Student created': '学生已创建',
    'The student needs a name': '请填写学生姓名', 'Enrol in class': '加入班级', 'None for now': '暂不加入',
    'No students yet': '还没有学生', 'Create a class and enrol students in it.': '创建班级并添加学生。',
    'e.g. HSK 4 · Upper intermediate': '例如 HSK 4 · 中高级',

    'New lesson': '新建课程', 'Create lesson': '创建课程', 'Lesson created': '课程已创建',
    'Lesson not found': '未找到课程', 'No lessons yet': '还没有课程', 'Nothing here': '这里没有内容',
    'Try another filter or create a lesson.': '换个筛选条件或新建一节课。', 'Try another filter.': '换个筛选条件。',
    'Upcoming': '即将开始', 'Past': '已过去', 'All': '全部', 'Date': '日期', 'When': '时间',
    'Marked': '已点名', 'Status': '状态', 'Title': '标题', 'Topic': '主题', 'Vocabulary set': '生词表',
    'Create a class first': '请先创建班级',
    'Its words are copied into the lesson — edit them afterwards.': '其生词会复制到本课，之后可以修改。',
    'Defaults to the vocabulary set name': '留空则使用生词表名称', 'What the class will cover': '本课要讲的内容',
    'Optional': '选填', 'Edit lesson plan': '编辑教案', 'Edit plan': '编辑教案', 'Lesson plan': '教案',
    'Lesson plan saved': '教案已保存', 'Private notes': '私人备注', 'Only you can see this': '只有你能看到',
    'TOPIC': '主题', 'HOMEWORK': '作业', 'PRIVATE NOTES': '私人备注', 'None set': '未布置',
    'Delete lesson': '删除课程', 'Lesson deleted': '课程已删除',
    'Delete {title} on {date}? Its register and any handed-in homework go with it.':
      '删除 {date} 的《{title}》？其考勤与已交作业将一并删除。',
    'Complete lesson': '结课', 'What was covered': '本课内容', 'Leave blank for none': '没有则留空',
    'Any student still unmarked will be recorded as absent.': '仍未点名的学生将记为缺席。',
    'Lesson completed and register closed': '课程已结束，考勤已关闭', 'Reopen': '重新开启',
    'Lesson reopened': '课程已重新开启', 'Lesson {n} of {total}': '第 {n} 课 / 共 {total} 课',
    'Course progress': '课程进度', '{done} of {total} lessons': '{done} / {total} 节',

    'Attendance register': '考勤表', 'Mark all present': '全部标为出席',
    'Everyone unmarked is now present': '未点名的学生已标为出席', '{n} of {total} marked': '已点 {n} / {total}',
    'Mark present': '标为出席', 'Present': '出席', 'Late': '迟到', 'Absent': '缺席', 'Excused': '请假',
    'Not marked': '未点名', 'Completed': '已完成', 'Today': '今天', 'Tomorrow': '明天', 'Yesterday': '昨天',
    'Not closed': '未结课', 'Scheduled': '已安排', 'in {n} days': '{n} 天后', '{n} days ago': '{n} 天前',
    'RECENT ATTENDANCE': '最近出勤', 'Nothing recorded yet': '还没有记录', 'attendance': '出勤', 'overall': '总体',

    'Handed in': '已提交', 'all time': '全部', 'Waiting to grade': '待批改', 'Ungraded': '未评分',
    'Graded': '已评分', 'Grade': '评分', 'Review': '查看', 'Grade homework': '批改作业',
    'Grade (0–100)': '分数（0–100）', 'Feedback': '评语', 'Save grade': '保存分数', 'Grade saved': '分数已保存',
    'ASSIGNMENT': '作业要求', 'STUDENT ANSWER': '学生答案', 'handed in {date}': '{date} 提交',
    'Nothing handed in yet': '还没有人提交', 'Assignments': '作业', 'set for my classes': '我的班级布置的',
    'Hand in': '提交', 'Hand in homework': '提交作业', 'Edit my answer': '修改我的答案',
    'My answer': '我的答案', 'MY ANSWER': '我的答案', 'Save answer': '保存答案', 'Homework handed in': '作业已提交',
    'Write something before handing in': '提交前请先写点内容',
    'Type your answer, or describe the work you are handing in.': '写下你的答案，或说明你提交的内容。',
    'Already graded {g}/100 — editing clears the grade so your teacher can look again.':
      '已评 {g}/100 — 修改后分数会清空，老师会重新查看。',
    'Waiting for grading': '等待批改', 'Submitted': '已提交', 'Not handed in': '未提交',
    'Nothing set for this lesson.': '本课没有布置作业。', 'none': '无', 'Edit': '编辑',
    'Homework avg': '作业均分', 'Skills': '技能', 'Open': '打开', 'My students': '我的学生',

    /* news & noticeboard */
    'News': '公告', 'School news': '学校公告', 'All news': '全部公告',
    'Write a notice': '发布公告', 'Edit notice': '编辑公告', 'Save notice': '保存公告',
    'Delete notice': '删除公告', 'Notice': '公告内容', 'Headline': '标题',
    'Chinese headline': '中文标题', 'What is happening': '发生了什么',
    'The whole notice, as your students should read it.': '完整的公告内容，学生看到的就是这些。',
    'Publish it now': '立即发布', 'Pin to the top': '置顶',
    'Published': '已发布', 'Drafts': '草稿', 'Draft': '草稿', 'Pinned': '置顶',
    'Publish': '发布', 'Unpublish': '取消发布', 'Pin to top': '置顶', 'Unpin': '取消置顶',
    'Notice published': '公告已发布', 'Notice taken down': '公告已撤下',
    'Notice saved': '公告已保存', 'Notice saved as a draft': '公告已存为草稿',
    'Notice deleted': '公告已删除', 'The notice needs a headline': '公告需要标题',
    'Delete {title}? Anyone reading it now will stop seeing it.': '删除{title}？正在阅读的人将不再看到它。',
    'Nothing on the noticeboard yet': '公告栏还是空的', 'No drafts': '没有草稿',
    'Write a notice and publish it — visitors see it before they even sign in.':
      '写一条公告并发布 —— 访客还没登录就能看到。',
    'Published notices appear on the sign-in page and on every student dashboard.':
      '已发布的公告会出现在登录页和每位学生的主页上。',
    'School news will show up here.': '学校公告会显示在这里。',
    'by {name}': '{name}',

    /* a student's own tuition */
    'My tuition': '我的学费', 'My invoices': '我的账单',
    'Still to pay': '待缴', 'Paid so far': '已缴', 'Next due': '下次到期',
    'nothing outstanding': '没有欠费', 'all settled': '全部结清',
    '{n} of {total} billed': '已缴 {n}%，共开具 {total}',
    '{money} is past its due date': '{money} 已逾期',
    'Speak to the school office to settle it.': '请与学校前台联系缴清。',
    'paid {date}': '{date} 已缴', '{money} still owed': '尚欠 {money}',
    'No invoices yet': '还没有账单', 'Nothing has been billed to you.': '目前没有向你开具账单。',
    'Payments are recorded by the school — this page shows what is on file for you.':
      '缴费由学校登记 —— 此页显示的是你名下的记录。',

    /* graduation */
    'Graduated': '已毕业', 'Studying': '在读', 'Graduate': '结业', 'Bring back': '恢复在读',
    'finished {date}': '{date} 结业', 'Nobody has graduated yet': '还没有人毕业',
    'Finished students are kept here with their whole record.': '结业的学生连同全部记录保留在这里。',
    'Graduate {name}': '为 {name} 办理结业',
    '{name} stops appearing on new registers and is no longer billed. Their attendance, marks and tuition history stay on file.':
      '{name} 将不再出现在新的考勤表上，也不再产生学费账单。考勤、成绩与缴费记录仍然保留。',
    '{money} is still outstanding on {n} invoices — that debt stays on the books.':
      '{n} 张账单尚欠 {money} —— 该欠款仍然保留在账上。',
    '{name} has graduated': '{name} 已毕业', '{name} is studying again': '{name} 重新在读',
    'You have finished your course': '你已完成课程',
    'Graduated on {date}. Your record stays here to look back on.': '{date} 结业。你的记录会一直保留在这里。',
    'Your record stays here to look back on.': '你的记录会一直保留在这里。',
    'Classes taken': '修读班级', 'over your whole course': '整个课程期间',
    'Your course is finished': '你的课程已结束',
    'Everything you studied is still here to look back on.': '你学过的一切都还在这里，可以随时回顾。',
    'Course complete': '课程已完成', 'Nothing left to hand in': '没有要提交的作业了',
    'Never handed in — the course has since finished.': '当时未提交 —— 课程此后已结束。',
    'Your course has finished': '你的课程已经结束',

    'Grades over time': '成绩变化', 'No grades yet': '还没有成绩', 'Not assessed yet': '尚未评估',
    'SKILL ASSESSMENT': '技能评估', 'Update assessment': '更新评估', 'Assess {name}': '评估 {name}',
    'Save assessment': '保存评估', 'Assessment saved': '评估已保存', 'Speaking': '口语', 'Listening': '听力',
    'Reading': '阅读', 'Writing': '写作', 'This student is not in a class yet': '该学生尚未加入班级',
    'Close': '关闭',

    'Add word': '添加生词', 'Add a word': '添加生词', 'Characters': '汉字', 'Pinyin': '拼音',
    'Meaning': '释义', 'Add': '添加', 'Word added': '生词已添加', 'Characters are required': '请填写汉字',
    'No words yet': '还没有生词', 'Add the vocabulary for this lesson.': '为本课添加生词。',
    'No words for this lesson': '本课没有生词', 'No vocabulary yet': '还没有生词',
    'Choose a set to practise': '选择要练习的生词表', 'Choose another set': '换一个生词表',
    'Practise these words': '练习这些生词', 'Preview the words': '预习生词',
    'Click the card to reveal the pinyin and meaning': '点击卡片显示拼音和释义',
    'Back': '返回', 'Say it': '朗读', 'I know this': '我会了', 'Known': '已掌握', 'Shuffle': '打乱',
    'Shuffled': '已打乱', 'Next': '下一个',
    '{known} of {total} marked as known': '已标记掌握 {known} / {total}',
    'use the arrow keys to move, space to flip': '方向键切换，空格翻面',
    'End of the set — {known} of {total} known': '练习结束 — 掌握 {known} / {total}', '{n} words': '{n} 个词',

    'Start the online lesson': '开始在线课', 'Back into the classroom': '回到课堂',
    'Join the lesson': '加入课堂', '{class} is live now': '{class} 正在上课',
    'Leave the classroom': '离开课堂', 'Video call': '视频通话', 'Class board': '课堂白板',
    'Teaching tools': '教学工具', 'My controls': '我的操作', 'In the room': '课堂成员', 'Chat': '聊天',
    'Write a message': '写点什么', 'No messages yet.': '还没有消息。', 'Live': '直播中',
    'Room closed': '课堂未开', '{n} in the room': '课堂内 {n} 人', 'Open the room': '开启课堂',
    'End the lesson': '结束课堂', 'Lesson ended': '课堂已结束', 'The room is open': '课堂已开启',
    'The room is not open yet': '课堂尚未开启',
    'Press “Open the room” to let your students in.': '点击“开启课堂”让学生进入。',
    'Your teacher has not started the lesson.': '老师还没有开始上课。', 'Join the call': '加入通话',
    'Turn off video': '关闭视频', 'New tab': '新标签页', 'You left the call': '你已离开通话',
    'Join when you are ready — your camera stays off until you do.': '准备好再加入 — 在此之前摄像头不会开启。',
    'Test camera': '测试摄像头', 'Camera and microphone': '摄像头与麦克风',
    'Asking for permission…': '正在请求权限…',
    'Camera and microphone are working. Speak to see the level move.': '摄像头与麦克风正常，说话可看到音量变化。',
    'This browser cannot open the camera.': '此浏览器无法开启摄像头。',
    'Could not open the camera: {msg}': '无法开启摄像头：{msg}',
    'Room settings': '课堂设置', 'Room settings saved': '课堂设置已保存', 'Video service': '视频服务',
    'built in, free': '内置、免费', 'My own link (Zoom, Meet, Teams…)': '自定义链接（Zoom、Meet、Teams…）',
    'No video': '不用视频', 'Jitsi room name': 'Jitsi 房间名', 'My own meeting link': '自定义会议链接',
    'Anyone with the name can join, so keep it hard to guess.': '知道房间名的人都能进入，请设置不易猜到的名称。',
    'No meeting link': '没有会议链接', 'Add one in Room settings.': '请在课堂设置中添加。',
    'Flashcards': '生词卡', 'Writing pad': '书写板', 'Quick quiz': '快速测验', 'Big text': '大字板',
    'Pick a student': '随机点名', 'Clear': '清空',
    'Open the room to use the tools.': '开启课堂后即可使用工具。', 'Reveal': '揭示', 'Hide': '隐藏',
    'The card on every student screen follows yours.': '每位学生屏幕上的卡片会跟随你。',
    'Waiting for the teacher to reveal it': '等待老师揭示', 'Undo': '撤销', 'Grid': '格子',
    '田字格 practice grid': '田字格', 'Plain': '空白', 'Start the quiz': '开始测验',
    'Show the answer': '公布答案', 'Next question': '下一题', 'Quiz finished': '测验结束',
    'QUICK QUIZ': '快速测验', '{n} answered': '{n} 人已作答',
    'This lesson has no words yet': '本课还没有生词', 'Put on the board': '写到白板',
    'Type a sentence — students see it as you type': '输入句子 — 学生实时可见',
    'The teacher is writing…': '老师正在书写…', 'Pick someone': '随机选一位', 'YOUR TURN': '轮到你了',
    'Nobody to pick': '没有可选的学生', 'TIMER': '计时器', 'Stop': '停止', 'Time is up': '时间到',
    'Raise my hand': '举手', 'Lower my hand': '放下手', 'Lesson vocabulary': '本课生词',
    'in the room': '在课堂中', 'not here': '未进入', 'teacher': '老师', 'Nothing on the board': '白板空白',
    'Pick a tool on the right.': '在右侧选择一个工具。',
    'Your teacher will put something up shortly.': '老师马上会展示内容。',
    'The board wakes up when the lesson starts': '课堂开始后白板即可使用',


    /* tuition */
    'Payments': '学费', 'Tuition per class': '各班学费',
    'Collected': '已收', 'Outstanding': '未收', 'Overdue': '逾期',
    'Waiting': '待付', 'Paid': '已付', 'All settled': '已结清',
    '{n}% of {total} billed': '已开票 {total} 的 {n}%',
    '{n} invoices unpaid': '{n} 笔未付',
    '{n} past the due date': '{n} 笔已逾期',
    'Period': '账期', 'All months': '全部月份', 'Amount': '金额',
    'Due date': '到期日', 'Paid on': '付款日', 'Method': '方式', 'Note': '备注',
    'Cash': '现金', 'Bank transfer': '银行转账', 'Card': '刷卡', 'Mobile': '手机支付',
    'Bill {month}': '开具 {month} 账单', 'Raise invoices': '生成账单',
    '{n} invoices raised': '已生成 {n} 笔账单',
    'Everyone is already billed for {month}': '{month} 的账单已全部开具',
    '{n} students have no invoice for {month} yet. Each is billed the fee of their class, due on {date}.':
      '{n} 名学生还没有 {month} 的账单。按各自班级的学费开具，{date} 到期。',
    '{n} enrolled': '{n} 人在读', '{n} already billed': '已开 {n} 笔',
    'Record a payment': '登记收款', 'New invoice': '新建账单',
    'Mark paid': '标记已付', 'Mark unpaid': '撤销付款',
    'Edit invoice': '编辑账单', 'Delete invoice': '删除账单',
    'Save invoice': '保存账单', 'Invoice saved': '账单已保存',
    'Invoice deleted': '账单已删除', 'Payment recorded': '收款已登记',
    'Payment reversed': '付款已撤销', 'Enter an amount': '请输入金额',
    'Enrol a student first': '请先添加学生',
    'Paid already': '已经付款', 'Records today as the payment date.': '以今天作为付款日期。',
    'Receipt number, who paid…': '收据号、付款人…',
    '{name} · {month} · {money}': '{name} · {month} · {money}',
    'Delete the {month} invoice for {name}?': '删除 {name} 的 {month} 账单？',
    'Monthly fee': '月学费', 'Fee per student, per month': '每名学生每月学费',
    'per student, per month': '每人每月',
    '{money} per student, per month': '每人每月 {money}',
    '{money} a month if everyone pays': '全部付清每月 {money}',
    '{money} outstanding': '未收 {money}',
    'Invoices already raised keep their amount.': '已生成的账单金额不变。',
    'Fee saved': '学费已保存',
    'Bill the month to raise an invoice for every enrolled student.':
      '开具当月账单，为每位在读学生生成一笔。',
    'Create a class before billing tuition.': '先创建班级再开具学费账单。',


    /* advances */
    'Advance': '预付', 'Part paid': '部分付款', 'Amount received': '收到金额',
    'Record payment': '登记收款',
    'Less than {money} is kept as an advance.': '低于 {money} 的部分记为预付。',
    'Advance recorded — {money} left': '预付已登记 — 还差 {money}',
    '{money} left': '还差 {money}', '{money} in advances': '预付 {money}',
    '{money} in advance already': '已预付 {money}',
    'Ignored when the invoice is already paid in full.': '若已全额付清则忽略。',
    'Held against the {money} due': '计入应付的 {money}',
    'Settled in full.': '已全额结清。',

    'Save': '保存', 'Delete': '删除',
    'Mon': '一', 'Tue': '二', 'Wed': '三', 'Thu': '四', 'Fri': '五', 'Sat': '六', 'Sun': '日'
  };

  var DICT = { en: {}, mn: MN, zh: ZH };
  var lang = 'en';

  function T(s, vars) {
    var out = (DICT[lang] && DICT[lang][s]) || s;
    if (vars) {
      out = out.replace(/\{(\w+)\}/g, function (m, k) {
        return vars[k] == null ? m : vars[k];
      });
    }
    return out;
  }

  var I18n = {
    LANGS: LANGS,
    get: function () { return lang; },
    set: function (id) {
      if (!DICT[id]) return;
      lang = id;
      try { localStorage.setItem(KEY, id); } catch (e) {}
      document.documentElement.lang = id === 'zh' ? 'zh-CN' : id === 'mn' ? 'mn' : 'en';
    },
    init: function () {
      var saved = null;
      try { saved = localStorage.getItem(KEY); } catch (e) {}
      if (!saved) {
        var nav = (navigator.language || 'mn').toLowerCase();
        saved = nav.indexOf('zh') === 0 ? 'zh' : nav.indexOf('en') === 0 ? 'en' : 'mn';
      }
      this.set(DICT[saved] ? saved : 'mn');
    },
    days: function () { return CAL[lang].days; },
    months: function () { return CAL[lang].months; },
    dateShort: function (d, n, m) { return CAL[lang].short(d, n, m); },
    dateLong: function (d, n, m, y) { return CAL[lang].long(d, n, m, y); }
  };

  global.T = T;
  global.I18n = I18n;
})(window);
