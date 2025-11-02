const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Временное хранилище постов
let posts = [
  {
    id: 1,
    author: {
      name: 'Анна Смирнова',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face'
    },
    category: 'Frontend',
    title: 'Лучшие практики работы с React Hooks',
    content: 'Поделюсь своими наблюдениями по работе с хуками в React...',
    likes: 24,
    comments: 8,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isLiked: false,
    commentsData: []
  }
];

// Получить все посты
router.get('/', (req, res) => {
  try {
    const { category } = req.query;
    
    let filteredPosts = posts;
    if (category && category !== 'Все') {
      filteredPosts = posts.filter(post => post.category === category);
    }

    res.json({
      success: true,
      data: filteredPosts
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
router.post('/', auth, (req, res) => {
  try {
    const { title, content, category } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Контент поста не может быть пустым'
      });
    }

    const newPost = {
      id: posts.length + 1,
      author: {
        name: 'Вы',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      },
      category: category || 'Frontend',
      title: title || 'Новый пост',
      content,
      likes: 0,
      comments: 0,
      timestamp: new Date().toISOString(),
      isLiked: false,
      commentsData: []
    };

    posts.unshift(newPost);

    res.status(201).json({
      success: true,
      message: 'Пост успешно создан',
      data: newPost
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
router.post('/:id/like', auth, (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const post = posts.find(p => p.id === postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Пост не найден'
      });
    }

    post.isLiked = !post.isLiked;
    post.likes += post.isLiked ? 1 : -1;

    res.json({
      success: true,
      message: post.isLiked ? 'Лайк добавлен' : 'Лайк убран',
      data: { likes: post.likes, isLiked: post.isLiked }
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
router.post('/:id/comments', auth, (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { content } = req.body;
    const post = posts.find(p => p.id === postId);

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

    const newComment = {
      id: Date.now(),
      author: {
        name: 'Вы',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      },
      content,
      timestamp: new Date().toISOString()
    };

    if (!post.commentsData) {
      post.commentsData = [];
    }
    
    post.commentsData.push(newComment);
    post.comments = post.commentsData.length;

    res.status(201).json({
      success: true,
      message: 'Комментарий добавлен',
      data: newComment
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