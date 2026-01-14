import axios from 'axios';

const API_URL = 'https://audit-tool-as6f.onrender.com/api/subs';

// REMOVED THE HARDCODED USER CONSTANTS

export const getSubs = async (userId) => {
  const res = await axios.get(`${API_URL}/${userId}`);
  return res.data;
};

export const addSub = async (subData, userId, userEmail) => {
  const payload = {
    userId: userId,      // REAL ID from Clerk
    userEmail: userEmail, // REAL Email from Clerk
    name: subData.name,
    cost: Number(subData.cost),
    category: subData.category,
    renewalDate: subData.date
  };

  const res = await axios.post(API_URL, payload);
  return res.data;
};

export const toggleSub = async (id) => {
  const res = await axios.patch(`${API_URL}/${id}`);
  return res.data;
};

export const deleteSub = async (id) => {
  const res = await axios.delete(`${API_URL}/${id}`);
  return res.data;
};


