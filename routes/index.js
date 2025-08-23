// ===================================================================================
//  FILE: /routes/index.js (메인, 소개, 검색 라우터) (수정된 파일)
// ===================================================================================
const express = require('express');
const router = express.Router();
const db = require('../config/database');

const dbAllPromise = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

router.get('/', async (req, res) => {
    try {
        const noticesSql = "SELECT * FROM posts WHERE category = 'notice' ORDER BY createdAt DESC LIMIT 5";
        const freePostsSql = "SELECT * FROM posts WHERE category = 'free' ORDER BY createdAt DESC LIMIT 5";
        const scheduleSql = "SELECT * FROM schedule WHERE event_date >= date('now') ORDER BY event_date ASC LIMIT 5";
        const manualNewsSql = "SELECT * FROM news ORDER BY createdAt DESC LIMIT 5";
        const albumSql = "SELECT * FROM album ORDER BY createdAt DESC LIMIT 4";

        const [notices, freePosts, schedules, manualNews, photos] = await Promise.all([
            dbAllPromise(noticesSql, []),
            dbAllPromise(freePostsSql, []),
            dbAllPromise(scheduleSql, []),
            dbAllPromise(manualNewsSql, []),
            dbAllPromise(albumSql, [])
        ]);
        
        res.render('main/index', { 
            title: '메인', 
            notices,
            freePosts,
            schedules,
            manualNews,
            autoNews: req.app.locals.autoNewsCache || [],
            photos
        });

    } catch (err) {
        console.error("메인 페이지 로딩 오류:", err);
        res.status(500).send("페이지를 불러오는 중 오류가 발생했습니다.");
    }
});

router.get('/about', (req, res) => {
    res.render('main/about', { title: '동호회 소개' });
});

// 검색 기능 (수정된 로직)
router.get('/search', (req, res) => {
    const query = req.query.query;
    if (!query || query.trim() === "") {
        return res.redirect('/');
    }
    const searchQuery = `%${query}%`;
    const queryForJs = query.toLowerCase(); // JS 필터링을 위한 소문자 검색어

    // 데이터베이스 검색 SQL
    const sql = `
        SELECT 
            id, title, content as description, '게시글' as type, '/community/post/' || id as url 
        FROM posts WHERE title LIKE ? OR content LIKE ?
        
        UNION ALL
        
        SELECT 
            id, name as title, intro as description, '회원' as type, '/members' as url 
        FROM members WHERE name LIKE ? OR intro LIKE ?

        UNION ALL

        SELECT 
            id, title, location as description, '일정' as type, '/schedule' as url 
        FROM schedule WHERE title LIKE ? OR location LIKE ?

        UNION ALL

        SELECT 
            id, caption as title, '' as description, '앨범' as type, '/album' as url 
        FROM album WHERE caption LIKE ?

        UNION ALL

        SELECT 
            id, title, '' as description, '뉴스' as type, link as url 
        FROM news WHERE title LIKE ?
    `;

    const params = [searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery];

    db.all(sql, params, (err, dbResults) => {
        if (err) {
            console.error("검색 오류:", err);
            return res.status(500).send("검색 중 오류가 발생했습니다.");
        }

        // 자동 수집 뉴스 검색 (메모리에서 필터링)
        const autoNewsResults = (req.app.locals.autoNewsCache || [])
            .filter(news => news.title.toLowerCase().includes(queryForJs))
            .map(news => ({
                id: null, // DB id가 없으므로 null
                title: news.title,
                description: '자동 수집 뉴스',
                type: '뉴스',
                url: news.link
            }));

        // DB 검색 결과와 자동 수집 뉴스 검색 결과 합치기
        const results = [...dbResults, ...autoNewsResults];

        res.render('main/search_results', { title: '검색 결과', results, query });
    });
});

module.exports = router;