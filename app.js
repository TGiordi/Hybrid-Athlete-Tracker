/* =========================================================================
   HAT (Hybrid Athlete Tracker) - MOTOR PRINCIPAL JAVASCRIPT
   ========================================================================= */

const subtitleText = "La plataforma de alto rendimiento para quienes dominan el gimnasio y el campo de juego.";
let typeIndex = 0;

const SUPABASE_URL = "https://kqmkseiwgdzwzmtqdcxk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbWtzZWl3Z2R6d3ptdHFkY3hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzQ0NTMsImV4cCI6MjA4ODgxMDQ1M30.b3kQ8JSYaMCrRdgxoyek6xXF4Hhv_9H8edEN4c7oF8U";
const REDIRECT_URL = "https://tgiordi.github.io/Hybrid-Athlete-Tracker/";

let supabaseClient = null; 
let currentUserId = null; 
let isSignUp = false; 
let currentActiveDay = 'lunes'; 
let currentEditExerciseId = null; 
let currentAIPrompt = ""; 
let exerciseToCopy = null;
let pendingSavedRoutineId = null; 
let pendingDeleteSessionId = null;

window.myCharts = {}; 
window.currentHistory = {}; 
window.currentDayExercises = []; 
window.chatHistory = [];

// --- VARIABLES DE TIEMPO ---
let timerInterval = null; 
let timerSecondsLeft = 0;
let globalTimerInterval = null; 
let globalSeconds = 0;

const MAX_TIMER_SECONDS = 86400; // Límite de 24 hs
window.exerciseTimers = {}; 

