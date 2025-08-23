// ===================================================================================
//  FILE: /middleware/authMiddleware.js
//  역할: 로그인이 필요한 페이지에 접근하기 전, 로그인 상태인지 확인합니다.
// ===================================================================================
const isLoggedIn = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/auth/login');
};

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.isAdmin) {
        return next();
    }
    res.status(403).send('접근 권한이 없습니다.');
};

module.exports = { isLoggedIn, isAdmin };