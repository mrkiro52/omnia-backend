const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Hardcoded admin credentials
const ADMIN_CREDENTIALS = {
  username: 'mrkiro',
  password: 'longpeniscombo'
};

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Логин и пароль обязательны'
      });
    }

    // Check admin credentials
    if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
      return res.status(401).json({
        success: false,
        message: 'Неверные данные администратора'
      });
    }

    // Create admin JWT token with different secret
    const adminToken = jwt.sign(
      { 
        isAdmin: true, 
        username: username,
        role: 'admin'
      },
      process.env.JWT_ADMIN_SECRET || 'admin-fallback-secret',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Успешный вход в админ панель',
      data: {
        token: adminToken,
        user: {
          username: username,
          role: 'admin',
          isAdmin: true
        }
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при входе в админ панель'
    });
  }
});

module.exports = router;