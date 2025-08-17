// File: api/models/user.model.js
// ✅ نسخة محسنة: تدعم المستخدمين المجهولين والمسجلين عبر Google

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        // --- حقول للمستخدمين المسجلين (Google, Apple, etc.) ---
        googleId: {
            type: String,
            unique: true,
            sparse: true // مهم: يسمح بوجود مستخدمين مجهولين (بدون googleId)
        },
        displayName: {
            type: String
        },
        email: {
            type: String
        },
        avatar: {
            type: String
        },

        // --- حقول مشتركة لجميع المستخدمين ---
        points: {
            type: Number,
            default: 1,
        },
        lastSuggestionDate: {
            type: Date,
            default: null,
        },
        dailyAttempts: {
            type: Number,
            default: 3, // يبدأ المستخدم بـ 3 محاولات
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;