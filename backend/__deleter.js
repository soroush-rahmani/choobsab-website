const db = require('./db');
const r = db.prepare("DELETE FROM otp_codes WHERE phone = ?").run('09121234567');
console.log('deleted OTP rows for 09121234567:', r.changes);
