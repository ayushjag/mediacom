import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { assets } from '../assets/assets';

const MyConsultations = () => {
    const { backendUrl, token } = useContext(AppContext);
    
    const navigate = useNavigate();
    const [consultations, setConsultations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchConsultations = async () => {
            if (!token) {
                navigate('/login');
                return;
            }
            try {
                setIsLoading(true);
                const { data } = await axios.get(`${backendUrl}/api/chats`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (data.success) {
                    setConsultations(data.chats);
                } else {
                    toast.error(data.message);
                }
            } catch (error) {
                console.error('Error fetching consultations:', error);
                toast.error(error.response?.data?.message || 'Failed to load consultation history');
            } finally {
                setIsLoading(false);
            }
        };

        fetchConsultations();
    }, [token, backendUrl, navigate]);

    if (isLoading) {
        return (
            <div className='flex justify-center items-center min-h-[60vh]'>
                <div className='w-16 h-16 border-4 border-dashed rounded-full animate-spin border-teal-600'></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-semibold text-gray-800 mb-6">My Consultations</h1>
            
            {consultations.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500">You don't have any past consultations yet.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {consultations.map((chat) => {
                        const isExpired = new Date(chat.expiresAt) < new Date();

                        // --- FIX APPLIED HERE ---
                        // Create safe variables to handle cases where chat.doctorId might be null.
                        // This prevents the "Cannot read properties of null" error.
                        const doctorImage = chat.doctorId?.image || assets.default_doctor;
                        const doctorName = chat.doctorId?.name || 'Doctor Not Found';
                        const doctorSpeciality = chat.doctorId?.speciality || 'N/A';

                        return (
                            <div key={chat._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                                <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                    <div className="flex items-start space-x-4">
                                        <img 
                                            src={doctorImage} 
                                            alt={doctorName}
                                            className="w-20 h-20 rounded-lg object-cover"
                                        />
                                        <div>
                                            <h3 className="font-semibold text-lg">{doctorName}</h3>
                                            <p className="text-gray-600">{doctorSpeciality}</p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Started on: {new Date(chat.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-gray-600">
                                        <p className="font-medium">Consultation Fee Paid:</p>
                                        <p className="text-lg font-semibold text-green-600">₹{chat.amount}</p>
                                        <p className="mt-2 text-sm">
                                            Status: 
                                            <span className={`font-medium ${isExpired ? 'text-red-500' : 'text-green-600'}`}>
                                                {isExpired ? ' Expired' : ' Active'}
                                            </span>
                                        </p>
                                        {!isExpired && (
                                            <p className="text-xs text-gray-500">
                                                Expires on: {new Date(chat.expiresAt).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col space-y-2 justify-center">
                                        {isExpired ? (
                                            <div className="px-4 py-2 bg-gray-100 text-gray-500 rounded text-center">
                                                Session Expired
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => navigate(`/chat/${chat._id}`)}
                                                className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition"
                                            >
                                                View Chat
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MyConsultations;