// ÍCONOS SVG PUROS PARA EL CRONÓMETRO (Estilo HAT)
window.SVG_PLAY = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3l14 9-14 9V3z"></path></svg>`;
window.SVG_PAUSE = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 9v6m4-6v6"></path></svg>`;
window.SVG_RESET = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>`;

// --- MOTOR DE SONIDO ---
let audioCtx = null;
function initAudio() { 
    if(!audioCtx) { 
        audioCtx = new (window.AudioContext || window.webkitAudioContext)(); 
    } 
}
document.addEventListener('click', initAudio, {once: true}); 
document.addEventListener('touchstart', initAudio, {once: true});

function playTone(freq, type, duration, vol=0.05) {
    if(!audioCtx) return;
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator(); 
    const gain = audioCtx.createGain();
    osc.type = type; 
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain); 
    gain.connect(audioCtx.destination);
    osc.start(); 
    osc.stop(audioCtx.currentTime + duration);
}
function playTap() { playTone(1200, 'sine', 0.05, 0.015); } 
function playPop() { playTone(900, 'triangle', 0.08, 0.02); } 
function playAlarm() {
    if(!audioCtx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; 
    for(let j=0; j<3; j++) { 
        notes.forEach((freq, i) => { 
            setTimeout(() => playTone(freq, 'square', 0.1, 0.05), (j * 600) + (i * 100)); 
        }); 
    }
}
function playVictory() {
    if(!audioCtx) return;
    const notes = [440, 554.37, 659.25, 880]; 
    notes.forEach((freq, i) => { 
        setTimeout(() => playTone(freq, 'sine', 0.15, 0.08), i * 150); 
    });
}

// --- UTILIDADES ---
function escapeHTML(str) { 
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;'); 
}

function showToast(message) {
    const toast = document.getElementById('toast-notification'); 
    document.getElementById('toast-msg').innerText = message;
    toast.classList.remove('bottom-[-100px]', 'opacity-0'); 
    toast.classList.add('bottom-10', 'opacity-100');
    setTimeout(() => { 
        toast.classList.add('bottom-[-100px]', 'opacity-0'); 
        toast.classList.remove('bottom-10', 'opacity-100'); 
    }, 3000);
}

function formatTime(totalSeconds) {
    if(!totalSeconds || totalSeconds <= 0) return "0s";
    let h = Math.floor(totalSeconds / 3600);
    let m = Math.floor((totalSeconds % 3600) / 60); 
    let s = Math.round(totalSeconds % 60);
    if(h > 0) return `${h}h ${m}m`;
    if(m > 0 && s > 0) return `${m}m ${s}s`; 
    if(m > 0) return `${m}m`; 
    return `${s}s`;
}

// --- CLICS AFUERA PARA CERRAR MENÚS ---
document.addEventListener('click', (e) => {
    // Cerrar menú de 3 puntos
    if (!e.target.closest('.ex-menu-container')) { 
        document.querySelectorAll('.ex-dropdown').forEach(el => el.classList.add('hidden')); 
    }
    // Cerrar Rueda si haces clic afuera
    const fabContainer = document.getElementById('fab-container'); 
    const fabOptions = document.getElementById('fab-options');
    if (fabContainer && !e.target.closest('#fab-container') && !fabOptions.classList.contains('opacity-0')) { 
        window.toggleFabMenu(); 
    }
});

document.getElementById('modal-overlay').addEventListener('click', function(e) { 
    if (e.target === this) window.closeAllModals(); 
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(typeWriter, 500); 
    
    if (typeof Chart !== 'undefined') { 
        Chart.defaults.font.family = "'Montserrat', sans-serif"; 
        Chart.defaults.color = '#94A3B8'; 
    }
    
    // Eventos de teclado
    document.getElementById('auth-password')?.addEventListener('keypress', function (e) { if (e.key === 'Enter') window.handleAuth(); });
    document.getElementById('new-password-input')?.addEventListener('keypress', function (e) { if (e.key === 'Enter') window.saveNewPassword(); });
    document.getElementById('chat-input')?.addEventListener('keypress', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.sendChatMessage(); } });
    document.getElementById('timer-min')?.addEventListener('keypress', function (e) { if (e.key === 'Enter') window.toggleTimer(); });
    document.getElementById('timer-seg')?.addEventListener('keypress', function (e) { if (e.key === 'Enter') window.toggleTimer(); });
    document.getElementById('routine-save-name')?.addEventListener('keypress', function (e) { if (e.key === 'Enter') window.saveRoutine(); });
    ['new-ex-name', 'new-ex-sets', 'new-ex-reps'].forEach(id => { 
        document.getElementById(id)?.addEventListener('keypress', e => { if(e.key === 'Enter') window.saveExercise(); }); 
    });

    try {
        if (window.supabase) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            let isRecovering = window.location.hash.includes('type=recovery');
            
            if (isRecovering) { 
                window.openModal('modal-new-pwd'); 
            } else { 
                const { data: { session } } = await supabaseClient.auth.getSession(); 
                if(session) { 
                    currentUserId = session.user.id; 
                    loadDashboardView(session.user.email); 
                } 
            }
            
            supabaseClient.auth.onAuthStateChange((event, session) => {
                if (event === 'PASSWORD_RECOVERY') { 
                    isRecovering = true; 
                    window.openModal('modal-new-pwd'); 
                } else if (event === 'SIGNED_IN' && session) { 
                    setTimeout(() => { 
                        if(!isRecovering && !currentUserId) { 
                            currentUserId = session.user.id; 
                            loadDashboardView(session.user.email); 
                        } 
                    }, 500); 
                } else if (event === 'SIGNED_OUT') { 
                    currentUserId = null; 
                    location.reload(); 
                }
            });
        }
    } catch(e) { console.error("Error inicializando Supabase:", e); }
});

function typeWriter() { 
    const el = document.getElementById("typewriter-text"); 
    if(!el) return; 
    if (typeIndex < subtitleText.length) { 
        el.innerHTML += subtitleText.charAt(typeIndex); 
        typeIndex++; 
        setTimeout(typeWriter, 20); 
    } else { 
        el.classList.remove('typewriter-cursor'); 
    } 
}

window.openModal = function(modalId) {
    playPop();
    const overlay = document.getElementById('modal-overlay'); 
    overlay.classList.remove('hidden'); 
    overlay.classList.add('flex');
    
    document.querySelectorAll('.modal-content').forEach(m => m.classList.add('hidden')); 
    
    const targetModal = document.getElementById(modalId); 
    if(targetModal) targetModal.classList.remove('hidden'); 
    document.body.style.overflow = 'hidden';
    
    if(modalId === 'modal-auth') { 
        isSignUp = false; 
        updateAuthUI(); 
        document.getElementById('auth-password').type = 'password'; 
    }
    
    // Limpiar errores viejos
    document.getElementById('edit-error-msg')?.classList.add('hidden');
    document.getElementById('ex-error-msg')?.classList.add('hidden');
    document.getElementById('ai-error-msg')?.classList.add('hidden');
};

window.closeAllModals = function() {
    playPop();
    const overlay = document.getElementById('modal-overlay'); 
    overlay.classList.add('hidden'); 
    overlay.classList.remove('flex');
    
    document.querySelectorAll('.modal-content').forEach(m => m.classList.add('hidden')); 
    document.body.style.overflow = 'auto'; 
    window.location.hash = ''; 
    
    // Restaura el widget de timer si estaba contando
    if (timerSecondsLeft > 0) { 
        const miniWidget = document.getElementById('mini-timer-widget'); 
        if(miniWidget) {
            miniWidget.classList.remove('translate-x-[-150%]', 'opacity-0', 'hidden'); 
            miniWidget.classList.add('translate-x-0', 'opacity-100'); 
        }
    }
};

// --- RUEDA DE OPCIONES (FAB) ---
window.toggleFabMenu = function() {
    playTap();
    const options = document.getElementById('fab-options'); 
    const icon = document.getElementById('fab-icon');
    
    if (options.classList.contains('opacity-0')) { 
        options.classList.remove('opacity-0', 'translate-y-4'); 
        icon.style.transform = 'rotate(45deg)'; 
    } else { 
        options.classList.add('opacity-0', 'translate-y-4'); 
        icon.style.transform = 'rotate(0deg)'; 
    }
};

window.closeFabAndRun = function(callback) { 
    window.toggleFabMenu(); 
    if(typeof callback === 'function') callback(); 
};

// --- TIEMPO GLOBAL DE ENTRENAMIENTO (Persistente) ---
window.startGlobalWorkout = function() {
    playVictory(); 
    document.getElementById('btn-start-workout').classList.add('hidden'); 
    document.getElementById('global-workout-timer').classList.remove('hidden');
    
    if(!localStorage.getItem('hat_workout_start')) { 
        localStorage.setItem('hat_workout_start', Date.now().toString()); 
        globalSeconds = 0; 
    }
    updateGlobalTimerDisplay();
    
    if(globalTimerInterval) clearInterval(globalTimerInterval);
    
    globalTimerInterval = setInterval(() => { 
        const startTime = parseInt(localStorage.getItem('hat_workout_start') || Date.now()); 
        globalSeconds = Math.floor((Date.now() - startTime) / 1000); 
        
        if (globalSeconds >= MAX_TIMER_SECONDS) {
            globalSeconds = MAX_TIMER_SECONDS;
            showToast("⚠️ Límite de 24h alcanzado.");
        }
        updateGlobalTimerDisplay(); 
    }, 1000);
};

function updateGlobalTimerDisplay() {
    let h = Math.floor(globalSeconds / 3600).toString().padStart(2, '0'); 
    let m = Math.floor((globalSeconds % 3600) / 60).toString().padStart(2, '0'); 
    let s = (globalSeconds % 60).toString().padStart(2, '0');
    const display = document.getElementById('global-timer-display'); 
    if(display) display.innerText = `${h}:${m}:${s}`;
}

window.stopGlobalWorkout = function() { 
    window.openModal('modal-confirm-stop-workout'); 
};

window.confirmStopGlobalWorkout = async function() {
    clearInterval(globalTimerInterval); 
    globalTimerInterval = null;
    
    document.getElementById('global-workout-timer').classList.add('hidden'); 
    document.getElementById('btn-start-workout').classList.remove('hidden');
    
    const today = new Date(); 
    const dateString = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0') + "-" + String(today.getDate()).padStart(2, '0');
    
    try {
        await supabaseClient.from('workout_sessions').insert([{ 
            user_id: currentUserId, 
            session_date: dateString, 
            duration_seconds: globalSeconds 
        }]);
        window.closeAllModals(); 
        showToast(`¡Entrenamiento finalizado! Tiempo: ${formatTime(globalSeconds)}`); 
        playVictory();
    } catch(e) { 
        console.error("Error guardando sesión global:", e); 
    }
    
    localStorage.removeItem('hat_workout_start'); 
    globalSeconds = 0;
};

function resumeGlobalWorkoutIfActive() {
    const savedStart = localStorage.getItem('hat_workout_start');
    if (savedStart) {
        globalSeconds = Math.floor((Date.now() - parseInt(savedStart)) / 1000);
        if (globalSeconds >= MAX_TIMER_SECONDS) {
            globalSeconds = MAX_TIMER_SECONDS;
        }
        
        document.getElementById('btn-start-workout').classList.add('hidden'); 
        document.getElementById('global-workout-timer').classList.remove('hidden');
        updateGlobalTimerDisplay();
        
        globalTimerInterval = setInterval(() => { 
            const startTime = parseInt(localStorage.getItem('hat_workout_start') || Date.now()); 
            globalSeconds = Math.floor((Date.now() - startTime) / 1000); 
            if (globalSeconds >= MAX_TIMER_SECONDS) globalSeconds = MAX_TIMER_SECONDS;
            updateGlobalTimerDisplay(); 
        }, 1000);
    }
}

// --- GESTOR LOCAL DE TIEMPOS DE EJERCICIO (Persistencia) ---
function getExTimerState(exId) {
    let timers = JSON.parse(localStorage.getItem('hat_ex_timers') || '{}');
    return timers[exId] || { running: false, acc: 0, lastStart: 0 };
}
function saveExTimerState(exId, state) {
    let timers = JSON.parse(localStorage.getItem('hat_ex_timers') || '{}');
    timers[exId] = state;
    localStorage.setItem('hat_ex_timers', JSON.stringify(timers));
}
function clearExTimerState(exId) {
    let timers = JSON.parse(localStorage.getItem('hat_ex_timers') || '{}');
    delete timers[exId];
    localStorage.setItem('hat_ex_timers', JSON.stringify(timers));
}
function getExCurrentSeconds(exId) {
    let state = getExTimerState(exId);
    let secs = state.acc;
    if (state.running) {
        secs += Math.floor((Date.now() - state.lastStart) / 1000);
    }
    if (secs > MAX_TIMER_SECONDS) secs = MAX_TIMER_SECONDS;
    return secs;
}

// --- CRONÓMETRO INDIVIDUAL POR EJERCICIO ---
window.toggleExTimer = function(exId) {
    playTap();
    
    if(!window.exerciseTimers[exId]) window.exerciseTimers[exId] = { interval: null };
    const t = window.exerciseTimers[exId];
    const btn = document.getElementById(`btn-extimer-${exId}`);
    const display = document.getElementById(`display-extimer-${exId}`);
    
    let state = getExTimerState(exId);
    
    if(state.running) {
        // Pausar
        if(t.interval) clearInterval(t.interval); 
        t.interval = null;
        
        state.acc += Math.floor((Date.now() - state.lastStart) / 1000);
        state.running = false;
        saveExTimerState(exId, state);
        
        btn.innerHTML = window.SVG_PLAY; 
        btn.classList.replace('text-green-400', 'text-orange-400');
        if(btn.classList.contains('text-green-400')) btn.classList.replace('text-green-400', 'text-orange-400');
    } else {
        // Iniciar
        state.running = true;
        state.lastStart = Date.now();
        saveExTimerState(exId, state);
        
        btn.innerHTML = window.SVG_PAUSE; 
        btn.classList.replace('text-orange-400', 'text-green-400');
        if(!btn.classList.contains('text-green-400')) btn.classList.add('text-green-400');
        
        t.interval = setInterval(() => {
            let currentSecs = getExCurrentSeconds(exId);
            if (currentSecs >= MAX_TIMER_SECONDS) currentSecs = MAX_TIMER_SECONDS;
            
            let m = Math.floor(currentSecs / 60).toString().padStart(2, '0'); 
            let s = (currentSecs % 60).toString().padStart(2, '0');
            display.innerText = `${m}:${s}`;
        }, 1000);
    }
};

window.resetExTimer = function(exId) {
    playPop();
    if(window.exerciseTimers[exId] && window.exerciseTimers[exId].interval) {
        clearInterval(window.exerciseTimers[exId].interval);
    }
    window.exerciseTimers[exId] = { interval: null };
    clearExTimerState(exId);
    
    document.getElementById(`display-extimer-${exId}`).innerText = "00:00";
    const btn = document.getElementById(`btn-extimer-${exId}`);
    btn.innerHTML = window.SVG_PLAY; 
    btn.classList.replace('text-green-400', 'text-orange-400');
    if(btn.classList.contains('text-green-400')) btn.classList.replace('text-green-400', 'text-orange-400');
};

function resumeExTimerIfActive(exId) {
    let state = getExTimerState(exId);
    if (!state) return;
    
    let currentSecs = getExCurrentSeconds(exId);
    if (currentSecs > 0) {
        if(!window.exerciseTimers[exId]) window.exerciseTimers[exId] = { interval: null };
        const t = window.exerciseTimers[exId];
        const display = document.getElementById(`display-extimer-${exId}`);
        const btn = document.getElementById(`btn-extimer-${exId}`);
        
        let m = Math.floor(currentSecs / 60).toString().padStart(2, '0'); 
        let s = (currentSecs % 60).toString().padStart(2, '0');
        if(display) display.innerText = `${m}:${s}`;
        
        if (state.running) {
            btn.innerHTML = window.SVG_PAUSE; 
            btn.classList.replace('text-orange-400', 'text-green-400');
            if(!btn.classList.contains('text-green-400')) btn.classList.add('text-green-400');
            
            t.interval = setInterval(() => {
                let curr = getExCurrentSeconds(exId);
                let mins = Math.floor(curr / 60).toString().padStart(2, '0'); 
                let secs = (curr % 60).toString().padStart(2, '0');
                if(display) display.innerText = `${mins}:${secs}`;
            }, 1000);
        } else {
            btn.innerHTML = window.SVG_PLAY; 
            btn.classList.replace('text-green-400', 'text-orange-400');
        }
    }
}

// --- RENDERIZADO VISUAL DE EJERCICIOS ---
window.changeDay = async function(day, event) {
    currentActiveDay = day;
    if(event) { 
        playTap(); 
        document.querySelectorAll('.tab-btn').forEach(b => { 
            b.classList.remove('active', 'text-white'); 
            b.classList.add('text-custom-textMuted'); 
        }); 
        event.target.classList.add('active', 'text-white'); 
        event.target.classList.remove('text-custom-textMuted'); 
        event.target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); 
    } else { 
        document.querySelectorAll('.tab-btn').forEach(b => { 
            if(b.innerText.toLowerCase() === day.toLowerCase()) { 
                b.classList.add('active', 'text-white'); 
                b.classList.remove('text-custom-textMuted'); 
                b.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); 
            } else { 
                b.classList.remove('active', 'text-white'); 
                b.classList.add('text-custom-textMuted'); 
            } 
        }); 
    }
    
    const container = document.getElementById('exercise-container'); 
    container.innerHTML = '<div class="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 text-center text-custom-textMuted py-10 font-bold animate-pulse">Cargando tu rutina...</div>';
    
    try {
        const { data: exercises, error } = await supabaseClient.from('user_routines').select('*').eq('user_id', currentUserId).eq('day_of_week', day).order('order_index', { ascending: true }).order('created_at', { ascending: true });
        if (error) throw error; 
        window.currentDayExercises = exercises;
        
        if (exercises.length === 0) { 
            container.innerHTML = `<div class="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 flex flex-col items-center justify-center p-10 bg-custom-card border border-dashed border-custom-border rounded-3xl text-center"><div class="w-16 h-16 bg-[#171717] rounded-full flex items-center justify-center mb-4"><svg class="w-8 h-8 text-custom-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg></div><h3 class="text-xl font-bold text-white mb-2">Día libre o sin configurar</h3><p class="text-custom-textMuted text-sm mb-4">Aún no agregaste ejercicios para el día seleccionado.</p></div>`; 
            return; 
        }
        
        container.innerHTML = '';
        exercises.forEach(ex => {
            const safeExName = escapeHTML(ex.exercise_name); 
            // Nombre para usar dentro de JS (botones)
            const exNameForJS = ex.exercise_name.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;");
            
            const safeId = escapeHTML(ex.id); 
            const exType = ex.exercise_type || 'carga';
            
            let state = getExTimerState(safeId); 
            let currentExSecs = getExCurrentSeconds(safeId);
            let tDisplay = formatTime(currentExSecs);
            let tIcon = state.running ? window.SVG_PAUSE : window.SVG_PLAY;
            let tColor = state.running ? 'text-orange-400' : 'text-green-400';

            let setsHtml = ''; 
            for(let i=1; i<=ex.sets; i++) { 
                if (exType === 'tiempo') {
                    setsHtml += `
                    <div class="flex items-center justify-between mb-3 bg-custom-bg p-3 rounded-lg border border-custom-border shadow-sm">
                        <span class="w-16 text-[10px] font-bold text-custom-textMuted uppercase">Set ${i}</span>
                        <div class="flex items-center bg-[#0a0a0a] border border-[#262626] rounded-lg focus-within:border-custom-primary transition-colors overflow-hidden h-[40px] px-2">
                            <input type="text" inputmode="numeric" pattern="[0-9]*" id="min-${safeId}-${i}" placeholder="00" oninput="this.value=this.value.replace(/[^0-9]/g,''); if(this.value.length>=2){ let n=document.getElementById('seg-${safeId}-${i}'); n.focus(); if(this.value.length>2){ n.value=this.value.slice(2,4); } this.value=this.value.slice(0,2); }" class="w-[35px] h-full bg-transparent text-white text-center text-lg font-bold outline-none appearance-none p-0">
                            <span class="text-custom-textMuted font-bold mx-1 pb-1">:</span>
                            <input type="text" inputmode="numeric" pattern="[0-9]*" id="seg-${safeId}-${i}" placeholder="00" oninput="this.value=this.value.replace(/[^0-9]/g,''); if(this.value.length>2) this.value=this.value.slice(0,2);" class="w-[35px] h-full bg-transparent text-white text-center text-lg font-bold outline-none appearance-none p-0">
                        </div>
                        <input type="checkbox" id="check-${safeId}-${i}" class="w-6 h-6 accent-custom-primary cursor-pointer">
                    </div>`;
                } else {
                    setsHtml += `
                    <div class="flex items-center justify-between mb-3 bg-custom-bg p-3 rounded-lg border border-custom-border shadow-sm">
                        <span class="w-16 text-[10px] font-bold text-custom-textMuted uppercase">Set ${i}</span>
                        <div class="flex gap-1">
                            <input type="number" id="peso-${safeId}-${i}" placeholder="Kg" class="w-[60px] h-[40px] rounded bg-custom-bg border border-custom-border text-white text-center text-lg font-bold outline-none focus:border-custom-primary">
                            <input type="number" id="reps-${safeId}-${i}" placeholder="Rep" class="w-[60px] h-[40px] rounded bg-custom-bg border border-custom-border text-white text-center text-lg font-bold outline-none focus:border-custom-primary">
                        </div>
                        <input type="checkbox" id="check-${safeId}-${i}" class="w-6 h-6 accent-custom-primary cursor-pointer">
                    </div>`;
                }
            }

            let mediaHtml = ''; 
            if(ex.has_image && ex.image_url) { 
                mediaHtml += `<div class="mb-6 rounded-xl overflow-hidden border border-custom-border w-full"><img src="${escapeHTML(ex.image_url)}" class="w-full h-auto block" onerror="this.parentElement.style.display='none';"></div>`; 
            } 
            if(ex.has_video && ex.youtube_url && ex.youtube_url.length === 11) { 
                mediaHtml += `<div class="aspect-video mb-6 rounded-xl overflow-hidden bg-black border border-custom-border"><iframe class="w-full h-full" src="https://www.youtube.com/embed/${escapeHTML(ex.youtube_url)}" frameborder="0" allowfullscreen></iframe></div>`; 
            } else { 
                const searchQuery = encodeURIComponent(ex.exercise_name + " tutorial tecnica"); 
                mediaHtml += `<a href="https://www.youtube.com/results?search_query=${searchQuery}" target="_blank" class="flex items-center justify-center gap-2 w-full bg-[#171717] border border-[#262626] text-custom-textMuted hover:text-white hover:border-custom-primary py-3 rounded-xl mb-6 font-bold text-xs uppercase tracking-widest transition-colors"><svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg> Buscar en YouTube</a>`; 
            }

            container.innerHTML += `
            <div class="bg-custom-card p-6 rounded-3xl border border-custom-border shadow-xl flex flex-col relative group" data-ex-id="${safeId}">
                <div class="absolute top-4 right-4 flex items-center gap-2 z-30 ex-menu-container">
                    <div class="relative">
                        <button onclick="window.toggleExMenu('${safeId}')" class="p-2 bg-[#262626] rounded-lg text-custom-textMuted hover:text-white transition-colors shadow-lg" title="Opciones"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg></button>
                        <div id="ex-menu-${safeId}" class="ex-dropdown hidden absolute right-0 mt-2 w-48 bg-[#171717] border border-[#262626] rounded-xl shadow-2xl py-2 flex flex-col z-50">
                            <button onclick="window.askCoachAbout('${exNameForJS}')" class="flex items-center gap-3 px-4 py-3 text-sm text-purple-400 hover:text-white hover:bg-purple-500/20 transition-colors text-left w-full font-bold"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>Consultar Coach</button>
                            <div class="h-px bg-[#262626] my-1 w-full"></div>
                            <button onclick="window.promptCopyExercise('${safeId}')" class="flex items-center gap-3 px-4 py-3 text-sm text-custom-textMuted hover:text-white hover:bg-[#262626] transition-colors text-left w-full"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>Copiar</button>
                            <button onclick="window.openEditExerciseModal('${safeId}')" class="flex items-center gap-3 px-4 py-3 text-sm text-custom-textMuted hover:text-white hover:bg-[#262626] transition-colors text-left w-full"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>Editar</button>
                            <div class="h-px bg-[#262626] my-1 w-full"></div>
                            <button onclick="window.promptDeleteExercise('${safeId}', '${exNameForJS}')" class="flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:text-white hover:bg-red-500 transition-colors text-left w-full"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>Eliminar</button>
                        </div>
                    </div>
                    <div class="drag-handle p-2 text-custom-textMuted hover:text-white transition-colors cursor-grab active:cursor-grabbing" title="Mantener para mover"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v6" /><path d="M9 6l3-3 3 3" /><path d="M12 21v-6" /><path d="M9 18l3 3 3-3" /><path d="M3 12h6" /><path d="M6 9l-3 3 3 3" /><path d="M21 12h-6" /><path d="M18 9l3 3-3 3" /></svg></div>
                </div>
                
                <h3 class="text-xl font-bold mb-1 text-white uppercase italic tracking-tighter pr-28 break-words">${safeExName}</h3>
                <p class="text-xs text-custom-primary font-bold tracking-widest mb-4 uppercase">Objetivo: ${escapeHTML(ex.target_reps)}</p>
                ${mediaHtml}${setsHtml}
                
                <div class="flex flex-col items-center justify-center mt-4 mb-2 bg-[#0a0a0a] rounded-xl p-3 border border-[#262626]">
                    <span class="text-[10px] text-custom-textMuted font-bold tracking-widest uppercase mb-2">Tiempo del Ejercicio</span>
                    <div class="flex items-center justify-center gap-4 w-full">
                        <span class="text-3xl font-black text-white tracking-widest w-24 text-center" id="display-extimer-${safeId}">${tDisplay}</span>
                        <div class="flex gap-2">
                            <button onclick="window.resetExTimer('${safeId}')" class="flex items-center justify-center w-12 h-12 bg-[#171717] border border-[#262626] rounded-xl text-red-500 hover:bg-red-500/10 transition-colors" title="Limpiar y Reiniciar a Cero">
                                ${window.SVG_RESET}
                            </button>
                            <button onclick="window.toggleExTimer('${safeId}')" id="btn-extimer-${safeId}" class="flex items-center justify-center w-12 h-12 bg-[#171717] border border-[#262626] rounded-xl ${tColor} hover:bg-[#262626] transition-colors" title="Play/Pausa">
                                ${tIcon}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <button onclick="window.saveToCloud('${safeId}', ${ex.sets}, '${exNameForJS}', '${exType}', event)" class="w-full bg-custom-primary py-4 rounded-xl font-extrabold text-white tracking-widest hover:bg-custom-hover transition-all active:scale-95 shadow-lg relative overflow-hidden text-sm">
                        <span class="relative z-10 btn-text">GUARDAR SESIÓN</span>
                    </button>
                    <button onclick="window.loadEvolucion('${safeId}', '${exNameForJS}', '${exType}')" id="btn-evo-${safeId}" class="w-full bg-transparent border-2 border-custom-border text-custom-textMuted py-4 rounded-xl font-bold hover:border-custom-primary hover:text-white transition-all active:scale-95 text-sm uppercase tracking-widest">
                        VER PROGRESO
                    </button>
                </div>
                <div id="evo-container-${safeId}" class="hidden mt-6 pt-6 border-t border-custom-border"></div>
            </div>`;
        });

        Sortable.create(document.getElementById('exercise-container'), {
            handle: '.drag-handle', animation: 150, ghostClass: 'sortable-ghost', delay: 150, delayOnTouchOnly: true, touchStartThreshold: 3,
            onEnd: async function () {
                const items = Array.from(document.getElementById('exercise-container').children);
                const promises = items.map((item, index) => { 
                    return supabaseClient.from('user_routines').update({ order_index: index }).eq('id', item.getAttribute('data-ex-id')); 
                });
                await Promise.all(promises);
            }
        });
        
        exercises.forEach(ex => resumeExTimerIfActive(ex.id));

    } catch(e) { 
        container.innerHTML = `<div class="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 text-center text-red-500 py-10 font-bold">Error al cargar rutinas: ${e.message}</div>`; 
    }
};

