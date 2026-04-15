import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://zkiyqgfjlofxfzgnzkqk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpraXlxZ2ZqbG9meGZ6Z256a3FrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkyOTYyNiwiZXhwIjoyMDg5NTA1NjI2fQ.0rtRBHYSOBxRigt62y0qE3KYrE32dMkSik0p_nRlmPo',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const supervisors = [
  { email: 's1@anaesthesia.test',  full_name: 'Алиханова ЭИ' },
  { email: 's2@anaesthesia.test',  full_name: 'Арболишвили ГН' },
  { email: 's3@anaesthesia.test',  full_name: 'Вацик-Городецкая МВ' },
  { email: 's4@anaesthesia.test',  full_name: 'Винокурова АА' },
  { email: 's5@anaesthesia.test',  full_name: 'Гуцалюк АГ' },
  { email: 's6@anaesthesia.test',  full_name: 'Куценко АЭ' },
  { email: 's7@anaesthesia.test',  full_name: 'Малюк ДИ' },
  { email: 's8@anaesthesia.test',  full_name: 'Мисиков ЗФ' },
  { email: 's9@anaesthesia.test',  full_name: 'Михайлов АА' },
  { email: 's10@anaesthesia.test', full_name: 'Петрова МВ' },
  { email: 's11@anaesthesia.test', full_name: 'Погосян МЛ' },
  { email: 's12@anaesthesia.test', full_name: 'Прадхан П' },
  { email: 's13@anaesthesia.test', full_name: 'Спасский АА' },
  { email: 's14@anaesthesia.test', full_name: 'Струнин ОВ' },
  { email: 's15@anaesthesia.test', full_name: 'Хороненко ВЭ' },
  { email: 's16@anaesthesia.test', full_name: 'Ценципер ЛМ' },
  { email: 's17@anaesthesia.test', full_name: 'Шафран ПА' },
  { email: 's18@anaesthesia.test', full_name: 'Шпичко АИ' },
  { email: 's19@anaesthesia.test', full_name: 'Шпичко НП' },
  { email: 's20@anaesthesia.test', full_name: 'Ханахмедова УГ' },
  { email: 's21@anaesthesia.test', full_name: 'Крюков ИА' },
  { email: 's22@anaesthesia.test', full_name: 'Курмуков ИА' },
  { email: 's23@anaesthesia.test', full_name: 'Обухова ОА' },
]

