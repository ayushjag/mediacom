import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import Chat from "../models/Chat.js";
import { v2 as cloudinary } from 'cloudinary';
import sendEmail from "../utils/sendEmail.js"; 

// --- FIX: Helper function defined at the top of the file ---
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// === Start Chat ===
const startChat = async (req, res) => {
    try {
        const userId = req.user.id;
        const { doctorId } = req.body;

        const doctor = await doctorModel.findById(doctorId);
        if (!doctor || !doctor.available) {
            return res.status(400).json({ success: false, message: 'Doctor is not available for chat.' });
        }

        const newChat = await Chat.create({
            userId,
            doctorId,
            amount: 0,
            paymentStatus: true,
            paymentDetails: {
                orderId: `order_free_${Date.now()}`,
                paymentId: null,
                signature: null
            },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        const chat = await Chat.findById(newChat._id).populate('doctorId', 'name speciality image');
        res.json({ success: true, message: 'Chat session started', chat });
    } catch (error) {
        console.error("Chat initiation failed:", error);
        res.status(500).json({ success: false, message: 'Chat initiation failed' });
    }
};

// === User Profile Management ===
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const userData = await userModel.findById(userId).select('-password');
        res.json({ success: true, userData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone, address, dob, gender } = req.body;
        const imageFile = req.file;

        if (!name || !phone || !dob || !gender) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        
        const updateData = { name, phone, dob, gender };
        
        if (address) {
            updateData.address = JSON.parse(address);
        }
        
        if (imageFile) {
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image", folder: "user_profiles" });
            updateData.image = imageUpload.secure_url;
        }
        
        await userModel.findByIdAndUpdate(userId, updateData);
        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// === Chat Messaging ===
const sendChatMessage = async (req, res) => {
    try {
        const { chatId, text } = req.body;
        const userId = req.user.id;
        if (!text || !text.trim()) {
            return res.status(400).json({ success: false, message: "Message cannot be empty" });
        }
        const chat = await Chat.findOne({_id: chatId, userId, paymentStatus: true, expiresAt: { $gt: new Date() }});
        if (!chat) {
            return res.status(403).json({ success: false, message: "Chat not found or access denied" });
        }
        chat.messages.push({ sender: 'user', text, createdAt: new Date()});
        await chat.save();
        res.json({ success: true, message: "Message sent", chat});
    } catch (error) {
        console.error("Message send error:", error);
        res.status(500).json({ success: false, message: "Error sending message" });
    }
};

const getUserChats = async (req, res) => {
    try {
        const userId = req.user.id;
        const chats = await Chat.find({ userId, paymentStatus: true}).populate('doctorId', 'name image speciality').sort({ updatedAt: -1 });
        res.json({ success: true, chats });
    } catch (error) {
        console.error("Chat history error:", error);
        res.status(500).json({ success: false, message: "Error fetching chats" });
    }
};

const getSingleChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.id;
        const chat = await Chat.findOne({ _id: chatId, userId: userId })
            .populate('doctorId', 'name image speciality');
        
        if (!chat) {
            return res.status(404).json({ success: false, message: "Chat not found." });
        }
        res.json({ success: true, chat });
    } catch (error) {
        console.error("Get single chat error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
};

// === Authentication & Registration ===
const requestUserRegistrationOTP = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password || !validator.isEmail(email) || password.length < 8) {
            return res.status(400).json({ success: false, message: 'Please provide all valid details.' });
        }

        const existingUser = await userModel.findOne({ email, isVerified: true });
        if (existingUser) {
            return res.json({ success: false, message: "User with this email already exists." });
        }

        const otp = generateOTP(); // Using the helper function
        const salt = await bcrypt.genSalt(10);
        const hashedOTP = await bcrypt.hash(otp, salt);
        const hashedPassword = await bcrypt.hash(password, salt);
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        await userModel.findOneAndUpdate(
            { email, isVerified: false },
            { name, email, password: hashedPassword, otp: hashedOTP, otpExpires, isVerified: false },
            { upsert: true, new: true }
        );

        const message = `<p>Your OTP for HealthLife registration is: <h2><b>${otp}</b></h2> This is valid for 10 minutes.</p>`;
        await sendEmail({ email, subject: 'HealthLife - Email Verification', message });

        res.json({ success: true, message: "OTP sent to your email. Please verify." });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Error sending OTP." });
    }
};

const verifyUserOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await userModel.findOne({ email });

        if (!user || user.isVerified || user.otpExpires < new Date()) {
            return res.status(400).json({ success: false, message: "Verification failed. Code may be invalid or expired." });
        }

        const isMatch = await bcrypt.compare(otp, user.otp);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid OTP." });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();
        
        res.json({ success: true, message: "Email verified successfully!" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Error during verification." });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email, isVerified: true }); // Ensure user is verified
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials or email not verified" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.json({ success: true, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// === Password Reset ===
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Please enter a valid email." });
        }

        const user = await userModel.findOne({ email, isVerified: true });

        if (!user) {
            return res.json({ success: true, message: "If an account with that email exists, a password reset code has been sent." });
        }

        const otp = generateOTP(); // Using the helper function
        user.passwordResetOTP = otp;
        user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        try {
            const message = `<p>Your password reset code for HealthLife is: <h2><b>${otp}</b></h2> This code is valid for 10 minutes.</p>`;
            await sendEmail({
                email: user.email,
                subject: 'HealthLife - Password Reset Code',
                message
            });
            res.json({ success: true, message: "A password reset code has been sent to your email." });
        } catch (emailError) {
            console.error("Password reset email sending error:", emailError);
            user.passwordResetOTP = undefined;
            user.passwordResetExpires = undefined;
            await user.save();
            return res.status(500).json({ success: false, message: "Error sending email. Please try again later." });
        }
    } catch (error) {
        console.error("Request password reset error:", error);
        res.status(500).json({ success: false, message: "An unexpected error occurred." });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!otp || !newPassword || newPassword.length < 8) {
            return res.status(400).json({ success: false, message: "Please provide a valid code and a new password of at least 8 characters." });
        }

        const user = await userModel.findOne({
            email,
            passwordResetOTP: otp,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "The code is invalid or has expired. Please request a new one." });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.passwordResetOTP = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.json({ success: true, message: "Password has been reset successfully. You can now log in." });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ success: false, message: "An unexpected error occurred." });
    }
};

// === Final Export List ===
export {
    loginUser,
    requestUserRegistrationOTP, 
    verifyUserOTP, 
    getProfile,
    updateProfile,
    startChat,
    getUserChats,
    sendChatMessage,
    getSingleChat,
    requestPasswordReset,
    resetPassword
};