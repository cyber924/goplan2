
'use server';
/**
 * @fileOverview 기업마당(Bizinfo) 공고 리스트를 크롤링하는 Genkit Flow.
 * 보안 강화 및 파싱 로직 보완 버전.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as cheerio from 'cheerio';

const BizinfoAnnouncementSchema = z.object({
  id: z.string().describe('외부 시스템의 원본 ID 또는 링크'),
  title: z.string().describe('공고 제목'),
  org: z.string().describe('주관 기관'),
  period: z.string().describe('접수 기간'),
  link: z.string().describe('상세 페이지 URL'),
});

const ScrapeBizinfoOutputSchema = z.object({
  announcements: z.array(BizinfoAnnouncementSchema),
});

export type ScrapeBizinfoOutput = z.infer<typeof ScrapeBizinfoOutputSchema>;

/**
 * 기업마당 지원사업 공고 페이지를 크롤링합니다.
 */
export async function scrapeBizinfoAnnouncements(): Promise<ScrapeBizinfoOutput> {
  // 실제 브라우저에서 접근하는 것과 유사한 URL (지원사업 공고 목록)
  const url = 'https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do?schPblancDiv=01';
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.bizinfo.go.kr/',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
        console.error(`HTTP Error: ${response.status}`);
        throw new Error('기업마당 페이지 접근 실패');
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const announcements: z.infer<typeof BizinfoAnnouncementSchema>[] = [];
    const seenIds = new Set<string>();

    // 기업마당 공고 리스트 테이블
    $('table tbody tr').each((_, element) => {
      const $el = $(element);
      const cells = $el.find('td');
      
      if (cells.length < 3) return;

      const titleAnchor = $el.find('td.subject a').length > 0 
        ? $el.find('td.subject a') 
        : $el.find('a').first();

      const title = titleAnchor.text().trim();
      const relativeLink = titleAnchor.attr('href');
      
      if (!title || !relativeLink) return;

      const absoluteLink = relativeLink.startsWith('http') 
        ? relativeLink 
        : `https://www.bizinfo.go.kr${relativeLink}`;
      
      // 링크와 제목을 조합하여 고유 ID 생성 (중복 키 에러 방지 핵심 수정)
      // substring으로 자르지 않고 전체 문자열을 인코딩하여 고유성을 확보함
      const rawIdString = absoluteLink + title;
      const uniqueId = Buffer.from(rawIdString).toString('base64').replace(/[/+=]/g, '');
      
      // 중복 ID 방지
      if (seenIds.has(uniqueId)) return;
      seenIds.add(uniqueId);
      
      let org = "";
      let period = "";

      if (cells.length >= 5) {
        org = $(cells[3]).text().trim();
        period = $(cells[4]).text().trim();
      } else {
        org = $el.find('td').eq(-2).text().trim();
        period = $el.find('td').last().text().trim();
      }

      announcements.push({
        id: uniqueId,
        title,
        org: org || "기관 정보 없음",
        period: period || "기간 정보 없음",
        link: absoluteLink
      });
    });

    return { announcements };
  } catch (error) {
    console.error('Scraping error details:', error);
    return { announcements: [] };
  }
}
