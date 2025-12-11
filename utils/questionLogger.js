
// This utility handles logging user questions locally and exporting them to a file.
// Since this is a client-side app, we store logs in memory/localStorage and provide a download method.

const STORAGE_KEY = 'prani_mitra_user_questions';

export const logQuestion = (question) => {
    if (!question || !question.trim()) return;

    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${question.trim()}`;

    // Get existing logs
    const existingLogs = getLogs();
    existingLogs.push(logEntry);

    // Save back to local storage (optional, for persistence across reloads)
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existingLogs));
    } catch (e) {
        console.error('Failed to save log to localStorage', e);
    }
};

export const getLogs = () => {
    try {
        const logs = localStorage.getItem(STORAGE_KEY);
        return logs ? JSON.parse(logs) : [];
    } catch (e) {
        return [];
    }
};

export const downloadLogs = () => {
    const logs = getLogs();
    if (logs.length === 0) {
        alert("No questions recorded yet.");
        return;
    }

    const fileContent = logs.join('\n');
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `user_questions_log_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const clearLogs = () => {
    localStorage.removeItem(STORAGE_KEY);
};