window.toggleExMenu = function(id) { 
    const menu = document.getElementById(`ex-menu-${id}`); 
    document.querySelectorAll('.ex-dropdown').forEach(el => { 
        if (el.id !== `ex-menu-${id}`) el.classList.add('hidden'); 
    }); 
    menu.classList.toggle('hidden'); 
};

// --- CREACIÓN Y EDICIÓN DE EJERCICIOS ---
window.openAddExerciseModal = function() { 
    currentEditExerciseId = null; 
    document.getElementById('modal-ex-title').innerText = "Nuevo Ejercicio"; 
    document.getElementById('new-ex-name').value = ''; 
    document.getElementById('new-ex-sets').value = '4'; 
    document.getElementById('new-ex-reps').value = ''; 
    document.getElementById('new-ex-type').value = 'carga'; 
    document.getElementById('check-video').checked = false; 
    document.getElementById('input-video-container').classList.add('hidden'); 
    document.getElementById('new-ex-video').value = ''; 
    document.getElementById('check-image').checked = false; 
    document.getElementById('input-image-container').classList.add('hidden'); 
    document.getElementById('new-ex-image').value = ''; 
    document.getElementById('btn-save-exercise').innerText = "GUARDAR EJERCICIO"; 
    window.openModal('modal-exercise'); 
};

