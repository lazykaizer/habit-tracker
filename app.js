/* ==========================================================================
   Streakflow — Habit Tracker Application Logic
   ========================================================================== */

// ---------- Constants ----------
const STORAGE_KEY = 'streakflow_data';
const DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ---------- State ----------
let state = {
    habits: [],       // [{ id, name, createdAt }]
    completions: {},  // { habitId: { 'YYYY-MM-DD': true } }
    currentWeekStart: null // Monday of the viewed week
};

let renamingHabitId = null;
let deletingHabitId = null;

// ---------- DOM References ----------
const dom = {};

function cacheDom() {
    dom.addForm       = document.getElementById('add-habit-form');
    dom.habitInput    = document.getElementById('habit-input');
    dom.emptyState    = document.getElementById('empty-state');
    dom.trackerSection= document.getElementById('tracker-section');
    dom.weekLabel     = document.getElementById('week-label');
    dom.prevWeekBtn   = document.getElementById('prev-week-btn');
    dom.nextWeekBtn   = document.getElementById('next-week-btn');
    dom.todayBtn      = document.getElementById('today-btn');
    dom.gridHeader    = document.getElementById('grid-header');
    dom.habitRows     = document.getElementById('habit-rows');

    // Modals
    dom.renameDialog    = document.getElementById('rename-dialog');
    dom.renameInput     = document.getElementById('rename-input');
    dom.renameCancelBtn = document.getElementById('rename-cancel-btn');
    dom.renameSaveBtn   = document.getElementById('rename-save-btn');
    dom.deleteDialog    = document.getElementById('delete-dialog');
    dom.deleteHabitName = document.getElementById('delete-habit-name');
    dom.deleteCancelBtn = document.getElementById('delete-cancel-btn');
    dom.deleteConfirmBtn= document.getElementById('delete-confirm-btn');
}

// ---------- Utility Functions ----------

/** Generate a unique ID */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

/** Format a Date object as 'YYYY-MM-DD' */
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Get Monday of the week containing the given date (ISO weeks start on Monday) */
function getMondayOfWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=Sun, 1=Mon, ...
    const diff = day === 0 ? -6 : 1 - day; // if Sunday, go back 6 days
    d.setDate(d.getDate() + diff);
    return d;
}

/** Get array of 7 Date objects for Mon–Sun of the given week */
function getWeekDates(mondayDate) {
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(mondayDate);
        d.setDate(d.getDate() + i);
        dates.push(d);
    }
    return dates;
}

/** Check if a date is today */
function isToday(date) {
    const today = new Date();
    return date.getFullYear() === today.getFullYear()
        && date.getMonth() === today.getMonth()
        && date.getDate() === today.getDate();
}

/** Check if a date is in the future (strictly after today) */
function isFuture(date) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date > today;
}

/** Check if two dates are the same calendar day */
function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

