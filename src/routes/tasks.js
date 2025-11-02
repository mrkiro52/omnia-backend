const express = require('express');
const router = express.Router();
const database = require('../models/database');
const adminAuth = require('../middleware/adminAuth');

// Публичный эндпоинт для получения всех задач (без авторизации)
router.get('/public', async (req, res) => {
  try {
    const tasks = await database.all(`
      SELECT 
        t.*,
        tc.name as category_name
      FROM tasks t
      LEFT JOIN task_categories tc ON t.category_id = tc.id
      ORDER BY t.created_at DESC
    `, []);

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения задач'
    });
  }
});

// Получить все задачи с категориями (только для админов)
router.get('/', adminAuth, async (req, res) => {
  try {
    const tasks = await database.all(`
      SELECT 
        t.*,
        tc.name as category_name
      FROM tasks t
      LEFT JOIN task_categories tc ON t.category_id = tc.id
      ORDER BY t.created_at DESC
    `, []);

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения задач'
    });
  }
});

// Получить задачу по ID
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const task = await database.get(`
      SELECT 
        t.*,
        tc.name as category_name
      FROM tasks t
      LEFT JOIN task_categories tc ON t.category_id = tc.id
      WHERE t.id = $1
    `, [id]);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Задача не найдена'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения задачи'
    });
  }
});

// Создать новую задачу
router.post('/', adminAuth, async (req, res) => {
  try {
    const { category_id, difficulty, question, answer, solution } = req.body;

    // Валидация
    if (!category_id || !difficulty || !question || !answer || !solution) {
      return res.status(400).json({
        success: false,
        message: 'Все поля обязательны'
      });
    }

    if (!['легкая', 'средняя', 'сложная'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: 'Неверная сложность. Допустимы: легкая, средняя, сложная'
      });
    }

    // Проверяем, существует ли категория
    const categoryExists = await database.get('SELECT id FROM task_categories WHERE id = $1', [category_id]);

    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Категория не найдена'
      });
    }

    const result = await database.run(
      'INSERT INTO tasks (category_id, difficulty, question, answer, solution) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [category_id, difficulty, question, answer, solution]
    );

    // Получаем созданную задачу с категорией
    const newTask = await database.get(`
      SELECT 
        t.*,
        tc.name as category_name
      FROM tasks t
      LEFT JOIN task_categories tc ON t.category_id = tc.id
      WHERE t.id = $1
    `, [result.rows[0].id]);

    res.json({
      success: true,
      data: newTask
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка создания задачи'
    });
  }
});

// Обновить задачу
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, difficulty, question, answer, solution } = req.body;

    // Валидация
    if (!category_id || !difficulty || !question || !answer || !solution) {
      return res.status(400).json({
        success: false,
        message: 'Все поля обязательны'
      });
    }

    if (!['легкая', 'средняя', 'сложная'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: 'Неверная сложность. Допустимы: легкая, средняя, сложная'
      });
    }

    // Проверяем, существует ли категория
    const categoryExists = await database.get('SELECT id FROM task_categories WHERE id = $1', [category_id]);

    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Категория не найдена'
      });
    }

    await database.run(
      'UPDATE tasks SET category_id = $1, difficulty = $2, question = $3, answer = $4, solution = $5 WHERE id = $6',
      [category_id, difficulty, question, answer, solution, id]
    );

    // Получаем обновленную задачу
    const updatedTask = await database.get(`
      SELECT 
        t.*,
        tc.name as category_name
      FROM tasks t
      LEFT JOIN task_categories tc ON t.category_id = tc.id
      WHERE t.id = $1
    `, [id]);

    res.json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка обновления задачи'
    });
  }
});

// Удалить задачу
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await database.run('DELETE FROM tasks WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Задача не найдена'
      });
    }

    res.json({
      success: true,
      message: 'Задача успешно удалена'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка удаления задачи'
    });
  }
});

module.exports = router;