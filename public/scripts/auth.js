// ===================== SHARED VALIDATION FUNCTIONS =====================

function showError(inputId, message) {
    const errorEl = document.getElementById(inputId + '-error');
    const successEl = document.getElementById(inputId + '-success');
    const input = document.getElementById(inputId);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('visible');
    }
    if (successEl) successEl.classList.remove('visible');
    if (input) input.classList.add('error');
}

function showSuccess(inputId) {
    const errorEl = document.getElementById(inputId + '-error');
    const successEl = document.getElementById(inputId + '-success');
    const input = document.getElementById(inputId);
    if (errorEl) errorEl.classList.remove('visible');
    if (successEl) successEl.classList.add('visible');
    if (input) input.classList.remove('error');
}

function hideAllMessages(inputId) {
    const errorEl = document.getElementById(inputId + '-error');
    const successEl = document.getElementById(inputId + '-success');
    const input = document.getElementById(inputId);
    if (errorEl) errorEl.classList.remove('visible');
    if (successEl) successEl.classList.remove('visible');
    if (input) input.classList.remove('error');
}

// ===================== PASSWORD HASHING =====================

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// ===================== COMMON PASSWORD VALIDATION =====================

function validatePassword(passwordInputId) {
    const input = document.getElementById(passwordInputId);
    const val = input.value;
    if (!val) {
        showError(passwordInputId, 'Password is required.');
        return false;
    }
    if (val.length < 8) {
        showError(passwordInputId, 'Password must be at least 8 characters.');
        return false;
    }
    if (!/[A-Z]/.test(val)) {
        showError(passwordInputId, 'Password must contain at least one uppercase letter.');
        return false;
    }
    if (!/[a-z]/.test(val)) {
        showError(passwordInputId, 'Password must contain at least one lowercase letter.');
        return false;
    }
    if (!/[0-9]/.test(val)) {
        showError(passwordInputId, 'Password must contain at least one number.');
        return false;
    }
    showSuccess(passwordInputId);
    return true;
}

function validateConfirmPassword(confirmInputId, passwordInputId) {
    const confirmInput = document.getElementById(confirmInputId);
    const passwordInput = document.getElementById(passwordInputId);
    const val = confirmInput.value;
    if (!val) {
        showError(confirmInputId, 'Please confirm your password.');
        return false;
    }
    if (val !== passwordInput.value) {
        showError(confirmInputId, 'Passwords do not match.');
        return false;
    }
    showSuccess(confirmInputId);
    return true;
}

// ===================== DEBOUNCE UTILITY =====================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===================== DUPLICATE CHECK API =====================

async function checkAccountAvailability(field, value) {
    try {
        const res = await fetch(`/api/check-account?${field}=${encodeURIComponent(value)}`);
        const data = await res.json();
        return data;
    } catch (err) {
        return { available: true };
    }
}

// ===================== SIGNUP PAGE LOGIC =====================

function initSignupPage() {
    const form = document.getElementById('signup-form');
    if (!form) return; // Not on signup page

    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const formError = document.getElementById('form-error');

    // Validate username with server-side duplicate check
    async function validateUsernameAsync() {
        const val = usernameInput.value.trim();
        if (!val) {
            showError('username', 'Username is required.');
            return false;
        }
        if (val.length < 3) {
            showError('username', 'Username must be at least 3 characters.');
            return false;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(val)) {
            showError('username', 'Username can only contain letters, numbers, and underscores.');
            return false;
        }
        // Check if username is already taken
        const result = await checkAccountAvailability('username', val);
        if (!result.available) {
            showError('username', result.message);
            return false;
        }
        showSuccess('username');
        return true;
    }

    // Validate email with server-side duplicate check
    async function validateEmailAsync() {
        const val = emailInput.value.trim();
        if (!val) {
            showError('email', 'Email is required.');
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) {
            showError('email', 'Please enter a valid email address (e.g., user@example.com).');
            return false;
        }
        // Check if email is already registered
        const result = await checkAccountAvailability('email', val);
        if (!result.available) {
            showError('email', result.message);
            return false;
        }
        showSuccess('email');
        return true;
    }

    // Debounced async validators
    const debouncedUsernameCheck = debounce(async function() {
        if (usernameInput.value.trim()) await validateUsernameAsync();
        else hideAllMessages('username');
    }, 500);

    const debouncedEmailCheck = debounce(async function() {
        if (emailInput.value.trim()) await validateEmailAsync();
        else hideAllMessages('email');
    }, 500);

    // Validate on blur (when user leaves a field)
    usernameInput.addEventListener('blur', async function() {
        if (this.value.trim()) await validateUsernameAsync();
        else hideAllMessages('username');
    });
    emailInput.addEventListener('blur', async function() {
        if (this.value.trim()) await validateEmailAsync();
        else hideAllMessages('email');
    });
    passwordInput.addEventListener('blur', function() {
        if (this.value) validatePassword('password');
        else hideAllMessages('password');
    });
    confirmPasswordInput.addEventListener('blur', function() {
        if (this.value) validateConfirmPassword('confirm-password', 'password');
        else hideAllMessages('confirm-password');
    });

    // Validate on input (real-time feedback after first interaction)
    usernameInput.addEventListener('input', debouncedUsernameCheck);
    emailInput.addEventListener('input', debouncedEmailCheck);
    passwordInput.addEventListener('input', function() {
        if (this.value) validatePassword('password');
        else hideAllMessages('password');
    });
    confirmPasswordInput.addEventListener('input', function() {
        if (this.value) validateConfirmPassword('confirm-password', 'password');
        else hideAllMessages('confirm-password');
    });

    // Validate on form submit using API
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        formError.classList.remove('visible');
        formError.style.color = '#c55';

        const isUsernameValid = await validateUsernameAsync();
        const isEmailValid = await validateEmailAsync();
        const isPasswordValid = validatePassword('password');
        const isConfirmValid = validateConfirmPassword('confirm-password', 'password');

        if (!isUsernameValid || !isEmailValid || !isPasswordValid || !isConfirmValid) {
            formError.textContent = 'Please fix the errors above before submitting.';
            formError.classList.add('visible');

            // Focus the first invalid field
            if (!isUsernameValid) usernameInput.focus();
            else if (!isEmailValid) emailInput.focus();
            else if (!isPasswordValid) passwordInput.focus();
            else if (!isConfirmValid) confirmPasswordInput.focus();
            return;
        }

        // Submit signup data to API
        try {
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Creating account...';
            submitBtn.disabled = true;

            // Hash the password before sending
            const hashedPassword = await hashPassword(passwordInput.value);

            const res = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: usernameInput.value.trim(),
                    email: emailInput.value.trim(),
                    password: hashedPassword
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                formError.style.color = '#5a5';
                formError.textContent = 'Account created successfully! Redirecting to login...';
                formError.classList.add('visible');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            } else {
                formError.style.color = '#c55';
                formError.textContent = data.error || 'An error occurred during signup. Please try again.';
                formError.classList.add('visible');
                submitBtn.textContent = 'Signup';
                submitBtn.disabled = false;
            }
        } catch (err) {
            formError.style.color = '#c55';
            formError.textContent = 'Unable to connect to the server. Please check your connection and try again.';
            formError.classList.add('visible');
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Signup';
            submitBtn.disabled = false;
        }
    });
}

