const axios = require('axios');

async function loginAndDeleteAndAddCategory() {
  try {
    // 1. Login to get a token
    const loginResponse = await axios.post(`${process.env.API_BASE_URL}/api/auth/login`, {
      username: 'newadmin',
      password: 'newpassword'
    });

    const token = loginResponse.data.token;
    console.log('Login successful. Token obtained.');

    // 2. Attempt to delete the category using the old UUID, in case it's lingering
    const oldCategoryUuid = '8199cb23-80f9-408c-8534-898d0dbd68b8';
    try {
      console.log(`Attempting to delete category with old UUID: ${oldCategoryUuid}`);
      await axios.delete(`${process.env.API_BASE_URL}/api/categories/${oldCategoryUuid}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log(`Category with old UUID ${oldCategoryUuid} deleted successfully.`);
    } catch (error) {
      console.log(`Category with old UUID ${oldCategoryUuid} not found or could not be deleted (this is often fine if it didn't exist):`, error.response ? error.response.data : error.message);
    }

    // 3. Add category with the new UUID
    const newCategoryUuid = '012d855a-dd36-463d-9ecf-bfb4257549b7';
    const categoryData = {
      uuid: newCategoryUuid,
      name: `Women's T-Shirts`
    };

    const addCategoryResponse = await axios.post(
      `${process.env.API_BASE_URL}/api/categories`,
      categoryData,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log('Category added successfully:', addCategoryResponse.data);
  } catch (error) {
    console.error('Error in main process:', error.response ? error.response.data : error.message);
  }
}

loginAndDeleteAndAddCategory();
