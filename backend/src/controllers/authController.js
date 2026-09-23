const authService = require('../services/authService');

function validCredentials(body) { return body.name?.trim() && body.email?.includes('@') && body.password?.length >= 8; }
async function register(request, response) { try { if (!validCredentials(request.body)) return response.status(400).json({ message: 'Enter a name, valid email, and password with at least 8 characters.' }); return response.status(201).json(await authService.register(request.body)); } catch (error) { console.error('Registration failed:', error); return response.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to create your account right now.' }); } }
async function login(request, response) { try { const { email, password } = request.body; if (!email?.includes('@') || !password) return response.status(400).json({ message: 'Enter your email and password.' }); return response.json(await authService.login(email, password)); } catch (error) { console.error('Login failed:', error); return response.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to sign in right now.' }); } }
async function logout(request, response) { await authService.revokeSession(request.tokenId); return response.status(204).send(); }
async function forgotPassword(request, response) { if (!request.body.email?.includes('@')) return response.status(400).json({ message: 'Enter a valid email address.' }); return response.json({ message: 'If an account exists for this email, reset instructions will be sent.' }); }
async function getProfile(request, response) { try { return response.json(await authService.getProfile(request.user.sub)); } catch (error) { return response.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to load your profile.' }); } }
async function updateProfile(request, response) {
    try {
        const profile = {
            name: request.body.name?.trim(),
            countryCode: request.body.countryCode?.trim() || '+1',
            phone: request.body.phone?.trim() || '',
            specialty: request.body.specialty?.trim() || '',
            organization: request.body.organization?.trim() || '',
            bio: request.body.bio?.trim() || '',
        };
        if (!profile.name) return response.status(400).json({ message: 'Your name is required.' });
        if (request.file) profile.profileImage = `/uploads/${request.file.filename}`;
        return response.json(await authService.updateProfile(request.user.sub, profile));
    } catch (error) { return response.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to save your profile.' }); }
}

module.exports = { register, login, logout, forgotPassword, getProfile, updateProfile };