window.openEditExerciseModal = function(exId) { 
    currentEditExerciseId = exId; 
    const ex = window.currentDayExercises.find(e => e.id === exId); 
    document.getElementById('modal-ex-title').innerText = "Editar Ejercicio"; 
    document.getElementById('new-ex-name').value = ex.exercise_name; 
    document.getElementById('new-ex-sets').value = ex.sets; 
    document.getElementById('new-ex-reps').value = ex.target_reps; 
    document.getElementById('new-ex-type').value = ex.exercise_type || 'carga'; 
    
    document.getElementById('check-video').checked = ex.has_video; 
    document.getElementById('input-video-container').className = ex.has_video ? "mb-2 pl-4 border-l-2 border-custom-primary" : "hidden mb-2 pl-4 border-l-2 border-custom-primary"; 
    document.getElementById('new-ex-video').value = (ex.has_video && ex.youtube_url) ? `https://youtu.be/${ex.youtube_url}` : ''; 
    
    document.getElementById('check-image').checked = ex.has_image; 
    document.getElementById('input-image-container').className = ex.has_image ? "mb-4 pl-4 border-l-2 border-custom-primary" : "hidden mb-4 pl-4 border-l-2 border-custom-primary"; 
    document.getElementById('new-ex-image').value = ex.image_url || ''; 
    
    document.getElementById('btn-save-exercise').innerText = "ACTUALIZAR EJERCICIO"; 
    window.openModal('modal-exercise'); 
};

window.promptDeleteExercise = function(exId, exName) { 
    window.openModal('modal-confirm-delete-exercise'); 
    const btn = document.getElementById('btn-confirm-delete-ex'); 
    btn.onclick = async () => { 
        btn.innerText = "Quitando..."; btn.disabled = true; 
        try { 
            const {error} = await supabaseClient.from('user_routines').delete().eq('id', exId); 
            if(error) throw error; 
            window.closeAllModals(); window.changeDay(currentActiveDay); 
        } catch(e) { alert("Error: " + e.message); } 
        finally { btn.innerText = "Sí, quitar"; btn.disabled = false; } 
    }; 
};

function extractYoutubeId(url) { 
    if(!url) return null; 
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/; 
    const match = url.match(regExp); 
    return (match && match[2].length === 11) ? match[2] : null; 
}

