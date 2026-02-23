const axios = require('axios');
const securityConfig = require('../config/security');
const { getClientIP, logFromRequest } = require('../utils/securityLogger');

// Google's well-known test keys (always pass in dev)
const GOOGLE_TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
const GOOGLE_TEST_SECRET_KEY = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';

/**
 * Middleware to verify Google reCAPTCHA v2 checkbox token
 * Validates the "I'm not a robot" checkbox response with Google's API
 */
const verifyCaptcha = async (req, res, next) => {
    // Skip CAPTCHA if disabled
    if (!securityConfig.recaptcha.enabled) {
        return next();
    }

    const captchaToken = req.body.captchaToken || req.headers['x-captcha-token'];

    // Check if using test keys (development mode)
    const isTestMode = securityConfig.recaptcha.secretKey === GOOGLE_TEST_SECRET_KEY ||
        securityConfig.recaptcha.siteKey === GOOGLE_TEST_SITE_KEY;

    if (!captchaToken) {
        if (isTestMode) {
            // In test/dev mode, allow through without token
            console.log('🤖 CAPTCHA: Test mode - no token provided, allowing through');
            await logFromRequest(req, 'captcha_failed', 'allowed', 'No CAPTCHA token (test mode)');
            return next();
        }

        await logFromRequest(req, 'captcha_failed', 'blocked', 'No CAPTCHA token provided');
        return res.status(400).json({
            message: 'Please complete the CAPTCHA verification ("I\'m not a robot" checkbox).'
        });
    }

    try {
        // Verify with Google reCAPTCHA API
        const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
        const response = await axios.post(verifyUrl, null, {
            params: {
                secret: securityConfig.recaptcha.secretKey,
                response: captchaToken,
                remoteip: getClientIP(req)
            }
        });

        const { success, 'error-codes': errorCodes } = response.data;

        console.log(`🤖 CAPTCHA v2 Result: success=${success}`);
        if (!success) {
            console.log(`🤖 CAPTCHA Error Codes: ${JSON.stringify(errorCodes)}`);
            console.log(`🤖 CAPTCHA Secret Key used: ${securityConfig.recaptcha.secretKey.substring(0, 10)}...`);
        }

        if (!success) {
            // In test mode, allow anyway
            if (isTestMode) {
                console.log('🤖 CAPTCHA: Test mode - verification failed but allowing through');
                return next();
            }

            const errorDetail = (errorCodes || []).join(', ');
            await logFromRequest(req, 'captcha_failed', 'blocked',
                `CAPTCHA verification failed: ${errorDetail}`);

            return res.status(400).json({
                message: 'CAPTCHA verification failed. Please check the "I\'m not a robot" checkbox and try again.'
            });
        }

        // CAPTCHA verified successfully
        console.log('🤖 CAPTCHA: Verified successfully ✅');
        await logFromRequest(req, 'captcha_passed', 'allowed', 'CAPTCHA verification successful');
        next();
    } catch (error) {
        console.error('CAPTCHA verification error:', error.message);
        // Don't block user if CAPTCHA service is down
        await logFromRequest(req, 'captcha_failed', 'allowed',
            `CAPTCHA service error: ${error.message}. User allowed through.`);
        next();
    }
};

module.exports = { verifyCaptcha };
