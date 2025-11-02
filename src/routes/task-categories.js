const express = require('express');
const router = express.Router();
const database = require('../models/database');
const adminAuth = require('../middleware/adminAuth');

// Публичный эндпоинт для получения всех категорий задач (без авторизации)
router.get('/public', async (req, res) => {
  try {
    const categories = await database.all('SELECT * FROM task_categories ORDER BY name', []);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching task categories:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения категорий задач'
    });
  }
});

// Получить все категории задач (только для админов)
router.get('/', adminAuth, async (req, res) => {
  try {
    const categories = await database.all('SELECT * FROM task_categories ORDER BY name', []);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching task categories:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения категорий задач'
    });
  }
});

// Создать новую категорию задач
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Название категории обязательно'
      });
    }

    const result = await database.run(
      'INSERT INTO task_categories (name, description) VALUES ($1, $2) RETURNING id',
      [name, description || '']
    );

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        name,
        description: description || ''
      }
    });
  } catch (error) {
    console.error('Error creating task category:', error);
    if (error.code === '23505') { // PostgreSQL unique violation
      res.status(400).json({
        success: false,
        message: 'Категория с таким названием уже существует'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Ошибка создания категории задач'
      });
    }
  }
});

// Обновить категорию задач
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Название категории обязательно'
      });
    }

    await database.run(
      'UPDATE task_categories SET name = $1, description = $2 WHERE id = $3',
      [name, description || '', id]
    );

    res.json({
      success: true,
      data: { id: parseInt(id), name, description: description || '' }
    });
  } catch (error) {
    console.error('Error updating task category:', error);
    if (error.code === '23505') { // PostgreSQL unique violation
      res.status(400).json({
        success: false,
        message: 'Категория с таким названием уже существует'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Ошибка обновления категории задач'
      });
    }
  }
});

// Удалить категорию задач
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Проверяем, есть ли задачи в этой категории
    const tasksInCategory = await database.get(
      'SELECT COUNT(*) as count FROM tasks WHERE category_id = $1',
      [id]
    );

    if (tasksInCategory.count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Нельзя удалить категорию, в которой есть задачи'
      });
    }

    const result = await database.run(
      'DELETE FROM task_categories WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Категория не найдена'
      });
    }

    res.json({
      success: true,
      message: 'Категория успешно удалена'
    });
  } catch (error) {
    console.error('Error deleting task category:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка удаления категории задач'
    });
  }
});

module.exports = router;