const axios = require('axios');

async function createNewAdmin() {
  try {
    const userData = {
      uuid: 'a06ade34-8a9f-44ef-bd5e-a06c189a3032',
      username: 'newadmin',
      password: 'newpassword',
      role: 'admin'
    };

    const response = await axios.post(`${process.env.API_BASE_URL}/api/users`, userData);
    console.log('New admin user created successfully:', response.data);
  } catch (error) {
    console.error('Error creating new admin user:', error.response ? error.response.data : error.message);
  }
}

createNewAdmin();
