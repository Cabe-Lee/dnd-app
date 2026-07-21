let currentCharacterId = null;
let currentAbilityScores = null;

function abilityModifier(score) {
    const s = Number(score);
    if (Number.isNaN(s)) return 0;
    return Math.floor((s - 10) / 2);
}

function displayAbilityScores(scores) {
    currentAbilityScores = { ...scores };
    const container = document.getElementById('pc-abilities');
    const map = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };
    container.innerHTML = '';
    Object.entries(map).forEach(([key, label]) => {
        const val = scores?.[key] ?? 0;
        const mod = abilityModifier(val);

        const div = document.createElement('div');
        div.style.cssText = 'text-align: center; min-width: 70px;';

        const labelDiv = document.createElement('div');
        labelDiv.style.cssText = 'font-weight: 700; font-size: 0.85em; color: #aaa;';
        labelDiv.textContent = label;

        const input = document.createElement('input');
        input.type = 'number';
        input.value = val;
        input.style.cssText = 'font-size: 1.6em; font-weight: 700; width: 60px; text-align: center; background: #1e1e1e; color: #fff; border: 1px solid #555; border-radius: 4px;';
        input.title = 'Type a number and press Enter to change the ability score.';

        // Show instruction message on focus, hide on blur — every time the user interacts.
        (function setupInstruction() {
            const instructionId = 'pc-ability-instruction';
            let instructionEl = document.getElementById(instructionId);
            if (!instructionEl) {
                instructionEl = document.createElement('div');
                instructionEl.id = instructionId;
                instructionEl.textContent = 'Tip: Type a number and press Enter to change the ability score.';
                instructionEl.style.cssText = 'color: #aaa; font-size: 0.85em; margin-bottom: 8px; display: none;';
                const abilitiesContainer = document.getElementById('pc-abilities');
                if (abilitiesContainer && abilitiesContainer.parentElement) {
                    abilitiesContainer.parentElement.insertBefore(instructionEl, abilitiesContainer);
                }
            }
            input.addEventListener('focus', function showTip() {
                instructionEl.style.display = 'block';
            });
            input.addEventListener('blur', function hideTip() {
                instructionEl.style.display = 'none';
            });
        })();

        const modSpan = document.createElement('div');
        modSpan.style.cssText = `color: ${mod >= 0 ? '#5a5' : '#c55'};`;
        modSpan.textContent = `${mod >= 0 ? '+' : ''}${mod}`;

        // On Enter: if the number changed, save to JSON and update the display in-place.
        input.addEventListener('keydown', async function onEnter(e) {
            if (e.key === 'Enter') {
                const raw = input.value;
                const parsed = raw === '' ? 0 : Number.parseInt(raw, 10);
                const newVal = Number.isNaN(parsed) ? 0 : parsed;
                // Only save and update if the value actually changed
                if (newVal !== (currentAbilityScores?.[key] ?? 0)) {
                    currentAbilityScores[key] = newVal;
                    await saveField('abilityScores', { ...currentAbilityScores });
                    // Update modifier span
                    const newMod = abilityModifier(newVal);
                    modSpan.textContent = `${newMod >= 0 ? '+' : ''}${newMod}`;
                    modSpan.style.color = newMod >= 0 ? '#5a5' : '#c55';
                    // Re-render saving throws and skills with the new ability scores
                    const profBonus = Number(document.getElementById('pc-prof-bonus').textContent) || 0;
                    const currentSavingThrows = {};
                    document.querySelectorAll('#pc-saving-throws input[type="checkbox"]').forEach(function (cb) {
                        const saveKey = cb.id.replace('-saving-throw-input', '');
                        currentSavingThrows[saveKey] = cb.checked;
                    });
                    displaySavingThrowsWithModifiers(currentSavingThrows, currentAbilityScores, profBonus);
                    const currentSkills = {};
                    const skillKeyMap = {
                        'acrobatics-input': 'acrobatics', 'animal-handling-input': 'animalHandling', 'arcana-input': 'arcana',
                        'athletics-input': 'athletics', 'deception-input': 'deception', 'history-input': 'history',
                        'insight-input': 'insight', 'intimidation-input': 'intimidation', 'investigation-input': 'investigation',
                        'medicine-input': 'medicine', 'nature-input': 'nature', 'perception-input': 'perception',
                        'performance-input': 'performance', 'persuasion-input': 'persuasion', 'religion-input': 'religion',
                        'sleight-of-hand-input': 'sleightOfHand', 'stealth-input': 'stealth', 'survival-input': 'survival'
                    };
                    document.querySelectorAll('#pc-skills input[type="checkbox"]').forEach(function (cb) {
                        const skillKey = skillKeyMap[cb.id];
                        if (skillKey) currentSkills[skillKey] = cb.checked;
                    });
                    displaySkillsWithModifiers(currentSkills, currentAbilityScores, profBonus);
                }
            }
        });

        div.appendChild(labelDiv);
        div.appendChild(input);
        div.appendChild(modSpan);
        container.appendChild(div);
    });
}

