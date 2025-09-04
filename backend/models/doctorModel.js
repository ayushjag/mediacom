import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    // A quick tip: `select: false` is great for security! Just remember in your login
    // function to explicitly ask for it: const doctor = await doctorModel.findOne({ email }).select('+password');
    password: { type: String, required: true, select: false }, 
    image: { type: String },
    speciality: { type: String },
    degree: { type: String },
    experience: { type: String },
    about: { type: String },
    available: { type: Boolean, default: true },
    fees: { type: Number },
    slots_booked: { type: Object, default: {} },
    address: { type: Object },
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },
    
    // --- ADD THESE TWO FIELDS for password reset functionality ---
    passwordResetOTP: { type: String },      // <-- ADD THIS
    passwordResetExpires: { type: Date },    // <-- ADD THIS

    profileStatus: { type: String, default: 'incomplete' },
}, { minimize: false })

const doctorModel = mongoose.models.doctor || mongoose.model("doctor", doctorSchema);
export default doctorModel;