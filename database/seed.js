// File: database/seed.js
// هذا السكربت مخصص لتعبئة قاعدة البيانات بالبيانات الأولية.
// يتم تشغيله مرة واحدة يدوياً باستخدام الأمر: npm run db:seed

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { initialPlaces } from './places-data.js'; // 1. استيراد بياناتنا
import Place from '../api/models/place.model.js'; // 2. استيراد موديل المكان

// تحميل متغيرات البيئة من ملف .env
dotenv.config();

const seedDatabase = async () => {
    // 3. التحقق من وجود رابط قاعدة البيانات
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('🔴 خطأ: لم يتم العثور على رابط قاعدة البيانات (MONGO_URI) في ملف .env');
        process.exit(1); // الخروج من السكربت إذا لم يوجد الرابط
    }

    try {
        // 4. الاتصال بقاعدة البيانات
        await mongoose.connect(mongoUri);
        console.log('✅ تم الاتصال بقاعدة بيانات MongoDB بنجاح!');

        // 5. حذف جميع الأماكن الموجودة لتجنب التكرار
        await Place.deleteMany({});
        console.log('🧹 تم حذف البيانات القديمة من مجموعة الأماكن.');

        // 6. إدخال البيانات الجديدة من ملف places-data.js
        await Place.insertMany(initialPlaces);
        console.log(`🎉 نجاح! تم إضافة ${initialPlaces.length} مكان جديد إلى قاعدة البيانات.`);

    } catch (error) {
        console.error('🔴 فشل في تعبئة قاعدة البيانات:', error);
    } finally {
        // 7. إغلاق الاتصال بقاعدة البيانات في كل الأحوال
        await mongoose.connection.close();
        console.log('🔌 تم إغلاق الاتصال بقاعدة البيانات.');
    }
};

// 8. تشغيل الدالة
seedDatabase();