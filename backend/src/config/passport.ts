import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User';

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'), undefined);

        let user = await User.findOne({ where: { googleId: profile.id } });

        if (!user) {
          user = await User.findOne({ where: { email } });
          if (user) {
            await user.update({ googleId: profile.id, avatar: profile.photos?.[0]?.value || null });
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

export default passport;
