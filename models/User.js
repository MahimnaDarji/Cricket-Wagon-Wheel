const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 8,
      required: function requiredPassword() {
        return this.authProvider !== "google";
      },
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    profileImageUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200000,
    },
    preferences: {
      theme: {
        type: String,
        enum: ["system", "light", "dark"],
        default: "system",
      },
    },
    resetPasswordOtpHash: {
      type: String,
      default: null,
    },
    resetPasswordOtpExpiresAt: {
      type: Date,
      default: null,
    },
    resetPasswordOtpVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
