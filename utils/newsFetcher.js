// ===================================================================================
//  FILE: /utils/newsFetcher.js (수정된 최종 파일)
//  역할: 연합뉴스티비 스포츠 RSS 피드를 이용하여 최신 뉴스를 안정적으로 가져옵니다.
// ===================================================================================
const Parser = require('rss-parser');
const parser = new Parser();

async function fetchTableTennisNews() {
    try {
        // 연합뉴스 스포츠 RSS 피드 URL
        const feedUrl = 'https://www.yonhapnewstv.co.kr/browse/feed/';
        const feed = await parser.parseURL(feedUrl);

        const newsList = [];
        // '탁구' or 'WTT' 키워드가 포함된 뉴스를 필터링합니다.
        const filteredItems = feed.items.filter(item => item.title.includes('탁구') || item.title.includes('WTT'));

        // 필터링된 뉴스 중 최신 5개를 가져옵니다.
        filteredItems.slice(0, 5).forEach(item => {
            newsList.push({
                title: item.title,
                link: item.link
            });
        });

        if (newsList.length === 0) {
            console.warn('[News Fetcher] RSS 피드에서 "탁구" 관련 뉴스를 찾지 못했습니다.');
        } else {
            console.log('[News Fetcher] RSS 피드에서 뉴스 가져오기 성공:', newsList.length, '개');
        }
        return newsList;

    } catch (error) {
        console.error(`[News Fetcher] RSS 피드 가져오기 실패: ${error.message}`);
        return []; // 오류 발생 시 빈 배열 반환
    }
}

module.exports = { fetchTableTennisNews };