async function saveToggle(endpointKey, toggleKey, checked) {
    const body = {};
    body[endpointKey] = { [toggleKey]: checked };
    try {
        const res = await fetch(`/api/characters/${currentCharacterId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) console.error('Save failed:', await res.text());
    } catch (err) {
        console.error('Failed to save toggle:', err);
    }
}

function displaySkillsWithModifiers(skills, abilityScores, proficiencyBonus) {
    const container = document.getElementById('pc-skills');
    container.innerHTML = '';

    const skillAbilityMap = {
        acrobatics: 'dexterity', animalHandling: 'wisdom', arcana: 'intelligence',
        athletics: 'strength', deception: 'charisma', history: 'intelligence',
        insight: 'wisdom', intimidation: 'charisma', investigation: 'intelligence',
        medicine: 'wisdom', nature: 'intelligence', perception: 'wisdom',
        performance: 'charisma', persuasion: 'charisma', religion: 'intelligence',
        sleightOfHand: 'dexterity', stealth: 'dexterity', survival: 'wisdom'
    };

    const skillLabels = {
        acrobatics: 'Acrobatics (DEX)', animalHandling: 'Animal Handling (WIS)', arcana: 'Arcana (INT)',
        athletics: 'Athletics (STR)', deception: 'Deception (CHA)', history: 'History (INT)',
        insight: 'Insight (WIS)', intimidation: 'Intimidation (CHA)', investigation: 'Investigation (INT)',
        medicine: 'Medicine (WIS)', nature: 'Nature (INT)', perception: 'Perception (WIS)',
        performance: 'Performance (CHA)', persuasion: 'Persuasion (CHA)', religion: 'Religion (INT)',
        sleightOfHand: 'Sleight of Hand (DEX)', stealth: 'Stealth (DEX)', survival: 'Survival (WIS)'
    };

    const profBonus = Number(proficiencyBonus) || 0;

    Object.entries(skillLabels).forEach(([key, label]) => {
        const isProficient = skills?.[key] ?? false;
        const abilityVal = abilityScores?.[skillAbilityMap[key]] ?? 0;
        const baseMod = abilityModifier(abilityVal);
        const total = baseMod + (isProficient ? profBonus : 0);

        const div = document.createElement('div');
        div.style.cssText = 'display: flex; align-items: center; gap: 4px; font-size: 0.9em;';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isProficient;
        checkbox.addEventListener('change', (e) => {
            const newChecked = e.target.checked;
            const newTotal = baseMod + (newChecked ? profBonus : 0);
            totalSpan.textContent = `${newTotal >= 0 ? '+' : ''}${newTotal}`;
            totalSpan.style.color = newTotal >= 0 ? '#5a5' : '#c55';
            saveToggle('skills', key, newChecked);
        });

        const totalSpan = document.createElement('span');
        totalSpan.style.cssText = `font-weight: 600; min-width: 24px; color: ${total >= 0 ? '#5a5' : '#c55'};`;
        totalSpan.textContent = `${total >= 0 ? '+' : ''}${total}`;

        const labelSpan = document.createElement('span');
        labelSpan.style.color = '#bbb';
        labelSpan.textContent = label;

        div.appendChild(checkbox);
        div.appendChild(totalSpan);
        div.appendChild(labelSpan);
        container.appendChild(div);
    });
}

function displaySavingThrowsWithModifiers(savingThrows, abilityScores, proficiencyBonus) {
    const container = document.getElementById('pc-saving-throws');
    container.innerHTML = '';

    const saveMap = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };
    const profBonus = Number(proficiencyBonus) || 0;

    Object.entries(saveMap).forEach(([key, label]) => {
        const isProficient = savingThrows?.[key] ?? false;
        const abilityVal = abilityScores?.[key] ?? 0;
        const baseMod = abilityModifier(abilityVal);
        const total = baseMod + (isProficient ? profBonus : 0);

        const div = document.createElement('div');
        div.style.cssText = 'display: flex; align-items: center; gap: 4px; font-size: 0.9em;';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isProficient;
        checkbox.addEventListener('change', (e) => {
            const newChecked = e.target.checked;
            const newTotal = baseMod + (newChecked ? profBonus : 0);
            totalSpan.textContent = `${newTotal >= 0 ? '+' : ''}${newTotal}`;
            totalSpan.style.color = newTotal >= 0 ? '#5a5' : '#c55';
            saveToggle('savingThrows', key, newChecked);
        });

        const totalSpan = document.createElement('span');
        totalSpan.style.cssText = `font-weight: 600; min-width: 24px; color: ${total >= 0 ? '#5a5' : '#c55'};`;
        totalSpan.textContent = `${total >= 0 ? '+' : ''}${total}`;

        const labelSpan = document.createElement('span');
        labelSpan.style.color = '#bbb';
        labelSpan.textContent = label;

        div.appendChild(checkbox);
        div.appendChild(totalSpan);
        div.appendChild(labelSpan);
        container.appendChild(div);
    });
}

async function saveField(field, value) {
    const body = {};
    body[field] = value;
    try {
        const res = await fetch(`/api/characters/${currentCharacterId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) console.error('Save failed:', await res.text());
    } catch (err) {
        console.error('Failed to save field:', err);
    }
}

async function loadCharacter() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        document.getElementById('pc-loading').textContent = 'No character ID specified. Go back and select a character.';
        return;
    }

    currentCharacterId = Number(id);

    try {
        const res = await fetch('/api/characters');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const characters = await res.json();
        const c = characters.find(ch => ch.id === currentCharacterId);

        if (!c) {
            document.getElementById('pc-loading').textContent = 'Character not found.';
            return;
        }

        document.getElementById('pc-loading').style.display = 'none';
        document.getElementById('pc-content').style.display = 'block';

        document.getElementById('pc-name').textContent = c.name || 'Unknown';
        document.getElementById('pc-race-class').textContent = `${c.race || '?'} ${c.class || '?'}`;
        document.getElementById('pc-level').textContent = `Level ${c.level ?? '?'}`;
        document.getElementById('pc-alignment').textContent = c.alignment || '';
        document.getElementById('pc-hp').textContent = c.hitPoints ?? '?';
        document.getElementById('pc-ac').textContent = c.armorClass ?? '?';
        document.getElementById('pc-hit-dice').textContent = c.hitDice || '?';
        const profBonus = Number(c.proficiencyBonus) || 0;
        document.getElementById('pc-prof-bonus').textContent = `${profBonus >= 0 ? '+' : ''}${profBonus}`;
        document.getElementById('pc-background').textContent = c.background || '—';
        document.getElementById('pc-personality').textContent = c.personalityTraits || '—';
        document.getElementById('pc-ideals').textContent = c.ideals || '—';
        document.getElementById('pc-bonds').textContent = c.bonds || '—';
        document.getElementById('pc-flaws').textContent = c.flaws || '—';
        document.getElementById('pc-equipment').textContent = (c.equipment && c.equipment.length) ? c.equipment.join(', ') : '—';

        // Hit Points Left: auto-populate from saved value or default to hitPoints
        const hpLeftInput = document.getElementById('pc-hp-left');
        const savedHpLeft = c.hitPointsLeft;
        hpLeftInput.value = savedHpLeft !== undefined && savedHpLeft !== null ? savedHpLeft : (c.hitPoints ?? '');
        hpLeftInput.addEventListener('input', () => {
            const val = Number(hpLeftInput.value);
            if (Number.isNaN(val)) return;
            saveField('hitPointsLeft', val);
        });

        displayAbilityScores(c.abilityScores);
        displaySavingThrowsWithModifiers(c.savingThrows, c.abilityScores, c.proficiencyBonus);
        displaySkillsWithModifiers(c.skills, c.abilityScores, c.proficiencyBonus);

    } catch (err) {
        document.getElementById('pc-loading').textContent = 'Failed to load character. Make sure the server is running.';
        console.error(err);
    }
}

// Run on page load
loadCharacter();
