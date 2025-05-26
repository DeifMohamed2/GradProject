// Teacher API Test Script

// Function to create a teacher
async function testCreateTeacher() {
  try {
    const testTeacher = {
      username: 'testteacher' + Date.now(),
      email: 'testteacher' + Date.now() + '@example.com',
      firstName: 'Test',
      lastName: 'Teacher',
      password: 'password123',
      phoneNumber: '1234567890',
      profilePicture: 'https://via.placeholder.com/150'
    };
    
    console.log('Attempting to create teacher with data:', testTeacher);
    
    const response = await fetch('/admin/create-teacher', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testTeacher),
      credentials: 'include' // Include cookies for auth
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
    if (response.ok) {
      console.log('Teacher created successfully!');
      return data;
    } else {
      console.error('Error creating teacher:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error in testCreateTeacher:', error);
    return null;
  }
}

// Function to test teacher login
async function testTeacherLogin(email, password) {
  try {
    const response = await fetch('/api/teacher/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });
    
    const data = await response.json();
    console.log('Login response:', data);
    
    if (response.ok) {
      console.log('Teacher login successful!');
      return data;
    } else {
      console.error('Error logging in teacher:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error in testTeacherLogin:', error);
    return null;
  }
}

// Function to test getting teacher profile
async function testGetTeacherProfile(token) {
  try {
    const response = await fetch('/api/teacher/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    console.log('Profile response:', data);
    
    if (response.ok) {
      console.log('Got teacher profile successfully!');
      return data;
    } else {
      console.error('Error getting teacher profile:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error in testGetTeacherProfile:', error);
    return null;
  }
}

// Export functions for use in browser console
window.teacherApiTest = {
  createTeacher: testCreateTeacher,
  login: testTeacherLogin,
  getProfile: testGetTeacherProfile,
  runFullTest: async function() {
    console.log('Running full teacher API test...');
    
    // Create teacher
    const createResult = await this.createTeacher();
    if (!createResult) {
      console.error('Test failed at teacher creation step');
      return;
    }
    
    // Login with created teacher
    const email = createResult.teacher.email;
    const password = 'password123'; // Same as in creation
    console.log(`Attempting login with ${email}`);
    
    const loginResult = await this.login(email, password);
    if (!loginResult) {
      console.error('Test failed at teacher login step');
      return;
    }
    
    // Get profile using token
    const token = loginResult.token;
    const profileResult = await this.getProfile(token);
    if (!profileResult) {
      console.error('Test failed at get profile step');
      return;
    }
    
    console.log('Full teacher API test completed successfully!');
  }
}; 