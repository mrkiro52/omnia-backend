const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const database = require('../models/database');
const router = express.Router();

// Регистрация
router.post('/register', [
  body('email').isEmail().withMessage('Некорректный email'),
  body('password').isLength({ min: 6 }).withMessage('Пароль должен быть минимум 6 символов'),
  body('name').trim().isLength({ min: 2 }).withMessage('Имя должно быть минимум 2 символа'),
  body('surname').trim().isLength({ min: 2 }).withMessage('Фамилия должна быть минимум 2 символа')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибки валидации',
        errors: errors.array()
      });
    }

    const { email, password, name, surname, phone, bio, avatar } = req.body;

    // Проверка на существующего пользователя
    const existingUser = await database.get('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь с таким email уже существует'
      });
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание нового пользователя
    const result = await database.run(`
      INSERT INTO users (name, surname, email, password, avatar, phone, bio, rank, join_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
    `, [
      name,
      surname,
      email,
      hashedPassword,
      avatar || `https://ui-avatars.com/api/?name=${name}+${surname}&background=6366f1&color=fff`,
      phone || null,
      bio || '',
      'Новичок',
      new Date().toISOString().split('T')[0]
    ]);

    // Получаем созданного пользователя
    const newUser = await database.get('SELECT * FROM users WHERE id = $1', [result.rows[0].id]);
    
    // Вычисляем актуальный ранг
    const calculatedRank = database.calculateRank(newUser.join_date);
    newUser.rank = calculatedRank;

    // Создание JWT токена
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Ответ без пароля
    const { password: _, ...userResponse } = newUser;

    res.status(201).json({
      success: true,
      message: 'Пользователь успешно зарегистрирован',
      data: {
        user: userResponse,
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при регистрации'
    });
  }
});

// Авторизация
router.post('/login', [
  body('email').isEmail().withMessage('Некорректный email'),
  body('password').notEmpty().withMessage('Пароль обязателен')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибки валидации',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Поиск пользователя
    const user = await database.get('SELECT * FROM users WHERE email = $1', [email]);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль'
      });
    }

    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль'
      });
    }

    // Вычисляем актуальный ранг
    const calculatedRank = database.calculateRank(user.join_date);
    user.rank = calculatedRank;

    // Создание JWT токена
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Ответ без пароля
    const { password: _, ...userResponse } = user;

    res.json({
      success: true,
      message: 'Успешная авторизация',
      data: {
        user: userResponse,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при авторизации'
    });
  }
});

module.exports = router;