const express = require("express");
const passport = require("passport");
const { signup, login, currentUser, logout } = require("../controllers/authController");
const { hasGoogleOAuthConfig } = require("../config/passport");
const { isDatabaseReady } = require("../config/db");

const router = express.Router();

function toFrontendPath(pathname) {
	const base = String(process.env.FRONTEND_URL || "").trim().replace(/\/$/, "");
	if (!base) {
		return pathname;
	}

	return `${base}${pathname}`;
}

router.post("/signup", signup);
router.post("/login", login);
router.get("/auth/me", currentUser);
router.post("/auth/logout", logout);

router.get("/auth/google", (req, res, next) => {
	if (!isDatabaseReady()) {
		return res.status(503).json({
			success: false,
			message: "Database is not connected. Start MongoDB and set MONGODB_URI in .env.",
		});
	}

	if (!hasGoogleOAuthConfig()) {
		return res.status(503).json({
			success: false,
			message: "Google OAuth is not configured on the server.",
		});
	}

	const mode = req.query.mode === "signup" ? "signup" : "login";
	passport.authenticate("google", {
		scope: ["profile", "email"],
		state: mode,
	})(req, res, next);
});

router.get(
	"/auth/google/callback",
		(req, res, next) => {
			if (!hasGoogleOAuthConfig()) {
				return res.redirect(toFrontendPath("/?auth=error"));
			}

			next();
		},
	passport.authenticate("google", { failureRedirect: toFrontendPath("/?auth=error") }),
	(req, res) => {
		res.redirect(toFrontendPath("/dashboard.html"));
	}
);

module.exports = router;
