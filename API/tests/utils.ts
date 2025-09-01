import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Colony } from '../src/models/Player/Colony';

export async function createTestUserAndColony({
  userProps = { email: 'player@test.com', password: 'password123' },
  colonyProps  = { serverId: 'harbor', serverType: 'PvE', colonyName: 'First Colony', level: 1 }
} = {}) {
  // create user
  const User = mongoose.model('User');
  const user = new User(userProps);
  await user.save();

  // create JWT
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string);

  // create colony linked to user
  const colony = new Colony({ userId: user._id, ...colonyProps });
  await colony.save();

  return { user, colony, token };
}