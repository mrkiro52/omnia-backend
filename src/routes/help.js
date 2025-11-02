const express = require('express');
const router = express.Router();

// Заглушки для остальных роутов
router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Help API endpoint' });
});

module.exports = router;