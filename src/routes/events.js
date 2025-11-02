const express = require('express');
const router = express.Router();
const database = require('../models/database');
const adminAuth = require('../middleware/adminAuth');
const auth = require('../middleware/auth');

// Получить все события
router.get('/', async (req, res) => {
  try {
    const events = await database.all(`
      SELECT 
        id, 
        title, 
        description, 
        full_description,
        date, 
        time, 
        location, 
        image, 
        category, 
        organizer,
        created_at,
        updated_at
      FROM events 
      ORDER BY date ASC
    `);
    
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error loading events:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка загрузки событий',
      error: error.message 
    });
  }
});

// Получить событие по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await database.get(`
      SELECT 
        id, 
        title, 
        description, 
        full_description,
        date, 
        time, 
        location, 
        image, 
        category, 
        organizer,
        created_at,
        updated_at
      FROM events 
      WHERE id = ?
    `, [id]);
    
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Событие не найдено' 
      });
    }
    
    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Error loading event:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка загрузки события',
      error: error.message 
    });
  }
});

// Создать новое событие (только для админов)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      full_description,
      date, 
      time, 
      location, 
      image, 
      category, 
      organizer 
    } = req.body;
    
    if (!title || !date || !time) {
      return res.status(400).json({ 
        success: false, 
        message: 'Заполните обязательные поля: название, дата, время' 
      });
    }
    
    const result = await database.run(`
      INSERT INTO events (
        title, 
        description, 
        full_description,
        date, 
        time, 
        location, 
        image, 
        category, 
        organizer
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [title, description, full_description, date, time, location, image, category, organizer]);
    
    const newEvent = await database.get(`
      SELECT * FROM events WHERE id = ?
    `, [result.id]);
    
    res.status(201).json({ 
      success: true, 
      data: newEvent, 
      message: 'Событие успешно создано' 
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка создания события',
      error: error.message 
    });
  }
});

// Обновить событие (только для админов)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      full_description,
      date, 
      time, 
      location, 
      image, 
      category, 
      organizer 
    } = req.body;
    
    if (!title || !date || !time) {
      return res.status(400).json({ 
        success: false, 
        message: 'Заполните обязательные поля: название, дата, время' 
      });
    }
    
    const result = await database.run(`
      UPDATE events SET 
        title = ?, 
        description = ?, 
        full_description = ?,
        date = ?, 
        time = ?, 
        location = ?, 
        image = ?, 
        category = ?, 
        organizer = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, description, full_description, date, time, location, image, category, organizer, id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Событие не найдено' 
      });
    }
    
    const updatedEvent = await database.get(`
      SELECT * FROM events WHERE id = ?
    `, [id]);
    
    res.json({ 
      success: true, 
      data: updatedEvent, 
      message: 'Событие успешно обновлено' 
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка обновления события',
      error: error.message 
    });
  }
});

// Удалить событие (только для админов)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await database.run(`
      DELETE FROM events WHERE id = ?
    `, [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Событие не найдено' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Событие успешно удалено' 
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка удаления события',
      error: error.message 
    });
  }
});

// Проверить регистрацию пользователя на событие
router.get('/:id/check-registration', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const registration = await database.get(`
      SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?
    `, [id, userId]);
    
    res.json({ 
      success: true, 
      isRegistered: !!registration 
    });
  } catch (error) {
    console.error('Error checking registration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка проверки регистрации',
      error: error.message 
    });
  }
});

// Регистрация на событие
router.post('/:id/register', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    console.log('Event registration - Event ID:', id);
    console.log('Event registration - User from token:', req.user);
    console.log('Event registration - User ID:', userId);
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Не удалось определить пользователя' 
      });
    }
    
    // Проверяем, существует ли событие
    const event = await database.get(`
      SELECT * FROM events WHERE id = ?
    `, [id]);
    
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Событие не найдено' 
      });
    }
    
    // Проверяем, не зарегистрирован ли уже пользователь
    const existingRegistration = await database.get(`
      SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?
    `, [id, userId]);
    
    if (existingRegistration) {
      return res.status(400).json({ 
        success: false, 
        message: 'Вы уже зарегистрированы на это событие' 
      });
    }
    
    // Регистрируем пользователя
    await database.run(`
      INSERT INTO event_registrations (event_id, user_id) VALUES (?, ?)
    `, [id, userId]);
    
    res.json({ 
      success: true, 
      message: 'Вы успешно зарегистрированы на событие' 
    });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка регистрации на событие',
      error: error.message 
    });
  }
});

// Отмена регистрации на событие
router.delete('/:id/register', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await database.run(`
      DELETE FROM event_registrations WHERE event_id = ? AND user_id = ?
    `, [id, userId]);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Регистрация не найдена' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Регистрация отменена' 
    });
  } catch (error) {
    console.error('Error canceling registration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка отмены регистрации',
      error: error.message 
    });
  }
});

// Получить список зарегистрированных пользователей на событие (только для админов)
router.get('/:id/registrations', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const registrations = await database.all(`
      SELECT 
        u.id,
        u.name,
        u.surname,
        u.email,
        u.rank,
        u.avatar,
        er.created_at as registration_date
      FROM event_registrations er
      JOIN users u ON er.user_id = u.id
      WHERE er.event_id = ?
      ORDER BY er.created_at ASC
    `, [id]);
    
    res.json({ 
      success: true, 
      data: registrations,
      count: registrations.length 
    });
  } catch (error) {
    console.error('Error loading event registrations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка загрузки регистраций',
      error: error.message 
    });
  }
});

module.exports = router;