/** Format the week label, e.g., "May 26 – Jun 1, 2025" */
function formatWeekLabel(mondayDate) {
    const dates = getWeekDates(mondayDate);
    const mon = dates[0];
    const sun = dates[6];

    const startMonth = MONTH_NAMES[mon.getMonth()];
    const endMonth = MONTH_NAMES[sun.getMonth()];
    const startDay = mon.getDate();
    const endDay = sun.getDate();
    const year = sun.getFullYear();

    if (mon.getMonth() === sun.getMonth()) {
        return `${startMonth} ${startDay} – ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

/** Check if the viewed week is the current week */
function isCurrentWeek() {
    const currentMonday = getMondayOfWeek(new Date());
    return isSameDay(state.currentWeekStart, currentMonday);
}

// ---------- Streak Calculation ----------

/**
 * Calculate the current consecutive-day streak for a habit.
 *
 * Logic: Count backwards from today. If today is checked, include it.
 * If today is NOT checked, start counting from yesterday. This way,
 * the user doesn't lose their streak just because they haven't yet
 * done their habit today (e.g., it's still morning).
 */
function calculateStreak(habitId) {
    const completions = state.completions[habitId] || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let checkDate = new Date(today);

    // If today is not completed, start from yesterday
    if (!completions[formatDate(checkDate)]) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    let streak = 0;
    while (completions[formatDate(checkDate)]) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
}

/** Get the streak level class based on count */
function getStreakLevel(count) {
    if (count === 0) return 'streak-0';
    if (count <= 2) return 'streak-low';
    if (count <= 6) return 'streak-mid';
    return 'streak-high';
}

// ---------- State Persistence ----------

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            state.habits = data.habits || [];
            state.completions = data.completions || {};
        }
    } catch (e) {
        console.warn('Failed to load state from localStorage:', e);
    }
    state.currentWeekStart = getMondayOfWeek(new Date());
}

function saveState() {
    try {
        const data = {
            habits: state.habits,
            completions: state.completions
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save state to localStorage:', e);
    }
}

// ---------- Habit CRUD ----------

function addHabit(name) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const habit = {
        id: generateId(),
        name: trimmed,
        createdAt: formatDate(new Date())
    };

    state.habits.push(habit);
    state.completions[habit.id] = {};
    saveState();
    render();

    // Focus back on input for quick entry of multiple habits
    dom.habitInput.value = '';
    dom.habitInput.focus();
}

function renameHabit(id, newName) {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const habit = state.habits.find(h => h.id === id);
    if (habit) {
        habit.name = trimmed;
        saveState();
        render();
    }
}

function deleteHabit(id) {
    state.habits = state.habits.filter(h => h.id !== id);
    delete state.completions[id];
    saveState();
    render();
}

function toggleCompletion(habitId, dateStr) {
    if (!state.completions[habitId]) {
        state.completions[habitId] = {};
    }

    if (state.completions[habitId][dateStr]) {
        delete state.completions[habitId][dateStr];
    } else {
        state.completions[habitId][dateStr] = true;
    }

    saveState();
}

// ---------- Week Navigation ----------

function goToPreviousWeek() {
    const newStart = new Date(state.currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    state.currentWeekStart = newStart;
    render('right'); // slide from left = content coming from the right
}

function goToNextWeek() {
    const newStart = new Date(state.currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    state.currentWeekStart = newStart;
    render('left'); // slide from right
}

function goToCurrentWeek() {
    state.currentWeekStart = getMondayOfWeek(new Date());
    render();
}

// ---------- Rendering ----------

function render(slideDirection) {
    const hasHabits = state.habits.length > 0;

    // Toggle sections
    dom.emptyState.hidden = hasHabits;
    dom.trackerSection.hidden = !hasHabits;

    if (!hasHabits) return;

    // Update week label
    dom.weekLabel.textContent = formatWeekLabel(state.currentWeekStart);

    // Show/hide today button
    dom.todayBtn.hidden = isCurrentWeek();

    const weekDates = getWeekDates(state.currentWeekStart);

    // Render grid header
    renderGridHeader(weekDates);

    // Render habit rows
    renderHabitRows(weekDates, slideDirection);
}

function renderGridHeader(weekDates) {
    let html = `<div class="cell cell-habit" role="columnheader">Habit</div>`;

    weekDates.forEach((date, i) => {
        const todayClass = isToday(date) ? ' is-today' : '';
        html += `
            <div class="cell cell-day${todayClass}" role="columnheader">
                <div class="day-header-content">
                    <span class="day-name">${DAY_NAMES_SHORT[i]}</span>
                    <span class="day-date">${date.getDate()}</span>
                </div>
            </div>`;
    });

    html += `<div class="cell cell-streak" role="columnheader">Streak</div>`;

    dom.gridHeader.innerHTML = html;
}

function renderHabitRows(weekDates, slideDirection) {
    let html = '';

    state.habits.forEach((habit, index) => {
        const streak = calculateStreak(habit.id);
        const streakLevel = getStreakLevel(streak);
        const enterClass = slideDirection ? '' : ' habit-row-enter';

        html += `<div class="grid-row${enterClass}" role="row" data-habit-id="${habit.id}" style="animation-delay: ${index * 40}ms">`;

        // Habit name cell
        html += `
            <div class="cell cell-habit" role="rowheader">
                <div class="habit-info">
                    <span class="habit-name" title="${escapeHtml(habit.name)}">${escapeHtml(habit.name)}</span>
                    <div class="habit-actions">
                        <button class="habit-action-btn edit-btn" onclick="openRenameDialog('${habit.id}')"
                            aria-label="Rename ${escapeHtml(habit.name)}" title="Rename">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="habit-action-btn delete-btn" onclick="openDeleteDialog('${habit.id}')"
                            aria-label="Delete ${escapeHtml(habit.name)}" title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>`;

        // Day cells
        weekDates.forEach((date, dayIndex) => {
            const dateStr = formatDate(date);
            const isChecked = state.completions[habit.id]?.[dateStr] === true;
            const todayClass = isToday(date) ? ' is-today' : '';
            const futureDay = isFuture(date);
            const checkedClass = isChecked ? ' checked' : '';
            const futureClass = futureDay ? ' future' : '';

            const ariaLabel = `${habit.name}, ${DAY_NAMES_FULL[dayIndex]} ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}: ${isChecked ? 'completed' : futureDay ? 'future date' : 'not completed'}`;

            html += `
                <div class="cell cell-day${todayClass}" role="gridcell">
                    <button class="check-btn${checkedClass}${futureClass}"
                        ${futureDay ? 'disabled' : ''}
                        onclick="${futureDay ? '' : `handleCheck('${habit.id}', '${dateStr}', this)`}"
                        aria-label="${ariaLabel}"
                        aria-pressed="${isChecked}">
                        <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </button>
                </div>`;
        });

        // Streak cell
        html += `
            <div class="cell cell-streak">
                <span class="streak-display ${streakLevel}">
                    <span class="streak-flame" aria-hidden="true">🔥</span>
                    <span>${streak}</span>
                </span>
            </div>`;

        html += `</div>`;
    });

    // Apply slide animation
    if (slideDirection) {
        dom.habitRows.classList.remove('grid-slide-left', 'grid-slide-right');
        // Force reflow
        void dom.habitRows.offsetWidth;
        dom.habitRows.classList.add(slideDirection === 'left' ? 'grid-slide-left' : 'grid-slide-right');
    }

    dom.habitRows.innerHTML = html;
}

/** Escape HTML entities to prevent XSS */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ---------- Check Handling with Animation ----------

function handleCheck(habitId, dateStr, button) {
    const wasChecked = button.classList.contains('checked');

    // Toggle completion state
    toggleCompletion(habitId, dateStr);

    if (wasChecked) {
        // Unchecking: simple transition
        button.classList.remove('checked');
        button.setAttribute('aria-pressed', 'false');
    } else {
        // Checking: satisfying animation
        button.classList.add('checked', 'checking');
        button.setAttribute('aria-pressed', 'true');

        // Remove ripple effect after animation
        setTimeout(() => {
            button.classList.remove('checking');
        }, 600);
    }

    // Update the streak display for this habit row
    updateStreakDisplay(habitId);
}

function updateStreakDisplay(habitId) {
    const row = document.querySelector(`[data-habit-id="${habitId}"]`);
    if (!row) return;

    const streak = calculateStreak(habitId);
    const level = getStreakLevel(streak);
    const streakEl = row.querySelector('.streak-display');

    if (streakEl) {
        streakEl.className = `streak-display ${level}`;
        streakEl.querySelector('span:last-child').textContent = streak;

        // Brief scale pulse animation
        streakEl.style.transform = 'scale(1.2)';
        setTimeout(() => {
            streakEl.style.transform = 'scale(1)';
        }, 200);
    }
}

// ---------- Modal: Rename ----------

function openRenameDialog(habitId) {
    const habit = state.habits.find(h => h.id === habitId);
    if (!habit) return;

    renamingHabitId = habitId;
    dom.renameInput.value = habit.name;
    dom.renameDialog.classList.add('active');

    // Focus input and select text
    requestAnimationFrame(() => {
        dom.renameInput.focus();
        dom.renameInput.select();
    });
}

function closeRenameDialog() {
    dom.renameDialog.classList.remove('active');
    renamingHabitId = null;
}

function confirmRename() {
    if (renamingHabitId) {
        renameHabit(renamingHabitId, dom.renameInput.value);
    }
    closeRenameDialog();
}

// ---------- Modal: Delete ----------

function openDeleteDialog(habitId) {
    const habit = state.habits.find(h => h.id === habitId);
    if (!habit) return;

    deletingHabitId = habitId;
    dom.deleteHabitName.textContent = habit.name;
    dom.deleteDialog.classList.add('active');

    // Focus the cancel button (safer default)
    requestAnimationFrame(() => {
        dom.deleteCancelBtn.focus();
    });
}

function closeDeleteDialog() {
    dom.deleteDialog.classList.remove('active');
    deletingHabitId = null;
}

function confirmDelete() {
    if (deletingHabitId) {
        deleteHabit(deletingHabitId);
    }
    closeDeleteDialog();
}

// ---------- Event Binding ----------

function bindEvents() {
    // Add habit form
    dom.addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addHabit(dom.habitInput.value);
    });

    // Week navigation
    dom.prevWeekBtn.addEventListener('click', goToPreviousWeek);
    dom.nextWeekBtn.addEventListener('click', goToNextWeek);
    dom.todayBtn.addEventListener('click', goToCurrentWeek);

    // Rename dialog
    dom.renameCancelBtn.addEventListener('click', closeRenameDialog);
    dom.renameSaveBtn.addEventListener('click', confirmRename);
    dom.renameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmRename();
        }
        if (e.key === 'Escape') {
            closeRenameDialog();
        }
    });
    dom.renameDialog.addEventListener('click', (e) => {
        if (e.target === dom.renameDialog) closeRenameDialog();
    });

    // Delete dialog
    dom.deleteCancelBtn.addEventListener('click', closeDeleteDialog);
    dom.deleteConfirmBtn.addEventListener('click', confirmDelete);
    dom.deleteDialog.addEventListener('click', (e) => {
        if (e.target === dom.deleteDialog) closeDeleteDialog();
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape closes modals
        if (e.key === 'Escape') {
            if (dom.renameDialog.classList.contains('active')) closeRenameDialog();
            if (dom.deleteDialog.classList.contains('active')) closeDeleteDialog();
        }

        // Left/Right arrow for week navigation when not focused on input
        if (document.activeElement.tagName !== 'INPUT') {
            if (e.key === 'ArrowLeft' && e.altKey) {
                e.preventDefault();
                goToPreviousWeek();
            }
            if (e.key === 'ArrowRight' && e.altKey) {
                e.preventDefault();
                goToNextWeek();
            }
            if (e.key === 't' && e.altKey) {
                e.preventDefault();
                goToCurrentWeek();
            }
        }
    });
}

// ---------- Initialization ----------

function init() {
    cacheDom();
    loadState();
    bindEvents();
    render();
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
