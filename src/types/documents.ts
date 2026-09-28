export interface PracticeMonth {
  workplace: string
  diagnosis: string
  patient_count: string
  duty_place: string
  duty_dates: string
  procedures: string
}

export interface Publication {
  title: string
  coauthors: string
  publisher: string
  year: string
}

export interface Conference {
  topic: string
  date: string
  place: string
}

export interface IndividualPlanData {
  // Basic info
  full_name: string
  full_name_gen: string   // genitive case e.g. "Иванова Ивана Ивановича"
  specialty: string
  department: string
  supervisor_name: string
  dept_head: string
  enrollment_date: string
  enrollment_order: string
  expulsion_date: string
  expulsion_order: string

  // Attestation
  att1_date: string
  att1_protocol: string
  att2_date: string
  att2_protocol: string

  // Educational plan grades (must match template order)
  grade_main_s1: string   // Main specialty sem 1
  grade_main_s2: string   // Main specialty sem 2
  grade_main_s3: string   // Main specialty sem 3
  grade_main_s4: string   // Main specialty sem 4
  grade_emergency: string // Медицина ЧС
  grade_pedagogy: string  // Педагогика
  grade_pubhealth: string // Общественное здоровье
  grade_pathology: string // Патология
  grade_dept1: string     // Дисциплина кафедры 1
  grade_dept2: string     // Дисциплина кафедры 2
  grade_elec1: string     // Дисциплина по выбору 1
  grade_elec2: string     // Дисциплина по выбору 2
  grade_elec3: string     // Дисциплина по выбору 3
  grade_sim_cso: string   // Симуляционный курс ЦСО
  grade_sim1: string      // Симуляционный курс сем 1

  // Practice Year 1 (11 months)
  practice1: PracticeMonth[]

  // Practice Year 2 (11 months)
  practice2: PracticeMonth[]

  // Research
  research_topic: string
  research_passed: string
  research_date: string
  publications: Publication[]
  conf_talks: Conference[]
  conf_attended: Conference[]
}

export const emptyMonth = (): PracticeMonth => ({
  workplace: '',
  diagnosis: '',
  patient_count: '',
  duty_place: '',
  duty_dates: '',
  procedures: '',
})

export const emptyPub = (): Publication => ({ title: '', coauthors: '', publisher: '', year: '' })
export const emptyConf = (): Conference => ({ topic: '', date: '', place: '' })

export function emptyPlan(fullName = ''): IndividualPlanData {
  return {
    full_name: fullName,
    full_name_gen: '',
    specialty: 'Анестезиология-реаниматология',
    department: '',
    supervisor_name: '',
    dept_head: '',
    enrollment_date: '',
    enrollment_order: '',
    expulsion_date: '',
    expulsion_order: '',
    att1_date: '',
    att1_protocol: '',
    att2_date: '',
    att2_protocol: '',
    grade_main_s1: '',
    grade_main_s2: '',
    grade_main_s3: '',
    grade_main_s4: '',
    grade_emergency: '',
    grade_pedagogy: '',
    grade_pubhealth: '',
    grade_pathology: '',
    grade_dept1: '',
    grade_dept2: '',
    grade_elec1: '',
    grade_elec2: '',
    grade_elec3: '',
    grade_sim_cso: '',
    grade_sim1: '',
    practice1: Array.from({ length: 11 }, emptyMonth),
    practice2: Array.from({ length: 11 }, emptyMonth),
    research_topic: '',
    research_passed: '',
    research_date: '',
    publications: [],
    conf_talks: [],
    conf_attended: [],
  }
}

export type SubmissionStatus = 'draft' | 'submitted' | 'generating' | 'done' | 'error' | 'token_error'

export interface DocumentSubmission {
  id: string
  resident: string
  resident_name: string
  status: SubmissionStatus
  data: IndividualPlanData
  yandex_url: string
  error_msg: string
  updated: string
}
