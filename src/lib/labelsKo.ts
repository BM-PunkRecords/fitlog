const BODY_PART_KO: Record<string, string> = {
  back: '등',
  cardio: '유산소',
  chest: '가슴',
  hips: '엉덩이',
  'lower arms': '전완',
  'lower legs': '종아리',
  shoulders: '어깨',
  'upper arms': '상완',
  'upper legs': '허벅지',
  waist: '코어',
}

const EQUIPMENT_KO: Record<string, string> = {
  band: '밴드',
  barbell: '바벨',
  'body weight': '맨몸',
  cable: '케이블',
  dumbbell: '덤벨',
  'ez barbell': 'EZ바',
  kettlebell: '케틀벨',
  'leverage machine': '머신',
  rope: '로프',
  'sled machine': '슬레드',
  'smith machine': '스미스',
  'stability ball': '짐볼',
  weighted: '웨이트',
}

const TARGET_KO: Record<string, string> = {
  abdominals: '복근',
  abductors: '외전근',
  abs: '복근',
  adductors: '내전근',
  'anterior deltoid': '전면 삼각근',
  biceps: '이두',
  calves: '종아리',
  'cardiovascular system': '심폐',
  deltoids: '삼각근',
  delts: '삼각근',
  'erector spinae': '척추기립근',
  erectors: '척추기립근',
  'forearm extensors': '전완 신근',
  forearms: '전완',
  'full body': '전신',
  glutes: '둔근',
  'gluteus medius': '중둔근',
  hamstrings: '햄스트링',
  'hip flexors': '고관절 굴곡근',
  lats: '광배근',
  'middle back': '중부 등',
  'neck flexors': '목 굴곡근',
  obliques: '복사근',
  pectorals: '대흉근',
  peroneals: '비골근',
  'posterior deltoid': '후면 삼각근',
  quadriceps: '대퇴사두',
  quads: '대퇴사두',
  'rear deltoids': '후면 삼각근',
  'rectus abdominis': '복직근',
  rhomboids: '능형근',
  'spinal erectors': '척추기립근',
  spine: '척추',
  sternocleidomastoid: '흉쇄유돌근',
  'thoracic spine': '흉추',
  traps: '승모근',
  triceps: '삼두',
  'upper back': '상부 등',
  'upper pectorals': '상부 대흉근',
}

export function bodyPartKo(value: string): string {
  return BODY_PART_KO[value] ?? value
}

export function equipmentKo(value: string): string {
  return EQUIPMENT_KO[value] ?? value
}

export function targetKo(value: string): string {
  return TARGET_KO[value] ?? value
}

const DIFFICULTY_KO: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

export function difficultyKo(value: string): string {
  return DIFFICULTY_KO[value] ?? value
}
