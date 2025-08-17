// File: api/models/place.model.js
// ✅ نسخة محسنة: تمت إضافة حقل imageUrl وفهرس لرفع كفاءة البحث

import mongoose from 'mongoose';

const placeSchema = new mongoose.Schema(
    {
        // استخدمنا custom ID ليتوافق مع البيانات الأولية، لكن في لوحة التحكم سنعتمد على _id التلقائي
        id: {
            type: Number,
            required: true,
            unique: true, // يضمن عدم وجود مكانين بنفس الرقم
        },
        name: {
            type: String,
            required: [true, 'اسم المكان مطلوب.'], // رسالة خطأ مخصصة
            trim: true, // يزيل أي مسافات فارغة في البداية أو النهاية
        },
        category: {
            type: String,
            required: [true, 'فئة المكان مطلوبة.'],
            // نحدد الفئات المسموح بها لضمان تناسق البيانات
            enum: [
                'معلم سياحي',
                'مجمع تجاري',
                'ترفيه ونشاط',
                'مقهى متخصص',
                'مطعم كويتي',
                'مطعم إيطالي',
                'مطعم آسيوي',
                'مطعم أمريكي',
                'مطعم فطور وعائلي',
            ],
        },
        description: {
            type: String,
            required: [true, 'وصف المكان مطلوب.'],
            maxlength: [250, 'الوصف يجب ألا يتجاوز 250 حرفًا.'],
        },
        locationName: {
            type: String,
            required: true,
        },
        googleMapsUrl: {
            type: String,
            required: true,
        },
        // ✨ حقل جديد لدعم التخزين المؤقت للصور (Caching)
        imageUrl: {
            type: String,
            default: '',
        },
        // سنستخدم هذا الحقل لتخزين أسماء ملفات الصور على خدمة تخزين سحابية
        images: {
            type: [String],
            default: [], // القيمة الافتراضية هي مصفوفة فارغة
        },
        tags: [String], // مصفوفة من الكلمات المفتاحية للبحث
        suitableFor: {
            type: [String],
            enum: ['individual', 'couple', 'family', 'group'], // نحدد الخيارات المتاحة
            default: ['individual', 'group'],
        },
        events: [String], // للربط مع الأحداث الموسمية

        // حقول إضافية للمستقبل (لوحة التحكم)
        isActive: {
            type: Boolean,
            default: true, // هل المكان نشط ويظهر في الاقتراحات؟
        },
        priority: {
            type: Number,
            default: 0, // يمكن استخدامه لإعطاء أولوية لبعض الأماكن في الظهور
            min: 0,
            max: 10
        }
    },
    {
        // إعدادات إضافية للمخطط
        timestamps: true, // يضيف حقلي `createdAt` و `updatedAt` تلقائيًا
        versionKey: false // يزيل حقل `__v` غير الضروري
    }
);

// ✨ تحسين الأداء (الأهم): إضافة فهرس مركب للحقول المستخدمة بكثرة في البحث.
// هذا يسرّع بشكل هائل من عملية الفلترة عند نمو قاعدة البيانات.
placeSchema.index({ category: 1, suitableFor: 1, isActive: 1 });


// لمنع Mongoose من إعادة تعريف الموديل في كل مرة يتم فيها استدعاء الكود (مهم لـ Vercel)
const Place = mongoose.models.Place || mongoose.model('Place', placeSchema);

export default Place;