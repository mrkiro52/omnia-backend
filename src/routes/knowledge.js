const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const database = require('../models/database');
const router = express.Router();

// Получить все категории
router.get('/categories', async (req, res) => {
  try {
    const categories = await database.all(`
      SELECT id, title, description, icon
      FROM knowledge_categories 
      ORDER BY title
    `);
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения категорий'
    });
  }
});

// Создать новую категорию (только для админов)
router.post('/categories', adminAuth, async (req, res) => {
  try {
    const { title, description, icon } = req.body;
    
    if (!title || !description || !icon) {
      return res.status(400).json({
        success: false,
        message: 'Все поля обязательны для заполнения'
      });
    }
    
    // Проверяем, не существует ли уже такая категория
    const existingCategory = await database.get(`
      SELECT id FROM knowledge_categories WHERE title = ?
    `, [title]);
    
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Категория с таким названием уже существует'
      });
    }
    
    const result = await database.run(`
      INSERT INTO knowledge_categories (title, description, icon)
      VALUES (?, ?, ?)
    `, [title, description, icon]);
    
    const newCategory = await database.get(`
      SELECT id, title, description, icon
      FROM knowledge_categories 
      WHERE id = ?
    `, [result.id]);
    
    res.status(201).json({
      success: true,
      message: 'Категория успешно создана',
      data: newCategory
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка создания категории'
    });
  }
});

// Обновить категорию (только для админов)
router.put('/categories/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, icon } = req.body;
    
    if (!title || !description || !icon) {
      return res.status(400).json({
        success: false,
        message: 'Все поля обязательны для заполнения'
      });
    }
    
    // Проверяем, не существует ли уже категория с таким названием (кроме текущей)
    const existingCategory = await database.get(`
      SELECT id FROM knowledge_categories WHERE title = ? AND id != ?
    `, [title, id]);
    
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Категория с таким названием уже существует'
      });
    }
    
    const result = await database.run(`
      UPDATE knowledge_categories 
      SET title = ?, description = ?, icon = ?
      WHERE id = ?
    `, [title, description, icon, id]);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Категория не найдена'
      });
    }
    
    const updatedCategory = await database.get(`
      SELECT id, title, description, icon
      FROM knowledge_categories 
      WHERE id = ?
    `, [id]);
    
    res.json({
      success: true,
      message: 'Категория успешно обновлена',
      data: updatedCategory
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка обновления категории'
    });
  }
});

// Удалить категорию (только для админов)
router.delete('/categories/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверяем, есть ли статьи в этой категории
    const articlesInCategory = await database.get(`
      SELECT COUNT(*) as count FROM knowledge_articles WHERE category = ?
    `, [id]);
    
    if (articlesInCategory.count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Нельзя удалить категорию, в которой есть статьи'
      });
    }
    
    const result = await database.run(`
      DELETE FROM knowledge_categories WHERE id = ?
    `, [id]);
    
    if (result.changes === 0) {
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
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка удаления категории'
    });
  }
});

// Получить все статьи
router.get('/articles', async (req, res) => {
  try {
    const articles = await database.all(`
      SELECT id, title, type, category, content, 
             DATE(created_at) as date
      FROM knowledge_articles 
      ORDER BY created_at DESC
    `);
    
    res.json({
      success: true,
      data: articles
    });
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения статей'
    });
  }
});

// Получить статью по ID
router.get('/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const article = await database.get(`
      SELECT id, title, type, category, content, 
             DATE(created_at) as date
      FROM knowledge_articles 
      WHERE id = ?
    `, [id]);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Статья не найдена'
      });
    }
    
    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения статьи'
    });
  }
});

// Создать новую статью (только для админов)
router.post('/articles', adminAuth, async (req, res) => {
  try {
    const { title, type, category, content } = req.body;
    
    if (!title || !type || !category || !content) {
      return res.status(400).json({
        success: false,
        message: 'Все поля обязательны для заполнения'
      });
    }
    
    const result = await database.run(`
      INSERT INTO knowledge_articles (title, type, category, content)
      VALUES (?, ?, ?, ?)
    `, [title, type, category, content]);
    
    const newArticle = await database.get(`
      SELECT id, title, type, category, content,
             DATE(created_at) as date
      FROM knowledge_articles 
      WHERE id = ?
    `, [result.id]);
    
    res.status(201).json({
      success: true,
      message: 'Статья успешно создана',
      data: newArticle
    });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка создания статьи'
    });
  }
});

// Обновить статью (только для админов)
router.put('/articles/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, category, content } = req.body;
    
    if (!title || !type || !category || !content) {
      return res.status(400).json({
        success: false,
        message: 'Все поля обязательны для заполнения'
      });
    }
    
    const result = await database.run(`
      UPDATE knowledge_articles 
      SET title = ?, type = ?, category = ?, content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, type, category, content, id]);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Статья не найдена'
      });
    }
    
    const updatedArticle = await database.get(`
      SELECT id, title, type, category, content,
             DATE(created_at) as date
      FROM knowledge_articles 
      WHERE id = ?
    `, [id]);
    
    res.json({
      success: true,
      message: 'Статья успешно обновлена',
      data: updatedArticle
    });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка обновления статьи'
    });
  }
});

// Удалить статью (только для админов)
router.delete('/articles/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await database.run(`
      DELETE FROM knowledge_articles WHERE id = ?
    `, [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Статья не найдена'
      });
    }
    
    res.json({
      success: true,
      message: 'Статья успешно удалена'
    });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка удаления статьи'
    });
  }
});

// Очистить все статьи (только для админов)
router.delete('/articles', adminAuth, async (req, res) => {
  try {
    const result = await database.run(`DELETE FROM knowledge_articles`);
    
    res.json({
      success: true,
      message: `Удалено статей: ${result.changes}`
    });
  } catch (error) {
    console.error('Clear articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка очистки статей'
    });
  }
});

// Получить статистику
router.get('/stats', async (req, res) => {
  try {
    const categoriesCount = await database.get(`SELECT COUNT(*) as count FROM knowledge_categories`);
    const articlesCount = await database.get(`SELECT COUNT(*) as count FROM knowledge_articles`);
    
    res.json({
      success: true,
      data: {
        categories: categoriesCount.count,
        articles: articlesCount.count
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения статистики'
    });
  }
});

// Заглушки для остальных роутов
router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Knowledge API endpoint' });
});

module.exports = router;