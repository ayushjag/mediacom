import React, { useContext, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { DoctorContext } from '../context/DoctorContext';
import { AdminContext } from '../context/AdminContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    // State to toggle between 'Doctor' and 'Admin'
    const [userType, setUserType] = useState('Doctor'); 
    
    // --- NEW: State to manage the view (Login, Request Reset, Reset Password) ---
    const [stage, setStage] = useState('Login'); 

    // --- Form state variables ---
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();

    const { handleDoctorLogin } = useContext(DoctorContext);
    const { handleAdminLogin } = useContext(AdminContext);

    // --- Handler for Doctor/Admin Login ---
    const onLoginSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        try {
            if (userType === 'Admin') {
                const { data } = await axios.post(`${backendUrl}/api/admin/login`, { email, password });
                if (data.success) {
                    handleAdminLogin(data.token);
                    toast.success("Admin login successful!");
                    navigate('/admin/dashboard');
                } else {
                    toast.error(data.message);
                }
            } else { // Doctor Login
                const { data } = await axios.post(`${backendUrl}/api/doctor/login`, { email, password });
                if (data.success) {
                    handleDoctorLogin(data.token);
                    toast.success("Doctor login successful!");
                    if (data.profileStatus === 'incomplete') {
                        toast.info("Please complete your profile to activate your account.");
                        navigate('/doctor/profile');
                    } else {
                        navigate('/doctor/dashboard');
                    }
                } else {
                    toast.error(data.message);
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Login failed. Please check your credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- NEW: Handler for Requesting Password Reset Code ---
    const onRequestResetSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        try {
            const { data } = await axios.post(`${backendUrl}/api/doctor/forgot-password/request`, { email });
            if (data.success) {
                toast.success("A reset code has been sent to your email.");
                setStage('Reset Password'); // Move to the next stage
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send reset code.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- NEW: Handler for Resetting the Password ---
    const onResetPasswordSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        try {
            const { data } = await axios.post(`${backendUrl}/api/doctor/forgot-password/reset`, { email, otp, newPassword });
            if (data.success) {
                toast.success("Password has been reset successfully! Please log in.");
                setStage('Login'); // Go back to the login screen
                // Clear state for security
                setOtp('');
                setNewPassword('');
                setPassword('');
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to reset password.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className='min-h-[80vh] flex items-center justify-center bg-gray-50 p-4'>
            <div className='flex flex-col gap-5 m-auto items-start p-8 w-full max-w-md border bg-white rounded-xl text-gray-700 shadow-lg'>

                {/* --- Conditional Rendering Based on 'stage' --- */}

                {/* STAGE 1: LOGIN FORM */}
                {stage === 'Login' && (
                    <form onSubmit={onLoginSubmit} className="w-full flex flex-col gap-5">
                        <h1 className='text-3xl font-bold m-auto text-gray-800'><span className='text-teal-600'>{userType}</span> Login</h1>
                        <div className='w-full'>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input onChange={(e) => setEmail(e.target.value)} value={email} className='border border-gray-300 rounded-lg w-full p-2.5 mt-1 focus:ring-2 focus:ring-teal-500' type="email" required />
                        </div>
                        <div className='w-full'>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium">Password</label>
                                {/* --- Forgot Password Link (Only for Doctors) --- */}
                                {userType === 'Doctor' && (
                                    <span onClick={() => setStage('Request Reset')} className="text-sm text-teal-600 hover:underline cursor-pointer">
                                        Forgot Password?
                                    </span>
                                )}
                            </div>
                            <input onChange={(e) => setPassword(e.target.value)} value={password} className='border border-gray-300 rounded-lg w-full p-2.5 mt-1 leading-tight focus:outline-none focus:shadow-outline' type="password" required />
                        </div>
                        <button type="submit" disabled={isLoading} className='bg-teal-600 text-white w-full py-2.5 rounded-lg text-base font-semibold hover:bg-teal-700 transition disabled:bg-teal-400'>
                            {isLoading ? 'Logging in...' : 'Login'}
                        </button>
                        <p className="text-center w-full text-sm">
                            {userType === 'Admin'
                                ? <>Are you a Doctor? <span onClick={() => setUserType('Doctor')} className='text-teal-600 font-semibold underline cursor-pointer'>Login here</span></>
                                : <>
                                    Don't have an account? <Link to="/doctor/signup" className='text-teal-600 font-semibold underline cursor-pointer'>Sign Up here</Link>
                                    <br />
                                    Are you an Admin? <span onClick={() => setUserType('Admin')} className='text-teal-600 font-semibold underline cursor-pointer'>Login here</span>
                                  </>
                            }
                        </p>
                    </form>
                )}

                {/* STAGE 2: REQUEST RESET CODE FORM */}
                {stage === 'Request Reset' && (
                    <form onSubmit={onRequestResetSubmit} className="w-full flex flex-col gap-5">
                        <h1 className='text-3xl font-bold m-auto text-gray-800'>Forgot Password</h1>
                        <p className='text-sm text-gray-600 text-center -mt-2'>Enter your email to receive a password reset code.</p>
                        <div className='w-full'>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input onChange={(e) => setEmail(e.target.value)} value={email} className='border border-gray-300 rounded-lg w-full p-2.5 mt-1 focus:ring-2 focus:ring-teal-500' type="email" required />
                        </div>
                        <button type="submit" disabled={isLoading} className='bg-teal-600 text-white w-full py-2.5 rounded-lg text-base font-semibold hover:bg-teal-700 transition disabled:bg-teal-400'>
                            {isLoading ? 'Sending...' : 'Send Reset Code'}
                        </button>
                        <p className="text-center w-full text-sm">
                            Remembered your password? <span onClick={() => setStage('Login')} className='text-teal-600 font-semibold underline cursor-pointer'>Login here</span>
                        </p>
                    </form>
                )}

                {/* STAGE 3: RESET PASSWORD FORM */}
                {stage === 'Reset Password' && (
                    <form onSubmit={onResetPasswordSubmit} className="w-full flex flex-col gap-5">
                        <h1 className='text-3xl font-bold m-auto text-gray-800'>Set New Password</h1>
                        <p className='text-sm text-gray-600 text-center -mt-2'>A code was sent to <strong>{email}</strong>. Enter it below.</p>
                        <div className='w-full'>
                            <label className="block text-sm font-medium mb-1">Reset Code (OTP)</label>
                            <input onChange={(e) => setOtp(e.target.value)} value={otp} className='border border-gray-300 rounded-lg w-full p-2.5 mt-1 focus:ring-2 focus:ring-teal-500' type="text" required />
                        </div>
                        <div className='w-full'>
                            <label className="block text-sm font-medium mb-1">New Password</label>
                            <input onChange={(e) => setNewPassword(e.target.value)} value={newPassword} className='border border-gray-300 rounded-lg w-full p-2.5 mt-1 leading-tight focus:outline-none focus:shadow-outline' type="password" required />
                        </div>
                        <button type="submit" disabled={isLoading} className='bg-teal-600 text-white w-full py-2.5 rounded-lg text-base font-semibold hover:bg-teal-700 transition disabled:bg-teal-400'>
                            {isLoading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

            </div>
        </div>
    );
};

export default Login;