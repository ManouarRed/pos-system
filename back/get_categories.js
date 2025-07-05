const axios = require('axios');

async function getCategories() {
  try {
    const response = await axios.get('http://localhost:3001/api/categories');
    console.log('Categories:', response.data.items);
  } catch (error) {
    console.error('Error fetching categories:', error.response ? error.response.data : error.message);
  }
}

getCategories();