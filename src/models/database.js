const { Pool } = require('pg');

// Конфигурация PostgreSQL
const DB_CONFIG = {
  user: 'admin',
  host: 'dpg-d43dafuuk2gs738vqefg-a.oregon-postgres.render.com',
  database: 'mydb_ktil',
  password: 'z0IjwNQi97Hg0lHqOjrNaNBEMmkc9AgE',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
};

// Функция для автоматического расчета ранга
function calculateRank(joinDate) {
  const joinDateObj = new Date(joinDate);
  const currentDate = new Date();
  const diffTime = Math.abs(currentDate - joinDateObj);
  const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44)); // Примерно 30.44 дня в месяце

  if (diffMonths < 1) {
    return 'Новичок';
  } else if (diffMonths >= 1 && diffMonths < 3) {
    return 'Ученик';
  } else if (diffMonths >= 3 && diffMonths < 6) {
    return 'Исследователь';
  } else if (diffMonths >= 6 && diffMonths < 12) {
    return 'Мастер';
  } else {
    return 'Легенда';
  }
}

class Database {
  constructor() {
    this.pool = new Pool(DB_CONFIG);
  }

  // Подключение к базе данных
  async connect() {
    try {
      const client = await this.pool.connect();
      console.log('✅ Подключено к PostgreSQL базе данных');
      client.release();
    } catch (err) {
      console.error('Ошибка подключения к базе данных:', err.message);
      throw err;
    }
  }

  // Инициализация таблиц
  async init() {
    try {
      await this.connect();
      await this.createTables();
      console.log('🎉 База данных инициализирована');
    } catch (error) {
      console.error('Ошибка инициализации базы данных:', error);
      throw error;
    }
  }

  // Создание таблиц
  async createTables() {
    const tables = [
      // Таблица пользователей
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        surname VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar TEXT,
        phone VARCHAR(20),
        bio TEXT,
        rank VARCHAR(50) DEFAULT 'Новичок',
        join_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Таблица постов
      `CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title VARCHAR(255),
        content TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,

      // Таблица лайков
      `CREATE TABLE IF NOT EXISTS post_likes (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,

      // Таблица комментариев
      `CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,

      // Таблица событий
      `CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        full_description TEXT,
        date DATE NOT NULL,
        time TIME NOT NULL,
        location TEXT,
        image TEXT,
        category VARCHAR(100),
        organizer VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Таблица регистраций на события
      `CREATE TABLE IF NOT EXISTS event_registrations (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, user_id),
        FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,

      // Таблица менторов
      `CREATE TABLE IF NOT EXISTS mentors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        specialization VARCHAR(255) NOT NULL,
        experience TEXT,
        photo TEXT,
        description TEXT,
        skills TEXT, -- JSON строка с навыками
        rating DECIMAL(3,2) DEFAULT 0,
        reviews INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Таблица запросов помощи
      `CREATE TABLE IF NOT EXISTS help_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        mentor_id INTEGER NOT NULL,
        topic VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (mentor_id) REFERENCES mentors (id) ON DELETE CASCADE
      )`,

      // Таблица категорий базы знаний
      `CREATE TABLE IF NOT EXISTS knowledge_categories (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Таблица материалов базы знаний
      `CREATE TABLE IF NOT EXISTS knowledge_materials (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL, -- lesson, course, material
        url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES knowledge_categories (id) ON DELETE CASCADE
      )`,

      // Таблица статей базы знаний
      `CREATE TABLE IF NOT EXISTS knowledge_articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'lesson', -- lesson, course, guide, article
        category VARCHAR(100) NOT NULL, -- programming, design, career, tools
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Таблица категорий задач
      `CREATE TABLE IF NOT EXISTS task_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(255),
        color VARCHAR(7),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Таблица задач
      `CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL,
        difficulty VARCHAR(50) NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        solution TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES task_categories (id) ON DELETE CASCADE
      )`
    ];

    try {
      for (const sql of tables) {
        await this.pool.query(sql);
      }
      console.log('✅ Все таблицы созданы');
    } catch (error) {
      console.error('Ошибка создания таблиц:', error);
      throw error;
    }
  }

  // Выполнение SQL запроса
  async run(sql, params = []) {
    try {
      const result = await this.pool.query(sql, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount,
        insertId: result.rows[0]?.id
      };
    } catch (error) {
      console.error('Ошибка выполнения запроса:', error);
      throw error;
    }
  }

  // Получение одной записи
  async get(sql, params = []) {
    try {
      const result = await this.pool.query(sql, params);
      return result.rows[0];
    } catch (error) {
      console.error('Ошибка получения записи:', error);
      throw error;
    }
  }

  // Получение всех записей
  async all(sql, params = []) {
    try {
      const result = await this.pool.query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('Ошибка получения записей:', error);
      throw error;
    }
  }

  // Закрытие соединения
  async close() {
    try {
      await this.pool.end();
      console.log('🔒 Соединение с базой данных закрыто');
    } catch (error) {
      console.error('Ошибка закрытия соединения:', error);
      throw error;
    }
  }

  // Метод для расчета ранга пользователя
  calculateRank(joinDate) {
    return calculateRank(joinDate);
  }
}

// Экспорт singleton экземпляра
const database = new Database();
module.exports = database;