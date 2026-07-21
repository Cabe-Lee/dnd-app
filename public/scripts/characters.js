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
        // Sort by id descending so newest characters (highest id) appear on top.
        characters.sort((a, b) => (b.id || 0) - (a.id || 0));
        characters.forEach(c => {
            const card = document.createElement('a');
            card.href = `pc.html?id=${c.id}`;
            card.style.cssText = 'border: 1px solid #555; border-radius: 8px; padding: 12px 16px; display: flex; gap: 24px; align-items: center; background: #1e1e1e; color: #ddd; text-decoration: none; cursor: pointer; transition: background 0.2s;';
            card.onmouseover = () => card.style.background = '#2a2a2a';
            card.onmouseout = () => card.style.background = '#1e1e1e';
            card.innerHTML = `
                <span style="font-weight: 700; font-size: 1.2em; color: #fff;">${c.name || 'Unknown'}</span>
                <span>Lvl ${c.level ?? '?'}</span>
                <span>${c.class || '?'}</span>
                <span>${c.race || '?'}</span>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        container.textContent = 'Failed to load characters. Make sure the server is running.';
        console.error(err);
    }
}

loadCharacters();
