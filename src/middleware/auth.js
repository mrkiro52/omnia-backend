const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Токен доступа не предоставлен'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    // Приводим к единому формату - добавляем id для совместимости
    req.user = {
      ...decoded,
      id: decoded.userId || decoded.id
    };
    console.log('Auth middleware - decoded user:', req.user);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Недействительный токен'
    });
  }
};

module.exports = auth;