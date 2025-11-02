const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Импорт базы данных
const database = require('./models/database');

// Импорт роутов
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const usersRoutes = require('./routes/users');
const postsRoutes = require('./routes/posts');
const eventsRoutes = require('./routes/events');
const helpRoutes = require('./routes/help');
const knowledgeRoutes = require('./routes/knowledge');
const taskCategoriesRoutes = require('./routes/task-categories');
const tasksRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet()); // Безопасность
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://mrkiro52.github.io'
  ],
  credentials: true
}));
app.use(morgan('combined')); // Логирование
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/help', helpRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/task-categories', taskCategoriesRoutes);
app.use('/api/tasks', tasksRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'kiro.team.edu API'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// Инициализация базы данных и запуск сервера
async function startServer() {
  try {
    // Инициализация базы данных
    await database.init();

    // Запуск сервера
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 API Documentation: http://localhost:${PORT}/api/health`);
      console.log(`💾 Database: PostgreSQL`);
    });
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹️  Получен сигнал SIGINT. Завершаем работу...');
  try {
    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('Ошибка при закрытии БД:', error);
    process.exit(1);
  }
});

startServer();

module.exports = app;