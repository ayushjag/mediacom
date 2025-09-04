// utils/sendEmail.js

import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        // --- FIX: ADD THIS LINE ---
        secure: false, // true for 465, false for other ports like 587
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        // --- Optional but recommended: Add a timeout and reject unauthorized connections ---
        tls: {
            rejectUnauthorized: false 
        }
    });

    const mailOptions = {
        from: `HealthLife <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.message,
    };

    try {
        console.log("Attempting to send email...");
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully! Message ID:", info.messageId);
    } catch (error) {
        console.error("!!! FAILED TO SEND EMAIL !!!");
        console.error("Nodemailer error:", error);
    }
};

export default sendEmail;