const express = require('express');
const Parent = require('../models/parent');
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;
const router = express.Router();

const parentController = require('../controllers/parentController.js');

const authMiddleware = async (req, res, next) => {
    try {
    const token = req.header('Authorization').replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    

        const decode = jwt.verify(token, jwtSecret);
        req.parentId = decode.parentId;
        const parent = await Parent.findOne({ _id: decode.parentId });
    
        if (parent) {
        req.parent = parent;
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


router.post('/login', parentController.loginParent);


router.get('/dashboard', authMiddleware, parentController.dashbard_get);

router.get('/get_child_insights/:id' , authMiddleware, parentController.getChildInsights);

router.put('/updatePinCode', authMiddleware, parentController.updatePinCode);

// routes Wallet

router.get('/getWallet', authMiddleware, parentController.getWallet);

router.post('/sendMoney/:studentId', authMiddleware, parentController.sendMoney);


// routes for transaction history

router.get('/profileData', authMiddleware, parentController.getProfileData);

// Transaction management routes
router.get('/pending-transactions', authMiddleware, parentController.getPendingTransactions);
router.post('/transactions/:transactionId/approve', authMiddleware, parentController.approveTransaction);
router.post('/transactions/:transactionId/reject', authMiddleware, parentController.rejectTransaction);

router.put('/updateProfile' , authMiddleware, parentController.updateProfile);

router.post('/forgetPassword', parentController.forgetPassword);    

router.put('/updatePassword' ,authMiddleware , parentController.updatePassword);


router.get('/get-student-all-data/:id', authMiddleware, parentController.getStudentAllData);

// Student grades routes
// router.get('/student-grades/:id', authMiddleware, parentController.renderStudentGrades);
router.get('/student-grades/:id', authMiddleware, parentController.getStudentGrades);


module.exports = router;