// File: api/controllers/auth.controller.js
// هذا المتحكم مسؤول عن إنشاء وإدارة جلسات المستخدمين المجهولين

import User from '../models/user.model.js';

// دالة ذكية للبحث عن مستخدم أو إنشائه إذا لم يكن موجودًا
export const handleAnonymousSession = async (req, res) => {
    try {
        let { anonymousId } = req.body;
        let user;

        if (anonymousId) {
            // حاول العثور على المستخدم بالـ ID الموجود
            user = await User.findById(anonymousId);
        }

        // إذا لم يتم العثور على المستخدم (إما لأن الـ ID غير صالح أو أنها زيارة أولى)
        if (!user) {
            user = new User(); // أنشئ مستخدمًا جديدًا بالقيم الافتراضية (نقطة واحدة)
            await user.save();
        }

        // أرسل بيانات المستخدم المحدثة إلى الواجهة الأمامية
        res.status(200).json({
            anonymousId: user._id,
            points: user.points,
        });

    } catch (error) {
        console.error('Error in anonymous session handling:', error);
        res.status(500).json({ message: 'خطأ في معالجة جلسة المستخدم.' });
    }
};