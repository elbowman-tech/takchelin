// ===================================================================================
//  FILE: /routes/admin.js (수정된 파일)
//  역할: 관리자 전용 기능(회원 승인/거절/강제탈퇴)을 처리합니다.
// ===================================================================================
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAdmin } = require('../middleware/authMiddleware');

// 관리자 페이지 - 사용자 목록 및 가입 신청 목록
router.get('/users', isAdmin, (req, res) => {
    const approvedUsersSql = "SELECT id, username, nickname, isAdmin FROM users WHERE isApproved = 1";
    const pendingUsersSql = "SELECT * FROM users WHERE isApproved = 0";
    const adminCountSql = "SELECT COUNT(*) as adminCount FROM users WHERE isAdmin = 1";

    db.all(approvedUsersSql, [], (err, approvedUsers) => {
        if (err) throw err;
        db.all(pendingUsersSql, [], (err, pendingUsers) => {
            if (err) throw err;
            db.get(adminCountSql, [], (err, row) => {
                if (err) throw err;
                res.render('admin/users', {
                    title: '회원 관리',
                    approvedUsers,
                    pendingUsers,
                    adminCount: row.adminCount
                });
            });
        });
    });
});

// 가입 승인
router.post('/users/approve/:id', isAdmin, (req, res) => {
    const userIdToApprove = req.params.id;
    const findUserSql = "SELECT * FROM users WHERE id = ?";
    
    db.get(findUserSql, [userIdToApprove], (err, user) => {
        if (err) return res.status(500).send("서버 오류");
        if (!user) return res.status(404).send("사용자를 찾을 수 없습니다.");

        const approveSql = "UPDATE users SET isApproved = 1 WHERE id = ?";
        db.run(approveSql, [userIdToApprove], (err) => {
            if (err) return res.status(500).send("승인 처리 중 오류 발생");

            const memberSql = 'INSERT INTO members (user_id, name, level, intro) VALUES (?, ?, ?, ?)';
            db.run(memberSql, [user.id, user.name, user.level, user.intro], (err) => {
                if (err) return res.status(500).send("멤버 정보 생성 중 오류 발생");
                res.redirect('/admin/users');
            });
        });
    });
});

// 가입 거절
router.post('/users/reject/:id', isAdmin, (req, res) => {
    const userIdToReject = req.params.id;
    const sql = "DELETE FROM users WHERE id = ? AND isApproved = 0";
    db.run(sql, [userIdToReject], (err) => {
        if (err) return res.status(500).send("거절 처리 중 오류 발생");
        res.redirect('/admin/users');
    });
});

// 강제 탈퇴
router.post('/users/delete/:id', isAdmin, (req, res) => {
    const userIdToDelete = req.params.id;

    // 최초 관리자(ID: 1)는 탈퇴시킬 수 없음
    if (parseInt(userIdToDelete, 10) === 1) {
        return res.status(400).send("최초 관리자는 탈퇴시킬 수 없습니다.");
    }

    const sql = "DELETE FROM users WHERE id = ?";
    db.run(sql, [userIdToDelete], (err) => {
        if (err) return res.status(500).send("회원 삭제 처리 중 오류 발생");
        console.log(`관리자에 의해 회원(ID: ${userIdToDelete})이 강제 탈퇴되었습니다.`);
        res.redirect('/admin/users');
    });
});


// 관리자 지정/해제 로직은 이전과 동일
router.post('/users/promote/:id', isAdmin, (req, res) => {
    const userIdToPromote = req.params.id;
    const adminCountSql = "SELECT COUNT(*) as adminCount FROM users WHERE isAdmin = 1";

    db.get(adminCountSql, [], (err, row) => {
        if (err) return res.status(500).send("서버 오류");
        if (row.adminCount >= 3) {
            return res.status(400).send("관리자는 최대 3명까지 지정할 수 있습니다.");
        }
        
        const promoteSql = "UPDATE users SET isAdmin = 1 WHERE id = ?";
        db.run(promoteSql, [userIdToPromote], (err) => {
            if (err) return res.status(500).send("서버 오류");
            res.redirect('/admin/users');
        });
    });
});

router.post('/users/demote/:id', isAdmin, (req, res) => {
    const userIdToDemote = req.params.id;

    if (parseInt(userIdToDemote, 10) === 1) {
        return res.status(400).send("최초 관리자는 해제할 수 없습니다.");
    }

    const demoteSql = "UPDATE users SET isAdmin = 0 WHERE id = ?";
    db.run(demoteSql, [userIdToDemote], (err) => {
        if (err) return res.status(500).send("서버 오류");
        res.redirect('/admin/users');
    });
});

module.exports = router;