const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const database = require('../models/database');

// Получить все посты
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = `
      SELECT p.*, u.name, u.surname, u.avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `;
    let params = [];

    if (category && category !== 'Все') {
      query = `
        SELECT p.*, u.name, u.surname, u.avatar
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.category = $1
        ORDER BY p.created_at DESC
      `;
      params = [category];
    }

    const posts = await database.all(query, params);

    const formattedPosts = posts.map(post => ({
      id: post.id,
      author: {
        name: `${post.name} ${post.surname}`,
        avatar: post.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(`${post.name} ${post.surname}`) + '&background=6366f1&color=fff'
      },
      category: post.category,
      title: post.title || 'Без заголовка',
      content: post.content,
      likes: post.likes || 0,
      comments: 0, // TODO: подсчитать комментарии
      timestamp: post.created_at,
      isLiked: false // TODO: проверить лайк пользователя
    }));

    res.json({
      success: true,
      data: formattedPosts
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения постов'
    });
  }
});

// Создать новый пост
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const userId = req.user.userId;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Контент поста не может быть пустым'
      });
    }

    const result = await database.run(`
      INSERT INTO posts (user_id, title, content, category)
      VALUES ($1, $2, $3, $4) RETURNING id
    `, [userId, title || 'Новый пост', content, category || 'Frontend']);

    // Получаем созданный пост с информацией о пользователе
    const newPost = await database.get(`
      SELECT p.*, u.name, u.surname, u.avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [result.rows[0].id]);

    const formattedPost = {
      id: newPost.id,
      author: {
        name: `${newPost.name} ${newPost.surname}`,
        avatar: newPost.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(`${newPost.name} ${newPost.surname}`) + '&background=6366f1&color=fff'
      },
      category: newPost.category,
      title: newPost.title,
      content: newPost.content,
      likes: newPost.likes || 0,
      comments: 0,
      timestamp: newPost.created_at,
      isLiked: false
    };

    res.status(201).json({
      success: true,
      message: 'Пост успешно создан',
      data: formattedPost
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка создания поста'
    });
  }
});

// Лайк/дизлайк поста
router.post('/:id/like', auth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user.userId;

    // Проверяем, существует ли пост
    const post = await database.get('SELECT * FROM posts WHERE id = $1', [postId]);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Пост не найден'
      });
    }

    // Проверяем, лайкал ли пользователь этот пост
    const existingLike = await database.get(
      'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    let isLiked;
    if (existingLike) {
      // Убираем лайк
      await database.run('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
      await database.run('UPDATE posts SET likes = likes - 1 WHERE id = $1', [postId]);
      isLiked = false;
    } else {
      // Добавляем лайк
      await database.run(
        'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)',
        [postId, userId]
      );
      await database.run('UPDATE posts SET likes = likes + 1 WHERE id = $1', [postId]);
      isLiked = true;
    }

    // Получаем обновленное количество лайков
    const updatedPost = await database.get('SELECT likes FROM posts WHERE id = $1', [postId]);

    res.json({
      success: true,
      message: isLiked ? 'Лайк добавлен' : 'Лайк убран',
      data: { likes: updatedPost.likes, isLiked }
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка обработки лайка'
    });
  }
});

// Добавить комментарий
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { content } = req.body;
    const userId = req.user.userId;

    // Проверяем, существует ли пост
    const post = await database.get('SELECT * FROM posts WHERE id = $1', [postId]);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Пост не найден'
      });
    }

    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Комментарий не может быть пустым'
      });
    }

    // Добавляем комментарий
    const result = await database.run(`
      INSERT INTO comments (post_id, user_id, content)
      VALUES ($1, $2, $3) RETURNING id
    `, [postId, userId, content]);

    // Получаем комментарий с информацией о пользователе
    const newComment = await database.get(`
      SELECT c.*, u.name, u.surname, u.avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `, [result.rows[0].id]);

    const formattedComment = {
      id: newComment.id,
      author: {
        name: `${newComment.name} ${newComment.surname}`,
        avatar: newComment.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(`${newComment.name} ${newComment.surname}`) + '&background=6366f1&color=fff'
      },
      content: newComment.content,
      timestamp: newComment.created_at
    };

    res.status(201).json({
      success: true,
      message: 'Комментарий добавлен',
      data: formattedComment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка добавления комментария'
    });
  }
});

module.exports = router;