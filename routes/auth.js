// ===================================================================================
//  FILE: /routes/auth.js (수정된 파일)
//  역할: 회원가입, 로그인, 회원 탈퇴 로직을 처리합니다.
// ===================================================================================
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/database');
const { isLoggedIn } = require('../middleware/authMiddleware');

// 회원가입 페이지
router.get('/register', (req, res) => {
    res.render('auth/register', { title: '회원가입' });
});

// 회원가입 처리
router.post('/register', async (req, res) => {
    const { username, password, nickname, name, level, intro } = req.body;
    try {
        db.get("SELECT COUNT(*) as count FROM users", async (err, row) => {
            if (err) return res.status(500).send('서버 오류');

            const isFirstUser = row.count === 0;
            const isAdmin = isFirstUser ? 1 : 0;
            const isApproved = isFirstUser ? 1 : 0;

            const hashedPassword = await bcrypt.hash(password, 10);
            const sql = 'INSERT INTO users (username, password, nickname, name, level, intro, isAdmin, isApproved) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
            
            db.run(sql, [username, hashedPassword, nickname, name, level, intro, isAdmin, isApproved], function(err) {
                if (err) {
                    return res.status(400).send('아이디 또는 닉네임이 이미 사용 중입니다.');
                }
                
                if (isFirstUser) {
                    const userId = this.lastID;
                    const memberSql = 'INSERT INTO members (user_id, name, level, intro) VALUES (?, ?, ?, ?)';
                    db.run(memberSql, [userId, name, level, intro], (memberErr) => {
                        if (memberErr) {
                             return res.status(500).send('멤버 정보 생성 중 오류 발생');
                        }
                        console.log(`최초 관리자(${username})가 멤버로 자동 등록되었습니다.`);
                    });
                }
                
                console.log(`새로운 가입 신청: ${username}`);
                res.redirect('/auth/login');
            });
        });
    } catch {
        res.status(500).send('서버 오류');
    }
});

// 로그인 페이지
router.get('/login', (req, res) => {
    res.render('auth/login', { title: '로그인' });
});

// 로그인 처리
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.get(sql, [username], async (err, user) => {
        if (err) return res.status(500).send('서버 오류');
        if (!user) return res.status(400).send('아이디 또는 비밀번호가 잘못되었습니다.');
        
        if (user.isApproved === 0) {
            return res.status(403).send('아직 관리자의 승인을 받지 않은 계정입니다. 승인 후 다시 시도해주세요.');
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).send('아이디 또는 비밀번호가 잘못되었습니다.');

        req.session.user = {
            id: user.id,
            username: user.username,
            nickname: user.nickname,
            isAdmin: user.isAdmin
        };
        res.redirect('/');
    });
});

// 로그아웃
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send('로그아웃 실패');
        res.redirect('/');
    });
});

// 마이페이지 (자발적 탈퇴)
router.get('/mypage', isLoggedIn, (req, res) => {
    res.render('auth/mypage', { title: '마이페이지' });
});

// 회원 탈퇴 처리
router.post('/delete', isLoggedIn, (req, res) => {
    const userId = req.session.user.id;

    // 최초 관리자(ID: 1)는 탈퇴할 수 없음
    if (userId === 1) {
        return res.status(400).send("최초 관리자는 탈퇴할 수 없습니다.");
    }

    const sql = "DELETE FROM users WHERE id = ?";
    db.run(sql, [userId], (err) => {
        if (err) {
            return res.status(500).send("회원 탈퇴 처리 중 오류가 발생했습니다.");
        }
        req.session.destroy(err => {
            console.log(`회원(ID: ${userId})이 자발적으로 탈퇴했습니다.`);
            res.redirect('/');
        });
    });
});

module.exports = router;