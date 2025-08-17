// File: api/index.js - ✅ نسخة مصححة: تستخدم الدالة المصدرة من passport.js

import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';

import suggestionRoutes from './routes/suggestions.js';
import authRoutes from './routes/auth.routes.js';

// ✨ الحل هنا: استيراد الدالة المُصدرة
import configurePassport from './config/passport.js';

// --- دالة مساعدة للتحقق من فترة الصيف ---
const isSummer = () => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    if ((currentMonth === 5 && currentDay >= 15) || (currentMonth > 5 && currentMonth < 9) || (currentMonth === 9 && currentDay <= 25)) {
        return true;
    }
    return false;
};

export const IS_SUMMER_PERIOD = isSummer();
if (IS_SUMMER_PERIOD) {
    console.log("☀️ It's summer! Outdoor activities will be excluded.");
}

const app = express();
app.use(express.json());

// --- إعدادات الجلسات و Passport.js ---
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(passport.initialize());
app.use(passport.session());

// ✨ الحل هنا: تشغيل الدالة وتمرير كائن passport إليها
// هذا يضمن أن يتم تكوين Passport بعد تحميل كل شيء آخر.
configurePassport(passport);
// -----------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '..', 'public')));

const mongoUri = process.env.MONGO_URI;
if (mongoUri) {
    mongoose.connect(mongoUri)
        .then(() => console.log('✅ MongoDB connected successfully for API requests.'))
        .catch(err => console.error('🔴 MongoDB connection error:', err));
} else {
    console.warn('⚠️ MONGO_URI not found in .env file.');
}

// تعريف المسارات
app.use('/api/auth', authRoutes);
app.use('/api/suggestions', suggestionRoutes);


if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Server running locally on http://localhost:${PORT}`));
}

export default app;