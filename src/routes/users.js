const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const database = require('../models/database');

// Получить всех пользователей (только для администраторов)
router.get('/', adminAuth, async (req, res) => {
  try {
    const users = await database.all('SELECT id, name, surname, email, phone, bio, rank, join_date FROM users');
    
    // Вычисляем актуальные ранги для всех пользователей
    const usersWithCalculatedRanks = users.map(user => ({
      ...user,
      rank: database.calculateRank(user.join_date),
      joinDate: user.join_date // Добавляем алиас для frontend
    }));
    
    res.json({
      success: true,
      data: usersWithCalculatedRanks
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения пользователей'
    });
  }
});

// Создать нового пользователя (только для администраторов)
router.post('/create', adminAuth, async (req, res) => {
  try {
    const { name, surname, email, password, phone, bio } = req.body;

    if (!name || !surname || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Имя, фамилия, email и пароль обязательны'
      });
    }
    
    // Проверяем, не существует ли уже пользователь с таким email
    const existingUser = await database.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Пользователь с таким email уже существует'
      });
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем пользователя
    const result = await database.run(`
      INSERT INTO users (name, surname, email, password, phone, bio, rank, join_date, avatar) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, 
      surname, 
      email, 
      hashedPassword, 
      phone || '', 
      bio || '', 
      'Новичок',
      new Date().toISOString().split('T')[0],
      `https://ui-avatars.com/api/?name=${name}+${surname}&background=6366f1&color=fff`
    ]);

    // Получаем созданного пользователя
    const newUser = await database.get('SELECT * FROM users WHERE id = ?', [result.id]);
    
    // Вычисляем актуальный ранг
    const calculatedRank = database.calculateRank(newUser.join_date);
    
    const userResponse = {
      id: newUser.id,
      name: newUser.name,
      surname: newUser.surname,
      email: newUser.email,
      phone: newUser.phone,
      bio: newUser.bio,
      rank: calculatedRank,
      joinDate: newUser.join_date
    };

    res.json({
      success: true,
      message: 'Пользователь успешно создан',
      data: userResponse
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка создания пользователя'
    });
  }
});

// Удалить пользователя (только для администраторов)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    
    const result = await database.run('DELETE FROM users WHERE id = ?', [userId]);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    res.json({
      success: true,
      message: 'Пользователь успешно удален'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка удаления пользователя'
    });
  }
});

// Получить профиль пользователя
router.get('/profile', auth, async (req, res) => {
  try {
    // Получаем пользователя из БД
    const user = await database.get('SELECT * FROM users WHERE id = ?', [req.user.userId]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    // Вычисляем актуальный ранг
    const calculatedRank = database.calculateRank(user.join_date);
    
    // Подсчитываем статистику пользователя (безопасно, если таблица не существует)
    let postsCount = { count: 0 };
    try {
      postsCount = await database.get('SELECT COUNT(*) as count FROM posts WHERE author_id = ?', [user.id]);
    } catch (error) {
      console.log('Posts table does not exist yet, defaulting to 0');
    }
    
    const userProfile = {
      id: user.id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      avatar: user.avatar,
      phone: user.phone || '',
      bio: user.bio || '',
      joinDate: user.join_date,
      rank: calculatedRank,
      coursesCompleted: 0, // Можно будет добавить позже
      postsCount: postsCount?.count || 0,
      helpRequests: 0 // Можно будет добавить позже
    };

    res.json({
      success: true,
      data: userProfile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения профиля'
    });
  }
});

// Обновить профиль пользователя
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, surname, email, phone, bio, avatar } = req.body;
    const userId = req.user.userId;

    // Проверяем, что email не занят другим пользователем
    if (email) {
      const existingUser = await database.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Пользователь с таким email уже существует'
        });
      }
    }

    // Обновляем профиль пользователя
    await database.run(`
      UPDATE users 
      SET name = COALESCE(?, name),
          surname = COALESCE(?, surname),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          bio = COALESCE(?, bio),
          avatar = COALESCE(?, avatar)
      WHERE id = ?
    `, [name, surname, email, phone, bio, avatar, userId]);

    // Получаем обновленного пользователя
    const updatedUser = await database.get('SELECT * FROM users WHERE id = ?', [userId]);
    
    // Вычисляем актуальный ранг
    const calculatedRank = database.calculateRank(updatedUser.join_date);
    
    const userResponse = {
      id: updatedUser.id,
      name: updatedUser.name,
      surname: updatedUser.surname,
      email: updatedUser.email,
      phone: updatedUser.phone,
      bio: updatedUser.bio,
      avatar: updatedUser.avatar,
      joinDate: updatedUser.join_date,
      rank: calculatedRank
    };

    res.json({
      success: true,
      message: 'Профиль успешно обновлен',
      data: userResponse
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка обновления профиля'
    });
  }
});

module.exports = router;