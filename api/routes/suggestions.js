// File: api/routes/suggestions.js
// هذا الملف يحدد مسارات الـ API المتعلقة بالاقتراحات

import express from 'express';
import { getSuggestions } from '../controllers/suggestion.controller.js';

const router = express.Router();

// تعريف المسار: عندما يأتي طلب GET إلى المسار الجذري (/)
// (والذي هو في الحقيقة /api/suggestions بسبب الإعداد في index.js)
// سيتم تنفيذ دالة getSuggestions
router.get('/', getSuggestions);

export default router;