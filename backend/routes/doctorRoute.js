import express from 'express';

// --- Imports ---
import { 
  loginDoctor,
  doctorList,
  doctorProfile,
  updateDoctorProfile,
  getDoctorChats,
  doctorDashboard,
  doctorReplyToChat,
  getSingleDoctorChat,
  changeAvailablity,
  requestDoctorRegistrationOTP,
  verifyDoctorOTP,
  // --- ADD THESE TWO IMPORTS ---
  requestDoctorPasswordReset,
  resetDoctorPassword
} from '../controllers/doctorController.js';

import authDoctor from '../middleware/authDoctor.js';
import upload from '../middleware/multer.js';

// --- Router Setup ---
const doctorRouter = express.Router();


// --- Public Routes (No Authentication Needed) ---

// Login & Registration
doctorRouter.post('/login', loginDoctor);
doctorRouter.post('/register/request-otp', requestDoctorRegistrationOTP);
doctorRouter.post('/register/verify-otp', verifyDoctorOTP);

// --- ADD FORGOT PASSWORD ROUTES HERE ---
doctorRouter.post('/forgot-password/request', requestDoctorPasswordReset); // <-- ADD THIS
doctorRouter.post('/forgot-password/reset', resetDoctorPassword);         // <-- ADD THIS

// Public Doctor Information
doctorRouter.get('/list', doctorList);
doctorRouter.get('/public-profile/:id', doctorProfile);


// --- Protected Doctor Routes (Doctor Must Be Logged In) ---
doctorRouter.use(authDoctor);

// Profile Management
doctorRouter.get('/profile', doctorProfile);
doctorRouter.patch('/availability', changeAvailablity);
doctorRouter.patch('/profile', upload.single('image'), updateDoctorProfile);

// Dashboard
doctorRouter.get('/dashboard', doctorDashboard);

// Chat Management for the Logged-in Doctor
doctorRouter.get('/chats', getDoctorChats);
doctorRouter.get('/chats/single/:chatId', getSingleDoctorChat);
doctorRouter.post('/chats/reply', doctorReplyToChat);

// --- Export the Router ---
export default doctorRouter;