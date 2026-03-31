const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");

const User = require("../models/User");

function hasGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

  const clientIdReady = clientId.trim().length > 0 && !clientId.startsWith("REPLACE_WITH_");
  const clientSecretReady = clientSecret.trim().length > 0 && !clientSecret.startsWith("REPLACE_WITH_");

  return clientIdReady && clientSecretReady;
}

function getProfileName(profile) {
  if (profile.displayName && profile.displayName.trim()) {
    return profile.displayName.trim();
  }

  const givenName = profile.name?.givenName || "";
  const familyName = profile.name?.familyName || "";
  return `${givenName} ${familyName}`.trim() || "Google User";
}

function configurePassport() {
  if (!hasGoogleOAuthConfig()) {
    console.warn("Google OAuth is disabled. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it.");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/auth/google/callback",
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase().trim();
          if (!email) {
            return done(new Error("Google account email is unavailable."));
          }

          const googleId = profile.id;
          const name = getProfileName(profile);

          let user = await User.findOne({ email });

          if (!user) {
            user = await User.create({
              name,
              email,
              googleId,
              authProvider: "google",
            });
          } else {
            let hasChanges = false;

            if (!user.googleId) {
              user.googleId = googleId;
              hasChanges = true;
            }

            if (!user.name && name) {
              user.name = name;
              hasChanges = true;
            }

            if (!user.authProvider) {
              user.authProvider = user.password ? "local" : "google";
              hasChanges = true;
            }

            if (hasChanges) {
              await user.save();
            }
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user || false);
    } catch (error) {
      done(error);
    }
  });
}

module.exports = {
  configurePassport,
  hasGoogleOAuthConfig,
};