window.saveExercise = async function() {
    const msgBox = document.getElementById('ex-error-msg'); 
    const name = document.getElementById('new-ex-name').value.trim(); 
    const sets = document.getElementById('new-ex-sets').value; 
    const targetReps = document.getElementById('new-ex-reps').value.trim(); 
    const exType = document.getElementById('new-ex-type').value; 
    const hasVideo = document.getElementById('check-video').checked; 
    let ytUrl = document.getElementById('new-ex-video').value.trim(); 
    const ytId = extractYoutubeId(ytUrl); 
    const hasImage = document.getElementById('check-image').checked; 
    const imgUrl = document.getElementById('new-ex-image').value.trim();
    
    if(!name || !sets || !targetReps) { 
        msgBox.innerText = "Completá el nombre, series y objetivo."; 
        msgBox.classList.remove('hidden'); return; 
    }
    if(hasVideo && !ytId) { 
        msgBox.innerText = "El link de YouTube no es válido."; 
        msgBox.classList.remove('hidden'); return; 
    }
    if(hasImage && (!imgUrl || !imgUrl.startsWith('http'))) { 
        msgBox.innerText = "Pegá un link de imagen válido (que empiece con http)."; 
        msgBox.classList.remove('hidden'); return; 
    }
    
    const btn = document.getElementById('btn-save-exercise'); 
    btn.innerText = "GUARDANDO..."; btn.disabled = true; 
    msgBox.classList.add('hidden');
    
    const currentExercisesInDay = window.currentDayExercises.length;
    const exData = { 
        user_id: currentUserId, 
        day_of_week: currentActiveDay, 
        exercise_name: name, 
        sets: parseInt(sets), 
        target_reps: targetReps, 
        exercise_type: exType, 
        has_video: hasVideo, 
        youtube_url: ytId || '', 
        has_image: hasImage, 
        image_url: imgUrl || '', 
        order_index: currentExercisesInDay 
    };
    
    try { 
        if(currentEditExerciseId) { 
            // Eliminar order_index para no sobreescribir el orden actual al editar
            delete exData.order_index;
            const { error } = await supabaseClient.from('user_routines').update(exData).eq('id', currentEditExerciseId); 
            if (error) throw error; 
        } else { 
            const { error } = await supabaseClient.from('user_routines').insert([exData]); 
            if (error) throw error; 
        } 
        window.closeAllModals(); 
        window.changeDay(currentActiveDay); 
    } catch (err) { 
        msgBox.innerText = "Error: " + err.message; 
        msgBox.classList.remove('hidden'); 
    } finally { 
        btn.innerText = currentEditExerciseId ? "ACTUALIZAR EJERCICIO" : "GUARDAR EJERCICIO"; 
        btn.disabled = false; 
    }
};

window.toggleMediaInput = function(type) { 
    const checkbox = document.getElementById(`check-${type}`); 
    const container = document.getElementById(`input-${type}-container`); 
    checkbox.checked = !checkbox.checked; 
    if(checkbox.checked) { 
        container.classList.remove('hidden'); 
    } else { 
        container.classList.add('hidden'); 
        document.getElementById(`new-ex-${type}`).value = ''; 
    } 
};

window.promptCopyExercise = function(exId) { 
    exerciseToCopy = window.currentDayExercises.find(e => e.id === exId); 
    document.getElementById('copy-target-day').value = currentActiveDay; 
    window.openModal('modal-copy-exercise'); 
};

window.confirmCopyExercise = async function() {
    const targetDay = document.getElementById('copy-target-day').value; 
    const btn = document.getElementById('btn-confirm-copy'); 
    btn.innerText = "Copiando..."; btn.disabled = true;
    
    const { data: destExercises } = await supabaseClient.from('user_routines').select('id').eq('user_id', currentUserId).eq('day_of_week', targetDay); 
    const newOrderIndex = destExercises ? destExercises.length : 0;
    
    const newEx = { user_id: currentUserId, day_of_week: targetDay, exercise_name: exerciseToCopy.exercise_name, sets: exerciseToCopy.sets, target_reps: exerciseToCopy.target_reps, exercise_type: exerciseToCopy.exercise_type, has_video: exerciseToCopy.has_video, youtube_url: exerciseToCopy.youtube_url, has_image: exerciseToCopy.has_image, image_url: exerciseToCopy.image_url, order_index: newOrderIndex };
    try { 
        const {error} = await supabaseClient.from('user_routines').insert([newEx]); 
        if(error) throw error; 
        window.closeAllModals(); 
        showToast("¡Ejercicio copiado exitosamente!"); 
        if(targetDay === currentActiveDay) { window.changeDay(currentActiveDay); } 
    } catch(e) { alert("Error al copiar: " + e.message); } 
    finally { btn.innerText = "Copiar"; btn.disabled = false; }
};

// --- GUARDAR Y CARGAR HISTORIAL ---
window.saveToCloud = async function(exId, totalSets, exName, exType, btnEvent) {
    const btn = btnEvent.currentTarget; 
    const btnText = btn.querySelector('.btn-text'); 
    let logs = []; 
    const today = new Date(); 
    const dateString = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0') + "-" + String(today.getDate()).padStart(2, '0');
    
    let exTotalSeconds = getExCurrentSeconds(exId);
    window.resetExTimer(exId); 

    for(let i=1; i<=totalSets; i++) { 
        const checked = document.getElementById(`check-${exId}-${i}`).checked; 
        if (checked) {
            if (exType === 'tiempo') {
                let m = document.getElementById(`min-${exId}-${i}`).value || 0; 
                let s = document.getElementById(`seg-${exId}-${i}`).value || 0; 
                let totalSecs = (parseInt(m) * 60) + parseInt(s);
                if(totalSecs > 0) { 
                    logs.push({ user_id: currentUserId, exercise_name: exName, weight: 0, reps: 0, time_seconds: totalSecs, exercise_type: 'tiempo', exercise_duration: exTotalSeconds, set_number: i, log_date: dateString }); 
                }
            } else {
                let w = document.getElementById(`peso-${exId}-${i}`).value; 
                let r = document.getElementById(`reps-${exId}-${i}`).value;
                if(w && r) { 
                    logs.push({ user_id: currentUserId, exercise_name: exName, weight: parseFloat(w), reps: parseInt(r), time_seconds: 0, exercise_type: 'carga', exercise_duration: exTotalSeconds, set_number: i, log_date: dateString }); 
                }
            }
        } 
    }
    
    if(logs.length === 0) { 
        const originalText = btnText.innerText; 
        btn.classList.add('bg-red-600'); 
        btnText.innerText = "MARCÁ 1 SERIE MÍNIMO"; 
        setTimeout(() => { btn.classList.remove('bg-red-600'); btnText.innerText = originalText; }, 2000); 
        return; 
    } 
    
    btnText.innerText = "GUARDANDO...";
    
    try { 
        await supabaseClient.from('workout_logs').delete().eq('user_id', currentUserId).eq('exercise_name', exName).eq('log_date', dateString); 
        await supabaseClient.from('workout_logs').insert(logs); 
        btn.classList.replace('bg-custom-primary', 'bg-green-600'); 
        btnText.innerText = "¡GUARDADO!"; 
        
        const evoContainer = document.getElementById(`evo-container-${exId}`); 
        if(!evoContainer.classList.contains('hidden')) { 
            window.loadEvolucion(exId, exName, exType, true); 
        } 
        
        setTimeout(() => { 
            btn.classList.replace('bg-green-600', 'bg-custom-primary'); 
            btnText.innerText = "GUARDAR SESIÓN"; 
        }, 2000); 
        showToast("¡Entrenamiento registrado!"); 
        playVictory(); 
    } catch (e) { 
        btn.classList.add('bg-red-600'); 
        btnText.innerText = "ERROR"; 
        setTimeout(() => { btn.classList.remove('bg-red-600'); btnText.innerText = "GUARDAR SESIÓN"; }, 2000); 
    }
};

