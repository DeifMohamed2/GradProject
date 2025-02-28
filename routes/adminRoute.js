const express = require('express');
const Admin = require('../models/admin');
const router = express.Router();
const jwt = require('jsonwebtoken');


const jwtSecret = process.env.JWT_SECRET;

const adminController = require('../controllers/adminController.js');

const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
    console.log(token);
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decode = jwt.verify(token, jwtSecret);
    req.adminId = decode.adminId;
    console.log(decode.adminId);
    const admin = await Admin.findOne({ _id: decode.adminId });

    if (admin) {
      req.admin = admin;
      next(); // Proceed to the next middleware/route handler
    } else {
        res.clearCookie('token');
        return res.status(401).json({ message: 'Unauthorized' });   
    }
  } catch (error) {
    res.clearCookie('token');
    return res.status(401).json({ message: 'Unauthorized' });
  }
};


router.post('/createAccount', adminController.creatAdminAccount);

router.post('/login', adminController.loginAdmin);

router.post('/createParentAccount', authMiddleware, adminController.createParentAccount);

router.post('/createStudentAccount', authMiddleware, adminController.createStudentAccount);



module.exports = router;







