/**
 * @fileOverview Firestore REST API를 사용하여 서버 컴포넌트에서 데이터를 페칭하는 유틸리티
 */

const PROJECT_ID = 'goplanai-hpfj7';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/**
 * Firestore REST API 응답 필드를 일반 JS 객체로 변환
 */
function mapFields(fields: any) {
  const result: any = {};
  if (!fields) return result;

  for (const key in fields) {
    const val = fields[key];
    if (val.stringValue !== undefined) result[key] = val.stringValue;
    else if (val.integerValue !== undefined) result[key] = parseInt(val.integerValue);
    else if (val.doubleValue !== undefined) result[key] = val.doubleValue;
    else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
    else if (val.timestampValue !== undefined) result[key] = new Date(val.timestampValue);
    else if (val.mapValue !== undefined) result[key] = mapFields(val.mapValue.fields);
    else if (val.arrayValue !== undefined) {
        result[key] = (val.arrayValue.values || []).map((v: any) => {
            const entry = Object.entries(v)[0];
            if (!entry) return null;
            const [type, value]: [string, any] = entry;
            return type === 'mapValue' ? mapFields(value.fields) : value;
        }).filter(Boolean);
    }
  }
  return result;
}

export async function getMarketItems(limitCount: number = 24) {
  try {
    // API 호출 시 revalidate 값을 1시간(3600초)으로 설정하여 캐싱함
    const url = `${BASE_URL}/market_items?pageSize=${limitCount}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    
    if (!res.ok) throw new Error('Failed to fetch market items from REST API');
    
    const data = await res.json();
    return (data.documents || []).map((doc: any) => {
      const id = doc.name.split('/').pop();
      const fields = mapFields(doc.fields);
      return { id, ...fields };
    });
  } catch (error) {
    console.error('Error fetching market items:', error);
    return [];
  }
}

export async function getMarketItem(id: string) {
  try {
    const url = `${BASE_URL}/market_items/${id}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    const fields = mapFields(data.fields);
    return { id, ...fields };
  } catch (error) {
    console.error('Error fetching market item:', error);
    return null;
  }
}
