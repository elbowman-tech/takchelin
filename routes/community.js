// ===================================================================================
//  FILE: /routes/community.js (커뮤니티 게시판 라우터)
// 게시글 수정기증 추가
// ===================================================================================
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/database');
const { isLoggedIn } = require('../middleware/authMiddleware');

// 파일 업로드 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/posts/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

const categoryMap = {
    notice: '공지사항',
    free: '자유게시판',
    market: '회원장터',
    suggestion: '건의사항'
};

// 게시판 목록
router.get('/board/:category', (req, res) => {
    const category = req.params.category;
    const boardTitle = categoryMap[category];
    if (!boardTitle) return res.status(404).send('Not Found');

    const sql = "SELECT * FROM posts WHERE category = ? ORDER BY createdAt DESC";
    db.all(sql, [category], (err, posts) => {
        if (err) throw err;
        res.render('community/board', { title: boardTitle, posts, category });
    });
});

// 글쓰기 페이지
router.get('/write/:category', isLoggedIn, (req, res) => {
    const category = req.params.category;
    const boardTitle = categoryMap[category];
    if (!boardTitle) return res.status(404).send('Not Found');
    res.render('community/write', { title: '글쓰기', boardTitle, category });
});

// 글쓰기 처리
router.post('/write/:category', isLoggedIn, upload.single('mediaFile'), (req, res) => {
    const category = req.params.category;
    const { title, content } = req.body;
    const { id: author_id, nickname: author_nickname } = req.session.user;

    let filePath = null;
    let fileType = null;
    if (req.file) {
        filePath = req.file.filename;
        fileType = req.file.mimetype.startsWith('image') ? 'image' : 'video';
    }

    const sql = `INSERT INTO posts (category, title, content, filePath, fileType, author_id, author_nickname)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [category, title, content, filePath, fileType, author_id, author_nickname], (err) => {
        if (err) throw err;
        res.redirect(`/community/board/${category}`);
    });
});

// 게시글 상세 보기
router.get('/post/:id', (req, res) => {
    const postId = req.params.id;
    const postSql = "SELECT * FROM posts WHERE id = ?";
    const commentsSql = "SELECT * FROM comments WHERE post_id = ? ORDER BY createdAt DESC";

    db.get(postSql, [postId], (err, post) => {
        if (err) throw err;
        if (!post) return res.status(404).send('Not Found');
        
        db.all(commentsSql, [postId], (err, comments) => {
            if (err) throw err;
            res.render('community/post', { title: post.title, post, comments });
        });
    });
});

// 게시글 수정 페이지
router.get('/edit/:id', isLoggedIn, (req, res) => {
    const postId = req.params.id;
    const sql = "SELECT * FROM posts WHERE id = ?";
    db.get(sql, [postId], (err, post) => {
        if (err) throw err;
        if (!post) return res.status(404).send("게시글을 찾을 수 없습니다.");
        if (req.session.user.id !== post.author_id && !req.session.user.isAdmin) {
            return res.status(403).send("수정 권한이 없습니다.");
        }
        res.render('community/edit', { title: '게시글 수정', post });
    });
});

// 게시글 수정 처리
router.post('/edit/:id', isLoggedIn, upload.single('mediaFile'), (req, res) => {
    const postId = req.params.id;
    const { title, content } = req.body;

    const findSql = "SELECT filePath, fileType FROM posts WHERE id = ?";
    db.get(findSql, [postId], (err, post) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Server error");
        }

        let filePath = post ? post.filePath : null;
        let fileType = post ? post.fileType : null;

        if (req.file) {
            filePath = req.file.filename;
            fileType = req.file.mimetype.startsWith('image') ? 'image' : 'video';
        }

        const sql = "UPDATE posts SET title = ?, content = ?, filePath = ?, fileType = ? WHERE id = ?";
        db.run(sql, [title, content, filePath, fileType, postId], (err) => {
            if (err) throw err;
            res.redirect(`/community/post/${postId}`);
        });
    });
});

// 게시글 삭제
router.post('/post/delete/:id', isLoggedIn, (req, res) => {
    const postId = req.params.id;
    const userId = req.session.user.id;
    const isAdmin = req.session.user.isAdmin;

    const sql = "SELECT * FROM posts WHERE id = ?";
    db.get(sql, [postId], (err, post) => {
        if (err) throw err;
        if (!post) return res.status(404).send('Not Found');

        // 관리자이거나 본인 글일 경우에만 삭제 가능
        if (isAdmin || post.author_id === userId) {
            const deleteSql = "DELETE FROM posts WHERE id = ?";
            db.run(deleteSql, [postId], (err) => {
                if (err) throw err;
                // TODO: 실제 파일도 삭제하는 로직 추가
                res.redirect(`/community/board/${post.category}`);
            });
        } else {
            res.status(403).send('삭제 권한이 없습니다.');
        }
    });
});

module.exports = router;