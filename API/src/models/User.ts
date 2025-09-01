import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
   _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

export const User = mongoose.model<IUser>('User', UserSchema);
