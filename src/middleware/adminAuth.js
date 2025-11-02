const jwt = require('jsonwebtoken');

// Middleware для проверки админского токена
const adminAuth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.header('Admin-Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Токен доступа отсутствует'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET || 'admin-fallback-secret');
    
    if (!decoded.isAdmin || decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав доступа'
      });
    }
    
    req.admin = decoded;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(401).json({
      success: false,
      message: 'Недействительный токен администратора'
    });
  }
};

module.exports = adminAuth;