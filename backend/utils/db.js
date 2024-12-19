import mongoose, {Schema, model} from 'mongoose';

// MongoDB connection function
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {});
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1); // Exit the process if connection fails
  }
};

// Tutor Schema
const tutorSchema = new Schema({
  name: { type: String, required: true },
  subjects: [String],
  rating: { type: Number, default: 0 },
  hourlyRate: { type: Number, required: true },
  availability: [String],
  location: { type: String },
  bio: { type: String },
});

// Add indexes for efficient querying
tutorSchema.index({ rating: 1 });
tutorSchema.index({ hourlyRate: 1 });
tutorSchema.index({ availability: 1 });
const Tutor = mongoose.models.Tutor || mongoose.model('Tutor', tutorSchema);

// Resource Schema (already provided)
const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  price: { type: Number, required: true },
  tokenId: { type: String, required: true },
  filePath: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
},{ collection: 'resources' });
const Resource = mongoose.models.Resource || mongoose.model("Resource", resourceSchema, "resources");

// User Schema (example for tracking user data)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  // add more fields as necessary
},{ collection: 'users'});
const User = mongoose.models.User || mongoose.model("User", userSchema);

// Payment Schema (for tracking payment transactions)
const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  resourceId: { type: mongoose.Schema.Types.ObjectId, ref: "Resource" },
  amount: { type: Number, required: true },
  paymentDate: { type: Date, default: Date.now },
},{ collection: 'payments' });
const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

export { connectDB, Resource, Tutor, User, Payment };
