const bcrypt = require('bcryptjs');

function generateSecurePassword() {
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + symbols;

    let password = '';
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function test() {
    try {
        const password = generateSecurePassword();
        console.log("Generated Password:", password, "Type:", typeof password);

        const salt = await bcrypt.genSalt(10);
        console.log("Salt:", salt, "Type:", typeof salt);

        const hash = await bcrypt.hash(password, salt);
        console.log("Hash:", hash);
    } catch (error) {
        console.error("Error:", error);
    }
}

test();
