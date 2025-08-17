// File: public/js/main.js
// ✅ نسخة محسنة: تعالج خطأ 401 بهدوء عند التحقق من المستخدم

// --- 1. DOM Element Selection ---
const preferencesForm = document.getElementById('preferences-form');
const submitButton = preferencesForm.querySelector('button[type="submit"]');
const resultsSection = document.getElementById('results-section');
const suggestionsContainer = document.getElementById('suggestions-container');
const loader = document.getElementById('loader');
const pointsContainer = document.getElementById('points-container');
const pointsBalanceSpan = document.getElementById('points-balance');
const attemptsContainer = document.getElementById('attempts-container');
const attemptsBalanceSpan = document.getElementById('attempts-balance');
const systemMessageContainer = document.getElementById('system-message-container');
const authContainer = document.getElementById('auth-container');
const googleLoginBtn = document.getElementById('google-login-btn');
const userProfile = document.getElementById('user-profile');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');

// --- 2. State Management ---
let state = {
    anonymousId: null,
    isUserAuthenticated: false,
    points: 0,
    dailyAttempts: 0,
    isLoading: false,
};

// --- 3. Event Listeners ---
document.addEventListener('DOMContentLoaded', initializeApp);
preferencesForm.addEventListener('submit', handleFormSubmit);

// --- 4. Initialization ---
async function initializeApp() {
    try {
        const response = await fetch('/api/auth/me');
        // ✨ الحل هنا: التحقق من `response.ok` بدلاً من الاعتماد على try/catch فقط
        if (response.ok) {
            const user = await response.json();
            setupAuthenticatedUI(user);
        } else {
            // إذا كانت الاستجابة غير ناجحة (مثل 401)، لا يعتبر خطأً فادحًا، بل يعني أن المستخدم زائر
            if (response.status !== 401) {
                // نطبع الأخطاء الأخرى فقط إذا لم تكن 401
                console.warn('Could not verify user status:', response.statusText);
            }
            await initializeAnonymousSession();
        }
    } catch (error) {
        // هذا القسم سيعمل فقط إذا كان هناك خطأ في الشبكة (مثل انقطاع الإنترنت)
        console.error("Network error during initialization:", error);
        await initializeAnonymousSession();
    }
    loadPreferences();
}

function setupAuthenticatedUI(user) {
    state.isUserAuthenticated = true;
    state.anonymousId = null;
    localStorage.removeItem('wainArouh_anonymousId');
    authContainer.classList.add('hidden');
    userProfile.classList.remove('hidden');
    userAvatar.src = user.avatar || 'assets/images/default-avatar.png';
    userName.textContent = user.displayName;
    updatePointsUI(user.points);
}

async function initializeAnonymousSession() {
    state.isUserAuthenticated = false;
    try {
        const storedId = localStorage.getItem('wainArouh_anonymousId');
        const response = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anonymousId: storedId })
        });
        if (!response.ok) throw new Error('Failed to initialize session');
        const userData = await response.json();
        state.anonymousId = userData.anonymousId;
        state.points = userData.points;
        localStorage.setItem('wainArouh_anonymousId', state.anonymousId);
        updatePointsUI(state.points);
        googleLoginBtn.href = `/api/auth/google?anonymousId=${state.anonymousId}`;
    } catch (error) {
        console.error("Anonymous Session Error:", error);
        googleLoginBtn.href = '/api/auth/google';
    }
}

// --- 5. Core Functions ---
async function handleFormSubmit(event) {
    event.preventDefault();
    if (state.isLoading) return;
    const userType = document.querySelector('input[name="userType"]:checked').value;
    const selectedInterest = document.querySelector('input[name="interest"]:checked').value;
    savePreferences(userType, selectedInterest);
    await getAndDisplaySuggestions(false);
}

async function getAndDisplaySuggestions(isSpendingPoints = false) {
    setLoading(true);
    showLoadingAndScroll();
    try {
        const data = await fetchSuggestions(isSpendingPoints);
        displaySuggestions(data.suggestions);
        updatePointsUI(data.points);
        updateAttemptsUI(data.dailyAttempts);
    } catch (error) {
        if (error.statusCode === 429) {
            displaySystemMessage(error.message, error.canSpendPoints);
        } else {
            displayError(error.message);
        }
    } finally {
        setLoading(false);
    }
}