// ===================== LOGIN PAGE LOGIC =====================

function initLoginPage() {
    const form = document.getElementById('login-form');
    if (!form) return; // Not on login page

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const formError = document.getElementById('form-error');

    function validateUsername() {
        const val = usernameInput.value.trim();
        if (!val) {
            showError('username', 'Username is required.');
            return false;
        }
        if (val.length < 3) {
            showError('username', 'Username must be at least 3 characters.');
            return false;
        }
        showSuccess('username');
        return true;
    }

    function validatePasswordLogin() {
        const val = passwordInput.value;
        if (!val) {
            showError('password', 'Password is required.');
            return false;
        }
        if (val.length < 8) {
            showError('password', 'Password must be at least 8 characters.');
            return false;
        }
        showSuccess('password');
        return true;
    }

    // Validate on blur
    usernameInput.addEventListener('blur', function() {
        if (this.value.trim()) validateUsername();
        else hideAllMessages('username');
    });
    passwordInput.addEventListener('blur', function() {
        if (this.value) validatePasswordLogin();
        else hideAllMessages('password');
    });

    // Validate on input
    usernameInput.addEventListener('input', function() {
        if (this.value.trim()) validateUsername();
        else hideAllMessages('username');
    });
    passwordInput.addEventListener('input', function() {
        if (this.value) validatePasswordLogin();
        else hideAllMessages('password');
    });

    // Submit using login API
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        formError.classList.remove('visible');
        formError.style.color = '#c55';

        const isUsernameValid = validateUsername();
        const isPasswordValid = validatePasswordLogin();

        if (!isUsernameValid || !isPasswordValid) {
            formError.textContent = 'Please fix the errors above before submitting.';
            formError.classList.add('visible');

            if (!isUsernameValid) usernameInput.focus();
            else if (!isPasswordValid) passwordInput.focus();
            return;
        }

        try {
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Signing in...';
            submitBtn.disabled = true;

            // Hash the password before sending
            const hashedPassword = await hashPassword(passwordInput.value);

            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: usernameInput.value.trim(),
                    password: hashedPassword
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                formError.style.color = '#5a5';
                formError.textContent = 'Login successful! Redirecting...';
                formError.classList.add('visible');
                setTimeout(() => {
                    window.location.href = 'characters.html';
                }, 1000);
            } else {
                formError.style.color = '#c55';
                formError.textContent = data.error || 'Invalid credentials. Please try again.';
                formError.classList.add('visible');
                submitBtn.textContent = 'Login';
                submitBtn.disabled = false;
            }
        } catch (err) {
            formError.style.color = '#c55';
            formError.textContent = 'Unable to connect to the server. Please check your connection and try again.';
            formError.classList.add('visible');
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Login';
            submitBtn.disabled = false;
        }
    });
}

// ===================== INIT ON PAGE LOAD =====================

document.addEventListener('DOMContentLoaded', function() {
    initSignupPage();
    initLoginPage();
});
