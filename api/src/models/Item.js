import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: { type: String, required: true },
  difficulty: { type: String, required: true },
  wikipediaUrl: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() }
});

export default mongoose.models.Item || mongoose.model('Item', itemSchema);
