import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User';

// Only set up Google OAuth if credentials are provided
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

if (googleClientId && googleClientSecret) {
  console.log('✅ Google OAuth configured');

  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email from Google'), undefined);

          let user = await User.findOne({ where: { googleId: profile.id } });

          if (!user) {
            user = await User.findOne({ where: { email } });
            if (user) {
              await user.update({
                googleId: profile.id,
                avatar: profile.photos?.[0]?.value || null
              });
            } else {
              user = await User.create({
                email,
                password: null,
                googleId: profile.id,
                name: profile.displayName || null,
                avatar: profile.photos?.[0]?.value || null,
                isVerified: true,
                role: 'customer',
              });
            }
          }

          return done(null, user);
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );
} else {
  console.log('⚠️  Google OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)');
  console.log('   Google login will not be available.');
}

export default passport;