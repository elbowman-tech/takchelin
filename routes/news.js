// ===================================================================================
//  FILE: /routes/news.js (신규 파일)
//  역할: 로그인한 사용자가 뉴스를 직접 등록하고 관리합니다.
// ===================================================================================
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isLoggedIn } = require('../middleware/authMiddleware');

// 뉴스 공유 페이지
router.get('/', (req, res) => {
    const sql = "SELECT * FROM news ORDER BY createdAt DESC";
    db.all(sql, [], (err, manualNews) => { // 변수명을 manualNews로 변경
        if (err) {
            console.error("뉴스 페이지 로딩 오류:", err);
            return res.status(500).send("페이지를 불러오는 중 오류가 발생했습니다.");
        }
        res.render('news/index', { 
            title: '탁구 뉴스', 
            manualNews: manualNews, // 수동 등록 뉴스 전달
            autoNews: req.app.locals.autoNewsCache || [] // 자동 수집 뉴스 전달
        });
    });
});

// 뉴스 추가
router.post('/add', isLoggedIn, (req, res) => {
    const { title, link } = req.body;
    const { id: author_id, nickname: author_nickname } = req.session.user;
    const sql = "INSERT INTO news (title, link, author_id, author_nickname) VALUES (?, ?, ?, ?)";
    db.run(sql, [title, link, author_id, author_nickname], (err) => {
        if (err) throw err;
        res.redirect('/news');
    });
});

// 뉴스 삭제
router.post('/delete/:id', isLoggedIn, (req, res) => {
    const newsId = req.params.id;
    const { id: userId, isAdmin } = req.session.user;

    const sql = "SELECT * FROM news WHERE id = ?";
    db.get(sql, [newsId], (err, newsItem) => {
        if (err) throw err;
        if (!newsItem) return res.status(404).send("Not Found");

        if (isAdmin || newsItem.author_id === userId) {
            const deleteSql = "DELETE FROM news WHERE id = ?";
            db.run(deleteSql, [newsId], (err) => {
                if (err) throw err;
                res.redirect('/news');
            });
        } else {
            res.status(403).send("삭제 권한이 없습니다.");
        }
    });
});

module.exports = router;