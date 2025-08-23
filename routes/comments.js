// ===================================================================================
//  FILE: /routes/comments.js (신규 파일)
//  역할: 댓글 작성, 수정 및 삭제 기능을 처리합니다.
// ===================================================================================
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isLoggedIn } = require('../middleware/authMiddleware');

// 댓글 추가
router.post('/add/:type/:content_id', isLoggedIn, (req, res) => {
    const { type, content_id } = req.params;
    const { content } = req.body;
    const { id: author_id, nickname: author_nickname } = req.session.user;

    let sql, params, redirectUrl;

    switch (type) {
        case 'post':
            sql = 'INSERT INTO comments (content, author_id, author_nickname, post_id) VALUES (?, ?, ?, ?)';
            redirectUrl = `/community/post/${content_id}`;
            break;
        case 'schedule':
            sql = 'INSERT INTO comments (content, author_id, author_nickname, schedule_id) VALUES (?, ?, ?, ?)';
            redirectUrl = `/schedule/${content_id}`;
            break;
        case 'album':
            sql = 'INSERT INTO comments (content, author_id, author_nickname, album_id) VALUES (?, ?, ?, ?)';
            redirectUrl = `/album/${content_id}`;
            break;
        default:
            return res.status(400).send('잘못된 타입입니다.');
    }

    params = [content, author_id, author_nickname, content_id];
    db.run(sql, params, (err) => {
        if (err) {
            console.error("댓글 추가 오류:", err);
            return res.status(500).send("댓글 작성 중 오류가 발생했습니다.");
        }
        res.redirect(redirectUrl);
    });
});

// 댓글 수정
router.post('/edit/:id', isLoggedIn, (req, res) => {
    const commentId = req.params.id;
    const { content } = req.body;
    const { id: userId, isAdmin } = req.session.user;

    const findSql = "SELECT * FROM comments WHERE id = ?";
    db.get(findSql, [commentId], (err, comment) => {
        if (err) throw err;
        if (!comment) return res.status(404).send("댓글을 찾을 수 없습니다.");

        if (isAdmin || comment.author_id === userId) {
            const updateSql = "UPDATE comments SET content = ? WHERE id = ?";
            db.run(updateSql, [content, commentId], (err) => {
                if (err) throw err;

                if (comment.post_id) res.redirect(`/community/post/${comment.post_id}`);
                else if (comment.schedule_id) res.redirect(`/schedule/${comment.schedule_id}`);
                else if (comment.album_id) res.redirect(`/album/${comment.album_id}`);
                else res.redirect('/');
            });
        } else {
            res.status(403).send("수정 권한이 없습니다.");
        }
    });
});

// 댓글 삭제
router.post('/delete/:id', isLoggedIn, (req, res) => {
    const commentId = req.params.id;
    const { id: userId, isAdmin } = req.session.user;

    const findSql = "SELECT * FROM comments WHERE id = ?";
    db.get(findSql, [commentId], (err, comment) => {
        if (err) throw err;
        if (!comment) return res.status(404).send("댓글을 찾을 수 없습니다.");

        if (isAdmin || comment.author_id === userId) {
            const deleteSql = "DELETE FROM comments WHERE id = ?";
            db.run(deleteSql, [commentId], (err) => {
                if (err) throw err;
                
                if (comment.post_id) res.redirect(`/community/post/${comment.post_id}`);
                else if (comment.schedule_id) res.redirect(`/schedule/${comment.schedule_id}`);
                else if (comment.album_id) res.redirect(`/album/${comment.album_id}`);
                else res.redirect('/');
            });
        } else {
            res.status(403).send("삭제 권한이 없습니다.");
        }
    });
});

module.exports = router;