const Admin = require('../models/admin');
const Parent = require('../models/parent');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const jwtSecret = process.env.JWT_SECRET;   



const creatAdminAccount = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
         const hashedPassword = await bcrypt.hash(password, 10);
            const admin = await Admin.create({ username, password: hashedPassword });
            const token = jwt.sign({ adminId: admin._id }, jwtSecret);
            res.cookie('token', token, { httpOnly: true });
            res.status(201).json({ message: 'Admin account created successfully' , admin , token }); 
        
    } catch (error) {
        res.status(500).json({ message: 'An error occurred' });
    }
    
}


const loginAdmin = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ adminId: admin._id }, jwtSecret);
        res.cookie('token', token, { httpOnly: true });
        return res.status(200).json({ message: 'Login successful' , admin , token });
    } catch (error) {
        return res.status(500).json({ message: 'An error occurred' });
    }
}

const createParentAccount = async (req, res) => {
  const { username, password, email, phoneNumber, age, balance } = req.body;

  if (!username || !password || !email || !phoneNumber || !age ) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const parent = await Parent.create({
      username,
      password: hashedPassword,
      email,
      phoneNumber,
      age,
      balance,
    });
    return res.status(201).json({ message: 'Parent account created successfully', parent });
  } catch (error) {
    if(error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
};


module.exports = {
  creatAdminAccount,
  loginAdmin,
  createParentAccount,
};