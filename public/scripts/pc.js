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
        div.style.cssText = 'text-align: center; min-width: 96px;';

        const labelDiv = document.createElement('div');
        labelDiv.style.cssText = 'font-weight: 700; font-size: 0.85em; color: #aaa;';
        labelDiv.textContent = label;

        const input = document.createElement('input');
        input.type = 'number';
        input.value = val;
        input.style.cssText = 'font-size: 1.6em; font-weight: 700; width: 84px; min-width: 84px; text-align: center; background: #1e1e1e; color: #fff; border: 1px solid #555; border-radius: 8px; padding: 4px 8px;';
        input.title = 'Type a number and press Enter to change the ability score.';

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

        input.addEventListener('keydown', async function onEnter(e) {
            if (e.key === 'Enter') {
                const raw = input.value;
                const parsed = raw === '' ? 0 : Number.parseInt(raw, 10);
                const newVal = Number.isNaN(parsed) ? 0 : parsed;
                if (newVal !== (currentAbilityScores?.[key] ?? 0)) {
                    currentAbilityScores[key] = newVal;
                    await saveField('abilityScores', { ...currentAbilityScores });
                    const newMod = abilityModifier(newVal);
                    modSpan.textContent = `${newMod >= 0 ? '+' : ''}${newMod}`;
                    modSpan.style.color = newMod >= 0 ? '#5a5' : '#c55';
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

function rollD20() {
    return Math.floor(Math.random() * 20) + 1;
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
        labelSpan.style.cursor = 'pointer';
        labelSpan.style.textDecoration = 'underline dotted';
        labelSpan.title = 'Click to roll d20 + modifier';
        labelSpan.textContent = label;

        const rollResultSpan = document.createElement('span');
        rollResultSpan.style.cssText = 'font-size: 0.85em; color: #e0b040; min-width: 80px;';

        const rollHistory = [];
        labelSpan.addEventListener('click', () => {
            const d20 = rollD20();
            const resultVal = d20 + total;
            const sign = total >= 0 ? '+' : '';
            const resultText = `🎲 ${resultVal} (${d20} ${sign}${total})`;
            rollHistory.push(resultText);
            while (rollHistory.length > 2) {
                rollHistory.shift();
            }
            rollResultSpan.textContent = rollHistory.join('  |  ');
        });
        div.appendChild(checkbox);
        div.appendChild(totalSpan);
        div.appendChild(labelSpan);
        div.appendChild(rollResultSpan);
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
        labelSpan.style.cursor = 'pointer';
        labelSpan.style.textDecoration = 'underline dotted';
        labelSpan.title = 'Click to roll d20 + modifier';
        labelSpan.textContent = label;

        const rollResultSpan = document.createElement('span');
        rollResultSpan.style.cssText = 'font-size: 0.85em; color: #e0b040; min-width: 80px;';

        const rollHistory = [];
        labelSpan.addEventListener('click', () => {
            const d20 = rollD20();
            const resultVal = d20 + total;
            const sign = total >= 0 ? '+' : '';
            const resultText = `🎲 ${resultVal} (${d20} ${sign}${total})`;
            rollHistory.push(resultText);
            while (rollHistory.length > 2) {
                rollHistory.shift();
            }
            rollResultSpan.textContent = rollHistory.join('  |  ');
        });
        div.appendChild(checkbox);
        div.appendChild(totalSpan);
        div.appendChild(labelSpan);
        div.appendChild(rollResultSpan);
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

function setupEditableTextField(inputId, jsonField) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const instructionEl = document.getElementById('pc-text-input-instruction');
    if (!instructionEl) return;

    input.addEventListener('focus', function showTip() {
        instructionEl.style.display = 'block';
    });
    input.addEventListener('blur', function hideTip() {
        instructionEl.style.display = 'none';
    });

    input.addEventListener('keydown', async function onEnter(e) {
        if (e.key === 'Enter') {
            const newVal = input.value.trim();
            const currentVal = input.getAttribute('data-saved-value') || '';
            if (newVal !== currentVal) {
                input.setAttribute('data-saved-value', newVal);
                await saveField(jsonField, newVal);
            }
        }
    });
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

        const nameInput = document.getElementById('pc-name');
        if (nameInput) {
            nameInput.value = c.name || '';
            nameInput.setAttribute('data-saved-value', c.name || '');
        }

        const raceInput = document.getElementById('pc-race');
        if (raceInput) {
            raceInput.value = c.race || '';
            raceInput.setAttribute('data-saved-value', c.race || '');
        }

        const classInput = document.getElementById('pc-class');
        if (classInput) {
            classInput.value = c.class || '';
            classInput.setAttribute('data-saved-value', c.class || '');
        }

        const levelInput = document.getElementById('pc-level');
        const levelUpBtn = document.getElementById('pc-level-up');
        const levelDownBtn = document.getElementById('pc-level-down');
        const profBonusSpan = document.getElementById('pc-prof-bonus');
        
        function clampLevel(val) {
            const n = Number.parseInt(val, 10);
            if (Number.isNaN(n)) return 1;
            return Math.max(1, Math.min(20, n));
        }
        
        function getProficiencyBonus(level) {
            const lvl = clampLevel(level);
            if (lvl <= 4) return 2;
            if (lvl <= 8) return 3;
            if (lvl <= 12) return 4;
            if (lvl <= 16) return 5;
            return 6;
        }
        
        function syncLevel() {
            const raw = levelInput.value;
            const level = clampLevel(raw);
            levelInput.value = String(level);
            const pb = getProficiencyBonus(level);
            profBonusSpan.textContent = `${pb >= 0 ? '+' : ''}${pb}`;
        }
        
        function saveLevel() {
            const raw = levelInput.value;
            const level = clampLevel(raw);
            levelInput.value = String(level);
            const currentSaved = levelInput.getAttribute('data-saved-value') || '';
            if (String(level) !== currentSaved) {
                levelInput.setAttribute('data-saved-value', String(level));
                syncLevel();
                saveField('level', level);
            }
        }
        
        if (levelInput) {
            const initialLevel = clampLevel(c.level ?? 1);
            levelInput.value = String(initialLevel);
            levelInput.setAttribute('data-saved-value', String(initialLevel));
            
            setTimeout(syncLevel, 0);
            
            if (levelUpBtn) {
                levelUpBtn.addEventListener('click', () => {
                    const current = clampLevel(levelInput.value);
                    if (current < 20) {
                        levelInput.value = String(current + 1);
                        saveLevel();
                    }
                });
            }
            if (levelDownBtn) {
                levelDownBtn.addEventListener('click', () => {
                    const current = clampLevel(levelInput.value);
                    if (current > 1) {
                        levelInput.value = String(current - 1);
                        saveLevel();
                    }
                });
            }
            
            levelInput.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter') {
                    saveLevel();
                }
            });
        }

        const hpInput = document.getElementById('pc-hp');
        if (hpInput) {
            hpInput.value = c.hitPoints ?? '';
            hpInput.setAttribute('data-saved-value', String(c.hitPoints ?? ''));
            hpInput.title = 'Type a number and press Enter to change hit points.';
            hpInput.addEventListener('focus', function showTip() {
                const instructionEl = document.getElementById('pc-text-input-instruction');
                if (instructionEl) instructionEl.style.display = 'block';
            });
            hpInput.addEventListener('blur', function hideTip() {
                const instructionEl = document.getElementById('pc-text-input-instruction');
                if (instructionEl) instructionEl.style.display = 'none';
            });
            hpInput.addEventListener('keydown', async function onEnter(e) {
                if (e.key === 'Enter') {
                    const raw = hpInput.value;
                    const parsed = raw === '' ? 0 : Number.parseInt(raw, 10);
                    const newVal = Number.isNaN(parsed) ? 0 : parsed;
                    const currentVal = Number(hpInput.getAttribute('data-saved-value') || '');
                    if (newVal !== currentVal) {
                        hpInput.setAttribute('data-saved-value', String(newVal));
                        await saveField('hitPoints', newVal);
                    }
                }
            });
        }

        const acInput = document.getElementById('pc-ac');
        if (acInput) {
            acInput.value = c.armorClass ?? '';
            acInput.setAttribute('data-saved-value', String(c.armorClass ?? ''));
            acInput.title = 'Type a number and press Enter to change armor class.';
            acInput.addEventListener('focus', function showTip() {
                const instructionEl = document.getElementById('pc-text-input-instruction');
                if (instructionEl) instructionEl.style.display = 'block';
            });
            acInput.addEventListener('blur', function hideTip() {
                const instructionEl = document.getElementById('pc-text-input-instruction');
                if (instructionEl) instructionEl.style.display = 'none';
            });
            acInput.addEventListener('keydown', async function onEnter(e) {
                if (e.key === 'Enter') {
                    const raw = acInput.value;
                    const parsed = raw === '' ? 0 : Number.parseInt(raw, 10);
                    const newVal = Number.isNaN(parsed) ? 0 : parsed;
                    const currentVal = Number(acInput.getAttribute('data-saved-value') || '');
                    if (newVal !== currentVal) {
                        acInput.setAttribute('data-saved-value', String(newVal));
                        await saveField('armorClass', newVal);
                    }
                }
            });
        }

document.getElementById('pc-alignment').textContent = c.alignment || '';

        if (c.abilityScores) {
            displayAbilityScores(c.abilityScores);
        }
        const profBonusVal = Number(document.getElementById('pc-prof-bonus').textContent) || 2;
        if (c.savingThrows && c.abilityScores) {
            displaySavingThrowsWithModifiers(c.savingThrows, c.abilityScores, profBonusVal);
        }
        if (c.skills && c.abilityScores) {
            displaySkillsWithModifiers(c.skills, c.abilityScores, profBonusVal);
        }

        const initiativeBtn = document.getElementById('roll-initiative');
        const initiativeResultEl = document.getElementById('initiative-result');
        const initiativeHistory = [];
        if (initiativeBtn && initiativeResultEl) {
            initiativeBtn.addEventListener('click', () => {
                const dexVal = currentAbilityScores?.dexterity ?? 0;
                const dexMod = abilityModifier(dexVal);
                const d20 = rollD20();
                const total = d20 + dexMod;
                const sign = dexMod >= 0 ? '+' : '';
                const resultText = `🎲 Initiative: ${total} (${d20} ${sign}${dexMod})`;
                initiativeHistory.push(resultText);
                // Keep last 2 rolls
                while (initiativeHistory.length > 2) {
                    initiativeHistory.shift();
                }
                initiativeResultEl.innerHTML = initiativeHistory.join('<br>');
            });
        }

        const hitDiceEl = document.getElementById('pc-hit-dice');
        const hitDiceResultEl = document.getElementById('pc-hit-dice-result');
        const hitDiceStr = c.hitDice || 'd6';
        const dieSize = Number.parseInt(hitDiceStr.replace(/[^0-9]/g, ''), 10) || 6;
        const maxHitDice = clampLevel(c.level ?? 1);
        let remainingHitDice = c.hitDiceRemaining !== undefined ? c.hitDiceRemaining : maxHitDice;

        function updateHitDiceDisplay() {
            hitDiceEl.textContent = `${remainingHitDice}/${maxHitDice} ${hitDiceStr}`;
            hitDiceEl.style.color = remainingHitDice <= 0 ? '#c55' : '#aaa';
        }

        updateHitDiceDisplay();

        hitDiceEl.addEventListener('click', async function rollHitDie() {
            if (remainingHitDice <= 0) {
                hitDiceResultEl.textContent = 'No hit dice remaining!';
                return;
            }

            const conVal = currentAbilityScores?.constitution ?? 0;
            const conMod = abilityModifier(conVal);

            const roll = Math.floor(Math.random() * dieSize) + 1;
            const healAmount = roll + conMod;
            const clampedHeal = Math.max(0, healAmount);

            const hpLeftInput = document.getElementById('pc-hp-left');
            const maxHp = Number(document.getElementById('pc-hp').value) || 0;
            const currentHpLeft = Number(hpLeftInput.value) || 0;
            const newHpLeft = Math.min(maxHp, currentHpLeft + clampedHeal);
            hpLeftInput.value = String(newHpLeft);

            remainingHitDice--;
            updateHitDiceDisplay();

            const sign = conMod >= 0 ? '+' : '';
            hitDiceResultEl.textContent = `Rolled ${clampedHeal} (${roll}${sign}${conMod}) -> HP: ${newHpLeft}`;

            setTimeout(() => {
                hitDiceResultEl.textContent = '';
            }, 10000);

            await saveField('hitPointsLeft', newHpLeft);
            await saveField('hitDiceRemaining', remainingHitDice);
        });

        const longRestBtn = document.getElementById('long-rest');
        const longRestResultEl = document.getElementById('pc-long-rest-result');
        if (longRestBtn) {
            longRestBtn.addEventListener('click', async function onLongRest() {
                const maxHp = Number(document.getElementById('pc-hp').value) || 0;
                const hpLeftInput = document.getElementById('pc-hp-left');
                
                hpLeftInput.value = String(maxHp);
                remainingHitDice = maxHitDice;
                updateHitDiceDisplay();
                
                if (longRestResultEl) {
                    longRestResultEl.style.display = 'inline';
                    longRestResultEl.textContent = 'Long rest completed! HP and hit dice restored.';
                }
                
                setTimeout(() => {
                    if (longRestResultEl) {
                        longRestResultEl.textContent = '';
                        longRestResultEl.style.display = 'none';
                    }
                }, 10000);
                
                await saveField('hitPointsLeft', maxHp);
                await saveField('hitDiceRemaining', remainingHitDice);
            });
        }

        document.getElementById('pc-background').textContent = c.background || '-';
        document.getElementById('pc-personality').textContent = c.personalityTraits || '-';
        document.getElementById('pc-ideals').textContent = c.ideals || '-';
        document.getElementById('pc-bonds').textContent = c.bonds || '-';
        document.getElementById('pc-flaws').textContent = c.flaws || '-';

        const hpLeftInput = document.getElementById('pc-hp-left');
        const savedHpLeft = c.hitPointsLeft;
        hpLeftInput.value = savedHpLeft !== undefined && savedHpLeft !== null ? savedHpLeft : (c.hitPoints ?? '');
        hpLeftInput.addEventListener('input', () => {
            const val = Number(hpLeftInput.value);
            if (Number.isNaN(val)) return;
            saveField('hitPointsLeft', val);
        });

        setupEditableTextField('pc-name', 'name');
        setupEditableTextField('pc-race', 'race');
        setupEditableTextField('pc-class', 'class');

        function migrateEquipment(items) {
            if (!items || items.length === 0) return [];
            if (typeof items[0] === 'string') {
                return items.map(name => ({
                    quantity: 1,
                    name: name,
                    type: 'adventuring gear',
                    description: '',
                    isMagicItem: false,
                    rarity: '',
                    moneyValue: 0,
                    moneyType: 'GP'
                }));
            }
            return items.map(item => ({
                quantity: item.quantity ?? 1,
                name: item.name || '',
                type: item.type || 'adventuring gear',
                description: item.description || '',
                isMagicItem: item.isMagicItem ?? false,
                rarity: item.rarity || '',
                moneyValue: item.moneyValue ?? 0,
                moneyType: item.moneyType || 'GP'
            }));
        }

        c.equipment = migrateEquipment(c.equipment);

        const equipmentBtn = document.getElementById('equipment');
        const equipmentMenu = document.getElementById('equipment-side-menu');
        const equipmentOverlay = document.getElementById('equipment-overlay');
        const equipmentCloseBtn = document.getElementById('equipment-close-btn');
        const equipmentAddBtn = document.getElementById('equipment-add-btn');
        const equipmentListEl = document.getElementById('equipment-list');

        const magicCheckbox = document.getElementById('equip-magic');
        const raritySelect = document.getElementById('equip-rarity');
        if (magicCheckbox && raritySelect) {
            magicCheckbox.addEventListener('change', () => {
                raritySelect.style.display = magicCheckbox.checked ? 'block' : 'none';
            });
        }

        function renderEquipmentItem(item, index, items) {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = 'border: 1px solid #444; border-radius: 6px; overflow: hidden;';

            const summaryBar = document.createElement('div');
            summaryBar.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #2a2a2a; padding: 8px 10px; cursor: pointer; gap: 6px;';
            summaryBar.title = 'Click to expand/collapse';

            const leftSpan = document.createElement('span');
            leftSpan.style.cssText = 'font-weight: 600; color: #fff; font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;';
            leftSpan.textContent = `${item.quantity}x ${item.name || 'Unnamed'}`;

            const typeBadge = document.createElement('span');
            typeBadge.style.cssText = 'font-size: 0.75em; color: #aaa; background: #3a3a3a; border-radius: 3px; padding: 2px 5px; white-space: nowrap;';
            typeBadge.textContent = item.type || '';

            let magicBadge = null;
            if (item.isMagicItem) {
                magicBadge = document.createElement('span');
                magicBadge.style.cssText = 'font-size: 0.75em; color: #e0b040; background: #3a3020; border-radius: 3px; padding: 2px 5px; white-space: nowrap;';
                magicBadge.textContent = `* ${item.rarity || 'magic'}`;
            }

            const moneySpan = document.createElement('span');
            moneySpan.style.cssText = 'font-size: 0.85em; color: #e0b040; font-weight: 600; white-space: nowrap;';
            moneySpan.textContent = `${item.moneyValue} ${item.moneyType}`;

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'x';
            deleteBtn.style.cssText = 'background: none; color: #c55; border: none; cursor: pointer; font-size: 1.2em; padding: 0 2px; flex-shrink: 0;';
            deleteBtn.title = 'Remove item';
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const newEquipment = [...items];
                newEquipment.splice(index, 1);
                await saveField('equipment', newEquipment);
                c.equipment = newEquipment;
                refreshEquipmentList(newEquipment);
                updateEquipmentDisplay(newEquipment);
            });

            summaryBar.appendChild(leftSpan);
            summaryBar.appendChild(typeBadge);
            if (magicBadge) summaryBar.appendChild(magicBadge);
            summaryBar.appendChild(moneySpan);
            summaryBar.appendChild(deleteBtn);

            const detailArea = document.createElement('div');
            detailArea.style.cssText = 'display: none; padding: 8px 10px; background: #222; border-top: 1px solid #444; font-size: 0.85em; color: #bbb;';
            detailArea.innerHTML = `
                <div style="margin-bottom: 4px;"><strong>Description:</strong> ${item.description || 'No description'}</div>
                <div style="margin-bottom: 4px;"><strong>Type:</strong> ${item.type}</div>
                ${item.isMagicItem ? `<div style="margin-bottom: 4px;"><strong>Magic Item:</strong> Yes - ${item.rarity}</div>` : ''}
                <div><strong>Value:</strong> ${item.moneyValue} ${item.moneyType}</div>
            `;

            let expanded = false;
            summaryBar.addEventListener('click', () => {
                expanded = !expanded;
                detailArea.style.display = expanded ? 'block' : 'none';
                summaryBar.style.background = expanded ? '#333' : '#2a2a2a';
            });

            itemDiv.appendChild(summaryBar);
            itemDiv.appendChild(detailArea);
            return itemDiv;
        }

        function refreshEquipmentList(items) {
            if (!equipmentListEl) return;
            equipmentListEl.innerHTML = '';
            if (!items || items.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.style.cssText = 'color: #666; font-style: italic; padding: 8px;';
                emptyMsg.textContent = 'No equipment added yet.';
                equipmentListEl.appendChild(emptyMsg);
                return;
            }
            items.forEach((item, index) => {
                const itemEl = renderEquipmentItem(item, index, items);
                equipmentListEl.appendChild(itemEl);
            });
        }

        function updateEquipmentDisplay(items) {
            const equipmentSpan = document.getElementById('pc-equipment');
            if (!equipmentSpan) return;
            if (!items || items.length === 0) {
                equipmentSpan.textContent = '-';
                return;
            }
            const parts = items.map(item => `${item.quantity}x ${item.name}${item.isMagicItem ? ' *' : ''} [${item.moneyValue} ${item.moneyType}]`);
            equipmentSpan.textContent = parts.join(', ');
        }

        function openEquipmentMenu() {
            if (equipmentMenu) equipmentMenu.style.right = '0';
            if (equipmentOverlay) equipmentOverlay.style.display = 'block';
            // Always start with the form hidden and button text reset
            const formContainer = document.getElementById('equip-form-container');
            const equipToggleBtn = document.getElementById('equip-toggle-form-btn');
            if (formContainer) formContainer.style.display = 'none';
            if (equipToggleBtn) equipToggleBtn.textContent = '+ Add Item';
        }

        function closeEquipmentMenu() {
            if (equipmentMenu) equipmentMenu.style.right = '-350px';
            if (equipmentOverlay) equipmentOverlay.style.display = 'none';
        }

        if (equipmentBtn) {
            equipmentBtn.addEventListener('click', () => {
                const isOpen = equipmentMenu && equipmentMenu.style.right === '0px';
                if (isOpen) {
                    closeEquipmentMenu();
                } else {
                    refreshEquipmentList(c.equipment || []);
                    openEquipmentMenu();
                }
            });
        }

        if (equipmentCloseBtn) {
            equipmentCloseBtn.addEventListener('click', closeEquipmentMenu);
        }

        const equipToggleBtn = document.getElementById('equip-toggle-form-btn');
        if (equipToggleBtn) {
            equipToggleBtn.addEventListener('click', () => {
                const formContainer = document.getElementById('equip-form-container');
                if (!formContainer) return;
                const isVisible = formContainer.style.display !== 'none';
                if (isVisible) {
                    formContainer.style.display = 'none';
                    equipToggleBtn.textContent = '+ Add Item';
                } else {
                    formContainer.style.display = 'block';
                    equipToggleBtn.textContent = 'x Close Item';
                }
            });
        }

        if (equipmentAddBtn) {
            equipmentAddBtn.addEventListener('click', addEquipmentItem);
        }

        async function addEquipmentItem() {
            const qtyEl = document.getElementById('equip-qty');
            const nameEl = document.getElementById('equip-name');
            const typeEl = document.getElementById('equip-type');
            const descEl = document.getElementById('equip-description');
            const magicEl = document.getElementById('equip-magic');
            const rarityEl = document.getElementById('equip-rarity');
            const moneyEl = document.getElementById('equip-money');
            const moneyTypeEl = document.getElementById('equip-money-type');

            const name = (nameEl?.value || '').trim();
            if (!name) {
                alert('Please enter an item name.');
                return;
            }

            const newItem = {
                quantity: Number(qtyEl?.value) || 1,
                name: name,
                type: typeEl?.value || 'adventuring gear',
                description: (descEl?.value || '').trim(),
                isMagicItem: magicEl?.checked || false,
                rarity: magicEl?.checked ? (rarityEl?.value || 'common') : '',
                moneyValue: Number(moneyEl?.value) || 0,
                moneyType: moneyTypeEl?.value || 'GP'
            };

            const updatedEquipment = [...(c.equipment || []), newItem];
            await saveField('equipment', updatedEquipment);
            c.equipment = updatedEquipment;

            refreshEquipmentList(updatedEquipment);
            updateEquipmentDisplay(updatedEquipment);

            if (qtyEl) qtyEl.value = '1';
            if (nameEl) nameEl.value = '';
            if (typeEl) typeEl.value = 'adventuring gear';
            if (descEl) descEl.value = '';
            if (magicEl) magicEl.checked = false;
            if (rarityEl) {
                rarityEl.value = 'common';
                rarityEl.style.display = 'none';
            }
            if (moneyEl) moneyEl.value = '0';
            if (moneyTypeEl) moneyTypeEl.value = 'GP';

            const formContainer = document.getElementById('equip-form-container');
            const equipToggleBtn = document.getElementById('equip-toggle-form-btn');
            if (formContainer) formContainer.style.display = 'none';
            if (equipToggleBtn) equipToggleBtn.textContent = '+ Add Item';
        }

        const spellsBtn = document.getElementById('spells');
        const spellsMenu = document.getElementById('spells-side-menu');
        const spellsCloseBtn = document.getElementById('spells-close-btn');
        const spellsAddBtn = document.getElementById('spells-add-btn');
        const spellsListEl = document.getElementById('spells-list');

        function configureSpellComponents(spell) {
            const components = [];
            if (spell.verbal) components.push('V');
            if (spell.somatic) components.push('S');
            if (spell.material) components.push('M');
            return components.join(', ');
        }

        function getSpellLevelLabel(level) {
            if (level === 0) return 'Cantrip';
            const ordinalMap = { 1: '1st', 2: '2nd', 3: '3rd' };
            return ordinalMap[level] || `${level}th`;
        }

        function renderSpellItem(spell, index, spells) {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = 'border: 1px solid #444; border-radius: 6px; overflow: hidden;';

            const summaryBar = document.createElement('div');
            summaryBar.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #2a2a2a; padding: 8px 10px; cursor: pointer; gap: 6px;';
            summaryBar.title = 'Click to expand/collapse';

            const leftSpan = document.createElement('span');
            leftSpan.style.cssText = 'font-weight: 600; color: #fff; font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;';
            leftSpan.textContent = spell.name || 'Unnamed';

            const levelBadge = document.createElement('span');
            levelBadge.style.cssText = 'font-size: 0.75em; color: #aaa; background: #3a3a3a; border-radius: 3px; padding: 2px 5px; white-space: nowrap;';
            levelBadge.textContent = getSpellLevelLabel(spell.level);

            const schoolBadge = document.createElement('span');
            schoolBadge.style.cssText = 'font-size: 0.75em; color: #8af; background: #1a2a3a; border-radius: 3px; padding: 2px 5px; white-space: nowrap;';
            schoolBadge.textContent = spell.school || '';

            const concBadge = document.createElement('span');
            if (spell.concentration) {
                concBadge.style.cssText = 'font-size: 0.7em; color: #e0b040; background: #3a3020; border-radius: 3px; padding: 2px 4px; white-space: nowrap;';
                concBadge.textContent = 'C';
            }

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'x';
            deleteBtn.style.cssText = 'background: none; color: #c55; border: none; cursor: pointer; font-size: 1.2em; padding: 0 2px; flex-shrink: 0;';
            deleteBtn.title = 'Remove spell';
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const newSpells = [...spells];
                newSpells.splice(index, 1);
                await saveField('spells', newSpells);
                c.spells = newSpells;
                refreshSpellsList(newSpells);
            });

            summaryBar.appendChild(leftSpan);
            summaryBar.appendChild(levelBadge);
            summaryBar.appendChild(schoolBadge);
            if (spell.concentration) summaryBar.appendChild(concBadge);
            summaryBar.appendChild(deleteBtn);

            const detailArea = document.createElement('div');
            detailArea.style.cssText = 'display: none; padding: 8px 10px; background: #222; border-top: 1px solid #444; font-size: 0.85em; color: #bbb;';
            const comps = configureSpellComponents(spell);
            detailArea.innerHTML = `
                <div style="margin-bottom: 4px;"><strong>Level:</strong> ${getSpellLevelLabel(spell.level)}</div>
                <div style="margin-bottom: 4px;"><strong>School:</strong> ${spell.school || 'N/A'}</div>
                ${spell.concentration ? '<div style="margin-bottom: 4px;"><strong>Concentration:</strong> Yes</div>' : ''}
                ${spell.ritual ? '<div style="margin-bottom: 4px;"><strong>Ritual:</strong> Yes</div>' : ''}
                <div style="margin-bottom: 4px;"><strong>Components:</strong> ${comps || 'None'}</div>
                <div><strong>Description:</strong> ${spell.description || 'No description'}</div>
            `;

            let expanded = false;
            summaryBar.addEventListener('click', () => {
                expanded = !expanded;
                detailArea.style.display = expanded ? 'block' : 'none';
                summaryBar.style.background = expanded ? '#333' : '#2a2a2a';
            });

            itemDiv.appendChild(summaryBar);
            itemDiv.appendChild(detailArea);
            return itemDiv;
        }

        function refreshSpellsList(spells) {
            if (!spellsListEl) return;
            spellsListEl.innerHTML = '';
            if (!spells || spells.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.style.cssText = 'color: #666; font-style: italic; padding: 8px;';
                emptyMsg.textContent = 'No spells added yet.';
                spellsListEl.appendChild(emptyMsg);
                return;
            }
            spells.forEach((spell, index) => {
                const spellEl = renderSpellItem(spell, index, spells);
                spellsListEl.appendChild(spellEl);
            });
        }

        function openSpellsMenu() {
            if (spellsMenu) spellsMenu.style.right = '0';
            if (equipmentOverlay) equipmentOverlay.style.display = 'block';
        }

        function closeSpellsMenu() {
            if (spellsMenu) spellsMenu.style.right = '-350px';
            if (equipmentOverlay) equipmentOverlay.style.display = 'none';
        }

        // Spells button toggles the side menu
        if (spellsBtn) {
            spellsBtn.addEventListener('click', () => {
                const isOpen = spellsMenu && spellsMenu.style.right === '0px';
                if (isOpen) {
                    closeSpellsMenu();
                } else {
                    refreshSpellsList(c.spells || []);
                    openSpellsMenu();
                }
            });
        }

        // Close button
        if (spellsCloseBtn) {
            spellsCloseBtn.addEventListener('click', closeSpellsMenu);
        }

        // Toggle spell form show/hide with button text change
        const spellToggleBtn = document.getElementById('spell-toggle-form-btn');
        if (spellToggleBtn) {
            spellToggleBtn.addEventListener('click', () => {
                const formContainer = document.getElementById('spell-form-container');
                if (!formContainer) return;
                const isVisible = formContainer.style.display !== 'none';
                if (isVisible) {
                    formContainer.style.display = 'none';
                    spellToggleBtn.textContent = '+ Add Spell';
                } else {
                    formContainer.style.display = 'block';
                    spellToggleBtn.textContent = 'x Close Spell';
                }
            });
        }

        const rangeTypeEl = document.getElementById('spell-range-type');
        const rangeDistanceEl = document.getElementById('spell-range-distance');
        if (rangeTypeEl && rangeDistanceEl) {
            function updateRangeVisibility() {
                if (rangeTypeEl.value === 'touch') {
                    rangeDistanceEl.style.display = 'none';
                } else {
                    rangeDistanceEl.style.display = 'flex';
                }
            }
            rangeTypeEl.addEventListener('change', updateRangeVisibility);
            updateRangeVisibility();
        }

        const compMCheckbox = document.getElementById('spell-comp-m');
        const materialDescEl = document.getElementById('spell-material-desc');
        if (compMCheckbox && materialDescEl) {
            compMCheckbox.addEventListener('change', () => {
                materialDescEl.style.display = compMCheckbox.checked ? 'block' : 'none';
            });
        }

        const concCheckbox = document.getElementById('spell-concentration');
        const durationTypeEl = document.getElementById('spell-duration-type');
        const durationValueEl = document.getElementById('spell-duration-value');
        if (concCheckbox && durationTypeEl) {
            function updateDurationOptions() {
                const instantOption = durationTypeEl.querySelector('option[value="instantaneous"]');
                if (concCheckbox.checked) {
                    if (instantOption) instantOption.style.display = 'none';
                    if (durationTypeEl.value === 'instantaneous') {
                        durationTypeEl.value = 'minute';
                    }
                } else {
                    if (instantOption) instantOption.style.display = 'block';
                }
                updateDurationValueVisibility();
            }
            concCheckbox.addEventListener('change', updateDurationOptions);
            updateDurationOptions();
        }

        function updateDurationValueVisibility() {
            if (durationTypeEl && durationValueEl) {
                if (durationTypeEl.value === 'instantaneous') {
                    durationValueEl.style.display = 'none';
                } else {
                    durationValueEl.style.display = 'inline-block';
                }
            }
        }
        if (durationTypeEl) {
            durationTypeEl.addEventListener('change', updateDurationValueVisibility);
            updateDurationValueVisibility();
        }

        if (spellsAddBtn) {
            spellsAddBtn.addEventListener('click', async function addSpell() {
                const nameEl = document.getElementById('spell-name');
                const levelEl = document.getElementById('spell-level');
                const schoolEl = document.getElementById('spell-school');
                const descEl = document.getElementById('spell-description');
                const castingTimeEl = document.getElementById('spell-casting-time');
                const rangeTypeEl = document.getElementById('spell-range-type');
                const rangeEl = document.getElementById('spell-range');
                const durationValueEl = document.getElementById('spell-duration-value');
                const durationTypeEl = document.getElementById('spell-duration-type');
                const concEl = document.getElementById('spell-concentration');
                const ritualEl = document.getElementById('spell-ritual');
                const compVEl = document.getElementById('spell-comp-v');
                const compSEl = document.getElementById('spell-comp-s');
                const compMEl = document.getElementById('spell-comp-m');
                const materialDescEl = document.getElementById('spell-material-desc');

                const name = (nameEl?.value || '').trim();
                if (!name) {
                    alert('Please enter a spell name.');
                    return;
                }

                const isTouch = rangeTypeEl?.value === 'touch';
                const rangeStr = isTouch ? 'Touch' : (rangeEl?.value || '60') + ' ft';

                const newSpell = {
                    name: name,
                    level: Number(levelEl?.value) || 1,
                    school: schoolEl?.value || 'Abjuration',
                    description: (descEl?.value || '').trim(),
                    castingTime: castingTimeEl?.value || '1 action',
                    range: rangeStr,
                    durationValue: durationTypeEl?.value === 'instantaneous' ? 0 : (Number(durationValueEl?.value) || 1),
                    durationType: durationTypeEl?.value || 'instantaneous',
                    concentration: concEl?.checked || false,
                    ritual: ritualEl?.checked || false,
                    verbal: compVEl?.checked || false,
                    somatic: compSEl?.checked || false,
                    material: compMEl?.checked || false,
                    materialComponents: (compMEl?.checked ? (materialDescEl?.value || '').trim() : '')
                };

                const updatedSpells = [...(c.spells || []), newSpell];
                await saveField('spells', updatedSpells);
                c.spells = updatedSpells;

                refreshSpellsList(updatedSpells);

                if (nameEl) nameEl.value = '';
                if (levelEl) levelEl.value = '1';
                if (schoolEl) schoolEl.value = 'Abjuration';
                if (descEl) descEl.value = '';
                if (castingTimeEl) castingTimeEl.value = '1 action';
                if (rangeTypeEl) rangeTypeEl.value = 'distance';
                if (rangeEl) rangeEl.value = '60';
                if (durationValueEl) durationValueEl.value = '1';
                if (durationTypeEl) durationTypeEl.value = 'instantaneous';
                if (concEl) concEl.checked = false;
                if (ritualEl) ritualEl.checked = false;
                if (compVEl) compVEl.checked = false;
                if (compSEl) compSEl.checked = false;
                if (compMEl) compMEl.checked = false;
                if (materialDescEl) {
                    materialDescEl.value = '';
                    materialDescEl.style.display = 'none';
                }

                const formContainer = document.getElementById('spell-form-container');
                const spellToggleBtn = document.getElementById('spell-toggle-form-btn');
                if (formContainer) formContainer.style.display = 'none';
                if (spellToggleBtn) spellToggleBtn.textContent = '+ Add Spell';
            });
        }

        const featuresBtn = document.getElementById('features');
        const featuresMenu = document.getElementById('features-side-menu');
        const featuresCloseBtn = document.getElementById('features-close-btn');
        const featuresAddBtn = document.getElementById('features-add-btn');
        const featuresListEl = document.getElementById('features-list');

        function renderFeatureItem(feat, index, features) {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = 'border: 1px solid #444; border-radius: 6px; overflow: hidden;';

            const summaryBar = document.createElement('div');
            summaryBar.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #2a2a2a; padding: 8px 10px; cursor: pointer; gap: 6px;';
            summaryBar.title = 'Click to expand/collapse';

            const leftSpan = document.createElement('span');
            leftSpan.style.cssText = 'font-weight: 600; color: #fff; font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;';
            leftSpan.textContent = feat.name || 'Unnamed';

            const typeBadge = document.createElement('span');
            typeBadge.style.cssText = 'font-size: 0.75em; color: #aaa; background: #3a3a3a; border-radius: 3px; padding: 2px 5px; white-space: nowrap;';
            typeBadge.textContent = feat.type || '';

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'x';
            deleteBtn.style.cssText = 'background: none; color: #c55; border: none; cursor: pointer; font-size: 1.2em; padding: 0 2px; flex-shrink: 0;';
            deleteBtn.title = 'Remove';
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const newFeatures = [...features];
                newFeatures.splice(index, 1);
                await saveField('abilities', newFeatures);
                c.abilities = newFeatures;
                refreshFeaturesList(newFeatures);
            });

            summaryBar.appendChild(leftSpan);
            summaryBar.appendChild(typeBadge);
            summaryBar.appendChild(deleteBtn);

            const detailArea = document.createElement('div');
            detailArea.style.cssText = 'display: none; padding: 8px 10px; background: #222; border-top: 1px solid #444; font-size: 0.85em; color: #bbb;';
            detailArea.innerHTML = `
                <div style="margin-bottom: 4px;"><strong>Type:</strong> ${feat.type || 'N/A'}</div>
                <div><strong>Description:</strong> ${feat.description || 'No description'}</div>
            `;

            let expanded = false;
            summaryBar.addEventListener('click', () => {
                expanded = !expanded;
                detailArea.style.display = expanded ? 'block' : 'none';
                summaryBar.style.background = expanded ? '#333' : '#2a2a2a';
            });

            itemDiv.appendChild(summaryBar);
            itemDiv.appendChild(detailArea);
            return itemDiv;
        }

        function refreshFeaturesList(features) {
            if (!featuresListEl) return;
            featuresListEl.innerHTML = '';
            if (!features || features.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.style.cssText = 'color: #666; font-style: italic; padding: 8px;';
                emptyMsg.textContent = 'No abilities or feats added yet.';
                featuresListEl.appendChild(emptyMsg);
                return;
            }
            features.forEach((feat, index) => {
                const featEl = renderFeatureItem(feat, index, features);
                featuresListEl.appendChild(featEl);
            });
        }

        function openFeaturesMenu() {
            if (featuresMenu) featuresMenu.style.right = '0';
            if (equipmentOverlay) equipmentOverlay.style.display = 'block';
        }

        function closeFeaturesMenu() {
            if (featuresMenu) featuresMenu.style.right = '-350px';
            if (equipmentOverlay) equipmentOverlay.style.display = 'none';
        }

        if (featuresBtn) {
            featuresBtn.addEventListener('click', () => {
                const isOpen = featuresMenu && featuresMenu.style.right === '0px';
                if (isOpen) {
                    closeFeaturesMenu();
                } else {
                    refreshFeaturesList(c.abilities || []);
                    openFeaturesMenu();
                }
            });
        }

        if (featuresCloseBtn) {
            featuresCloseBtn.addEventListener('click', closeFeaturesMenu);
        }

        const featuresToggleBtn = document.getElementById('features-toggle-form-btn');
        if (featuresToggleBtn) {
            featuresToggleBtn.addEventListener('click', () => {
                const formContainer = document.getElementById('features-form-container');
                if (!formContainer) return;
                const isVisible = formContainer.style.display !== 'none';
                if (isVisible) {
                    formContainer.style.display = 'none';
                    featuresToggleBtn.textContent = '+ Add Ability / Feat';
                } else {
                    formContainer.style.display = 'block';
                    featuresToggleBtn.textContent = 'x Close Ability / Feat';
                }
            });
        }

        if (featuresAddBtn) {
            featuresAddBtn.addEventListener('click', async function addFeature() {
                const typeEl = document.getElementById('feat-type');
                const nameEl = document.getElementById('feat-name');
                const descEl = document.getElementById('feat-description');

                const name = (nameEl?.value || '').trim();
                if (!name) {
                    alert('Please enter a name.');
                    return;
                }

                const newFeature = {
                    type: typeEl?.value || 'Ability',
                    name: name,
                    description: (descEl?.value || '').trim()
                };

                const updatedFeatures = [...(c.abilities || []), newFeature];
                await saveField('abilities', updatedFeatures);
                c.abilities = updatedFeatures;

                refreshFeaturesList(updatedFeatures);

                if (typeEl) typeEl.value = 'Ability';
                if (nameEl) nameEl.value = '';
                if (descEl) descEl.value = '';

                const formContainer = document.getElementById('features-form-container');
                const featuresToggleBtn = document.getElementById('features-toggle-form-btn');
                if (formContainer) formContainer.style.display = 'none';
                if (featuresToggleBtn) featuresToggleBtn.textContent = '+ Add Ability / Feat';
            });
        }

        if (equipmentOverlay) {
            equipmentOverlay.addEventListener('click', () => {
                closeEquipmentMenu();
                closeSpellsMenu();
                closeFeaturesMenu();
            });
        }

    } catch (err) {
        console.error('Failed to load character:', err);
    }
}

loadCharacter();
