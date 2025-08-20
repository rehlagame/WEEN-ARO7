// File: api/index.js - ✅ نسخة محسنة: تستخدم MongoStore لتخزين الجلسات

import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import MongoStore from 'connect-mongo'; // ✨ 1. استيراد الحزمة الجديدة

import suggestionRoutes from './routes/suggestions.js';
import authRoutes from './routes/auth.routes.js';
import configurePassport from './config/passport.js';

// --- دالة مساعدة للتحقق من فترة الصيف ---
const isSummer = () => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    return (currentMonth === 5 && currentDay >= 15) || (currentMonth > 5 && currentMonth < 9) || (currentMonth === 9 && currentDay <= 25);
};

export const IS_SUMMER_PERIOD = isSummer();
if (IS_SUMMER_PERIOD) {
    console.log("☀️ It's summer! Outdoor activities will be excluded.");
}

const app = express();
app.use(express.json());

const mongoUri = process.env.MONGO_URI;

// ✨ 2. التحقق من وجود mongoUri قبل استخدامه في الجلسات
if (!mongoUri) {
    console.error('🔴 MONGO_URI not found in .env file. Cannot start session store.');
    process.exit(1); // إيقاف التطبيق إذا لم يكن رابط قاعدة البيانات موجودًا
}


// --- إعدادات الجلسات و Passport.js ---
app.use(cookieParser());

// ✨ 3. تعديل إعدادات الجلسة لاستخدام MongoStore
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: mongoUri,
        collectionName: 'sessions' // اسم الـ collection الذي سيتم تخزين الجلسات فيه
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true, // ممارسة أمنية جيدة
        maxAge: 1000 * 60 * 60 * 24 * 7 // صلاحية الكوكي لمدة 7 أيام
    }
}));


app.use(passport.initialize());
app.use(passport.session());

configurePassport(passport);
// -----------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '..', 'public')));

mongoose.connect(mongoUri)
    .then(() => console.log('✅ MongoDB connected successfully for API requests.'))
    .catch(err => console.error('🔴 MongoDB connection error:', err));


// تعريف المسارات
app.use('/api/auth', authRoutes);
app.use('/api/suggestions', suggestionRoutes);


if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Server running locally on http://localhost:${PORT}`));
}

export default app;