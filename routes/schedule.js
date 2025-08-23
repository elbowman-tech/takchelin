// ===================================================================================
//  FILE: /routes/schedule.js (시합일정 라우터)
//  역할: 모든 로그인한 회원이 시합 일정을 관리합니다. 수정기능 추가
// ===================================================================================
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isLoggedIn } = require('../middleware/authMiddleware');

// 일정 목록 페이지
router.get('/', (req, res) => {
    const sql = "SELECT * FROM schedule ORDER BY event_date DESC";
    db.all(sql, [], (err, schedules) => {
        if (err) throw err;
        res.render('schedule/index', { title: '시합일정', schedules });
    });
});

// 일정 상세 페이지
router.get('/:id', (req, res) => {
    const scheduleId = req.params.id;
    const scheduleSql = "SELECT * FROM schedule WHERE id = ?";
    const commentsSql = "SELECT * FROM comments WHERE schedule_id = ? ORDER BY createdAt DESC";

    db.get(scheduleSql, [scheduleId], (err, schedule) => {
        if (err) throw err;
        if (!schedule) return res.status(404).send("일정을 찾을 수 없습니다.");

        db.all(commentsSql, [scheduleId], (err, comments) => {
            if (err) throw err;
            res.render('schedule/detail', { title: schedule.title, schedule, comments });
        });
    });
});

// 일정 수정 페이지
router.get('/edit/:id', isLoggedIn, (req, res) => {
    const scheduleId = req.params.id;
    const sql = "SELECT * FROM schedule WHERE id = ?";
    db.get(sql, [scheduleId], (err, schedule) => {
        if (err) throw err;
        if (!schedule) return res.status(404).send("일정을 찾을 수 없습니다.");
        if (req.session.user.id !== schedule.author_id && !req.session.user.isAdmin) {
            return res.status(403).send("수정 권한이 없습니다.");
        }
        res.render('schedule/edit', { title: '일정 수정', schedule });
    });
});

// 일정 수정 처리
router.post('/edit/:id', isLoggedIn, (req, res) => {
    const scheduleId = req.params.id;
    const { title, event_date, event_time, location } = req.body;
    const sql = "UPDATE schedule SET title = ?, event_date = ?, event_time = ?, location = ? WHERE id = ?";
    db.run(sql, [title, event_date, event_time, location, scheduleId], (err) => {
        if (err) throw err;
        res.redirect(`/schedule/${scheduleId}`);
    });
});

// 일정 추가
router.post('/add', isLoggedIn, (req, res) => {
    const { title, event_date, event_time, location } = req.body;
    const { id: author_id, nickname: author_nickname } = req.session.user;
    const sql = "INSERT INTO schedule (title, event_date, event_time, location, author_id, author_nickname) VALUES (?, ?, ?, ?, ?, ?)";
    db.run(sql, [title, event_date, event_time, location, author_id, author_nickname], (err) => {
        if (err) throw err;
        res.redirect('/schedule');
    });
});

// 일정 삭제
router.post('/delete/:id', isLoggedIn, (req, res) => {
    const scheduleId = req.params.id;
    const { id: userId, isAdmin } = req.session.user;

    const sql = "SELECT * FROM schedule WHERE id = ?";
    db.get(sql, [scheduleId], (err, item) => {
        if (err) throw err;
        if (!item) return res.status(404).send("Not Found");

        if (isAdmin || item.author_id === userId) {
            const deleteSql = "DELETE FROM schedule WHERE id = ?";
            db.run(deleteSql, [scheduleId], (err) => {
                if (err) throw err;
                res.redirect('/schedule');
            });
        } else {
            res.status(403).send("삭제 권한이 없습니다.");
        }
    });
});

module.exports = router;