window.loadEvolucion = async function(exId, exName, exType, forceReload = false) {
    const safeExId = escapeHTML(exId); 
    const safeExName = escapeHTML(exName);
    const exNameForJS = exName.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;");
    
    const container = document.getElementById(`evo-container-${safeExId}`); 
    const btn = document.getElementById(`btn-evo-${safeExId}`); 
    
    if (!container.classList.contains('hidden') && !forceReload) { 
        container.classList.add('hidden'); 
        btn.innerText = "VER PROGRESO"; 
        btn.classList.replace('border-custom-primary', 'border-custom-border'); 
        btn.classList.replace('text-white', 'text-custom-textMuted'); 
        return; 
    } 
    
    btn.innerText = "CARGANDO...";
    
    try { 
        const { data, error } = await supabaseClient.from('workout_logs').select('*').eq('user_id', currentUserId).eq('exercise_name', exName).order('log_date', { ascending: true }); 
        if (error) throw error; 
        
        if (data.length === 0) { 
            container.innerHTML = `<div class="text-center p-4 bg-[#171717] rounded-xl border border-custom-border"><p class="text-sm text-custom-textMuted font-medium">Aún no hay datos.</p></div>`; 
            container.classList.remove('hidden'); 
            btn.innerText = "OCULTAR PROGRESO"; 
            return; 
        } 
        
        const groupedData = {}; 
        data.forEach(log => { 
            const [year, month, day] = log.log_date.split('-'); 
            const dateStr = new Date(year, month - 1, day).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }); 
            if (!groupedData[dateStr]) groupedData[dateStr] = { maxStat: 0, totalStat: 0, totalSets: 0, duration: log.exercise_duration || 0, sets: [], rawDate: log.log_date }; 
            
            if (exType === 'tiempo') { 
                if (log.time_seconds > groupedData[dateStr].maxStat) groupedData[dateStr].maxStat = log.time_seconds; 
                groupedData[dateStr].totalStat += log.time_seconds; 
            } else { 
                if (log.weight > groupedData[dateStr].maxStat) groupedData[dateStr].maxStat = log.weight; 
                groupedData[dateStr].totalStat += log.reps; 
            }
            if(log.exercise_duration > groupedData[dateStr].duration) groupedData[dateStr].duration = log.exercise_duration; 
            groupedData[dateStr].totalSets += 1; 
            groupedData[dateStr].sets.push(log); 
        }); 
        
        window.currentHistory[safeExId] = groupedData; 
        const dates = Object.keys(groupedData); 
        const chartDataMax = dates.map(d => groupedData[d].maxStat); 
        const chartDataAvg = dates.map(d => Math.round((groupedData[d].totalStat / groupedData[d].totalSets) * 10) / 10); 
        const chartDataDuration = dates.map(d => parseFloat((groupedData[d].duration / 60).toFixed(2)));
        
        let tableRows = ''; 
        const reversedDates = [...dates].reverse(); 
        
        reversedDates.forEach(date => { 
            const dayData = groupedData[date]; 
            dayData.sets.sort((a,b) => a.set_number - b.set_number); 
            
            const badges = dayData.sets.map(s => { 
                if (exType === 'tiempo') { 
                    return `<span class="inline-block bg-[#262626] border border-[#333] text-xs px-2 py-1 rounded text-custom-textMuted whitespace-nowrap mb-1 mr-1"><strong class="text-white">${formatTime(s.time_seconds)}</strong></span>`; 
                } else { 
                    return `<span class="inline-block bg-[#262626] border border-[#333] text-xs px-2 py-1 rounded text-custom-textMuted whitespace-nowrap mb-1 mr-1"><strong class="text-white">${s.weight}kg</strong> x ${s.reps}</span>`; 
                } 
            }).join(''); 
            
            let durText = dayData.duration > 0 ? formatTime(dayData.duration) : '-';

            tableRows += `
            <tr class="border-b border-custom-border hover:bg-[#171717] transition-colors">
                <td class="py-3 px-3 text-sm font-bold text-custom-primary whitespace-nowrap align-middle">${date}</td>
                <td class="py-3 px-2 text-xs text-custom-textMuted text-center font-medium whitespace-nowrap align-middle">${durText}</td>
                <td class="py-3 px-2 align-middle w-full">${badges}</td>
                <td class="py-3 px-3 align-middle text-right space-x-1 whitespace-nowrap">
                    <button type="button" onclick="window.promptEditLog('${safeExId}', '${exNameForJS}', '${date}', '${exType}')" class="p-1.5 bg-[#262626] rounded text-custom-textMuted hover:text-white transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                    <button type="button" onclick="window.promptDeleteLog('${exNameForJS}', '${dayData.rawDate}', '${safeExId}', '${exType}')" class="p-1.5 bg-red-500/10 rounded text-red-500 hover:bg-red-500 hover:text-white transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </td>
            </tr>`; 
        }); 
        
        const chartTitle1 = exType === 'tiempo' ? 'Tiempo Máximo (Segundos)' : 'Carga Máxima (Kilos)'; 
        const chartTitle2 = exType === 'tiempo' ? 'Promedio de Tiempo (Seg)' : 'Promedio de Repeticiones';

        container.innerHTML = `
        <div class="mb-6 relative">
            <div class="flex overflow-x-auto snap-x-mandatory custom-scroll gap-4 pb-2" id="carousel-${safeExId}">
                <div class="min-w-full snap-center">
                    <h4 class="text-[10px] font-black text-custom-textMuted mb-3 uppercase tracking-[0.2em]">${chartTitle1} <span class="text-[8px] font-normal lowercase">(Deslizá ->)</span></h4>
                    <div class="h-48 w-full bg-[#0a0a0a] rounded-xl p-3 border border-custom-border relative"><canvas id="chart1-${safeExId}"></canvas></div>
                </div>
                <div class="min-w-full snap-center">
                    <h4 class="text-[10px] font-black text-custom-textMuted mb-3 uppercase tracking-[0.2em]">${chartTitle2}</h4>
                    <div class="h-48 w-full bg-[#0a0a0a] rounded-xl p-3 border border-custom-border relative"><canvas id="chart2-${safeExId}"></canvas></div>
                </div>
                <div class="min-w-full snap-center">
                    <h4 class="text-[10px] font-black text-custom-textMuted mb-3 uppercase tracking-[0.2em]">Tiempo de Ejercicio (Minutos)</h4>
                    <div class="h-48 w-full bg-[#0a0a0a] rounded-xl p-3 border border-custom-border relative"><canvas id="chart3-${safeExId}"></canvas></div>
                </div>
            </div>
            <button onclick="window.analyzeProgress('${safeExId}', '${exNameForJS}', '${exType}')" class="w-full mt-2 bg-gradient-to-r from-purple-600/20 to-blue-500/20 border border-purple-500/30 text-purple-400 hover:text-white hover:bg-purple-500/40 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 text-sm"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>Analizar Progreso con IA</button>
        </div>
        <div>
            <h4 class="text-[10px] font-black text-custom-textMuted mb-3 uppercase tracking-[0.2em]">Historial</h4>
            <div class="overflow-x-auto rounded-xl border border-custom-border bg-[#0a0a0a]">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-[#171717]">
                        <tr class="border-b border-custom-border text-custom-textMuted text-[10px] uppercase tracking-widest">
                            <th class="py-3 px-3 font-bold">Día</th>
                            <th class="py-3 px-3 font-bold text-center">Tiempo</th>
                            <th class="py-3 px-2 font-bold">Series</th>
                            <th class="py-3 px-3 font-bold text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        </div>`; 
        container.classList.remove('hidden'); 
        
        if (window.myCharts[safeExId + '-1']) window.myCharts[safeExId + '-1'].destroy(); 
        if (window.myCharts[safeExId + '-2']) window.myCharts[safeExId + '-2'].destroy(); 
        if (window.myCharts[safeExId + '-3']) window.myCharts[safeExId + '-3'].destroy(); 
        
        const ctx1 = document.getElementById(`chart1-${safeExId}`).getContext('2d'); 
        window.myCharts[safeExId + '-1'] = new Chart(ctx1, { type: 'line', data: { labels: dates, datasets: [{ label: chartTitle1, data: chartDataMax, borderColor: '#F54927', backgroundColor: 'rgba(245, 73, 39, 0.1)', borderWidth: 3, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#0a0a0a', pointBorderColor: '#F54927', pointBorderWidth: 2, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false, grid: { color: '#171717' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } } }); 
        const ctx2 = document.getElementById(`chart2-${safeExId}`).getContext('2d'); 
        window.myCharts[safeExId + '-2'] = new Chart(ctx2, { type: 'line', data: { labels: dates, datasets: [{ label: chartTitle2, data: chartDataAvg, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 3, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#0a0a0a', pointBorderColor: '#3b82f6', pointBorderWidth: 2, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false, grid: { color: '#171717' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } } }); 
        const ctx3 = document.getElementById(`chart3-${safeExId}`).getContext('2d'); 
        window.myCharts[safeExId + '-3'] = new Chart(ctx3, { type: 'bar', data: { labels: dates, datasets: [{ label: 'Minutos', data: chartDataDuration, backgroundColor: 'rgba(168, 85, 247, 0.8)', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: '#171717' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } } });

        btn.innerText = "OCULTAR PROGRESO"; 
        btn.classList.replace('border-custom-border', 'border-custom-primary'); 
        btn.classList.replace('text-custom-textMuted', 'text-white'); 
    } catch(err) { 
        btn.innerText = "ERROR"; 
        setTimeout(() => { btn.innerText = "VER PROGRESO"; }, 2000); 
    }
};

window.promptDeleteLog = function(exName, rawDate, exId, exType) {
    const safeExName = escapeHTML(exName); const safeExId = escapeHTML(exId);
    const exNameForJS = exName.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;");
    
    window.openModal('modal-confirm-delete'); 
    const btn = document.getElementById('btn-confirm-delete'); 
    const msgBox = document.getElementById('delete-error-msg'); 
    
    btn.onclick = async () => { 
        btn.innerText = "Borrando..."; btn.disabled = true; msgBox.classList.add('hidden'); 
        try { 
            await supabaseClient.from('workout_logs').delete().eq('user_id', currentUserId).eq('exercise_name', exName).eq('log_date', rawDate); 
            window.closeAllModals(); window.loadEvolucion(safeExId, exNameForJS, exType, true); 
        } catch(e) { msgBox.innerText = e.message; msgBox.classList.remove('hidden'); } 
        finally { btn.innerText = "Borrar"; btn.disabled = false; } 
    };
};

window.promptEditLog = function(exId, exName, dateStr, exType) {
    const safeExId = escapeHTML(exId); 
    const exNameForJS = exName.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;");
    const dayData = window.currentHistory[exId][dateStr]; 
    document.getElementById('edit-log-title').innerText = `Corregir ${dateStr}`; 
    
    let html = ''; 
    let durM = Math.floor(dayData.duration / 60).toString().padStart(2, '0'); 
    let durS = (dayData.duration % 60).toString().padStart(2, '0');

    html += `
        <div class="mb-4 bg-[#171717] p-3 rounded-xl border border-[#262626]">
            <span class="text-xs font-bold text-custom-textMuted uppercase block mb-2">Duración Total del Ejercicio</span>
            <div class="flex items-center bg-[#0a0a0a] border border-[#333] rounded-lg focus-within:border-custom-primary transition-colors overflow-hidden h-[36px] px-2 w-24">
                <input type="text" inputmode="numeric" id="edit-dur-m" value="${durM}" oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,2);" class="w-[35px] h-full bg-transparent text-white text-center text-base font-bold outline-none appearance-none p-0">
                <span class="text-custom-textMuted font-bold mx-1 pb-1">:</span>
                <input type="text" inputmode="numeric" id="edit-dur-s" value="${durS}" oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,2);" class="w-[35px] h-full bg-transparent text-white text-center text-base font-bold outline-none appearance-none p-0">
            </div>
            <p class="text-[10px] text-custom-textMuted mt-2">Ponelo en 00:00 si querés borrarlo del gráfico.</p>
        </div>
        <div class="space-y-3 mb-2">
    `;

    dayData.sets.forEach(s => { 
        if(exType === 'tiempo') {
            let m = Math.floor(s.time_seconds / 60); let seg = s.time_seconds % 60; let padM = m.toString().padStart(2, '0'); let padSeg = seg.toString().padStart(2, '0');
            html += `<div class="flex items-center justify-between bg-[#171717] p-3 rounded-xl border border-[#262626]"><span class="text-xs font-bold text-custom-primary uppercase tracking-wider w-12">Set ${s.set_number}</span><div class="flex items-center bg-[#0a0a0a] border border-[#333] rounded-lg focus-within:border-custom-primary transition-colors overflow-hidden h-[36px] px-2"><input type="text" inputmode="numeric" pattern="[0-9]*" id="edit-m-${s.id}" value="${padM}" oninput="this.value=this.value.replace(/[^0-9]/g,''); if(this.value.length>=2){ let n=document.getElementById('edit-s-${s.id}'); n.focus(); if(this.value.length>2){ n.value=this.value.slice(2,4); } this.value=this.value.slice(0,2); }" class="w-[35px] h-full bg-transparent text-white text-center text-base font-bold outline-none appearance-none p-0"><span class="text-custom-textMuted font-bold mx-1 pb-1">:</span><input type="text" inputmode="numeric" pattern="[0-9]*" id="edit-s-${s.id}" value="${padSeg}" oninput="this.value=this.value.replace(/[^0-9]/g,''); if(this.value.length>2) this.value=this.value.slice(0,2);" class="w-[35px] h-full bg-transparent text-white text-center text-base font-bold outline-none appearance-none p-0"></div></div>`;
        } else {
            html += `<div class="flex items-center justify-between bg-[#171717] p-3 rounded-xl border border-[#262626]"><span class="text-xs font-bold text-custom-primary uppercase tracking-wider w-12">Set ${s.set_number}</span><div class="flex items-center gap-2"><input type="number" id="edit-w-${s.id}" value="${s.weight}" class="w-16 bg-[#0a0a0a] border border-[#333] rounded-lg text-center text-white py-1.5 font-bold outline-none focus:border-custom-primary"><span class="text-[10px] text-custom-textMuted">kg</span><span class="text-custom-textMuted mx-1">x</span><input type="number" id="edit-r-${s.id}" value="${s.reps}" class="w-16 bg-[#0a0a0a] border border-[#333] rounded-lg text-center text-white py-1.5 font-bold outline-none focus:border-custom-primary"><span class="text-[10px] text-custom-textMuted">rep</span></div></div>`; 
        }
    }); 
    html += `</div>`;
    
    document.getElementById('edit-log-sets-container').innerHTML = html; 
    const btn = document.getElementById('btn-save-edit'); 
    const msgBox = document.getElementById('edit-error-msg'); 
    
    btn.onclick = async () => { 
        btn.innerText = "Actualizando..."; btn.disabled = true; msgBox.classList.add('hidden'); 
        try { 
            let dM = parseInt(document.getElementById('edit-dur-m').value) || 0; 
            let dS = parseInt(document.getElementById('edit-dur-s').value) || 0; 
            let newDuration = (dM * 60) + dS;

            for(let s of dayData.sets) { 
                if(exType === 'tiempo') {
                    let m = document.getElementById(`edit-m-${s.id}`).value || 0; let seg = document.getElementById(`edit-s-${s.id}`).value || 0; let t = (parseInt(m)*60) + parseInt(seg);
                    await supabaseClient.from('workout_logs').update({ time_seconds: t, exercise_duration: newDuration }).eq('id', s.id);
                } else {
                    let w = document.getElementById(`edit-w-${s.id}`).value; let r = document.getElementById(`edit-r-${s.id}`).value; 
                    await supabaseClient.from('workout_logs').update({ weight: parseFloat(w), reps: parseInt(r), exercise_duration: newDuration }).eq('id', s.id); 
                }
            } 
            window.closeAllModals(); window.loadEvolucion(safeExId, exNameForJS, exType, true); 
        } catch(e) { msgBox.innerText = e.message; msgBox.classList.remove('hidden'); } finally { btn.innerText = "Actualizar Datos"; btn.disabled = false; } 
    }; 
    window.openModal('modal-edit-log');
};

// --- SOPORTE TÉCNICO ---
window.submitSupportTicket = async function() {
    const msg = document.getElementById('support-text').value.trim(); if(!msg) return;
    const btn = document.getElementById('btn-submit-support'); btn.disabled = true; btn.innerText = "Enviando...";
    try {
        const { error } = await supabaseClient.from('support_tickets').insert([{ user_id: currentUserId, message: msg }]); if(error) throw error;
        document.getElementById('support-text').value = ''; document.getElementById('support-text').classList.add('hidden'); btn.classList.add('hidden');
        document.getElementById('support-msg-feedback').innerText = "¡Recibimos tu mensaje! Lo leeremos pronto."; document.getElementById('support-msg-feedback').classList.remove('hidden');
        setTimeout(() => { window.closeAllModals(); setTimeout(() => { document.getElementById('support-text').classList.remove('hidden'); btn.classList.remove('hidden'); document.getElementById('support-msg-feedback').classList.add('hidden'); btn.innerText = "Enviar Mensaje"; btn.disabled = false; }, 500); }, 2000);
    } catch(e) { alert("Error: " + e.message); btn.innerText = "Enviar Mensaje"; btn.disabled = false; }
};

// --- COACH IA ---
window.handleAIGenerationRequest = function() { document.getElementById('ai-prompt').value = ""; window.openModal('modal-ai-coach'); };
window.processAIPrompt = async function() {
    const userPrompt = document.getElementById('ai-prompt').value; const msgBox = document.getElementById('ai-error-msg');
    if(!userPrompt) { msgBox.innerText = "Escribí tu objetivo para que el Coach Inteligente arme la rutina."; msgBox.classList.remove('hidden'); return; }
    try { const { count, error } = await supabaseClient.from('user_routines').select('*', { count: 'exact', head: true }).eq('user_id', currentUserId); if (error) throw error; 
        currentAIPrompt = userPrompt + ". MUY IMPORTANTE: Devuelve un JSON exacto. La rutina debe ser COMPLETA y exigente, incluyendo al menos 5 a 6 ejercicios por cada día de entrenamiento. Cada ejercicio DEBE tener: 'day_of_week', 'exercise_name', 'sets', 'target_reps' (incluye el descanso aquí, ej: '10 reps - 60s rest'), y 'exercise_type' (debe ser estrictamente la palabra 'carga' si es de peso/repeticiones o 'tiempo' si es isometría/cardio/planchas)."; 
        if (count > 0) window.openModal('modal-confirm-ai-overwrite'); else window.proceedWithAIGeneration();
    } catch(e) { msgBox.innerText = e.message; msgBox.classList.remove('hidden'); }
};
window.proceedWithAIGeneration = async function() {
    window.closeAllModals(); document.getElementById('loading-title').innerText = "Diseñando Rutina..."; document.getElementById('loading-desc').innerText = "El Coach Inteligente está diseñando tu semana de entrenamiento. Por favor, no cierres esta ventana."; document.getElementById('ai-loading-overlay').classList.remove('hidden'); document.getElementById('ai-loading-overlay').classList.add('flex');
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const { data, error } = await supabaseClient.functions.invoke('coach', { headers: { Authorization: `Bearer ${session.access_token}` }, body: { action: 'generate_routine', prompt: currentAIPrompt } });
        if(error) throw new Error(error.message); if(data && data.error) throw new Error(data.error);
        let rawJson = data.response.candidates[0].content.parts[0].text; rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim(); const routineData = JSON.parse(rawJson);
        const { data: globalMedia } = await supabaseClient.from('global_media_bank').select('*'); await supabaseClient.from('user_routines').delete().eq('user_id', currentUserId);
        const exercisesToInsert = routineData.map((ex, index) => { 
            const cleanDay = ex.day_of_week.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); let exType = ex.exercise_type === 'tiempo' ? 'tiempo' : 'carga';
            let imgUrl = ""; let hasImg = false; let ytUrl = ""; let hasVid = false;
            if (globalMedia) { const match = globalMedia.find(gm => ex.exercise_name.toLowerCase().includes(gm.exercise_name.toLowerCase()) || gm.exercise_name.toLowerCase().includes(ex.exercise_name.toLowerCase())); if (match) { imgUrl = match.image_url || ""; hasImg = match.has_image || false; ytUrl = match.youtube_url || ""; hasVid = match.has_video || false; } }
            return { user_id: currentUserId, day_of_week: cleanDay, exercise_name: ex.exercise_name, sets: ex.sets, target_reps: ex.target_reps, exercise_type: exType, has_video: hasVid, youtube_url: ytUrl, has_image: hasImg, image_url: imgUrl, order_index: index }; 
        });
        const { error: dbError } = await supabaseClient.from('user_routines').insert(exercisesToInsert); if(dbError) throw new Error(dbError.message);
        if(data.remaining_credits !== undefined) { const hasInf = document.getElementById('ai-credit-count').innerHTML.includes('infin'); if(!hasInf) { document.getElementById('ai-credit-count').innerText = data.remaining_credits; animateTokenLoss(); } }
        document.getElementById('ai-loading-overlay').classList.add('hidden'); document.getElementById('ai-loading-overlay').classList.remove('flex'); window.openModal('modal-ai-success');
    } catch(e) { document.getElementById('ai-loading-overlay').classList.add('hidden'); document.getElementById('ai-loading-overlay').classList.remove('flex'); window.openModal('modal-ai-coach'); document.getElementById('ai-error-msg').innerText = "Detalle: " + e.message; document.getElementById('ai-error-msg').classList.remove('hidden'); }
};

window.openChatModal = function() { const savedChat = localStorage.getItem(`hat_chat_${currentUserId}`); if(savedChat) { window.chatHistory = JSON.parse(savedChat); } else { window.chatHistory = []; } renderChat(); window.openModal('modal-ai-chat'); };
window.promptClearChat = function() { window.closeAllModals(); window.openModal('modal-confirm-clear-chat'); };
window.cancelClearChat = function() { window.closeAllModals(); window.openModal('modal-ai-chat'); };
window.confirmClearChatHistory = function() { window.chatHistory = []; localStorage.removeItem(`hat_chat_${currentUserId}`); window.closeAllModals(); window.openChatModal(); };
function renderChat() {
    const container = document.getElementById('chat-messages'); container.innerHTML = '<div class="text-center text-xs font-bold text-custom-textMuted py-4 uppercase tracking-widest">El historial se guarda en tu dispositivo</div><div class="chat-bubble-ai">¡Hola! Soy tu Coach Inteligente. ¿En qué te ayudo hoy con tu entrenamiento?</div>';
    window.chatHistory.forEach(msg => { const isUser = msg.role === 'user'; const html = `<div class="${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}">${formatMarkdown(escapeHTML(msg.parts[0].text))}</div>`; container.innerHTML += html; }); container.scrollTop = container.scrollHeight;
}
window.askCoachAbout = function(exName) { window.closeAllModals(); window.openChatModal(); const input = document.getElementById('chat-input'); input.value = `Mi duda con el ejercicio ${exName} es: `; input.focus(); };
window.analyzeProgress = function(exId, exName, exType) {
    const history = window.currentHistory[exId]; if(!history) return; const dates = Object.keys(history); 
    if (dates.length < 3) { showToast("⚠️ Entrená al menos 3 veces para activar el análisis IA."); return; }
    let dataStr = ""; dates.forEach(d => { const max = history[d].maxStat; const avg = history[d].totalStat / history[d].totalSets; if(exType === 'tiempo') { dataStr += `Fecha: ${d} | Max: ${formatTime(max)} | Promedio: ${formatTime(avg)}\n`; } else { dataStr += `Fecha: ${d} | Peso Max: ${max}kg | Promedio Reps: ${avg.toFixed(1)}\n`; } });
    const prompt = `Actúa como mi Coach Deportivo. Analiza mi evolución en el ejercicio "${exName}". Aquí están mis datos ordenados por fecha:\n\n${dataStr}\nDame una devolución técnica y motivadora de 1 o 2 párrafos cortos. Dime si vengo mejorando o si estoy estancado. No saludes al principio.`;
    window.closeAllModals(); window.openChatModal(); const input = document.getElementById('chat-input'); input.value = prompt; window.sendChatMessage(); 
};
window.sendChatMessage = async function() {
    const input = document.getElementById('chat-input'); const text = input.value.trim(); if(!text) return;
    window.chatHistory.push({ role: 'user', parts: [{ text: text }] }); input.value = ''; input.style.height = ''; renderChat();
    const btn = document.getElementById('btn-send-chat'); btn.disabled = true; btn.innerHTML = '<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>';
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const { data, error } = await supabaseClient.functions.invoke('coach', { headers: { Authorization: `Bearer ${session.access_token}` }, body: { action: 'chat', history: window.chatHistory } });
        if(error) throw new Error(error.message); if(data && data.error) throw new Error(data.error);
        const aiReply = data.response.candidates[0].content.parts[0].text; window.chatHistory.push({ role: 'model', parts: [{ text: aiReply }] }); localStorage.setItem(`hat_chat_${currentUserId}`, JSON.stringify(window.chatHistory));
        if(data.remaining_credits !== undefined) { const hasInf = document.getElementById('ai-credit-count').innerHTML.includes('infin'); if(!hasInf) { document.getElementById('ai-credit-count').innerText = data.remaining_credits; animateTokenLoss(); } }
    } catch(e) { window.chatHistory.push({ role: 'model', parts: [{ text: `❌ Error: ${e.message}` }] }); } finally { renderChat(); btn.disabled = false; btn.innerHTML = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>'; }
};

window.promptDeleteEntireRoutine = function() { window.openModal('modal-confirm-delete-all'); };
window.confirmDeleteEntireRoutine = async function() { window.closeAllModals(); document.getElementById('loading-title').innerText = "Borrando Semana..."; document.getElementById('loading-desc').innerText = "Limpiando todos los ejercicios de tu plan..."; document.getElementById('ai-loading-overlay').classList.remove('hidden'); document.getElementById('ai-loading-overlay').classList.add('flex'); try { const { error } = await supabaseClient.from('user_routines').delete().eq('user_id', currentUserId); if(error) throw error; window.changeDay('lunes'); } catch(e) { alert("Error al borrar rutina: " + e.message); } finally { document.getElementById('ai-loading-overlay').classList.add('hidden'); document.getElementById('ai-loading-overlay').classList.remove('flex'); } };
