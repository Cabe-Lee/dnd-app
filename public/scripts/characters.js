let deleteModeActive = false;
let pendingDeleteId = null;

async function loadCharacters() {
    const container = document.getElementById('character-list');
    container.textContent = 'Loading...';
    try {
        const res = await fetch('/api/characters');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const characters = await res.json();
        if (!characters || characters.length === 0) {
            container.textContent = 'No characters found. Create one!';
            return;
        }
        container.innerHTML = '';
        characters.sort((a, b) => (b.id || 0) - (a.id || 0));
        characters.forEach(c => {
            const cardWrapper = document.createElement('div');
            cardWrapper.style.cssText = 'display: flex; align-items: center; gap: 8px;';

            const deleteXBtn = document.createElement('button');
            deleteXBtn.textContent = '✕';
            deleteXBtn.style.cssText = 'background: #c55; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; padding: 8px 10px; display: none; font-weight: 700;';
            deleteXBtn.title = 'Delete this character';
            deleteXBtn.addEventListener('click', () => {
                pendingDeleteId = c.id;
                const nameSpan = document.getElementById('delete-target-name');
                if (nameSpan) nameSpan.textContent = c.name || 'Unknown';
                const confirmDiv = document.getElementById('delete-confirmation');
                if (confirmDiv) confirmDiv.style.display = 'block';
            });

            const card = document.createElement('a');
            card.href = `pc.html?id=${c.id}`;
            card.style.cssText = 'border: 1px solid #555; border-radius: 8px; padding: 12px 16px; display: flex; gap: 24px; align-items: center; background: #1e1e1e; color: #ddd; text-decoration: none; cursor: pointer; transition: background 0.2s; flex: 1;';
            card.onmouseover = () => card.style.background = '#2a2a2a';
            card.onmouseout = () => card.style.background = '#1e1e1e';
            card.innerHTML = `
                <span style="font-weight: 700; font-size: 1.2em; color: #fff;">${c.name || 'Unknown'}</span>
                <span>Lvl ${c.level ?? '?'}</span>
                <span>${c.class || '?'}</span>
                <span>${c.race || '?'}</span>
            `;

            cardWrapper.appendChild(deleteXBtn);
            cardWrapper.appendChild(card);
            container.appendChild(cardWrapper);
        });
    } catch (err) {
        container.textContent = 'Failed to load characters. Make sure the server is running.';
        console.error(err);
    }
}

function renderDeleteMode() {
    const deleteBtn = document.getElementById('delete-mode-btn');
    const xButtons = document.querySelectorAll('#character-list > div > button:first-child');

    if (deleteModeActive) {
        deleteBtn.textContent = 'Stop Delete Mode';
        deleteBtn.style.background = '#c55';
        xButtons.forEach(btn => btn.style.display = 'block');
    } else {
        deleteBtn.textContent = 'Delete Characters';
        deleteBtn.style.background = '';
        xButtons.forEach(btn => btn.style.display = 'none');
        const confirmDiv = document.getElementById('delete-confirmation');
        if (confirmDiv) confirmDiv.style.display = 'none';
        pendingDeleteId = null;
    }
}

async function confirmDelete() {
    if (pendingDeleteId === null) return;
    try {
        const res = await fetch(`/api/characters/${pendingDeleteId}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        pendingDeleteId = null;
        const confirmDiv = document.getElementById('delete-confirmation');
        if (confirmDiv) confirmDiv.style.display = 'none';
        await loadCharacters();
        renderDeleteMode();
    } catch (err) {
        console.error('Failed to delete character:', err);
    }
}

function cancelDelete() {
    pendingDeleteId = null;
    const confirmDiv = document.getElementById('delete-confirmation');
    if (confirmDiv) confirmDiv.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    const deleteBtn = document.getElementById('delete-mode-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            deleteModeActive = !deleteModeActive;
            renderDeleteMode();
        });
    }

    const confirmYesBtn = document.getElementById('confirm-delete-yes');
    if (confirmYesBtn) {
        confirmYesBtn.addEventListener('click', confirmDelete);
    }

    const confirmNoBtn = document.getElementById('confirm-delete-no');
    if (confirmNoBtn) {
        confirmNoBtn.addEventListener('click', cancelDelete);
    }
});

loadCharacters();