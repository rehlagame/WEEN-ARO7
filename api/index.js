// File: api/index.js - ✅ نسخة نهائية ومحسنة للإنتاج

import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import MongoStore from 'connect-mongo';

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

if (!mongoUri) {
    console.error('🔴 MONGO_URI not found in .env file. Cannot start session store.');
    process.exit(1);
}

// --- إعدادات الجلسات و Passport.js (محسنة للإنتاج) ---
const isProduction = process.env.NODE_ENV === 'production';

app.use(cookieParser());

// ✨ Vercel يعمل كـ proxy, هذا الإعداد ضروري ليعمل الكوكي بشكل صحيح على HTTPS
if (isProduction) {
    app.set('trust proxy', 1);
}

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: mongoUri,
        collectionName: 'sessions'
    }),
    cookie: {
        secure: isProduction, // true في الإنتاج (Vercel), false في التطوير المحلي
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 أيام
        // ✨ هذا الإعداد مهم جدًا لعملية إعادة التوجيه من Google
        sameSite: isProduction ? 'lax' : undefined
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