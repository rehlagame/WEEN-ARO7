// File: api/routes/auth.routes.js
// ✅ نسخة محسنة: تدعم المصادقة عبر Google ودمج الحسابات المجهولة

import express from 'express';
import passport from 'passport';
import { handleAnonymousSession } from '../controllers/auth.controller.js';

const router = express.Router();

// --- المسارات الحالية للمستخدم المجهول ---
router.post('/session', handleAnonymousSession);

// --- المسارات الجديدة للمصادقة عبر Google ---

// 1. مسار بدء عملية تسجيل الدخول (عندما يضغط المستخدم على زر "تسجيل الدخول بقوقل")
// ✨ تم التعديل: هذا المسار الآن يقبل anonymousId ويخزنه في الجلسة
router.get('/google', (req, res, next) => {
    const { anonymousId } = req.query;
    if (anonymousId) {
        // تخزين الـ ID المجهول في الجلسة لنستخدمه لاحقًا في ملف passport.js
        req.session.anonymousId = anonymousId;
    }
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })(req, res, next);
});

// 2. المسار الذي يعود إليه Google بعد المصادقة الناجحة
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }), // إذا فشل، يعود للصفحة الرئيسية
    (req, res) => {
        // إذا نجح، أعد توجيهه للصفحة الرئيسية (سيكون مسجلاً دخوله الآن)
        res.redirect('/');
    }
);

// 3. مسار للتحقق من حالة تسجيل الدخول (مهم جدًا للواجهة الأمامية)
router.get('/me', (req, res) => {
    if (req.user) {
        // إذا كان المستخدم مسجلاً، أرسل بياناته
        res.status(200).json(req.user);
    } else {
        // إذا لم يكن مسجلاً، أرسل خطأ
        res.status(401).json({ message: 'User not authenticated' });
    }
});

// 4. مسار تسجيل الخروج
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
});


export default router;