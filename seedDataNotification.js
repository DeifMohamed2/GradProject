const mongoose = require('mongoose');
const Notification = require('./models/notification');

// Connect to MongoDB
mongoose.connect('mongodb+srv://deif:1qaz2wsx@3devway.aa4i6ga.mongodb.net/GradProjectReal?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected for notification seeding'))
.catch(err => console.error('MongoDB connection error:', err));

// Parent ID to seed notifications for
const parentId = '68338d365918955bae66777b';

// Sample notification data
const notificationData = [
    {
        parent: parentId,
        title: 'Welcome to the School System',
        message: 'Thank you for joining our school system. We hope you have a great experience!'
    },
    {
        parent: parentId,
        title: 'New Payment Due',
        message: 'Please note that the school fees for this semester are due by the end of the month.'
    },
    {
        parent: parentId,
        title: 'Parent-Teacher Meeting',
        message: 'A parent-teacher meeting is scheduled for next Friday at 4 PM. Your attendance is requested.'
    },
    {
        parent: parentId,
        title: 'Student Achievement',
        message: 'Congratulations! Your child has been recognized for outstanding performance in mathematics.'
    },
    {
        parent: parentId,
        title: 'School Holiday',
        message: 'Please note that the school will be closed next Monday for the national holiday.'
    }
];

// Function to seed notifications
const seedNotifications = async () => {
    try {
        // Clear existing notifications for this parent
        await Notification.deleteMany({ parent: parentId });
        
        // Insert new notifications
        const notifications = await Notification.insertMany(notificationData);
        
        console.log(`${notifications.length} notifications seeded successfully for parent ${parentId}`);
        
        // Disconnect from MongoDB
        mongoose.disconnect();
    } catch (error) {
        console.error('Error seeding notifications:', error);
        mongoose.disconnect();
    }
};

// Run the seeding function
seedNotifications(); 