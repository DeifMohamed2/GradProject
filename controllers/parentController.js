const Parent = require('../models/parent');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const jwtSecret = process.env.JWT_SECRET;   


const loginParent =async (req,res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: false });
  }

  try {
      const parent = await Parent.findOne({ email });
      
      if (!parent) {
          return res.status(400).json({ message: false });
      }

      const isMatch = await bcrypt.compare(password, parent.password);
      if (!isMatch) {
          return res.status(400).json({ message: false });
      }

      const token = jwt.sign({ parentId: parent._id }, jwtSecret);
      res.cookie('token', token, { httpOnly: true });
      return res.status(200).json({ message: true , parent , token });
  } catch (error) {
      return res.status(500).json({ message: false});
  }
}


const getProfileData = async (req,res) => {
  return res.status(200).json({ message: 'Profile data fetched successfully' , parent: req.parent });
}

module.exports = {
  loginParent,
  getProfileData,
};