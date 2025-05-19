// Class API Test Script

// Function to create a class
async function testCreateClass() {
  try {
    // First get a teacher ID to use
    const teachersResponse = await fetch('/admin/teachers', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    // Use a default teacher ID if we can't get one
    let teacherId = '60a1c123b456c789d012e345'; // Fallback ID
    
    if (teachersResponse.ok) {
      try {
        const teachersData = await teachersResponse.json();
        if (teachersData.teachers && teachersData.teachers.length > 0) {
          teacherId = teachersData.teachers[0]._id;
        }
      } catch (e) {
        console.warn('Could not parse teachers response, using fallback ID');
      }
    }
    
    const testClass = {
      name: 'Test Class ' + Date.now(),
      description: 'Test class description created for testing',
      teacherId: teacherId,
      isActive: true
    };
    
    console.log('Attempting to create class with data:', testClass);
    
    const response = await fetch('/admin/create-class', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testClass),
      credentials: 'include' // Include cookies for auth
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
    if (response.ok) {
      console.log('Class created successfully!');
      return data;
    } else {
      console.error('Error creating class:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error in testCreateClass:', error);
    return null;
  }
}

// Function to get all classes
async function testGetClasses() {
  try {
    const response = await fetch('/admin/classes', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    console.log('Get classes response:', data);
    
    if (response.ok) {
      console.log('Got classes successfully!');
      return data;
    } else {
      console.error('Error getting classes:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error in testGetClasses:', error);
    return null;
  }
}

// Function to get class details
async function testGetClassDetails(classId) {
  try {
    const response = await fetch(`/admin/classes/${classId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    console.log('Class details response:', data);
    
    if (response.ok) {
      console.log('Got class details successfully!');
      return data;
    } else {
      console.error('Error getting class details:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error in testGetClassDetails:', error);
    return null;
  }
}

// Export functions for use in browser console
window.classApiTest = {
  createClass: testCreateClass,
  getClasses: testGetClasses,
  getClassDetails: testGetClassDetails,
  runFullTest: async function() {
    console.log('Running full class API test...');
    
    // Create class
    const createResult = await this.createClass();
    if (!createResult) {
      console.error('Test failed at class creation step');
      return;
    }
    
    // Get class details
    const classId = createResult.class.id;
    console.log(`Getting details for class ID: ${classId}`);
    
    const detailsResult = await this.getClassDetails(classId);
    if (!detailsResult) {
      console.error('Test failed at get class details step');
      return;
    }
    
    console.log('Full class API test completed successfully!');
  }
}; 