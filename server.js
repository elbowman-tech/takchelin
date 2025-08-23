// ===================================================================================
//  FILE: /server.js
//  역할: 웹 서버의 시작점. 모든 요청을 받아 각 담당자(라우터)에게 연결함. 뉴스 캐시 관리기능 포함
// ===================================================================================
const express = require('express');
const path = require('path');
const session = require('express-session');
const fs = require('fs');
const db = require('./config/database');
const { fetchTableTennisNews } = require('./utils/newsFetcher'); // 뉴스 수집기 불러오기

const app = express();
// *** 오류 해결: PORT 변수를 한 번만 선언하도록 위치 조정 ***
const PORT = process.env.PORT || 3000;

// --- 뉴스 캐시 관리 로직 ---
app.locals.autoNewsCache = []; // app.locals를 사용해 앱 전역에서 캐시 접근 가능
const cacheDuration = 1000 * 60 * 60; // 1시간

async function updateNewsCache() {
    console.log('최신 뉴스를 확인합니다...');
    try {
        const freshNews = await fetchTableTennisNews();
        app.locals.autoNewsCache = freshNews; // app.locals에 저장
        console.log('뉴스 캐시가 업데이트되었습니다.');
    } catch (error) {
        console.error('뉴스 캐시 업데이트 실패:', error);
    }
}
// 서버 시작 시 즉시 실행 및 1시간마다 반복
updateNewsCache();
setInterval(updateNewsCache, cacheDuration);
// --- 뉴스 캐시 관리 로직 끝 ---


const uploadsDir = path.join(__dirname, 'uploads');
const postsDir = path.join(uploadsDir, 'posts');
const albumDir = path.join(uploadsDir, 'album');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir);
if (!fs.existsSync(albumDir)) fs.mkdirSync(albumDir);

app.use(session({
    secret: 'takchelin-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/members', require('./routes/members'));
app.use('/community', require('./routes/community'));
app.use('/schedule', require('./routes/schedule'));
app.use('/album', require('./routes/album'));
app.use('/admin', require('./routes/admin'));
app.use('/news', require('./routes/news'));
app.use('/comments', require('./routes/comments')); // <-- 댓글 라우터 추가


// 서버 실행
app.listen(PORT, () => {
    console.log(`탁슐랭 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});