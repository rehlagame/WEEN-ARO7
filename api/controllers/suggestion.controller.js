// File: api/controllers/suggestion.controller.js
// ✅ نسخة محسنة: تتعامل بذكاء مع المستخدمين المسجلين والمجهولين

import Place from '../models/place.model.js';
import User from '../models/user.model.js';
import { IS_SUMMER_PERIOD } from '../index.js';
import fetch from 'node-fetch';

const categorySearchTerms = {
    'مقهى متخصص': 'aesthetic coffee shop kuwait',
    'مطعم إيطالي': 'italian food pasta pizza',
    'مطعم كويتي': 'kuwaiti food traditional',
    'مطعم آسيوي': 'asian food sushi',
    'مطعم أمريكي': 'burger fries restaurant',
    'مطعم فطور وعائلي': 'breakfast brunch cafe',
    'مجمع تجاري': 'shopping mall interior kuwait',
    'ترفيه ونشاط': 'kuwait entertainment fun activity',
    'معلم سياحي': 'kuwait landmark travel',
};

async function getPlaceImage(place) {
    if (place.imageUrl && place.imageUrl.trim() !== '') {
        return place.imageUrl;
    }
    try {
        const query = `${place.name} ${categorySearchTerms[place.category] || 'kuwait'}`;
        const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`, {
            headers: { Authorization: process.env.PEXELS_API_KEY }
        });
        if (!response.ok) {
            console.error(`Pexels API error: ${response.status} ${response.statusText}`);
            throw new Error('Pexels API request failed');
        }
        const data = await response.json();
        if (data.photos && data.photos.length > 0) {
            const fetchedUrl = data.photos[0].src.large;
            await Place.findByIdAndUpdate(place._id, { imageUrl: fetchedUrl });
            return fetchedUrl;
        }
    } catch (error) {
        console.error("Pexels API error:", error);
    }
    const fallbackSearchTerm = (categorySearchTerms[place.category] || 'kuwait city').replace(/ /g, ',');
    return `https://source.unsplash.com/400x300/?${fallbackSearchTerm}&sig=${Math.random()}`;
}

const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
};

export const getSuggestions = async (req, res) => {
    try {
        const { userType, interests, exclude, anonymousId, spendPoints } = req.query;

        // ✨ --- المنطق الجديد لتحديد المستخدم ---
        let user;
        if (req.user) {
            // 1. إذا كان المستخدم مسجلاً دخوله (من Passport)، استخدم `req.user`
            user = req.user;
        } else if (anonymousId) {
            // 2. إذا لم يكن مسجلاً، ابحث عن المستخدم المجهول
            user = await User.findById(anonymousId);
        }

        // 3. إذا لم يتم العثور على أي مستخدم، أرسل خطأ
        if (!user) {
            return res.status(401).json({ message: 'المعرّف غير موجود، يرجى تحديث الصفحة.' });
        }
        // -----------------------------------------

        // 1. إذا كان يوماً جديداً، قم بإعادة تعيين المحاولات اليومية
        if (!isSameDay(user.lastSuggestionDate, new Date())) {
            user.dailyAttempts = 3;
        }

        // 2. التحقق مما إذا كان المستخدم قد استنفد محاولاته
        if (user.dailyAttempts <= 0) {
            if (spendPoints !== 'true') {
                return res.status(429).json({
                    message: `لقد استهلكت محاولاتك اليومية (3). عُد غدًا أو استخدم 3 نقاط للمزيد.`,
                    canSpendPoints: user.points >= 3
                });
            }
            if (user.points < 3) {
                return res.status(403).json({ message: 'ليس لديك نقاط كافية!' });
            }
            user.points -= 3;
        } else {
            user.dailyAttempts -= 1;
        }

        const query = { isActive: true };
        if (userType) query.suitableFor = userType;
        if (interests) query.category = { $in: interests.split(',') };
        if (exclude) {
            const excludedIds = exclude.split(',');
            query._id = { $nin: excludedIds };
        }
        if (IS_SUMMER_PERIOD) {
            const outdoorCategories = ['معلم سياحي', 'ترفيه ونشاط'];
            const outdoorKeywords = /شاطئ|حديقة|جزيرة|هواء طلق|ألعاب مائية/i;
            query.$and = [
                { category: { $nin: outdoorCategories.filter(c => c === 'معلم سياحي') } },
                { $or: [ { category: { $ne: 'ترفيه ونشاط' } }, { description: { $not: outdoorKeywords } }] }
            ];
        }

        const matchedPlaces = await Place.find(query)
            .select('name category description googleMapsUrl imageUrl')
            .lean();

        if (matchedPlaces.length < 2) {
            return res.status(404).json({ message: 'لا توجد أماكن جديدة كافية تطابق تفضيلاتك حاليًا.' });
        }

        const suggestions = [];
        const usedIndexes = new Set();
        while (suggestions.length < 2 && suggestions.length < matchedPlaces.length) {
            const randomIndex = Math.floor(Math.random() * matchedPlaces.length);
            if (!usedIndexes.has(randomIndex)) {
                suggestions.push(matchedPlaces[randomIndex]);
                usedIndexes.add(randomIndex);
            }
        }

        const suggestionsWithImages = await Promise.all(
            suggestions.map(async (place) => {
                const imageUrl = await getPlaceImage(place);
                return { ...place, imageUrl };
            })
        );

        user.lastSuggestionDate = new Date();
        if (spendPoints !== 'true') {
            user.points += 1;
        }
        await user.save();

        res.status(200).json({
            suggestions: suggestionsWithImages,
            points: user.points,
            dailyAttempts: user.dailyAttempts
        });

    } catch (error) {
        console.error('Error fetching suggestions:', error);
        res.status(500).json({ message: 'حدث خطأ أثناء جلب الاقتراحات.' });
    }
};