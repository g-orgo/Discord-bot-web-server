import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  displayName: { type: String, required: true, trim: true },
  discordUsername: { type: String, default: null, trim: true },
}, { timestamps: true });

userSchema.index(
  { discordUsername: 1 },
  {
    unique: true,
    partialFilterExpression: { discordUsername: { $type: 'string' } },
    collation: { locale: 'en', strength: 2 },
  }
);

export const User = mongoose.model('User', userSchema);