async function fetchSuggestions(spendPoints = false) {
    if (!state.isUserAuthenticated && !state.anonymousId) {
        throw new Error('لا يمكن طلب اقتراحات بدون معرّف. يرجى تحديث الصفحة.');
    }
    const userType = document.querySelector('input[name="userType"]:checked').value;
    const interest = document.querySelector('input[name="interest"]:checked').value;
    const recentlySuggested = JSON.parse(localStorage.getItem('wainArouh_history')) || [];
    const excludeQuery = recentlySuggested.join(',');
    let apiUrl = `/api/suggestions?userType=${userType}&interests=${encodeURIComponent(interest)}&exclude=${excludeQuery}`;
    if (state.anonymousId) {
        apiUrl += `&anonymousId=${state.anonymousId}`;
    }
    if (spendPoints) {
        apiUrl += '&spendPoints=true';
    }
    const response = await fetch(apiUrl);
    const data = await response.json();
    if (!response.ok) {
        const err = new Error(data.message || 'حدث خطأ ما.');
        err.statusCode = response.status;
        err.canSpendPoints = data.canSpendPoints;
        throw err;
    }
    return data;
}

// --- 6. UI Rendering ---
function setLoading(isLoading) {
    state.isLoading = isLoading;
    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? 'جاري البحث...' : 'اكتشف وجهتك اليوم!';
}

function showLoadingAndScroll() {
    resultsSection.classList.remove('hidden');
    suggestionsContainer.innerHTML = '';
    systemMessageContainer.innerHTML = '';
    systemMessageContainer.classList.add('hidden');
    loader.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function displaySuggestions(suggestions) {
    loader.classList.add('hidden');
    if (!suggestions || suggestions.length === 0) {
        displayError('لم نجد اقتراحات جديدة تطابق اختيارك. قد تكون شاهدت كل شيء!');
        return;
    }
    updateHistory(suggestions);
    suggestionsContainer.innerHTML = '';
    suggestions.forEach(place => {
        const card = document.createElement('div');
        card.className = 'suggestion-card';
        const imageDiv = document.createElement('div');
        imageDiv.className = 'suggestion-card-image';
        const contentDiv = document.createElement('div');
        contentDiv.className = 'suggestion-card-content';
        imageDiv.style.backgroundImage = `url('${place.imageUrl}')`;
        contentDiv.innerHTML = `
            <span class="category">${place.category}</span>
            <h3>${place.name}</h3>
            <p>${place.description}</p>
            <a href="${place.googleMapsUrl}" target="_blank" class="cta-button">عرض على الخريطة</a>
        `;
        card.appendChild(imageDiv);
        card.appendChild(contentDiv);
        suggestionsContainer.appendChild(card);
    });
}

function displayError(message) {
    loader.classList.add('hidden');
    suggestionsContainer.innerHTML = `<p class="error-message">${message}</p>`;
}

function displaySystemMessage(message, canSpend) {
    loader.classList.add('hidden');
    systemMessageContainer.classList.remove('hidden');
    let buttonHtml = canSpend
        ? `<button id="spend-points-btn" class="main-button spend-points-button">محاولة أخرى (3 <i class="fas fa-star"></i>)</button>`
        : `<button class="main-button spend-points-button" disabled>لا توجد نقاط كافية</button>`;
    systemMessageContainer.innerHTML = `
        <div class="system-message-card">
            <p>${message}</p>
            ${buttonHtml}
        </div>
    `;
    if (canSpend) {
        document.getElementById('spend-points-btn').addEventListener('click', () => getAndDisplaySuggestions(true));
    }
}

function updatePointsUI(points) {
    state.points = points;
    pointsBalanceSpan.textContent = state.points;
    pointsContainer.classList.remove('hidden');
}

function updateAttemptsUI(attempts) {
    state.dailyAttempts = attempts;
    attemptsBalanceSpan.textContent = state.dailyAttempts;
    attemptsContainer.classList.remove('hidden');
}

// --- 7. Local Storage & History ---
function updateHistory(newSuggestions) {
    let history = JSON.parse(localStorage.getItem('wainArouh_history')) || [];
    const newIds = newSuggestions.map(p => p._id);
    history = [...new Set([...newIds, ...history])];
    const HISTORY_LIMIT = 50;
    if (history.length > HISTORY_LIMIT) {
        history = history.slice(0, HISTORY_LIMIT);
    }
    localStorage.setItem('wainArouh_history', JSON.stringify(history));
}

function savePreferences(userType, interest) {
    localStorage.setItem('wainArouh_userType', userType);
    localStorage.setItem('wainArouh_interest', interest);
}

function loadPreferences() {
    const savedUserType = localStorage.getItem('wainArouh_userType');
    const savedInterest = localStorage.getItem('wainArouh_interest');
    if (savedUserType) {
        document.querySelector(`input[name="userType"][value="${savedUserType}"]`).checked = true;
    }
    if (savedInterest) {
        const interestRadio = document.querySelector(`input[name="interest"][value="${savedInterest}"]`);
        if (interestRadio) interestRadio.checked = true;
    }
}