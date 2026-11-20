/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Russian translations of English procedures — same category names so they appear
  // side by side in the UI. Admin can verify and delete the English originals.
  var procedures = [
    // Airway Management
    {section:"Airway Management",procedure:"Масочная вентиляция",graduation_target:5},
    {section:"Airway Management",procedure:"Интубация трахеи с прямой ларингоскопией",graduation_target:5},
    {section:"Airway Management",procedure:"Интубация трахеи с видеоларингоскопией",graduation_target:5},
    {section:"Airway Management",procedure:"Интубация трахеи в сознании через фиброскоп",graduation_target:4},
    {section:"Airway Management",procedure:"Назотрахеальная интубация",graduation_target:5},
    {section:"Airway Management",procedure:"Установка надгортанного воздуховода",graduation_target:5},
    {section:"Airway Management",procedure:"Интубация через ларингеальную маску",graduation_target:4},
    {section:"Airway Management",procedure:"Интубация световым стилетом",graduation_target:3},
    {section:"Airway Management",procedure:"Ретроградная интубация",graduation_target:3},
    {section:"Airway Management",procedure:"Пункционная крикотиреотомия",graduation_target:3},
    {section:"Airway Management",procedure:"Крикотиреотомия (на манекене)",graduation_target:4},
    {section:"Airway Management",procedure:"Двупросветная эндотрахеальная трубка",graduation_target:4},
    {section:"Airway Management",procedure:"Бронхиальный блокатор",graduation_target:4},
    {section:"Airway Management",procedure:"Смена эндотрахеальной трубки по катетеру",graduation_target:5},
    {section:"Airway Management",procedure:"Высокочастотная струйная вентиляция",graduation_target:4},
    {section:"Airway Management",procedure:"ЭМГ-мониторинговая интубация",graduation_target:4},
    {section:"Airway Management",procedure:"УЗИ желудка",graduation_target:3},
    {section:"Airway Management",procedure:"УЗИ дыхательных путей",graduation_target:3},
    // Vascular Access
    {section:"Vascular Access",procedure:"Венепункция",graduation_target:5},
    {section:"Vascular Access",procedure:"Катетеризация периферической вены под УЗИ",graduation_target:5},
    {section:"Vascular Access",procedure:"Катетер для быстрой инфузии",graduation_target:4},
    {section:"Vascular Access",procedure:"ЦВК: внутренняя яремная вена",graduation_target:4},
    {section:"Vascular Access",procedure:"ЦВК: внутренняя яремная вена под УЗИ",graduation_target:5},
    {section:"Vascular Access",procedure:"Катетеризация наружной яремной вены",graduation_target:4},
    {section:"Vascular Access",procedure:"ЦВК: подключичная вена",graduation_target:4},
    {section:"Vascular Access",procedure:"ЦВК: подключичная вена под УЗИ",graduation_target:4},
    {section:"Vascular Access",procedure:"ЦВК: бедренная вена",graduation_target:4},
    {section:"Vascular Access",procedure:"ЦВК: бедренная вена под УЗИ",graduation_target:5},
    {section:"Vascular Access",procedure:"Внутрикостный доступ",graduation_target:3},
    {section:"Vascular Access",procedure:"Катетер лучевой артерии",graduation_target:5},
    {section:"Vascular Access",procedure:"Катетер бедренной артерии",graduation_target:4},
    {section:"Vascular Access",procedure:"Катетер подмышечной артерии",graduation_target:3},
    {section:"Vascular Access",procedure:"Катетер плечевой артерии",graduation_target:4},
    {section:"Vascular Access",procedure:"Катетер артерии под УЗИ",graduation_target:5},
    // Hemodynamic Monitoring
    {section:"Hemodynamic Monitoring",procedure:"Катетер лёгочной артерии (Свана-Ганца)",graduation_target:4},
    {section:"Hemodynamic Monitoring",procedure:"ЧПЭхоКГ — стандартные позиции",graduation_target:3},
    {section:"Hemodynamic Monitoring",procedure:"ТТЭхоКГ — стандартные позиции",graduation_target:3},
    {section:"Hemodynamic Monitoring",procedure:"ТТЭхоКГ — оценка нижней полой вены",graduation_target:3},
    {section:"Hemodynamic Monitoring",procedure:"Пищеводная допплерография (сердечный выброс)",graduation_target:3},
    {section:"Hemodynamic Monitoring",procedure:"Торакальная биоимпедансная кардиография",graduation_target:3},
    // Critical Care Medicine
    {section:"Critical Care Medicine",procedure:"ТТЭхоКГ — стандартные позиции",graduation_target:4},
    {section:"Critical Care Medicine",procedure:"FAST-протокол УЗИ",graduation_target:3},
    {section:"Critical Care Medicine",procedure:"ТТЭхоКГ: диагностика пневмоторакса",graduation_target:4},
    {section:"Critical Care Medicine",procedure:"ТТЭхоКГ: оценка функции левого желудочка",graduation_target:4},
    {section:"Critical Care Medicine",procedure:"УЗИ сонных артерий",graduation_target:2},
    {section:"Critical Care Medicine",procedure:"УЗИ вен: диагностика тромбоза",graduation_target:3},
    {section:"Critical Care Medicine",procedure:"Чрескожная дилатационная трахеостомия",graduation_target:2},
    {section:"Critical Care Medicine",procedure:"Дренирование плевральной полости",graduation_target:2},
    {section:"Critical Care Medicine",procedure:"Плевральная пункция",graduation_target:3},
    {section:"Critical Care Medicine",procedure:"Фибробронхоскопия",graduation_target:3},
    {section:"Critical Care Medicine",procedure:"Временная трансвенозная электрокардиостимуляция",graduation_target:2},
    {section:"Critical Care Medicine",procedure:"Тромбоэластография",graduation_target:4},
    // Neuroanesthesia
    {section:"Neuroanesthesia",procedure:"Прекардиальная аускультация (обнаружение воздушной эмболии)",graduation_target:3},
    {section:"Neuroanesthesia",procedure:"Люмбальный спинальный дренаж",graduation_target:3},
    // Chronic Pain Management
    {section:"Chronic Pain Management",procedure:"Шейная интерламинарная эпидуральная инъекция кортикостероидов",graduation_target:2},
    {section:"Chronic Pain Management",procedure:"Инъекция в фасеточные суставы шейного отдела",graduation_target:2},
    {section:"Chronic Pain Management",procedure:"Блокада медиальных ветвей шейного отдела",graduation_target:2},
    {section:"Chronic Pain Management",procedure:"Поясничная интерламинарная эпидуральная инъекция",graduation_target:2},
    {section:"Chronic Pain Management",procedure:"Поясничная трансфораминальная эпидуральная инъекция",graduation_target:2},
    {section:"Chronic Pain Management",procedure:"Инъекция в фасеточные суставы поясничного отдела",graduation_target:2},
    {section:"Chronic Pain Management",procedure:"Инъекции в триггерные точки",graduation_target:3},
    {section:"Chronic Pain Management",procedure:"Инъекции в периферические суставы",graduation_target:2},
    {section:"Chronic Pain Management",procedure:"Блокада звёздчатого ганглия",graduation_target:2},
    {section:"Chronic Pain Management",procedure:"Блокада чревного сплетения",graduation_target:2},
    // Head
    {section:"Head",procedure:"Блокада поверхностного шейного сплетения",graduation_target:3},
    {section:"Head",procedure:"Блокада глубокого шейного сплетения",graduation_target:3},
    {section:"Head",procedure:"Ретробульбарная блокада",graduation_target:2},
    {section:"Head",procedure:"Перибульбарная блокада",graduation_target:2},
    {section:"Head",procedure:"Блокада крылонёбного ганглия",graduation_target:2},
    {section:"Head",procedure:"Блокада верхнегортанного нерва",graduation_target:3},
    {section:"Head",procedure:"Транстрахеальная блокада",graduation_target:3},
    {section:"Head",procedure:"Блокада языкоглоточного нерва",graduation_target:3},
    // Upper Extremity
    {section:"Upper Extremity",procedure:"Блокада надлопаточного нерва",graduation_target:3},
    {section:"Upper Extremity",procedure:"Блокада надлопаточного нерва — катетер",graduation_target:3},
    {section:"Upper Extremity",procedure:"Межлестничная блокада",graduation_target:4},
    {section:"Upper Extremity",procedure:"Межлестничная блокада — катетер",graduation_target:4},
    {section:"Upper Extremity",procedure:"Надключичная блокада",graduation_target:4},
    {section:"Upper Extremity",procedure:"Надключичная блокада — катетер",graduation_target:4},
    {section:"Upper Extremity",procedure:"Подключичная блокада",graduation_target:4},
    {section:"Upper Extremity",procedure:"Подключичная блокада — катетер",graduation_target:3},
    {section:"Upper Extremity",procedure:"Подмышечная блокада",graduation_target:4},
    {section:"Upper Extremity",procedure:"Блокада межрёберно-плечевого нерва",graduation_target:4},
    {section:"Upper Extremity",procedure:"Блокада срединного нерва (УЗИ)",graduation_target:3},
    {section:"Upper Extremity",procedure:"Блокада лучевого нерва",graduation_target:3},
    {section:"Upper Extremity",procedure:"Блокада локтевого нерва",graduation_target:3},
    {section:"Upper Extremity",procedure:"Блокада пальцевых нервов",graduation_target:4},
    // Trunk
    {section:"Trunk",procedure:"Торакальная паравертебральная блокада",graduation_target:3},
    {section:"Trunk",procedure:"Торакальная паравертебральная блокада — катетер",graduation_target:3},
    {section:"Trunk",procedure:"ESP-блок (мышца-разгибатель позвоночника)",graduation_target:3},
    {section:"Trunk",procedure:"ESP-блок — катетер",graduation_target:3},
    {section:"Trunk",procedure:"Межрёберная блокада",graduation_target:3},
    {section:"Trunk",procedure:"PECS I блок",graduation_target:3},
    {section:"Trunk",procedure:"PECS II блок",graduation_target:3},
    {section:"Trunk",procedure:"Блокада передней зубчатой мышцы",graduation_target:3},
    {section:"Trunk",procedure:"Блокада передней зубчатой мышцы — катетер",graduation_target:2},
    {section:"Trunk",procedure:"Блокада влагалища прямой мышцы живота",graduation_target:3},
    {section:"Trunk",procedure:"Блокада влагалища прямой мышцы живота — катетер",graduation_target:2},
    {section:"Trunk",procedure:"ТАП-блок",graduation_target:4},
    {section:"Trunk",procedure:"ТАП-блок — катетер",graduation_target:3},
    {section:"Trunk",procedure:"Блокада подвздошно-пахового нерва",graduation_target:3},
    {section:"Trunk",procedure:"Блокада верхнего подчревного сплетения",graduation_target:3},
    {section:"Trunk",procedure:"Блокада квадратной мышцы поясницы (QL-блок)",graduation_target:3},
    // Lower Extremity
    {section:"Lower Extremity",procedure:"Блокада поясничного сплетения",graduation_target:2},
    {section:"Lower Extremity",procedure:"Блокада поясничного сплетения — катетер",graduation_target:2},
    {section:"Lower Extremity",procedure:"Блокада фасции подвздошной мышцы",graduation_target:4},
    {section:"Lower Extremity",procedure:"Блокада фасции подвздошной мышцы — катетер",graduation_target:3},
    {section:"Lower Extremity",procedure:"Блокада бедренного нерва",graduation_target:5},
    {section:"Lower Extremity",procedure:"Блокада бедренного нерва — катетер",graduation_target:4},
    {section:"Lower Extremity",procedure:"Блокада запирательного нерва",graduation_target:3},
    {section:"Lower Extremity",procedure:"Блокада наружного кожного нерва бедра",graduation_target:3},
    {section:"Lower Extremity",procedure:"Блокада приводящего канала",graduation_target:4},
    {section:"Lower Extremity",procedure:"Блокада приводящего канала — катетер",graduation_target:4},
    {section:"Lower Extremity",procedure:"Блокада сафенозного нерва",graduation_target:4},
    {section:"Lower Extremity",procedure:"Блокада седалищного нерва (ягодичный доступ)",graduation_target:4},
    {section:"Lower Extremity",procedure:"Блокада седалищного нерва в подколенной ямке",graduation_target:4},
    {section:"Lower Extremity",procedure:"Блокада седалищного нерва в подколенной ямке — катетер",graduation_target:4},
    {section:"Lower Extremity",procedure:"IPACK-блок",graduation_target:2},
    {section:"Lower Extremity",procedure:"Блокада большеберцового нерва",graduation_target:3},
    {section:"Lower Extremity",procedure:"Блокада общего малоберцового нерва",graduation_target:3},
    {section:"Lower Extremity",procedure:"Блокада голеностопного сустава",graduation_target:4},
    {section:"Lower Extremity",procedure:"Катетер периферической нервной блокады",graduation_target:4},
    // Neuraxial
    {section:"Neuraxial",procedure:"Спинномозговая анестезия",graduation_target:5},
    {section:"Neuraxial",procedure:"Субарахноидальный катетер",graduation_target:4},
    {section:"Neuraxial",procedure:"Торакальная эпидуральная анестезия (катетер)",graduation_target:4},
    {section:"Neuraxial",procedure:"Поясничная эпидуральная анестезия (катетер)",graduation_target:5},
    {section:"Neuraxial",procedure:"Комбинированная спинально-эпидуральная анестезия",graduation_target:5},
    {section:"Neuraxial",procedure:"Эпидуральная кровяная пломба",graduation_target:5},
    // Peds Airway Management
    {section:"Peds Airway Management",procedure:"Масочная вентиляция",graduation_target:5},
    {section:"Peds Airway Management",procedure:"Интубация с прямой ларингоскопией",graduation_target:5},
    {section:"Peds Airway Management",procedure:"Интубация с видеоларингоскопией",graduation_target:5},
    {section:"Peds Airway Management",procedure:"Назотрахеальная интубация",graduation_target:4},
    {section:"Peds Airway Management",procedure:"Установка надгортанного воздуховода",graduation_target:5},
    {section:"Peds Airway Management",procedure:"Интубация через ларингеальную маску",graduation_target:4},
    {section:"Peds Airway Management",procedure:"Двупросветная эндотрахеальная трубка",graduation_target:3},
    {section:"Peds Airway Management",procedure:"Бронхиальный блокатор",graduation_target:2},
    {section:"Peds Airway Management",procedure:"Смена эндотрахеальной трубки по катетеру",graduation_target:3},
    {section:"Peds Airway Management",procedure:"Высокочастотная струйная вентиляция",graduation_target:3},
    // Peds Vascular Access
    {section:"Peds Vascular Access",procedure:"Катетеризация периферической вены",graduation_target:5},
    {section:"Peds Vascular Access",procedure:"Катетеризация периферической вены под УЗИ",graduation_target:4},
    {section:"Peds Vascular Access",procedure:"Венепункция",graduation_target:4},
    {section:"Peds Vascular Access",procedure:"ЦВК: внутренняя яремная вена",graduation_target:3},
    {section:"Peds Vascular Access",procedure:"ЦВК: внутренняя яремная вена под УЗИ",graduation_target:3},
    {section:"Peds Vascular Access",procedure:"ЦВК: подключичная вена",graduation_target:3},
    {section:"Peds Vascular Access",procedure:"ЦВК: подключичная вена под УЗИ",graduation_target:3},
    {section:"Peds Vascular Access",procedure:"ЦВК: бедренная вена",graduation_target:3},
    {section:"Peds Vascular Access",procedure:"ЦВК: бедренная вена под УЗИ",graduation_target:3},
    {section:"Peds Vascular Access",procedure:"Внутрикостный доступ",graduation_target:3},
    {section:"Peds Vascular Access",procedure:"Катетер лучевой артерии",graduation_target:4},
    {section:"Peds Vascular Access",procedure:"Катетер артерии под УЗИ",graduation_target:4},
    {section:"Peds Vascular Access",procedure:"Катетер бедренной артерии",graduation_target:3},
    {section:"Peds Vascular Access",procedure:"Забор артериальной крови",graduation_target:4},
    // Peds Regional Anesthesia/Analgesia
    {section:"Peds Regional Anesthesia/Analgesia",procedure:"Торакальная эпидуральная анестезия (катетер)",graduation_target:3},
    {section:"Peds Regional Anesthesia/Analgesia",procedure:"Поясничная эпидуральная анестезия (катетер)",graduation_target:3},
    {section:"Peds Regional Anesthesia/Analgesia",procedure:"Каудальная блокада",graduation_target:4},
    {section:"Peds Regional Anesthesia/Analgesia",procedure:"Спинномозговая анестезия",graduation_target:3},
    {section:"Peds Regional Anesthesia/Analgesia",procedure:"Блокада полового нерва",graduation_target:2},
    {section:"Peds Regional Anesthesia/Analgesia",procedure:"Блокада периферического нерва: верхняя конечность",graduation_target:3},
    {section:"Peds Regional Anesthesia/Analgesia",procedure:"Блокада периферического нерва: нижняя конечность",graduation_target:3},
    {section:"Peds Regional Anesthesia/Analgesia",procedure:"Блокада нервов передней брюшной стенки",graduation_target:2}
  ];

  var col = app.findCollectionByNameOrId("procedures");
  for (var i = 0; i < procedures.length; i++) {
    var p = procedures[i];
    var existing = [];
    try {
      existing = app.findRecordsByFilter("procedures", "name = {:name} && category = {:cat}", {name: p.procedure, cat: p.section}, 1, 0);
    } catch(e) {}
    if (existing.length > 0) { continue; }
    var rec = new Record(col);
    rec.set("name", p.procedure);
    rec.set("category", p.section);
    rec.set("field", "anaesthesiology");
    rec.set("sort", 1000 + i + 1);
    rec.set("active", true);
    rec.set("graduation_target", p.graduation_target);
    app.save(rec);
  }
}, (app) => {
  var names = [
    "Масочная вентиляция","Интубация трахеи с прямой ларингоскопией","Интубация трахеи с видеоларингоскопией",
    "Интубация трахеи в сознании через фиброскоп","Назотрахеальная интубация","Установка надгортанного воздуховода",
    "Интубация через ларингеальную маску","Интубация световым стилетом","Ретроградная интубация",
    "Пункционная крикотиреотомия","Крикотиреотомия (на манекене)","Двупросветная эндотрахеальная трубка",
    "Бронхиальный блокатор","Смена эндотрахеальной трубки по катетеру","Высокочастотная струйная вентиляция",
    "ЭМГ-мониторинговая интубация","УЗИ желудка","УЗИ дыхательных путей",
    "Венепункция","Катетеризация периферической вены под УЗИ","Катетер для быстрой инфузии",
    "ЦВК: внутренняя яремная вена","ЦВК: внутренняя яремная вена под УЗИ","Катетеризация наружной яремной вены",
    "ЦВК: подключичная вена","ЦВК: подключичная вена под УЗИ","ЦВК: бедренная вена","ЦВК: бедренная вена под УЗИ",
    "Внутрикостный доступ","Катетер лучевой артерии","Катетер бедренной артерии","Катетер подмышечной артерии",
    "Катетер плечевой артерии","Катетер артерии под УЗИ",
    "Катетер лёгочной артерии (Свана-Ганца)","ЧПЭхоКГ — стандартные позиции","ТТЭхоКГ — стандартные позиции",
    "ТТЭхоКГ — оценка нижней полой вены","Пищеводная допплерография (сердечный выброс)","Торакальная биоимпедансная кардиография",
    "FAST-протокол УЗИ","ТТЭхоКГ: диагностика пневмоторакса","ТТЭхоКГ: оценка функции левого желудочка",
    "УЗИ сонных артерий","УЗИ вен: диагностика тромбоза","Чрескожная дилатационная трахеостомия",
    "Дренирование плевральной полости","Плевральная пункция","Фибробронхоскопия",
    "Временная трансвенозная электрокардиостимуляция","Тромбоэластография",
    "Прекардиальная аускультация (обнаружение воздушной эмболии)","Люмбальный спинальный дренаж",
    "Шейная интерламинарная эпидуральная инъекция кортикостероидов","Инъекция в фасеточные суставы шейного отдела",
    "Блокада медиальных ветвей шейного отдела","Поясничная интерламинарная эпидуральная инъекция",
    "Поясничная трансфораминальная эпидуральная инъекция","Инъекция в фасеточные суставы поясничного отдела",
    "Инъекции в триггерные точки","Инъекции в периферические суставы","Блокада звёздчатого ганглия","Блокада чревного сплетения",
    "Блокада поверхностного шейного сплетения","Блокада глубокого шейного сплетения","Ретробульбарная блокада",
    "Перибульбарная блокада","Блокада крылонёбного ганглия","Блокада верхнегортанного нерва",
    "Транстрахеальная блокада","Блокада языкоглоточного нерва",
    "Блокада надлопаточного нерва","Блокада надлопаточного нерва — катетер","Межлестничная блокада",
    "Межлестничная блокада — катетер","Надключичная блокада","Надключичная блокада — катетер",
    "Подключичная блокада","Подключичная блокада — катетер","Подмышечная блокада",
    "Блокада межрёберно-плечевого нерва","Блокада срединного нерва (УЗИ)","Блокада лучевого нерва",
    "Блокада локтевого нерва","Блокада пальцевых нервов",
    "Торакальная паравертебральная блокада","Торакальная паравертебральная блокада — катетер",
    "ESP-блок (мышца-разгибатель позвоночника)","ESP-блок — катетер","Межрёберная блокада",
    "PECS I блок","PECS II блок","Блокада передней зубчатой мышцы","Блокада передней зубчатой мышцы — катетер",
    "Блокада влагалища прямой мышцы живота","Блокада влагалища прямой мышцы живота — катетер",
    "ТАП-блок","ТАП-блок — катетер","Блокада подвздошно-пахового нерва",
    "Блокада верхнего подчревного сплетения","Блокада квадратной мышцы поясницы (QL-блок)",
    "Блокада поясничного сплетения","Блокада поясничного сплетения — катетер",
    "Блокада фасции подвздошной мышцы","Блокада фасции подвздошной мышцы — катетер",
    "Блокада бедренного нерва","Блокада бедренного нерва — катетер","Блокада запирательного нерва",
    "Блокада наружного кожного нерва бедра","Блокада приводящего канала","Блокада приводящего канала — катетер",
    "Блокада сафенозного нерва","Блокада седалищного нерва (ягодичный доступ)",
    "Блокада седалищного нерва в подколенной ямке","Блокада седалищного нерва в подколенной ямке — катетер",
    "IPACK-блок","Блокада большеберцового нерва","Блокада общего малоберцового нерва",
    "Блокада голеностопного сустава","Катетер периферической нервной блокады",
    "Спинномозговая анестезия","Субарахноидальный катетер","Торакальная эпидуральная анестезия (катетер)",
    "Поясничная эпидуральная анестезия (катетер)","Комбинированная спинально-эпидуральная анестезия","Эпидуральная кровяная пломба",
    "Интубация с прямой ларингоскопией","Интубация с видеоларингоскопией",
    "Катетеризация периферической вены","Забор артериальной крови",
    "Каудальная блокада","Блокада полового нерва",
    "Блокада периферического нерва: верхняя конечность","Блокада периферического нерва: нижняя конечность",
    "Блокада нервов передней брюшной стенки"
  ];
  try {
    for (var i = 0; i < names.length; i++) {
      var recs = app.findRecordsByFilter("procedures", "name = {:name}", {name: names[i]}, 0, 0);
      for (var j = 0; j < recs.length; j++) {
        app.delete(recs[j]);
      }
    }
  } catch(e) {}
});
