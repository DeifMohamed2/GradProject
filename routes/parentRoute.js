const express = require('express');
const Parent = require('../models/parent');
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;
const router = express.Router();

const parentController = require('../controllers/parentController.js');

const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization').replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    
    try {
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

router.get('/profileData', authMiddleware, parentController.getProfileData);


module.exports = router;