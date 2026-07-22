# Implementation Tasks

## Step 1: Roll Initiative with Dexterity Modifier (pc.js)
- [ ] Update initiative button to roll d20 + dex modifier
- [ ] Keep rolling history for multiple clicks

## Step 2: Token-Based Login System (server.js & auth.js)
- [ ] Server: Generate tokens on successful login
- [ ] Server: Token validation endpoint/middleware
- [ ] Client: Store token in sessionStorage on login
- [ ] Client: isLoggedIn() / getToken() helper functions
- [ ] Client: Logout functionality (clear sessionStorage)

## Step 3: Navigation Auth-Awareness (index.html + auth.js)
- [ ] On page load, check login state
- [ ] Change "Sign Up" button to "Logout" when logged in
- [ ] Logout clears token and reverts nav

## Step 4: Protect Character Creation
- [ ] characters.js: Check login state for "Create New Character" button
- [ ] character-creation.html: Auth guard on page load
- [ ] character-creation-validation.js: Redirect if not logged in

## Step 5: Testing
- [ ] Test login flow
- [ ] Test character creation protection
- [ ] Test initiative roll
- [ ] Test logout