const residents = [
  { email: 'r1@anaesthesia.test',  full_name: 'Абдуллаева Азиза Алишеровна' },
  { email: 'r2@anaesthesia.test',  full_name: 'Абдуллаева Надан Гасым Кызы' },
  { email: 'r3@anaesthesia.test',  full_name: 'Алымов Махсуд' },
  { email: 'r4@anaesthesia.test',  full_name: 'Бородин Максим Александрович' },
  { email: 'r5@anaesthesia.test',  full_name: 'Болдырева Светлана Геннадьевна' },
  { email: 'r6@anaesthesia.test',  full_name: 'Ботоев Батрадз Казбекович' },
  { email: 'r7@anaesthesia.test',  full_name: 'Батырев Эльдар Хонгрович' },
  { email: 'r8@anaesthesia.test',  full_name: 'Бочкарева Анастасия Геннадьевна' },
  { email: 'r9@anaesthesia.test',  full_name: 'Вердесото Солорсано Генезис Белен' },
  { email: 'r10@anaesthesia.test', full_name: 'Дорофеев Даниил Сергеевич' },
  { email: 'r11@anaesthesia.test', full_name: 'Ламбин Никита Дмитриевич' },
  { email: 'r12@anaesthesia.test', full_name: 'Медина Пенья Йенит Лусия' },
  { email: 'r13@anaesthesia.test', full_name: 'Подолян Никита Александрович' },
  { email: 'r14@anaesthesia.test', full_name: 'Рустамов Жалол Рустамович' },
  { email: 'r15@anaesthesia.test', full_name: 'Сарибекян Аревик Геворговна' },
  { email: 'r16@anaesthesia.test', full_name: 'Саломзода Зухалшохи Эмомали' },
  { email: 'r17@anaesthesia.test', full_name: 'Третьяк Елизавета Александровна' },
  { email: 'r18@anaesthesia.test', full_name: 'Турдиев Фарходжон Бахтиёрович' },
  { email: 'r19@anaesthesia.test', full_name: 'Федышина Юлия Олеговна' },
  { email: 'r20@anaesthesia.test', full_name: 'Хатива Ариас Лади Роксана' },
  { email: 'r21@anaesthesia.test', full_name: 'Чавлешвили Мариам' },
  { email: 'r22@anaesthesia.test', full_name: 'Яманова Полина Владиславовна' },
  { email: 'r23@anaesthesia.test', full_name: 'Шодиев Шохаид Абдусамадович' },
  { email: 'r24@anaesthesia.test', full_name: 'Абдурахманов Баходур Бахтиёрович' },
  { email: 'r25@anaesthesia.test', full_name: 'Анисимова Екатерина Николаевна' },
  { email: 'r26@anaesthesia.test', full_name: 'Бусалаева Дарья Игоревна' },
  { email: 'r27@anaesthesia.test', full_name: 'Дадуева Диана Сейдуллаховна' },
  { email: 'r28@anaesthesia.test', full_name: 'Закарлюка Анна Игоревна' },
  { email: 'r29@anaesthesia.test', full_name: 'Родригес Бегер Марио' },
  { email: 'r30@anaesthesia.test', full_name: 'Пикалова Анна Сергеевна' },
  { email: 'r31@anaesthesia.test', full_name: 'Птушкина Юлия Алексеевна' },
  { email: 'r32@anaesthesia.test', full_name: 'Таштамирова Макка Ибрагимовна' },
  { email: 'r33@anaesthesia.test', full_name: 'Трифонова Мария Максимовна' },
  { email: 'r34@anaesthesia.test', full_name: 'Федотова Елизавета Александровна' },
  { email: 'r35@anaesthesia.test', full_name: 'Широченко Дарья Евгеньевна' },
  { email: 'r36@anaesthesia.test', full_name: 'Диана Марджори Вальехо Родригес' },
  { email: 'r37@anaesthesia.test', full_name: 'Фернанда Ракель Моралес Кирога' },
  { email: 'r38@anaesthesia.test', full_name: 'Георгиу Мария' },
  { email: 'r39@anaesthesia.test', full_name: 'Сахетдурдыев Байрам Шагельдиевич' },
  { email: 'r40@anaesthesia.test', full_name: 'Джалолов Мухаммадсодик Захруддинович' },
  { email: 'r41@anaesthesia.test', full_name: 'Хасанов Комрон Зоиджонович' },
  { email: 'r42@anaesthesia.test', full_name: 'Кучаров Саидадхам Саидмуминович' },
  { email: 'r43@anaesthesia.test', full_name: 'Сафаров Мухаммадикбол Мирзоанварович' },
  { email: 'r44@anaesthesia.test', full_name: 'Дехконов Лочинбек Хасанович' },
  { email: 'r45@anaesthesia.test', full_name: 'Худжаев Сунатулло Назурллоевич' },
  { email: 'r46@anaesthesia.test', full_name: 'Мардаев Нурмухаммад Хуррамович' },
  { email: 'r47@anaesthesia.test', full_name: 'Ибрагимова Насият Курбановна' },
  { email: 'r48@anaesthesia.test', full_name: 'Манга Дебора Нинсима' },
  { email: 'r49@anaesthesia.test', full_name: 'Тлепова Асем Николаевна' },
  { email: 'r50@anaesthesia.test', full_name: 'Родригес Сантиэстебан Фаусто Рикардо' },
  { email: 'r51@anaesthesia.test', full_name: 'Мнгома Носибонело' },
  { email: 'r52@anaesthesia.test', full_name: 'Рахманкулов Непес Чарыевич' },
  { email: 'r53@anaesthesia.test', full_name: 'Звягина Мария Константиновна' },
  { email: 'r54@anaesthesia.test', full_name: 'Амину Нгессе Ибрахим Силле' },
]

let ok = 0, fail = 0

for (const u of supervisors) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email, password: 'Super1234!', email_confirm: true,
    user_metadata: { full_name: u.full_name },
  })
  if (error) { console.error(`FAIL ${u.email}: ${error.message}`); fail++; continue }
  await supabase.from('profiles').insert({ id: data.user.id, full_name: u.full_name, role: 'supervisor' })
  console.log(`OK   ${u.email}`)
  ok++
}

for (const u of residents) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email, password: 'Resid1234!', email_confirm: true,
    user_metadata: { full_name: u.full_name },
  })
  if (error) { console.error(`FAIL ${u.email}: ${error.message}`); fail++; continue }
  await supabase.from('profiles').insert({ id: data.user.id, full_name: u.full_name, role: 'resident' })
  console.log(`OK   ${u.email}`)
  ok++
}

console.log(`\nDone: ${ok} created, ${fail} failed`)
