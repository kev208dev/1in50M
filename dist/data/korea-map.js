export const KOREA_MAP_POINTS = [
  { code: 'SEL', label: '서울특별시', x: 34, y: 24 },
  { code: 'BSN', label: '부산광역시', x: 74, y: 77 },
  { code: 'DGU', label: '대구광역시', x: 66, y: 61 },
  { code: 'ICN', label: '인천광역시', x: 27, y: 27 },
  { code: 'GJU', label: '광주광역시', x: 34, y: 75 },
  { code: 'DJN', label: '대전광역시', x: 45, y: 53 },
  { code: 'USN', label: '울산광역시', x: 77, y: 69 },
  { code: 'SJN', label: '세종특별자치시', x: 40, y: 48 },
  { code: 'GGD', label: '경기도', x: 38, y: 30 },
  { code: 'GWD', label: '강원특별자치도', x: 61, y: 27 },
  { code: 'CBK', label: '충청북도', x: 51, y: 45 },
  { code: 'CNM', label: '충청남도', x: 34, y: 51 },
  { code: 'JBK', label: '전북특별자치도', x: 41, y: 65 },
  { code: 'JNM', label: '전라남도', x: 36, y: 81 },
  { code: 'GBK', label: '경상북도', x: 67, y: 49 },
  { code: 'GNM', label: '경상남도', x: 61, y: 73 },
  { code: 'JJU', label: '제주특별자치도', x: 31, y: 94 },
];

// 독도는 광역자치단체 선택지가 아니라 대한민국 영토 표식으로 지도에 별도 표시한다.
export const DOKDO_POINT = Object.freeze({
  code: 'DOKDO', label: '독도', x: 92, y: 31, territory: true,
});

export function mapRegionState(regionCode) {
  return KOREA_MAP_POINTS.map((point) => ({
    ...point,
    selected: point.code === regionCode,
  }));
}
