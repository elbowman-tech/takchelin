// ===================================================================================
//  FILE: /routes/album.js (동호회 앨범 라우터)
// 앨범 수정기능 추가
// ===================================================================================
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/database');
const { isLoggedIn } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/album/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 앨범 목록 페이지
router.get('/', (req, res) => {
    const sql = "SELECT * FROM album ORDER BY createdAt DESC";
    db.all(sql, [], (err, photos) => {
        if (err) throw err;
        res.render('album/index', { title: '동호회 앨범', photos });
    });
});

// 앨범 상세 페이지
router.get('/:id', (req, res) => {
    const photoId = req.params.id;
    const photoSql = "SELECT * FROM album WHERE id = ?";
    const commentsSql = "SELECT * FROM comments WHERE album_id = ? ORDER BY createdAt DESC";

    db.get(photoSql, [photoId], (err, photo) => {
        if (err) throw err;
        if (!photo) return res.status(404).send("사진을 찾을 수 없습니다.");

        db.all(commentsSql, [photoId], (err, comments) => {
            if (err) throw err;
            res.render('album/detail', { title: photo.caption || '앨범 상세', photo, comments });
        });
    });
});

// 앨범 수정 페이지
router.get('/edit/:id', isLoggedIn, (req, res) => {
    const photoId = req.params.id;
    const sql = "SELECT * FROM album WHERE id = ?";
    db.get(sql, [photoId], (err, photo) => {
        if (err) throw err;
        if (!photo) return res.status(404).send("사진을 찾을 수 없습니다.");
        if (req.session.user.id !== photo.uploader_id && !req.session.user.isAdmin) {
            return res.status(403).send("수정 권한이 없습니다.");
        }
        res.render('album/edit', { title: '앨범 수정', photo });
    });
});

// 앨범 수정 처리
router.post('/edit/:id', isLoggedIn, upload.single('mediaFile'), (req, res) => {
    const photoId = req.params.id;
    const { caption } = req.body;

    const findSql = "SELECT filePath, fileType FROM album WHERE id = ?";
    db.get(findSql, [photoId], (err, photo) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Server error");
        }
        if (!photo) {
            return res.status(404).send("Not Found");
        }

        let filePath = photo.filePath;
        let fileType = photo.fileType;

        if (req.file) {
            filePath = req.file.filename;
            fileType = req.file.mimetype.startsWith('image') ? 'image' : 'video';
        }

        const sql = "UPDATE album SET caption = ?, filePath = ?, fileType = ? WHERE id = ?";
        db.run(sql, [caption, filePath, fileType, photoId], (err) => {
            if (err) throw err;
            res.redirect(`/album/${photoId}`);
        });
    });
});


// 사진/동영상 업로드
router.post('/upload', isLoggedIn, upload.single('mediaFile'), (req, res) => {
    const { caption } = req.body;
    const { id: uploader_id, nickname: uploader_nickname } = req.session.user;
    const filePath = req.file.filename;
    const fileType = req.file.mimetype.startsWith('image') ? 'image' : 'video';

    const sql = `INSERT INTO album (caption, filePath, fileType, uploader_id, uploader_nickname)
                 VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [caption, filePath, fileType, uploader_id, uploader_nickname], (err) => {
        if (err) throw err;
        res.redirect('/album');
    });
});

// 사진/동영상 삭제
router.post('/delete/:id', isLoggedIn, (req, res) => {
    const fileId = req.params.id;
    const { id: userId, isAdmin } = req.session.user;

    const sql = "SELECT * FROM album WHERE id = ?";
    db.get(sql, [fileId], (err, file) => {
        if (err) throw err;
        if (!file) return res.status(404).send('Not Found');

        if (isAdmin || file.uploader_id === userId) {
            const deleteSql = "DELETE FROM album WHERE id = ?";
            db.run(deleteSql, [fileId], (err) => {
                if (err) throw err;
                res.redirect('/album');
            });
        } else {
            res.status(403).send('삭제 권한이 없습니다.');
        }
    });
});

module.exports = router;