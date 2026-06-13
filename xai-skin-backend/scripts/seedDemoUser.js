/**
 * Seed a demo patient account so anyone can sign in immediately after setup.
 *
 *   Email:    patient@skin.com
 *   Password: 123456
 *
 * The password is 6 chars on purpose: the app's login form enforces
 * PASSWORD_MIN = 6 (MyApp/lib/validators.ts), so a shorter demo password
 * would be rejected client-side before the request ever reaches the API.
 *
 * Idempotent: if the account already exists, its password is reset to the demo
 * value (handy if the DB drifted). Run with:  npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const DEMO = {
  email: 'patient@skin.com',
  password: '123456',
  firstName: 'Demo',
  lastName: 'Patient',
  gender: 'male',
  dateOfBirth: new Date('1990-01-01'),
};

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/xai-skin-health';
  await mongoose.connect(uri);
  console.log('[seed] connected to', uri);

  let user = await User.findOne({ email: DEMO.email });
  if (user) {
    // Reset the password through the document so the pre-save hook re-hashes it.
    user.password = DEMO.password;
    user.firstName = DEMO.firstName;
    user.lastName = DEMO.lastName;
    user.gender = DEMO.gender;
    user.dateOfBirth = DEMO.dateOfBirth;
    await user.save();
    console.log('[seed] demo user already existed — password reset to "123456"');
  } else {
    user = new User(DEMO);
    await user.save();
    console.log('[seed] created demo user');
  }

  console.log('[seed] login with:  patient@skin.com  /  123456');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] failed:', err.message);
  process.exit(1);
});
