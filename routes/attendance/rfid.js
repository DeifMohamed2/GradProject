const express = require('express');
const router = express.Router();
const { SerialPort } = require('serialport');
const Student = require('../../models/student');
const automatedAttendanceSocket = require('../../services/automatedAttendanceSocket');

let rfidPort;
let currentRfidData = '';
let connectedClients = [];

// Initialize RFID reader
const initRfidReader = () => {
  try {
    const portPath = process.env.RFID_PORT || '/dev/tty.usbserial-1410';
    const baudRate = parseInt(process.env.RFID_BAUDRATE || '9600');
    
    // Check if the port exists first (for development without hardware)
    const fs = require('fs');
    if (!fs.existsSync(portPath)) {
      console.log(`RFID port ${portPath} not found. Running in simulation mode.`);
      return true; // Return success even though we're in simulation mode
    }
    
    rfidPort = new SerialPort({ 
      path: portPath, 
      baudRate: baudRate 
    });
    
    rfidPort.on('open', () => {
      console.log('RFID Serial port opened');
    });
    
    rfidPort.on('error', (err) => {
      console.error('RFID Serial port error:', err.message);
    });
    
    rfidPort.on('data', (data) => {
      // Convert buffer to string
      const dataString = data.toString().trim();
      
      // Append to current data
      currentRfidData += dataString;
      
      // Check if we have a complete RFID card ID (usually ends with a newline or carriage return)
      if (dataString.includes('\r') || dataString.includes('\n')) {
        // Clean up the RFID data
        const rfidCardId = currentRfidData.replace(/[\r\n]/g, '').trim();
        
        // Reset the current data
        currentRfidData = '';
        
        // If we have a valid RFID card ID, process it
        if (rfidCardId.length > 0) {
          processRfidCard(rfidCardId);
        }
      }
    });
    
    return true;
  } catch (err) {
    console.error('Failed to initialize RFID reader:', err);
    console.log('Running in RFID simulation mode');
    return true; // Return success even in simulation mode
  }
};

// Process RFID card reading
const processRfidCard = async (rfidCardId) => {
  try {
    // Find student by RFID card ID
    const student = await Student.findOne({ rfidCardId }).select('-photos');
    
    // Create data object
    const data = {
      rfidCardId,
      timestamp: new Date(),
      student: student || null
    };
    
    // Send the data to all connected clients
    connectedClients.forEach(client => {
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
    
    // Also send to automated attendance system
    automatedAttendanceSocket.broadcastRfidDetection(data);
    
    console.log(`RFID Card detected: ${rfidCardId}`);
  } catch (err) {
    console.error('Error processing RFID card:', err);
  }
};

// Route to manually initialize RFID reader
router.post('/init', (req, res) => {
  const success = initRfidReader();
  if (success) {
    res.json({ message: 'RFID reader initialized successfully' });
  } else {
    res.status(500).json({ message: 'Failed to initialize RFID reader' });
  }
});

// Route to manually simulate RFID card reading (for testing)
router.post('/simulate', async (req, res) => {
  try {
    const { rfidCardId } = req.body;
    
    if (!rfidCardId) {
      return res.status(400).json({ message: 'RFID card ID is required' });
    }
    
    await processRfidCard(rfidCardId);
    res.json({ message: 'RFID card simulated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Route to subscribe to RFID events using Server-Sent Events (SSE)
router.get('/events', (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ connected: true, timestamp: new Date() })}\n\n`);
  
  // Add client to connected clients
  const clientId = Date.now();
  const client = {
    id: clientId,
    res
  };
  
  connectedClients.push(client);
  
  // Handle client disconnect
  req.on('close', () => {
    console.log(`Client ${clientId} disconnected from RFID events`);
    connectedClients = connectedClients.filter(c => c.id !== clientId);
  });
});

// Auto-start RFID reader when the server starts
initRfidReader();

module.exports = router; 