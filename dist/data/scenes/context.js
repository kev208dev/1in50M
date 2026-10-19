// 장면·딜레마 계열이 공통으로 쓰는 삶의 맥락 판정입니다.
// 사건이 캐릭터의 실제 상태(학생인지, 일하는지, 동반자·자녀·부모가 있는지, 시대·지역)와
// 어긋나지 않도록 모든 계열은 여기의 판정만 조합해 조건을 적습니다.

const n = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export const age = (life) => n(life?.age);
export const year = (life) => n(life?.year, 2026);
export const stat = (life, key) => n(life?.stats?.[key], 50);

const careerStatus = (life) => life?.career?.status ?? 'none';
const educationLevel = (life) => life?.education?.level ?? 'infant';
const educationStatus = (life) => life?.education?.status ?? 'not-started';

export const isMinor = (life) => age(life) < 19;
export const isChild = (life) => age(life) >= 7 && age(life) <= 12;
export const isTeen = (life) => age(life) >= 13 && age(life) <= 18;
export const isSchoolStudent = (life) => age(life) >= 7 && age(life) <= 18
  && ['elementary', 'middle-school', 'high-school'].includes(educationLevel(life))
  && educationStatus(life) !== 'completed' && educationStatus(life) !== 'left';
export const isUniversityStudent = (life) => age(life) >= 18 && age(life) <= 30
  && ['university', 'college'].includes(educationLevel(life))
  && educationStatus(life) === 'enrolled';
export const isStudent = (life) => isSchoolStudent(life) || isUniversityStudent(life);

export const isWorking = (life) => ['employed', 'part-time', 'self-employed'].includes(careerStatus(life));
export const isEmployee = (life) => ['employed', 'part-time'].includes(careerStatus(life));
export const isFullTime = (life) => careerStatus(life) === 'employed';
export const isSelfEmployed = (life) => careerStatus(life) === 'self-employed'
  || life?.business?.status === 'operating';
export const isRetired = (life) => careerStatus(life) === 'retired';
export const isJobSeeking = (life) => age(life) >= 19 && age(life) <= 64
  && !isWorking(life) && !isRetired(life) && !isStudent(life);

export const hasPartner = (life) => Boolean(life?.relationships?.partner);
export const isSingle = (life) => !hasPartner(life);
export const childCount = (life) => (Array.isArray(life?.relationships?.children) ? life.relationships.children.length : 0);
export const hasChildren = (life) => childCount(life) > 0;
export const friendCount = (life) => (Array.isArray(life?.relationships?.friends) ? life.relationships.friends.length : 0);

/** 출생 당시 보호자 나이를 기준으로, 보호자가 아직 90세를 넘지 않았을 가능성이 높은지. */
export const parentAge = (life) => {
  const guardians = life?.profile?.guardians ?? [];
  const youngest = guardians.length ? Math.min(...guardians.map((item) => n(item.age, 30))) : 30;
  return youngest + age(life);
};
export const hasLivingParents = (life) => (life?.profile?.guardians?.length ?? 0) > 0 && parentAge(life) <= 88;
export const hasAgingParents = (life) => hasLivingParents(life) && parentAge(life) >= 62;
export const hasSiblings = (life) => n(life?.profile?.siblings?.count, /외동/.test(life?.profile?.siblings?.value ?? '') ? 0 : 1) > 0;

export const isMale = (life) => (life?.profile?.sex?.id ?? life?.profile?.sex) === 'male';
export const isFemale = (life) => (life?.profile?.sex?.id ?? life?.profile?.sex) === 'female';
export const hasDisability = (life) => {
  const disability = life?.profile?.disability;
  return Boolean(disability && disability.type && disability.type !== 'none' && disability.id !== 'none');
};
export const hasMobilityDisability = (life) => life?.profile?.disability?.type === 'mobility';

const regionCode = (life) => life?.profile?.region?.code ?? life?.housing?.regionCode ?? '';
export const inCapitalArea = (life) => ['SEL', 'GGD', 'ICN'].includes(regionCode(life));
export const inSeoul = (life) => regionCode(life) === 'SEL';
export const isRural = (life) => /군·읍면/.test(life?.profile?.urbanicity ?? '');
export const isUrban = (life) => !isRural(life);
export const isCoastal = (life) => ['BSN', 'USN', 'ICN', 'JNM', 'GNM', 'JJU', 'GWD', 'GBK', 'CNM', 'JBK'].includes(regionCode(life));
export const onJeju = (life) => regionCode(life) === 'JJU';

const housingType = (life) => life?.housing?.type ?? 'with-family';
export const livesWithFamily = (life) => housingType(life) === 'with-family';
export const isHomeowner = (life) => housingType(life) === 'owned-home';
export const isRenter = (life) => ['monthly-rent', 'jeonse', 'public-rental', 'dormitory'].includes(housingType(life));
export const livesAlone = (life) => age(life) >= 19 && !livesWithFamily(life) && isSingle(life) && !hasChildren(life);

const cash = (life) => n(life?.economy?.cash);
const netWorth = (life) => n(life?.economy?.netWorth);
export const isStrapped = (life) => age(life) >= 19 && (cash(life) < 3000000 || netWorth(life) < 10000000);
export const isComfortable = (life) => age(life) >= 19 && netWorth(life) >= 150000000;
export const canSpend = (amount) => (life) => (age(life) < 19 ? n(life?.economy?.householdSupport) : cash(life)) >= amount;

export const isHealthy = (life) => stat(life, 'health') >= 65;
export const isUnwell = (life) => stat(life, 'health') < 45;
export const isLow = (life) => stat(life, 'happiness') < 40;
export const isLonely = (life) => stat(life, 'relationships') < 40;
export const hasChronicCondition = (life) => (life?.conditions?.chronic?.length ?? 0) > 0;

export const between = (from, to = 9999) => (life) => year(life) >= from && year(life) <= to;
export const all = (...tests) => (life) => tests.every((test) => test(life));
export const any = (...tests) => (life) => tests.some((test) => test(life));
export const not = (test) => (life) => !test(life);
export const always = () => true;

/** 자녀 나이 목록(입양·출생 연도 기준). */
export const childAges = (life) => (life?.relationships?.children ?? []).map((child) => year(life) - n(child.since, year(life)));
export const hasChildAged = (min, max) => (life) => childAges(life).some((value) => value >= min && value <= max);
export const ageBetween = (min, max) => (life) => age(life) >= min && age(life) <= max;
export const decadeOf = (life) => Math.floor(year(life) / 10) * 10;
