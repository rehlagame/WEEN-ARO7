// File: api/config/passport.js
// ✅ نسخة مصححة ونهائية: تم تثبيت رابط الـ callbackURL بشكل كامل

import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import mongoose from 'mongoose';
import User from '../models/user.model.js';

// ✨ تغليف كل المنطق في دالة نقوم بتصديرها
export default function(passport) {
    // --- 1. Serialize & Deserialize User ---
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });

    // --- 2. Google OAuth 2.0 Strategy ---
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                // ✨✨✨ الحل النهائي هنا ✨✨✨
                // نستخدم الرابط الكامل لضمان استخدام بروتوكول HTTPS دائمًا على Vercel
                // وتجنب خطأ redirect_uri_mismatch
                callbackURL: `${process.env.BASE_URL}/api/auth/google/callback`,
                passReqToCallback: true,
            },
            async (req, accessToken, refreshToken, profile, done) => {
                try {
                    let existingUser = await User.findOne({ googleId: profile.id });

                    if (existingUser) {
                        return done(null, existingUser);
                    }

                    const newUser = new User({
                        googleId: profile.id,
                        displayName: profile.displayName,
                        email: profile.emails && profile.emails[0].value,
                        avatar: profile.photos && profile.photos[0].value,
                    });

                    if (req.session.anonymousId) {
                        const anonymousUser = await User.findById(req.session.anonymousId);
                        if (anonymousUser) {
                            console.log(`Merging anonymous user ${anonymousUser._id} into new Google user.`);
                            newUser.points = anonymousUser.points;
                            newUser.dailyAttempts = anonymousUser.dailyAttempts;
                            await User.findByIdAndDelete(req.session.anonymousId);
                        }
                        delete req.session.anonymousId;
                    }

                    await newUser.save();
                    done(null, newUser);

                } catch (err) {
                    console.error('Error in Google Strategy:', err);
                    done(err, null);
                }
            }
        )
    );
}