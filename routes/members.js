// ===================================================================================
//  FILE: /routes/members.js (수정된 파일)
//  역할: 회원소개 라우터 (신규 등록 기능 삭제)
// ===================================================================================
/*
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAdmin } = require('../middleware/authMiddleware');

// 회원 목록
router.get('/', (req, res) => {
    const sql = "SELECT * FROM members ORDER BY name";
    db.all(sql, [], (err, members) => {
        if (err) throw err;
        res.render('members/list', { title: '회원 소개', members });
    });
});

// 회원 삭제 처리 (관리자 전용)
router.post('/delete/:id', isAdmin, (req, res) => {
    const memberId = req.params.id;
    // members 테이블에서 user_id를 먼저 찾고, users 테이블과 members 테이블에서 모두 삭제
    const findUserSql = "SELECT user_id FROM members WHERE id = ?";
    db.get(findUserSql, [memberId], (err, member) => {
        if (err) throw err;
        if (member) {
            const deleteUserSql = "DELETE FROM users WHERE id = ?";
            db.run(deleteUserSql, [member.user_id], (err) => {
                if (err) throw err;
                // users 테이블에서 삭제되면 members 테이블에서도 자동으로 삭제됨 (ON DELETE CASCADE)
                console.log(`회원(ID: ${member.user_id}) 정보가 삭제되었습니다.`);
                res.redirect('/members');
            });
        } else {
            res.redirect('/members');
        }
    });
});

module.exports = router;
*/

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// 회원 목록
router.get('/', (req, res) => {
    const sql = "SELECT * FROM members ORDER BY name";
    db.all(sql, [], (err, members) => {
        if (err) throw err;
        res.render('members/list', { title: '회원 소개', members });
    });
});

module.exports = router;