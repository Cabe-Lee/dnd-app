const validationMessageEl = document.getElementById('pc-validation-message');

function showMessage(messages) {
  if (!validationMessageEl) return;
  if (!messages || messages.length === 0) {
    validationMessageEl.textContent = '';
    validationMessageEl.style.color = '';
    return;
  }
  validationMessageEl.innerHTML = messages.map((m) => `<div>• ${m}</div>`).join('');
  validationMessageEl.style.color = '#c00';
}

function getVal(id) {
  const el = document.getElementById(id);
  if (!el) return '';
  return el.value.toString().trim();
}

function isChecked(id) {
  const el = document.getElementById(id);
  if (!el) return false;
  return el.checked;
}

function validateInfo() {
  const msgs = [];

  if (!getVal('name-input')) msgs.push('Info: Name is required.');
  if (!getVal('class-input')) msgs.push('Info: Class is required.');
  if (!getVal('race-input')) msgs.push('Info: Race is required.');
  if (!getVal('alignment-input')) msgs.push('Info: Alignment is required.');

  const level = document.getElementById('level-input');
  if (level && (!level.value || Number.parseInt(level.value, 10) < 1)) msgs.push('Info: Level must be at least 1.');

  return msgs;
}

function validateBackground() {
  const msgs = [];
  const skill1 = getVal('background-skill-1-input');
  const skill2 = getVal('background-skill-2-input');

  if (!skill1) msgs.push('Background: Skill 1 is required.');
  if (!skill2) msgs.push('Background: Skill 2 is required.');

  return msgs;
}

function validateAbilityScores() {
  const msgs = [];
  const abilityIds = [
    'strength-input',
    'dexterity-input',
    'constitution-input',
    'intelligence-input',
    'wisdom-input',
    'charisma-input'
  ];

  abilityIds.forEach((id) => {
    const val = getVal(id);
    if (val === '') {
      const label = id.replace('-input', '');
      msgs.push(`Ability Scores: ${label.charAt(0).toUpperCase() + label.slice(1)} is required.`);
    }
  });

  return msgs;
}

function validateSavingThrows() {
  return [];
}

function validateHpAc() {
  const msgs = [];
  const hp = getVal('hp-input');
  const ac = getVal('ac-input');

  if (hp === '') msgs.push('Hit Points: HP value is required.');
  if (ac === '') msgs.push('Armor Class: AC value is required.');

  return msgs;
}

function validateSkills() {
  return [];
}

function runValidation() {
  const allMessages = [
    ...validateInfo(),
    ...validateBackground(),
    ...validateAbilityScores(),
    ...validateSavingThrows(),
    ...validateHpAc(),
    ...validateSkills()
  ];

  showMessage(allMessages);
  return allMessages;
}

function collectCharacterData() {
  const getVal = (id) => (document.getElementById(id)?.value ?? '').toString().trim();
  const isChecked = (id) => !!document.getElementById(id)?.checked;

  return {
    name: getVal('name-input'),
    race: getVal('race-input'),
    class: getVal('class-input'),
    level: Number.parseInt(getVal('level-input'), 10) || 1,
    background: getVal('background-input') || '',
    alignment: getVal('alignment-input') || '',
    experience: 0,
    abilityScores: {
      strength: Number.parseInt(getVal('strength-input'), 10) || 8,
      dexterity: Number.parseInt(getVal('dexterity-input'), 10) || 8,
      constitution: Number.parseInt(getVal('constitution-input'), 10) || 8,
      intelligence: Number.parseInt(getVal('intelligence-input'), 10) || 8,
      wisdom: Number.parseInt(getVal('wisdom-input'), 10) || 8,
      charisma: Number.parseInt(getVal('charisma-input'), 10) || 8
    },
    savingThrows: {
      strength: isChecked('strength-saving-throw-input'),
      dexterity: isChecked('dexterity-saving-throw-input'),
      constitution: isChecked('constitution-saving-throw-input'),
      intelligence: isChecked('intelligence-saving-throw-input'),
      wisdom: isChecked('wisdom-saving-throw-input'),
      charisma: isChecked('charisma-saving-throw-input')
    },
    skills: {
      acrobatics: isChecked('acrobatics-input'),
      animalHandling: isChecked('animal-handling-input'),
      arcana: isChecked('arcana-input'),
      athletics: isChecked('athletics-input'),
      deception: isChecked('deception-input'),
      history: isChecked('history-input'),
      insight: isChecked('insight-input'),
      intimidation: isChecked('intimidation-input'),
      investigation: isChecked('investigation-input'),
      medicine: isChecked('medicine-input'),
      nature: isChecked('nature-input'),
      perception: isChecked('perception-input'),
      performance: isChecked('performance-input'),
      persuasion: isChecked('persuasion-input'),
      religion: isChecked('religion-input'),
      sleightOfHand: isChecked('sleight-of-hand-input'),
      stealth: isChecked('stealth-input'),
      survival: isChecked('survival-input')
    },
    hitPoints: Number.parseInt(getVal('hp-input'), 10) || 0,
    hitPointsLeft: Number.parseInt(getVal('hp-left-input'), 10) || 0,
    armorClass: Number.parseInt(getVal('ac-input'), 10) || 10,
    hitDice: getVal('hit-dice-input') || '1d8',
    proficiencyBonus: Number.parseInt(getVal('proficiency-bonus-input'), 10) || 2,
    equipment: [
      getVal('background-equipment-input') || ''
    ].filter(Boolean),
    featuresAndTraits: [],
    personalityTraits: getVal('background-personality-trait-input') || '',
    ideals: getVal('background-ideal-input') || '',
    bonds: getVal('background-bond-input') || '',
    flaws: getVal('background-flaw-input') || ''
  };
}

async function submitCharacter(data) {
  try {
    const res = await fetch('/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      showMessage([`Character saved successfully! (ID: ${result.id})`]);
      validationMessageEl.style.color = '#080';
      return true;
    } else {
      showMessage(['Error: Could not save character.']);
      return false;
    }
  } catch (err) {
    showMessage(['Error: Could not connect to server.']);
    return false;
  }
}

const submitBtn = document.getElementById('pc-submit');
if (submitBtn) {
  submitBtn.addEventListener('click', async (e) => {
    e.preventDefault(); // Always prevent default form 
    const errors = runValidation();
    if (errors.length > 0) {
      return;
    }
    const data = collectCharacterData();
    await submitCharacter(data);
  });
}
