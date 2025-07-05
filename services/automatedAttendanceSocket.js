const socketIo = require('socket.io');
const automatedAttendanceModule = require('../controllers/automatedAttendance');
const automatedAttendanceController = automatedAttendanceModule.controller;

/**
 * AutomatedAttendanceSocketService - Manages WebSocket connections for the automated attendance system
 */
class AutomatedAttendanceSocketService {
  /**
   * Initialize the socket service with an HTTP server
   * @param {object} server - HTTP server instance
   */
  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    
    this.setupSocketEvents();
    this.setupControllerEvents();
    
    console.log('Automated attendance socket service initialized');
    return this;
  }
  
  /**
   * Set up socket event listeners
   */
  setupSocketEvents() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Send current state to newly connected client
      socket.emit('systemState', {
        state: automatedAttendanceController.state,
        student: automatedAttendanceController.currentStudent,
        retryCount: automatedAttendanceController.retryCount
      });
      
      // Client requests to start the system
      socket.on('startSystem', () => {
        console.log('Client requested system start');
        automatedAttendanceController.start();
      });
      
      // Client requests to reset the system
      socket.on('resetSystem', () => {
        console.log('Client requested system reset');
        automatedAttendanceController.forceReset();
      });
      
      // Client sends RFID card data (for testing or manual input)
      socket.on('rfidDetected', (data) => {
        console.log('Client sent RFID detection:', data);
        
        // Reset verification data to prevent using stale data
        automatedAttendanceController.capturedImage = null;
        automatedAttendanceController.verificationResult = null;
        automatedAttendanceController.retryCount = 0;
        
        // Process the RFID card
        automatedAttendanceController.processRfidCard(data.rfidCardId);
      });
      
      // Client sends captured face image
      socket.on('faceCaptured', (data) => {
        console.log('Client sent face capture');
        const timestamp = data.timestamp || Date.now();
        automatedAttendanceController.processCapturedFace(data.imageData, timestamp);
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }
  
  /**
   * Set up controller event listeners
   */
  setupControllerEvents() {
    // State changed
    automatedAttendanceController.on('stateChanged', (data) => {
      this.io.emit('systemState', data);
    });
    
    // Attendance marked
    automatedAttendanceController.on('attendanceMarked', (data) => {
      this.io.emit('attendanceMarked', data);
    });
    
    // Error occurred
    automatedAttendanceController.on('error', (data) => {
      this.io.emit('systemError', data);
    });
    
    // Max retries reached
    automatedAttendanceController.on('maxRetriesReached', (data) => {
      this.io.emit('maxRetriesReached', data);
    });
  }
  
  /**
   * Broadcast RFID detection to all connected clients
   * @param {object} data - RFID detection data
   */
  broadcastRfidDetection(data) {
    if (this.io) {
      this.io.emit('rfidDetected', data);
      
      // Also process it in the controller
      automatedAttendanceController.processRfidCard(data.rfidCardId);
    }
  }
}

// Export singleton instance
module.exports = new AutomatedAttendanceSocketService(); 